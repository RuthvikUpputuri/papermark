import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

import AppMiddleware from "@/lib/middleware/app";
import DomainMiddleware from "@/lib/middleware/domain";

import { BLOCKED_PATHNAMES } from "./lib/constants";
import IncomingWebhookMiddleware, {
  isWebhookPath,
} from "./lib/middleware/incoming-webhooks";
import PostHogMiddleware from "./lib/middleware/posthog";

function normalizeHost(host?: string | null) {
  if (!host) return "";
  return host.toLowerCase().split(":")[0];
}

const envAppHosts = (() => {
  const values = [
    process.env.NEXT_PUBLIC_APP_BASE_HOST,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_MARKETING_URL,
    process.env.NEXTAUTH_URL,
  ];

  const hosts = new Set<string>();

  for (const value of values) {
    if (!value) continue;

    try {
      const parsed = new URL(value);
      hosts.add(parsed.hostname.toLowerCase());
      continue;
    } catch (error) {
      // fall through – value may already be a bare hostname
    }

    hosts.add(value.toLowerCase());
  }

  return hosts;
})();

function isAnalyticsPath(path: string) {
  // Create a regular expression
  // ^ - asserts position at start of the line
  // /ingest/ - matches the literal string "/ingest/"
  // .* - matches any character (except for line terminators) 0 or more times
  const pattern = /^\/ingest\/.*/;

  return pattern.test(path);
}

function isKnownAppHost(host: string) {
  const normalized = normalizeHost(host);
  if (!normalized) return false;

  if (normalized.includes("localhost")) return true;
  if (normalized.endsWith(".vercel.app")) return true;
  if (envAppHosts.has(normalized)) return true;

  return false;
}

function isCustomDomain(host: string) {
  const normalized = normalizeHost(host);

  if (!normalized) {
    return false;
  }

  if (process.env.NODE_ENV === "development") {
    const looksCustom =
      normalized.includes(".local") || normalized.includes("papermark.dev");
    return looksCustom && !isKnownAppHost(normalized);
  }

  return !isKnownAppHost(normalized);
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api/ routes
     * 2. /_next/ (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml (static files)
     */
    "/((?!api/|_next/|_static|vendor|_icons|_vercel|favicon.ico|sitemap.xml).*)",
  ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const path = req.nextUrl.pathname;
  const host = req.headers.get("host");

  if (isAnalyticsPath(path)) {
    return PostHogMiddleware(req);
  }

  // Handle incoming webhooks
  if (isWebhookPath(host)) {
    return IncomingWebhookMiddleware(req);
  }

  // For custom domains, we need to handle them differently
  if (isCustomDomain(host || "")) {
    return DomainMiddleware(req);
  }

  // Handle standard papermark.io paths
  if (
    !path.startsWith("/view/") &&
    !path.startsWith("/verify") &&
    !path.startsWith("/unsubscribe")
  ) {
    return AppMiddleware(req);
  }

  // Check for blocked pathnames in view routes
  if (
    path.startsWith("/view/") &&
    (BLOCKED_PATHNAMES.some((blockedPath) => path.includes(blockedPath)) ||
      path.includes("."))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/404";
    return NextResponse.rewrite(url, { status: 404 });
  }

  return NextResponse.next();
}

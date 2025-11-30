/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const isDev = process.env.NODE_ENV === "development";

    const baseHeaders = [
      {
        // Default headers for all routes
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer-when-downgrade",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Report-To",
            value: JSON.stringify({
              group: "csp-endpoint",
              max_age: 10886400,
              endpoints: [{ url: "/api/csp-report" }],
            }),
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              `default-src 'self' https: ${isDev ? "http:" : ""}; ` +
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https: ${isDev ? "http:" : ""}; ` +
              `style-src 'self' 'unsafe-inline' https: ${isDev ? "http:" : ""}; ` +
              `img-src 'self' data: blob: https: ${isDev ? "http:" : ""}; ` +
              `font-src 'self' data: https: ${isDev ? "http:" : ""}; ` +
              `frame-ancestors 'none'; ` +
              `connect-src 'self' https: ${isDev ? "http: ws: wss:" : ""}; ` + // Add WebSocket for hot reload
              `${isDev ? "" : "upgrade-insecure-requests;"} ` +
              "report-to csp-endpoint;",
          },
        ],
      },
      {
        source: "/view/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
      {
        // Embed routes - allow iframe embedding
        source: "/view/:path*/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self' https: ${isDev ? "http:" : ""}; ` +
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https: ${isDev ? "http:" : ""}; ` +
              `style-src 'self' 'unsafe-inline' https: ${isDev ? "http:" : ""}; ` +
              `img-src 'self' data: blob: https: ${isDev ? "http:" : ""}; ` +
              `font-src 'self' data: https: ${isDev ? "http:" : ""}; ` +
              "frame-ancestors *; " + // This allows iframe embedding
              `connect-src 'self' https: ${isDev ? "http: ws: wss:" : ""}; ` + // Add WebSocket for hot reload
              `${isDev ? "" : "upgrade-insecure-requests;"}`,
          },
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
      {
        source: "/api/webhooks/services/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
      {
        source: "/unsubscribe",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
    ];

    const webhookHost = process.env.NEXT_PUBLIC_WEBHOOK_BASE_HOST;

    if (webhookHost) {
      baseHeaders.push({
        source: "/services/:path*",
        has: [
          {
            type: "host",
            value: webhookHost,
          },
        ],
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      });
    }

    return baseHeaders;
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/mupdf/*": ["./node_modules/mupdf/dist/*.wasm"],
    },
    missingSuspenseWithCSRBailout: false,
  },
};

function prepareRemotePatterns() {
  let patterns = [
    // static images and videos
    { protocol: "https", hostname: "assets.papermark.io" },
    { protocol: "https", hostname: "cdn.papermarkassets.com" },
    { protocol: "https", hostname: "d2kgph70pw5d9n.cloudfront.net" },
    // twitter img
    { protocol: "https", hostname: "pbs.twimg.com" },
    // linkedin img
    { protocol: "https", hostname: "media.licdn.com" },
    // google img
    { protocol: "https", hostname: "lh3.googleusercontent.com" },
    // useragent img
    { protocol: "https", hostname: "faisalman.github.io" },
    // special document pages
    { protocol: "https", hostname: "d36r2enbzam0iu.cloudfront.net" },
    // us special storage
    { protocol: "https", hostname: "d35vw2hoyyl88.cloudfront.net" },
  ];

  // Default region patterns
  if (process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST) {
    patterns.push({
      protocol: "https",
      hostname: process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST,
    });
  }

  if (process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST) {
    patterns.push({
      protocol: "https",
      hostname: process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST,
    });
  }

  // US region patterns
  if (process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST_US) {
    patterns.push({
      protocol: "https",
      hostname: process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST_US,
    });
  }

  if (process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST_US) {
    patterns.push({
      protocol: "https",
      hostname: process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST_US,
    });
  }

  if (process.env.VERCEL_ENV === "production") {
    patterns.push({
      // production vercel blob
      protocol: "https",
      hostname: "yoywvlh29jppecbh.public.blob.vercel-storage.com",
    });
  }

  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development"
  ) {
    patterns.push({
      // staging vercel blob
      protocol: "https",
      hostname: "36so9a8uzykxknsu.public.blob.vercel-storage.com",
    });
  }

  return patterns;
}

export default nextConfig;

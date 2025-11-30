import { tenant } from "@teamhanko/passkeys-next-auth-provider";

const hasHankoConfig =
  Boolean(process.env.HANKO_API_KEY) &&
  Boolean(process.env.NEXT_PUBLIC_HANKO_TENANT_ID);

const hanko = hasHankoConfig
  ? tenant({
      apiKey: process.env.HANKO_API_KEY!,
      tenantId: process.env.NEXT_PUBLIC_HANKO_TENANT_ID!,
    })
  : null;

export const isHankoEnabled = hasHankoConfig;

export default hanko;

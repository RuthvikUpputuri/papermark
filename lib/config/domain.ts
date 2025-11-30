/**
 * Get the configured domain from environment variables
 * Falls back to papermark.io for backward compatibility
 */
export const getEmailDomain = (): string => {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  try {
    const url = new URL(baseUrl);
    return url.hostname;
  } catch {
    return "papermark.io"; // fallback
  }
};

/**
 * Get the configured public base URL
 */
export const getBaseUrl = (): string => {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://www.papermark.io"
  );
};

/**
 * Get the configured app domain (www or app prefix based on env)
 */
export const getAppDomain = (): string => {
  const baseUrl = getBaseUrl();
  try {
    const url = new URL(baseUrl);
    return url.hostname.replace(/^(www\.|app\.)/, "www.");
  } catch {
    return "www.papermark.io";
  }
};

/**
 * Email configuration helpers
 */
export const getEmailFromSystem = (): string => {
  return process.env.EMAIL_FROM_SYSTEM || `no-reply@${getEmailDomain()}`;
};

export const getEmailFromSystemName = (): string => {
  return process.env.EMAIL_FROM_SYSTEM_NAME || "Papermark";
};

export const getEmailFromMarketing = (): string => {
  return process.env.EMAIL_FROM_MARKETING || `hello@${getEmailDomain()}`;
};

export const getEmailFromMarketingName = (): string => {
  return process.env.EMAIL_FROM_MARKETING_NAME || "Papermark Team";
};

export const getEmailFromSupport = (): string => {
  return process.env.EMAIL_FROM_SUPPORT || `support@${getEmailDomain()}`;
};

export const getEmailFromSupportName = (): string => {
  return process.env.EMAIL_FROM_SUPPORT_NAME || "Papermark Support";
};

/**
 * Get full formatted email address with name
 */
export const getFormattedEmailFrom = (type: "system" | "marketing" | "support" = "system"): string => {
  switch (type) {
    case "marketing":
      return `${getEmailFromMarketingName()} <${getEmailFromMarketing()}>`;
    case "support":
      return `${getEmailFromSupportName()} <${getEmailFromSupport()}>`;
    case "system":
    default:
      return `${getEmailFromSystemName()} <${getEmailFromSystem()}>`;
  }
};

// Shorter aliases for convenience
export const getMarketingEmail = () => getFormattedEmailFrom("marketing");
export const getSupportEmail = () => getFormattedEmailFrom("support");
export const getSystemEmail = () => getFormattedEmailFrom("system");

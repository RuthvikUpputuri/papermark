import { sendEmail } from "@/lib/resend";
import { getMarketingEmail, getSupportEmail } from "@/lib/config/domain";

import WelcomeEmail from "@/components/emails/welcome";

import { CreateUserEmailProps } from "../types";

export const sendWelcomeEmail = async (params: CreateUserEmailProps) => {
  const { name, email } = params.user;
  const emailTemplate = WelcomeEmail({ name });
  try {
    await sendEmail({
      to: email as string,
      from: getMarketingEmail(),
      subject: "Welcome to Papermark!",
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};

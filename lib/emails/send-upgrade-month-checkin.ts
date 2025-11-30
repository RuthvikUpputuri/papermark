import { sendEmail } from "@/lib/resend";
import { getMarketingEmail, getSupportEmail } from "@/lib/config/domain";

import UpgradeCheckinEmail from "@/components/emails/upgrade-one-month-checkin";

import { CreateUserEmailProps } from "../types";

export const sendUpgradeOneMonthCheckinEmail = async (
  params: CreateUserEmailProps,
) => {
  const { name, email } = params.user;

  // Get the first name from the full name
  const firstName = name ? name.split(" ")[0] : null;

  const emailTemplate = UpgradeCheckinEmail({
    name: firstName,
  });
  try {
    await sendEmail({
      to: email as string,
      subject: "Check-in from Papermark",
      from: getMarketingEmail(),
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};

import nodemailer from "nodemailer";

export interface ProvisionedEtherealAccount {
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}

/**
 * Creates a brand-new fake SMTP account on Ethereal Email
 * (https://ethereal.email) — used so each "sender" in the app has real,
 * independent SMTP credentials without needing a production mail provider.
 */
export async function provisionEtherealAccount(): Promise<ProvisionedEtherealAccount> {
  const account = await nodemailer.createTestAccount();
  return {
    email: account.user,
    smtpHost: account.smtp.host,
    smtpPort: account.smtp.port,
    smtpUser: account.user,
    smtpPass: account.pass,
  };
}

import { registerAs, type ConfigType } from '@nestjs/config';

const DEFAULT_SMTP_PORT = 587;

/** SMTP settings and the frontend base URL used to build the links sent by email. */
export const mailConfig = registerAs('mail', () => ({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || DEFAULT_SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.MAIL_FROM,
  frontendUrl: process.env.FRONTEND_URL,
}));

export type MailConfig = ConfigType<typeof mailConfig>;

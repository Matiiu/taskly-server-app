import { Inject, Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import {
  buildResetPasswordEmail,
  type ResetPasswordEmailData,
} from '@/common/mail/templates/reset-password.template';
import { mailConfig, type MailConfig } from '@/config/mail/mail.config';

/** Port where SMTP starts over TLS (SMTPS); other ports upgrade with STARTTLS. */
const SMTPS_PORT = 465;

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(@Inject(mailConfig.KEY) private readonly config: MailConfig) {
    const { host, port, user, pass } = config;

    this.transporter = createTransport({
      host,
      port,
      secure: port === SMTPS_PORT,
      // Local SMTP servers (e.g. Mailpit) don't require credentials
      auth: user ? { user, pass } : undefined,
    });
  }

  async sendPasswordResetEmail(to: string, data: ResetPasswordEmailData): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to,
      ...buildResetPasswordEmail(data),
    });
  }
}

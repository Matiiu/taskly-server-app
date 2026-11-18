import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EVENTS } from '@/common/constants/events.constants';
import { MailService } from '@/common/mail/mail.service';
import type { PasswordResetRequestedEvent } from '@/common/types/events.types';
import { mailConfig, type MailConfig } from '@/config/mail/mail.config';
import { RESET_PASSWORD_PATH, RESET_TOKEN_TTL_MINUTES } from '@/login/constants/login.constant';

@Injectable()
export class PasswordResetMailListener {
  private readonly logger = new Logger(PasswordResetMailListener.name);

  constructor(
    private readonly mailService: MailService,
    @Inject(mailConfig.KEY) private readonly config: MailConfig,
  ) {}

  // Runs in the background, so the response time doesn't reveal whether the email exists,
  // and a mail failure never reaches the request.
  @OnEvent(EVENTS.PASSWORD_RESET_REQUESTED, { async: true })
  async handlePasswordResetRequested({
    email,
    name,
    token,
  }: PasswordResetRequestedEvent): Promise<void> {
    const resetUrl = new URL(RESET_PASSWORD_PATH, this.config.frontendUrl);
    resetUrl.searchParams.set('token', token);

    try {
      await this.mailService.sendPasswordResetEmail(email, {
        name,
        resetUrl: resetUrl.toString(),
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    } catch (e) {
      this.logger.error('Failed to send the password reset email', e);
    }
  }
}

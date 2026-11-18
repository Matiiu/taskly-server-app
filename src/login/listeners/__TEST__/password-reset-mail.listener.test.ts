import { Logger } from '@nestjs/common';

import { PasswordResetMailListener } from '@/login/listeners/password-reset-mail.listener';
import { MailService } from '@/common/mail/mail.service';
import type { MailConfig } from '@/config/mail/mail.config';
import { createMailServiceMock } from '@/common/testing/login/mocks/mail-service.mock';

const FRONTEND_URL = 'https://app.taskly.test';
const EVENT = { email: 'john@example.com', name: 'John', token: 'abc123' };

describe('PasswordResetMailListener', () => {
  let listener: PasswordResetMailListener;
  let mailServiceMock: ReturnType<typeof createMailServiceMock>;
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    mailServiceMock = createMailServiceMock();
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    listener = new PasswordResetMailListener(
      mailServiceMock as unknown as MailService,
      {
        frontendUrl: FRONTEND_URL,
      } as MailConfig,
    );
  });

  afterEach(() => {
    loggerError.mockRestore();
  });

  it('sends the email with the reset URL, the name and the expiry', async () => {
    mailServiceMock.sendPasswordResetEmail.mockResolvedValue(undefined);

    await listener.handlePasswordResetRequested(EVENT);

    expect(mailServiceMock.sendPasswordResetEmail).toHaveBeenCalledWith(EVENT.email, {
      name: EVENT.name,
      resetUrl: `${FRONTEND_URL}/reset-password?token=${EVENT.token}`,
      expiresInMinutes: 30,
    });
  });

  it('logs the error and does not throw when sending fails', async () => {
    const error = new Error('smtp down');
    mailServiceMock.sendPasswordResetEmail.mockRejectedValue(error);

    await expect(listener.handlePasswordResetRequested(EVENT)).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith('Failed to send the password reset email', error);
  });
});

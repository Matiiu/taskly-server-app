import { createTransport } from 'nodemailer';

import { buildResetPasswordEmail } from '@/common/mail/templates/reset-password.template';
import { MailService } from '@/common/mail/mail.service';
import type { MailConfig } from '@/config/mail/mail.config';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const createTransportMock = jest.mocked(createTransport);

const baseConfig = {
  host: 'smtp.test',
  port: 587,
  user: 'smtp-user',
  pass: 'smtp-pass',
  from: 'Taskly <no-reply@taskly.test>',
  frontendUrl: 'https://app.taskly.test',
} as MailConfig;

const emailData = {
  name: 'John',
  resetUrl: 'https://app.taskly.test/reset-password?token=abc',
  expiresInMinutes: 30,
};

describe('MailService', () => {
  const sendMail = jest.fn();

  beforeEach(() => {
    sendMail.mockResolvedValue(undefined);
    createTransportMock.mockReturnValue({ sendMail } as never);
  });

  describe('constructor', () => {
    it('creates the transport with credentials and STARTTLS on port 587', () => {
      new MailService(baseConfig);

      expect(createTransportMock).toHaveBeenCalledWith({
        host: 'smtp.test',
        port: 587,
        secure: false,
        auth: { user: 'smtp-user', pass: 'smtp-pass' },
      });
    });

    it('creates the transport without auth when there is no user', () => {
      new MailService({ ...baseConfig, user: undefined, pass: undefined });

      expect(createTransportMock).toHaveBeenCalledWith(
        expect.objectContaining({ auth: undefined }),
      );
    });

    it('uses a secure connection on port 465', () => {
      new MailService({ ...baseConfig, port: 465 });

      expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends the reset email from the configured sender', async () => {
      const service = new MailService(baseConfig);

      await service.sendPasswordResetEmail('john@example.com', emailData);

      expect(sendMail).toHaveBeenCalledWith({
        from: baseConfig.from,
        to: 'john@example.com',
        ...buildResetPasswordEmail(emailData),
      });
    });

    it('propagates the transport error', async () => {
      sendMail.mockRejectedValue(new Error('smtp down'));
      const service = new MailService(baseConfig);

      await expect(
        service.sendPasswordResetEmail('john@example.com', {
          name: 'John',
          resetUrl: 'https://x.test',
          expiresInMinutes: 30,
        }),
      ).rejects.toThrow('smtp down');
    });
  });
});

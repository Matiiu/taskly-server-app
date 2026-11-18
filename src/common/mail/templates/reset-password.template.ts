export type ResetPasswordEmailData = {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
};

type EmailContent = { subject: string; text: string; html: string };

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// The name is user input: escape it so it can't inject markup into the email
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

export function buildResetPasswordEmail({
  name,
  resetUrl,
  expiresInMinutes,
}: ResetPasswordEmailData): EmailContent {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  return {
    subject: 'Reset your Taskly password',
    text: [
      `Hi ${name},`,
      '',
      'We received a request to reset your Taskly password. Open this link to choose a new one:',
      resetUrl,
      '',
      `The link expires in ${expiresInMinutes} minutes and can be used once.`,
      "If you didn't ask for this, you can ignore this email: your password won't change.",
    ].join('\n'),
    html: `
      <p>Hi ${safeName},</p>
      <p>We received a request to reset your Taskly password.</p>
      <p><a href="${safeUrl}">Reset my password</a></p>
      <p>The link expires in ${expiresInMinutes} minutes and can be used once.</p>
      <p>If you didn't ask for this, you can ignore this email: your password won't change.</p>
    `,
  };
}

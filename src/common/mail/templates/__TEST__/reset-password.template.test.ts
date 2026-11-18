import { buildResetPasswordEmail } from '@/common/mail/templates/reset-password.template';

const RESET_URL = 'https://app.taskly.test/reset-password?token=abc&x=1';
const data = { name: 'John', resetUrl: RESET_URL, expiresInMinutes: 30 };

describe('buildResetPasswordEmail', () => {
  it('returns a subject, text and html with the link, the name and the expiry', () => {
    const { subject, text, html } = buildResetPasswordEmail(data);

    expect(subject).toBe('Reset your Taskly password');
    expect(text).toContain('Hi John,');
    expect(text).toContain(RESET_URL);
    expect(text).toContain('expires in 30 minutes');
    expect(html).toContain('Hi John,');
    expect(html).toContain('expires in 30 minutes');
  });

  it('escapes the URL in the html but not in the text', () => {
    const { text, html } = buildResetPasswordEmail(data);

    expect(html).toContain('href="https://app.taskly.test/reset-password?token=abc&amp;x=1"');
    expect(text).toContain(RESET_URL);
  });

  it('escapes & < > " and \' in the name inside the html', () => {
    const { html, text } = buildResetPasswordEmail({
      ...data,
      name: `<script>alert("x")</script> & O'Neil`,
    });

    expect(html).toContain(
      'Hi &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; O&#39;Neil,',
    );
    expect(html).not.toContain('<script>');
    expect(text).toContain(`<script>alert("x")</script> & O'Neil`);
  });
});

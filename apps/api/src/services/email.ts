import { env } from '../env.js';

/** Sends a verification email when Resend is configured; otherwise no-op. */
export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (env.NODE_ENV === 'development') {
      console.log(`[ivc/email] Verification link for ${to}: ${verifyUrl}`);
    }
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject: 'Verify your Interactive Vacations Chronicle account',
      html: `<p>Welcome! <a href="${verifyUrl}">Verify your email</a> to finish signing up.</p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[ivc/email] Resend failed:', text);
  }
}

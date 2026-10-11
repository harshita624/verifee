/**
 * Minimal transactional email via Resend's HTTP API (no extra dependency).
 * Set RESEND_API_KEY and EMAIL_FROM. Without a key, the message is logged in
 * development so the reset flow can still be tested locally.
 */
async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    } else {
      console.warn("RESEND_API_KEY is not set; email was not sent.");
    }
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Verifee <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Email provider error ${res.status}`);
  return { sent: true };
}

exports.sendPasswordResetEmail = (to, link) =>
  sendEmail({
    to,
    subject: "Reset your Verifee password",
    text: `Use this link to reset your password. It expires in 10 minutes.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html:
      `<p>Use the button below to reset your Verifee password. The link expires in 10 minutes.</p>` +
      `<p><a href="${link}" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">Reset password</a></p>` +
      `<p style="color:#71717a;font-size:12px">If you didn't ask for this, you can ignore this email.</p>`,
  });
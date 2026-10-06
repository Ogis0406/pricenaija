type AccountEmail = { to: string; subject: string; action: string; path: string; purpose: "verify_email" | "reset_password" };

export function isTransactionalEmailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM && process.env.PUBLIC_APP_URL);
}

export async function sendAccountEmail(message: AccountEmail): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const publicUrl = process.env.PUBLIC_APP_URL;
  if (!isTransactionalEmailReady() || !apiKey || !from || !publicUrl) return { sent: false };
  const base = publicUrl.replace(/\/+$/, "");
  const link = `${base}${message.path}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111"><div style="background:#087443;color:white;padding:20px 24px;border-radius:16px 16px 0 0;font-weight:700">PriceNaija</div><div style="padding:24px;border:1px solid #e3e8e3;border-top:0;border-radius:0 0 16px 16px"><h1 style="font-size:22px">${message.action}</h1><p>Use the secure, one-time link below. If you did not request this, you can ignore this email.</p><p><a href="${link}" style="display:inline-block;background:#087443;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">${message.action}</a></p><p style="color:#66736c;font-size:13px">This link expires automatically. PriceNaija will never ask you to share your password.</p></div></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, html }),
  });
  if (!response.ok) {
    const status = response.status;
    console.warn(`[Email] Transactional message was not accepted (${status}).`);
    return { sent: false };
  }
  return { sent: true };
}

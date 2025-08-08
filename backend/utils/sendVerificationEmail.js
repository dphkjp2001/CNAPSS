// backend/utils/sendVerificationEmail.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// Send a 6-digit alphanumeric code email
module.exports = async function sendVerificationEmail({ to, code, ttlMinutes = 10 }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;padding:40px">
      <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:28px;box-shadow:0 4px 12px rgba(0,0,0,.06)">
        <h2 style="margin:0 0 10px 0;color:#111827">Your CNAPSS Verification Code</h2>
        <p style="color:#374151;margin:0 0 18px 0">Enter this code in the app to verify your email.</p>
        <div style="font-size:28px;letter-spacing:6px;font-weight:700;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;display:inline-block">
          ${code}
        </div>
        <p style="color:#6b7280;margin-top:18px">This code expires in ${ttlMinutes} minutes.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn’t request this, you can safely ignore this email.</p>
      </div>
      <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:18px">Sent by CNAPSS</p>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: 'verify@cnapss.com',
      to,
      subject: 'Your CNAPSS verification code',
      html,
      text: `Your verification code is: ${code} (expires in ${ttlMinutes} minutes)`,
    });
    console.log('✅ Code email sent:', data?.id || data);
  } catch (err) {
    console.error('❌ Failed to send code email:', err);
    throw new Error('Failed to send verification code email');
  }
};


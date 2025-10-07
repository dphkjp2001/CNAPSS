// backend/services/sendVerificationEmail.js
// 네가 올린 CJS 버전을 service 경로에 맞춰 정리(내용은 동등)
// Resend 사용, 간단한 HTML 템플릿
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail({ to, code, ttlMinutes = 10 }) {
  const html = `
    <!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f7f7f8;padding:40px">
      <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:28px;box-shadow:0 4px 12px rgba(0,0,0,.06)">
        <h2 style="margin:0 0 8px 0;color:#111">Your CNAPSS Verification Code</h2>
        <p style="color:#444;margin:0 0 16px 0">Enter this code in the app to verify your email.</p>
        <div style="font-size:28px;letter-spacing:6px;font-weight:700;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;display:inline-block">
          ${code}
        </div>
        <p style="color:#666;margin-top:16px">This code expires in ${ttlMinutes} minutes.</p>
      </div>
      <p style="color:#9aa">If you didn’t request this, you can ignore this email.</p>
    </body></html>`;

  try {
    const data = await resend.emails.send({
      from: "verify@cnapss.com",
      to,
      subject: "Your CNAPSS verification code",
      html,
      text: `Your verification code is: ${code} (expires in ${ttlMinutes} minutes)`
    });
    console.log("✅ Code email sent:", data?.id || data);
  } catch (err) {
    console.error("❌ Failed to send code email:", err);
    throw new Error("Failed to send verification code email");
  }
}

module.exports = { sendVerificationEmail };

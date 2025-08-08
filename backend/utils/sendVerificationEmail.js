// 📁 파일 경로: backend/utils/sendVerificationEmail.js

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, token) => {
  const verificationLink = `https://api.cnapss.com/api/auth/verify?token=${token}`;

  try {
    const data = await resend.emails.send({
      from: 'verify@cnapss.com',
      to: email,
      subject: 'NYUETA Email Verification',
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: sans-serif; background-color: #f9fafb; padding: 40px;">
            <div style="max-width: 480px; margin: auto; background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center;">
              <h2 style="color: #111827; font-size: 24px;">Verify Your Email</h2>
              <p style="color: #374151; font-size: 16px; margin-top: 16px;">
                Click the button below to verify your email address and activate your account.
              </p>

              <a href="${verificationLink}" style="display: inline-block; margin-top: 24px; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
                Verify Email
              </a>

              <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
                * This link will expire in 1 hour.
              </p>
            </div>
            <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 40px;">
              Sent by NYUETA (via cnapss.com)
            </p>
          </body>
        </html>
      `,
      text: `Please verify your NYUETA email address by clicking the link: ${verificationLink}`,
    });

    console.log("✅ Verification email sent:", data);
  } catch (error) {
    console.error("❌ Failed to send verification email:", error);
    throw new Error("Failed to send verification email via Resend");
  }
};

module.exports = sendVerificationEmail;




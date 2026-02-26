import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey && apiKey.startsWith("SG.")) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn("SENDGRID_API_KEY not set or invalid – emails will be logged to console instead of sent.");
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  firstName: string
): Promise<void> {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || "noreply@saccofraudguard.co.ke",
    subject: "SaccoFraudGuard — Password Reset Request",
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
        <div style="padding: 40px 32px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <h1 style="color: #10b981; margin: 0; font-size: 24px;">SaccoFraudGuard</h1>
        </div>
        <div style="padding: 40px 32px;">
          <h2 style="color: #f8fafc; margin: 0 0 16px; font-size: 20px;">Password Reset Request</h2>
          <p style="color: #94a3b8; line-height: 1.6; margin: 0 0 24px;">
            Hello ${firstName},<br/><br/>
            We received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour.
          </p>
          <a href="${resetLink}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Reset Password
          </a>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 32px 0 0;">
            If you did not request a password reset, please ignore this email or contact your administrator immediately.
          </p>
        </div>
        <div style="padding: 24px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
          <p style="color: #475569; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} SaccoFraudGuard. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  if (!apiKey || !apiKey.startsWith("SG.")) {
    console.log("[Email] Would send password reset to:", to);
    console.log("[Email] Reset link:", resetLink);
    return;
  }

  await sgMail.send(msg);
}

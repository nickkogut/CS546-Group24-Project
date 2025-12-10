import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("❌ Missing SMTP_USER or SMTP_PASS in .env");
}
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // 587 = false, 465 = true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to send password reset email
export async function sendResetEmail(toEmail, resetLink) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: toEmail,
    subject: "Reset Your Password - CareerScope NYC",
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank">Reset Password</a>
      <p>This link expires in <strong>15 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
}
// config/email.js
import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendResetEmail = async (toEmail, resetLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "NYC Job Analyzer - Password Reset Link",
    text: `Please click the following link within 15 minutes to reset your password:\n\n${resetLink}\n\nIf you did not request a password reset, please ignore this email.`
  };
  await mailer.sendMail(mailOptions);
};
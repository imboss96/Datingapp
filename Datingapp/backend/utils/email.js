import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS
  }
});

export async function sendEmail(to, subject, text, html) {
  const mail = {
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to,
    subject,
    text,
    html
  };
  return transport.sendMail(mail);
}

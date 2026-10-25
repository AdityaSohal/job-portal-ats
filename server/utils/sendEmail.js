import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.EMAIL_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
};

export const sendEmail = ({ to, subject, text, html }) =>
  getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  });

export const sendEmailSafe = async (options) => {
  try {
    await sendEmail(options);
  } catch (err) {
    console.error("Email failed:", err.message);
  }
};
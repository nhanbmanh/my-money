import nodemailer from "nodemailer";
import { EmailTemplate } from "./email-templates";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(to: string, template: EmailTemplate) {
  await transporter.sendMail({
    from: `"My Money" <${process.env.GMAIL_USER}>`,
    to,
    subject: template.subject,
    html: template.html,
  });
}

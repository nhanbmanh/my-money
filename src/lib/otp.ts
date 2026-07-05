import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";
import {
  // budgetAlertTemplate,
  // monthlyReportTemplate,
  otpTemplate,
} from "./email-templates";

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(userId: string) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  await prisma.otpCode.create({
    data: { userId, code, expiresAt },
  });

  return code;
}

export async function sendOtpEmail(to: string, code: string) {
  await sendEmail(to, otpTemplate(code));
  // await sendEmail(to, budgetAlertTemplate("Ăn uống", 80, 2400000, 3000000));
  // await sendEmail(to, monthlyReportTemplate("7/2025", 15000000, 8500000));
}

import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { vi } from "date-fns/locale";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export function formatVND(val: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function buildAndSendWeeklyReportEmail({
  userId,
  userEmail,
  targetDate = subWeeks(new Date(), 1), // Default to last week
}: {
  userId?: string;
  userEmail: string;
  targetDate?: Date;
}) {
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  const weekRangeStr = `${format(weekStart, "dd/MM/yyyy")} — ${format(
    weekEnd,
    "dd/MM/yyyy"
  )}`;

  // Find user if userId not directly supplied
  let targetUserId = userId;
  if (!targetUserId) {
    const u = await prisma.user.findUnique({ where: { email: userEmail } });
    if (u) targetUserId = u.id;
  }

  // 1. Fetch transactions for target week
  const items = targetUserId
    ? await prisma.cashFlow.findMany({
        where: {
          userId: targetUserId,
          datetime: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          source: true,
          primaryCategory: true,
          secondaryCategories: {
            include: { secondaryCategory: true },
          },
        },
        orderBy: { datetime: "desc" },
      })
    : [];

  // 2. Compute weekly stats
  let totalIncome = 0;
  let totalExpense = 0;

  items.forEach((item) => {
    if (item.cashType === "Income") {
      totalIncome += item.amountOfMoney;
    } else {
      totalExpense += item.amountOfMoney;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // 3. Top 3 highest transactions (by amountOfMoney descending)
  const top3Transactions = [...items]
    .sort((a, b) => b.amountOfMoney - a.amountOfMoney)
    .slice(0, 3);

  // 4. Primary category expense breakdown & percentage share
  const categoryMap: Record<
    string,
    { name: string; amount: number; count: number }
  > = {};

  items
    .filter((item) => item.cashType === "Expense")
    .forEach((item) => {
      const catName = item.primaryCategory?.categoryName || "Chưa phân loại";
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, amount: 0, count: 0 };
      }
      categoryMap[catName].amount += item.amountOfMoney;
      categoryMap[catName].count += 1;
    });

  const categoryBreakdown = Object.values(categoryMap)
    .map((c) => ({
      ...c,
      percent: totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // HTML Email Template Construction
  const appUrl = process.env.NEXTAUTH_URL || "https://my-money.app";

  const top3RowsHtml =
    top3Transactions.length === 0
      ? `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8; font-style: italic;">Không có giao dịch nào trong tuần này</td></tr>`
      : top3Transactions
          .map(
            (t) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 14px; font-weight: 700; color: #1e293b;">
          ${t.title}
          <div style="font-size: 11px; font-weight: 400; color: #64748b; margin-top: 2px;">
            ${format(new Date(t.datetime), "HH:mm - dd/MM/yyyy")}
          </div>
        </td>
        <td style="padding: 12px 14px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background-color: ${
            t.cashType === "Income" ? "#dcfce7" : "#ffe4e6"
          }; color: ${t.cashType === "Income" ? "#166534" : "#991b1b"};">
            ${t.cashType === "Income" ? "💰 Thu nhập" : "💸 Chi tiêu"}
          </span>
        </td>
        <td style="padding: 12px 14px; font-size: 12px; color: #475569;">
          ${t.primaryCategory?.categoryName || "—"}
        </td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 800; font-size: 14px; color: ${
          t.cashType === "Income" ? "#16a34a" : "#dc2626"
        };">
          ${t.cashType === "Income" ? "+" : "-"}${formatVND(t.amountOfMoney)}
        </td>
      </tr>
    `
          )
          .join("");

  const categoryRowsHtml =
    categoryBreakdown.length === 0
      ? `<tr><td colspan="3" style="padding: 16px; text-align: center; color: #94a3b8; font-style: italic;">Chưa có chi tiêu theo nhãn chính</td></tr>`
      : categoryBreakdown
          .map(
            (c) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 14px; font-weight: 700; color: #334155;">
          ${c.name}
          <span style="font-size: 11px; font-weight: 400; color: #94a3b8; margin-left: 4px;">(${
            c.count
          } giao dịch)</span>
        </td>
        <td style="padding: 12px 14px; width: 45%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; background-color: #e2e8f0; height: 8px; border-radius: 999px; overflow: hidden;">
              <div style="background-color: #0284c7; height: 100%; width: ${Math.min(
                c.percent,
                100
              )}%; border-radius: 999px;"></div>
            </div>
            <span style="font-size: 12px; font-weight: 700; color: #0284c7; min-width: 40px; text-align: right;">${c.percent.toFixed(
              1
            )}%</span>
          </div>
        </td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 700; color: #1e293b;">
          ${formatVND(c.amount)}
        </td>
      </tr>
    `
          )
          .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo Cáo Tài Chính Tuần - My Money</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
              
              <!-- Header Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                  <div style="font-size: 36px; margin-bottom: 8px;">📊</div>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                    BÁO CÁO TÀI CHÍNH TUẦN
                  </h1>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #a5b4fc; font-weight: 600;">
                    Tuần: ${weekRangeStr}
                  </p>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 24px;">
                  
                  <!-- Executive Summary Cards -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                    <tr>
                      <td width="32%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 14px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; margin-bottom: 4px;">Thu Tuần</div>
                        <div style="font-size: 15px; font-weight: 800; color: #15803d;">${formatVND(
                          totalIncome
                        )}</div>
                      </td>
                      <td width="2%"></td>
                      <td width="32%" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 16px; padding: 14px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; margin-bottom: 4px;">Chi Tuần</div>
                        <div style="font-size: 15px; font-weight: 800; color: #b91c1c;">${formatVND(
                          totalExpense
                        )}</div>
                      </td>
                      <td width="2%"></td>
                      <td width="32%" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px; padding: 14px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 700; color: #075985; text-transform: uppercase; margin-bottom: 4px;">Dư Ròng</div>
                        <div style="font-size: 15px; font-weight: 800; color: ${
                          netBalance >= 0 ? "#0369a1" : "#d97706"
                        };">${formatVND(netBalance)}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- SECTION 1: TOP 3 GIAO DỊCH LỚN NHẤT -->
                  <div style="margin-bottom: 28px;">
                    <h2 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
                      🏆 Top 3 Giao Dịch Thu / Chi Cao Nhất
                    </h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-transform: uppercase;">
                          <th style="padding: 10px 14px; text-align: left;">Tên giao dịch</th>
                          <th style="padding: 10px 14px; text-align: left;">Loại</th>
                          <th style="padding: 10px 14px; text-align: left;">Nhãn</th>
                          <th style="padding: 10px 14px; text-align: right;">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${top3RowsHtml}
                      </tbody>
                    </table>
                  </div>

                  <!-- SECTION 2: TỔNG HỢP TỶ LỆ CHI THEO NHÃN CHÍNH -->
                  <div style="margin-bottom: 28px;">
                    <h2 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
                      📊 Phân Tích Tỷ Lệ Chi Theo Nhãn Chính
                    </h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-transform: uppercase;">
                          <th style="padding: 10px 14px; text-align: left;">Nhãn chính</th>
                          <th style="padding: 10px 14px; text-align: left;">Tỷ lệ chi</th>
                          <th style="padding: 10px 14px; text-align: right;">Tổng tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${categoryRowsHtml}
                      </tbody>
                    </table>
                  </div>

                  <!-- Action Call to Action -->
                  <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-t: 1px dashed #e2e8f0;">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 14px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">
                      🚀 Mở Ứng Dụng Xem Chi Tiết
                    </a>
                    <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
                      Báo cáo tự động được tạo từ ứng dụng Quản Lý Tài Chính My Money
                    </p>
                  </div>

                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Send email via nodemailer
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    await transporter.sendMail({
      from: `"My Money App" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `[Báo Cáo Tuần] Tài Chính Tuần ${weekRangeStr}`,
      html: htmlContent,
    });
  }

  return {
    success: true,
    weekRangeStr,
    totalIncome,
    totalExpense,
    netBalance,
    top3Count: top3Transactions.length,
    categoriesCount: categoryBreakdown.length,
    htmlContent,
  };
}

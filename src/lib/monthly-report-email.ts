import * as XLSX from "xlsx";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getStartOfDayVN, getEndOfDayVN } from "@/lib/date-utils";

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

export async function buildAndSendMonthlyReportEmail({
  userId,
  userEmail,
  monthStr,
  storedBudgets = {},
}: {
  userId: string;
  userEmail: string;
  monthStr: string; // e.g. "2026-07"
  storedBudgets?: Record<string, number>;
}) {
  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10) - 1;

  const rawStartDate = startOfMonth(new Date(year, month, 1));
  const rawEndDate = endOfMonth(new Date(year, month, 1));

  const startDate = getStartOfDayVN(rawStartDate);
  const endDate = getEndOfDayVN(rawEndDate);

  // 1. Fetch user data & transactions for specified month
  const [items, userSources, userPrimaryCategories, userSecondaryCategories] =
    await Promise.all([
      prisma.cashFlow.findMany({
        where: {
          userId,
          datetime: {
            gte: startDate,
            lte: endDate,
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
      }),
      prisma.source.findMany({
        where: { OR: [{ userId: null }, { userId }] },
      }),
      prisma.category.findMany({
        where: { OR: [{ userId: null }, { userId }] },
      }),
      prisma.secondaryCategory.findMany({
        where: { OR: [{ userId: null }, { userId }] },
      }),
    ]);

  // 2. Compute Summary Metrics
  let totalIncome = 0;
  let totalExpense = 0;

  items.forEach((item) => {
    const amt = Math.abs(item.amountOfMoney);
    if (item.cashType === "Income") {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
  });

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Health Rating
  let healthLabel = "Cần Cải Thiện";
  let healthColor = "#f59e0b"; // Amber
  let healthDesc = `Tỷ lệ tiết kiệm ở mức ${savingsRate.toFixed(1)}%. Hãy gia tăng khoản tích lũy!`;

  if (netSavings < 0) {
    healthLabel = "Thâm Hụt Chi Tiêu";
    healthColor = "#f43f5e"; // Rose
    healthDesc = "Tổng chi tiêu đang vượt tổng thu nhập. Cần rà soát và cắt giảm ngay!";
  } else if (savingsRate >= 40) {
    healthLabel = "Sức Khỏe Xuất Sắc";
    healthColor = "#10b981"; // Emerald
    healthDesc = `Tích lũy đạt ${savingsRate.toFixed(1)}% thu nhập. Quản lý tài chính cực kỳ vững vàng!`;
  } else if (savingsRate >= 20) {
    healthLabel = "Sức Khỏe Tốt";
    healthColor = "#0284c7"; // Sky
    healthDesc = `Tích lũy đạt ${savingsRate.toFixed(1)}% thu nhập. Tiếp tục duy trì phong độ này!`;
  }

  // 3. Compute Category Budget Progress
  const expenseByPrimaryMap = new Map<string, number>();
  const expenseBySecondaryMap = new Map<string, number>();

  items.forEach((item) => {
    if (item.cashType === "Expense") {
      const amt = Math.abs(item.amountOfMoney);
      if (item.primaryCategory?.id) {
        const id = item.primaryCategory.id;
        expenseByPrimaryMap.set(id, (expenseByPrimaryMap.get(id) || 0) + amt);
      }
      if (item.secondaryCategories && item.secondaryCategories.length > 0) {
        item.secondaryCategories.forEach((sc) => {
          if (sc.secondaryCategory?.id) {
            const id = sc.secondaryCategory.id;
            expenseBySecondaryMap.set(id, (expenseBySecondaryMap.get(id) || 0) + amt);
          }
        });
      }
    }
  });

  type BudgetRow = {
    name: string;
    typeLabel: string;
    limit: number;
    spent: number;
    percent: number;
    statusLabel: string;
    statusColor: string;
  };

  const budgetRows: BudgetRow[] = [];

  userPrimaryCategories.forEach((cat) => {
    const limit =
      cat.budgetLimit !== undefined && cat.budgetLimit !== null && cat.budgetLimit > 0
        ? cat.budgetLimit
        : storedBudgets[cat.id] || 0;
    if (limit > 0) {
      const spent = expenseByPrimaryMap.get(cat.id) || 0;
      const percent = (spent / limit) * 100;
      const isOver = percent >= 100;
      const isWarning = percent >= 80;

      budgetRows.push({
        name: cat.categoryName,
        typeLabel: "Nhãn chính",
        limit,
        spent,
        percent,
        statusLabel: isOver ? "🔴 VƯỢT HẠN MỨC" : isWarning ? "🟡 CHẠM NGƯỠNG" : "🟢 AN TOÀN",
        statusColor: isOver ? "#f43f5e" : isWarning ? "#f59e0b" : "#10b981",
      });
    }
  });

  userSecondaryCategories.forEach((cat) => {
    const limit =
      cat.budgetLimit !== undefined && cat.budgetLimit !== null && cat.budgetLimit > 0
        ? cat.budgetLimit
        : storedBudgets[cat.id] || 0;
    if (limit > 0) {
      const spent = expenseBySecondaryMap.get(cat.id) || 0;
      const percent = (spent / limit) * 100;
      const isOver = percent >= 100;
      const isWarning = percent >= 80;

      budgetRows.push({
        name: cat.categoryName,
        typeLabel: "Nhãn phụ",
        limit,
        spent,
        percent,
        statusLabel: isOver ? "🔴 VƯỢT HẠN MỨC" : isWarning ? "🟡 CHẠM NGƯỠNG" : "🟢 AN TOÀN",
        statusColor: isOver ? "#f43f5e" : isWarning ? "#f59e0b" : "#10b981",
      });
    }
  });

  budgetRows.sort((a, b) => b.percent - a.percent);

  // 4. Generate Attachment Excel Workbook
  const wb = XLSX.utils.book_new();

  const headers = [
    "Loại giao dịch",
    "Tên giao dịch",
    "Số tiền",
    "Thời gian (hh:mm - dd/mm/yyyy)",
    "Nguồn tiền",
    "Nhãn chính",
    "Nhãn phụ (phân cách bằng dấu phẩy)",
    "Mô tả",
  ];

  const transactionRows = items.map((item) => {
    const cashTypeStr = item.cashType === "Income" ? "Thu nhập" : "Chi tiêu";
    const title = item.title || "";
    const amount = Math.abs(item.amountOfMoney || 0);
    const timeStr = item.datetime
      ? format(new Date(item.datetime), "HH:mm - dd/MM/yyyy")
      : "";
    const sourceName = item.source?.sourceName || "";
    const primaryCatName = item.primaryCategory?.categoryName || "";
    const secCatsStr =
      item.secondaryCategories && item.secondaryCategories.length > 0
        ? item.secondaryCategories
            .map((sc) => sc.secondaryCategory?.categoryName)
            .filter(Boolean)
            .join(", ")
        : "";
    const description = item.description || "";

    return [
      cashTypeStr,
      title,
      amount,
      timeStr,
      sourceName,
      primaryCatName,
      secCatsStr,
      description,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...transactionRows]);
  ws["!cols"] = [
    { wch: 18 },
    { wch: 30 },
    { wch: 16 },
    { wch: 25 },
    { wch: 22 },
    { wch: 25 },
    { wch: 35 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Giao_Dich");

  const maxRefRows = Math.max(
    userSources.length,
    userPrimaryCategories.length,
    userSecondaryCategories.length,
    1
  );
  const refRows = [
    ["NGUỒN TIỀN CỦA BẠN", "NHÃN CHÍNH CỦA BẠN", "NHÃN PHỤ CỦA BẠN"],
  ];
  for (let i = 0; i < maxRefRows; i++) {
    refRows.push([
      userSources[i] ? userSources[i].sourceName : "",
      userPrimaryCategories[i] ? userPrimaryCategories[i].categoryName : "",
      userSecondaryCategories[i] ? userSecondaryCategories[i].categoryName : "",
    ]);
  }

  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Danh_Sach_Nguon_Va_Nhan");

  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const displayMonth = `${monthNumStr}/${yearStr}`;

  // 5. Build HTML Email Content
  const budgetTableHtml =
    budgetRows.length === 0
      ? `<p style="color: #64748b; font-size: 13px; text-align: center; padding: 15px; background: #f8fafc; border-radius: 12px;">Chưa có danh mục nào cài đặt ngân sách hạn mức trong tháng này.</p>`
      : `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; color: #334155;">
            <th style="padding: 10px; border-radius: 8px 0 0 8px;">Danh Mục</th>
            <th style="padding: 10px;">Loại</th>
            <th style="padding: 10px;">Đã Chi / Hạn Mức</th>
            <th style="padding: 10px; text-align: right; border-radius: 0 8px 8px 0;">Trạng Thái</th>
          </tr>
        </thead>
        <tbody>
          ${budgetRows
            .map(
              (r) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #0f172a;">${r.name}</td>
              <td style="padding: 10px; color: #64748b;">${r.typeLabel}</td>
              <td style="padding: 10px; color: #334155;">${formatVND(r.spent)} / ${formatVND(r.limit)} (${r.percent.toFixed(0)}%)</td>
              <td style="padding: 10px; text-align: right;">
                <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 6px; color: ${r.statusColor}; background: ${r.statusColor}15; border: 1px solid ${r.statusColor}30;">
                  ${r.statusLabel}
                </span>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
      .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
      .body { padding: 24px; }
      .metrics-grid { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
      .metric-card { flex: 1; min-w: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; text-align: center; }
      .metric-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
      .metric-val { font-size: 15px; font-weight: 800; color: #0f172a; }
      .health-box { background: ${healthColor}10; border: 1px solid ${healthColor}30; border-radius: 14px; padding: 16px; margin-bottom: 24px; }
      .health-title { font-size: 14px; font-weight: 800; color: ${healthColor}; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
      .health-desc { font-size: 12px; color: #334155; margin: 0; line-height: 1.5; }
      .section-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 24px 0 12px; }
      .cta-wrap { text-align: center; margin-top: 30px; padding-top: 20px; border-t: 1px solid #e2e8f0; }
      .cta-btn { display: inline-block; background: #0284c7; color: #ffffff; font-weight: bold; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); }
      .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📊 Báo Cáo Tài Chính Tháng ${displayMonth}</h1>
        <p>Hệ thống Quản Lý Thu Chi - My Money</p>
      </div>

      <div class="body">
        <div class="health-box">
          <div class="health-title">🛡️ Đánh Giá: ${healthLabel}</div>
          <p class="health-desc">${healthDesc}</p>
        </div>

        <div class="section-title">💰 Tổng Quan Dòng Tiền</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Tổng Thu</div>
            <div class="metric-val" style="color: #10b981;">+${formatVND(totalIncome)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Tổng Chi</div>
            <div class="metric-val" style="color: #f43f5e;">-${formatVND(totalExpense)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Còn Dư</div>
            <div class="metric-val" style="color: #0284c7;">${formatVND(netSavings)}</div>
          </div>
        </div>

        <div class="section-title">🎯 Báo Cáo Hạn Mức Ngân Sách</div>
        ${budgetTableHtml}

        <p style="font-size: 12px; color: #64748b; margin-top: 20px; line-height: 1.5;">
          📎 <strong>File đính kèm:</strong> Hệ thống đã tự động xuất và đính kèm file Excel chi tiết tất cả <strong>${items.length} giao dịch</strong> của Tháng ${displayMonth} để bạn lưu trữ và đối soát.
        </p>

        <div class="cta-wrap">
          <a href="${appUrl}" class="cta-btn">🚀 Mở Ứng Dụng Để Xem Chi Tiết</a>
        </div>
      </div>

      <div class="footer">
        Email này được gửi tự động từ hệ thống My Money • ${new Date().getFullYear()}
      </div>
    </div>
  </body>
  </html>
  `;

  // 6. Send Email via nodemailer
  await transporter.sendMail({
    from: `"My Money" <${process.env.GMAIL_USER}>`,
    to: userEmail,
    subject: `[My Money] Báo Cáo Tài Chính Tháng ${displayMonth}`,
    html: htmlContent,
    attachments: [
      {
        filename: `Bao_Cao_Giao_Dich_Thang_${monthNumStr}_${yearStr}.xlsx`,
        content: excelBuffer,
      },
    ],
  });

  return {
    success: true,
    totalItems: items.length,
    displayMonth,
    toEmail: userEmail,
  };
}

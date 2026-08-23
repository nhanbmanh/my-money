import { format } from "date-fns";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getStartOfTodayVN, getNowVN } from "@/lib/date-utils";

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

export async function buildAndSendDailySnapshotEmail({
  userId,
  userEmail,
  date,
}: {
  userId: string;
  userEmail: string;
  date?: Date;
}) {
  const targetDate = date || getStartOfTodayVN();
  const dateStrStr = format(targetDate, "dd/MM/yyyy");

  // 1. Fetch today's snapshot
  const todaySnapshot = await prisma.assetSnapshot.findFirst({
    where: {
      userId,
      date: targetDate,
    },
  });

  // 2. Fetch yesterday's snapshot for baseline comparison
  const yesterdaySnapshot = await prisma.assetSnapshot.findFirst({
    where: {
      userId,
      date: { lt: targetDate },
    },
    orderBy: { date: "desc" },
  });

  // 3. Fetch user's current holdings and liabilities
  const holdings = await prisma.holding.findMany({
    where: { userId },
    include: { asset: true },
    orderBy: { createdAt: "asc" },
  });

  const liabilities = await prisma.liability.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const totalAssets = todaySnapshot
    ? Number(todaySnapshot.totalAssetsValue)
    : holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);

  const totalLiabilities = todaySnapshot
    ? Number(todaySnapshot.totalLiabilitiesValue)
    : liabilities.reduce((sum, l) => sum + (l.totalDebt || 0), 0);

  const netWorth = todaySnapshot
    ? Number(todaySnapshot.netWorthValue)
    : totalAssets - totalLiabilities;

  const totalLiquid = todaySnapshot
    ? Number(todaySnapshot.totalLiquidValue)
    : holdings.reduce((sum, h) => sum + (h.investableFlag ? h.currentValue || 0 : 0), 0);

  // Variance vs yesterday
  const yesterdayNetWorth = yesterdaySnapshot ? Number(yesterdaySnapshot.netWorthValue) : netWorth;
  const netWorthDelta = netWorth - yesterdayNetWorth;
  const netWorthDeltaPercent = yesterdayNetWorth > 0 ? (netWorthDelta / yesterdayNetWorth) * 100 : 0;

  const isDeltaPositive = netWorthDelta >= 0;
  const deltaBadgeColor = isDeltaPositive ? "#10b981" : "#ef4444";
  const deltaBadgeBg = isDeltaPositive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
  const deltaSign = netWorthDelta > 0 ? "+" : "";

  // Group holdings by category type
  const categoryNames: Record<number, string> = {
    0: "Tài sản thanh khoản (Tiền mặt / Tiền gửi)",
    1: "Tài sản tăng trưởng (Cổ phiếu, CCQ, Vàng, Crypto)",
    2: "Bất động sản & Vật thể có giá trị",
    3: "Tài sản nợ thế chấp liên kết",
    4: "Cho vay / Khoản phải thu",
  };

  const groupedHoldings: Record<number, any[]> = {};
  holdings.forEach((h) => {
    const cat = h.categoryType ?? 0;
    if (!groupedHoldings[cat]) groupedHoldings[cat] = [];
    groupedHoldings[cat].push(h);
  });

  // Render HTML Table for Holdings
  let holdingsTableRowsHtml = "";
  Object.keys(groupedHoldings).forEach((catKeyStr) => {
    const catKey = Number(catKeyStr);
    const catItems = groupedHoldings[catKey];
    const catTotal = catItems.reduce((sum, i) => sum + (i.currentValue || 0), 0);

    holdingsTableRowsHtml += `
      <tr style="background-color: #f8fafc;">
        <td colspan="4" style="padding: 10px 12px; font-weight: bold; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">
          📁 ${categoryNames[catKey] || "Khác"} — <span style="color: #0284c7;">${formatVND(catTotal)}</span>
        </td>
      </tr>
    `;

    catItems.forEach((item) => {
      const symbol = item.asset?.symbolOrTicker || item.asset?.assetName || "Tài sản";
      const name = item.asset?.assetName || "";
      const qty = item.quantity;
      const price = item.quantity > 0 ? item.currentValue / item.quantity : item.averageCostBasis;
      const val = item.currentValue;

      holdingsTableRowsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 12px; font-size: 12px; color: #334155; font-weight: 600;">
            ${symbol} <br><span style="font-size: 11px; color: #64748b; font-weight: normal;">${name}</span>
          </td>
          <td style="padding: 8px 12px; font-size: 12px; color: #475569; text-align: center;">
            ${qty}
          </td>
          <td style="padding: 8px 12px; font-size: 12px; color: #475569; text-align: right;">
            ${formatVND(price)}
          </td>
          <td style="padding: 8px 12px; font-size: 12px; font-weight: bold; color: #0f172a; text-align: right;">
            ${formatVND(val)}
          </td>
        </tr>
      `;
    });
  });

  // Render HTML Table for Liabilities
  let liabilitiesTableHtml = "";
  if (liabilities.length > 0) {
    let rowsHtml = liabilities
      .map(
        (l) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px 12px; font-size: 12px; color: #334155; font-weight: 600;">${l.name}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #ef4444; font-weight: bold; text-align: right;">${formatVND(l.totalDebt)}</td>
      </tr>
    `
      )
      .join("");

    liabilitiesTableHtml = `
      <div style="margin-top: 20px;">
        <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">💳 Danh Sách Khoản Nợ Phải Trả</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px 12px; text-align: left;">Tên khoản nợ</th>
              <th style="padding: 8px 12px; text-align: right;">Số nợ còn lại</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo Snapshot Gia Sản Hàng Ngày</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">MyNOTE — BÁO CÁO SNAPSHOT GIA SẢN</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Chốt sổ tự động lúc 00:00 VNT · Ngày ${dateStrStr}</p>
        </div>

        <div style="padding: 24px;">
          <!-- Net Worth Summary Banner -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; color: #ffffff; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: bold;">GIA SẢN RÒNG (NET WORTH)</span>
            <div style="font-size: 28px; font-weight: 900; margin: 8px 0; color: #38bdf8;">${formatVND(netWorth)}</div>
            <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background-color: ${deltaBadgeBg}; color: ${deltaBadgeColor}; border: 1px solid ${deltaBadgeColor}40;">
              Biến động so với hôm qua: ${deltaSign}${formatVND(netWorthDelta)} (${deltaSign}${netWorthDeltaPercent.toFixed(2)}%)
            </div>
          </div>

          <!-- Key Metrics Grid -->
          <div style="display: table; width: 100%; margin-bottom: 24px;">
            <div style="display: table-row;">
              <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f1f5f9; border-radius: 10px; text-align: center;">
                <span style="font-size: 10px; color: #64748b; font-weight: bold; display: block;">TỔNG TÀI SẢN</span>
                <span style="font-size: 13px; font-weight: bold; color: #0f172a;">${formatVND(totalAssets)}</span>
              </div>
              <div style="display: table-cell; width: 4%;"></div>
              <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f1f5f9; border-radius: 10px; text-align: center;">
                <span style="font-size: 10px; color: #64748b; font-weight: bold; display: block;">TỔNG NỢ</span>
                <span style="font-size: 13px; font-weight: bold; color: #ef4444;">${formatVND(totalLiabilities)}</span>
              </div>
              <div style="display: table-cell; width: 4%;"></div>
              <div style="display: table-cell; width: 33%; padding: 10px; background-color: #f1f5f9; border-radius: 10px; text-align: center;">
                <span style="font-size: 10px; color: #64748b; font-weight: bold; display: block;">THANH KHOẢN</span>
                <span style="font-size: 13px; font-weight: bold; color: #10b981;">${formatVND(totalLiquid)}</span>
              </div>
            </div>
          </div>

          <!-- Holdings Breakdown Table -->
          <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">📊 Chi Tiết Danh Mục & Mã Tài Sản Snapshot</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #e2e8f0; color: #334155; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 8px 12px; text-align: left;">Mã / Tên tài sản</th>
                <th style="padding: 8px 12px; text-align: center;">Số lượng</th>
                <th style="padding: 8px 12px; text-align: right;">Giá đơn vị</th>
                <th style="padding: 8px 12px; text-align: right;">Tổng giá trị</th>
              </tr>
            </thead>
            <tbody>
              ${holdingsTableRowsHtml}
            </tbody>
          </table>

          ${liabilitiesTableHtml}

          <!-- Snapshot Audit Metadata -->
          <div style="margin-top: 24px; padding: 14px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; font-size: 11px; color: #64748b; line-height: 1.6;">
            <div><strong>🔒 Trạng thái chốt sổ:</strong> Ghi nhận snapshot 00:00 VNT vào cơ sở dữ liệu thành công.</div>
            <div><strong>🆔 Snapshot ID:</strong> <code>${todaySnapshot?.id || "Auto-Generated"}</code></div>
            <div><strong>⏰ Thời gian thực thi:</strong> ${format(getNowVN(), "HH:mm:ss dd/MM/yyyy")} (GMT+7)</div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Email tự động được gửi từ hệ thống MyNOTE theo dõi gia sản cá nhân.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"MyNOTE Snapshot" <${process.env.GMAIL_USER}>`,
    to: userEmail,
    subject: `📊 [MyNOTE] Báo Cáo Chốt Sổ Snapshot Gia Sản Ngày ${dateStrStr} (00:00 VNT)`,
    html: htmlTemplate,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
    dateStrStr,
    toEmail: userEmail,
    netWorth,
  };
}

export type EmailTemplate = {
  subject: string;
  html: string;
};

export function otpTemplate(code: string): EmailTemplate {
  return {
    subject: "Mã xác thực email - My Money",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0ea5e9;">My Money</h2>
        <p>Mã OTP xác thực email của bạn là:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9;">${code}</p>
        <p style="color: #888;">Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với ai khác.</p>
      </div>
    `,
  };
}

export function budgetAlertTemplate(
  categoryName: string,
  percent: number,
  spent: number,
  limit: number,
): EmailTemplate {
  return {
    subject: `Cảnh báo ngân sách - ${categoryName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0ea5e9;">My Money</h2>
        <p>Bạn đã sử dụng <strong>${percent}%</strong> ngân sách cho <strong>${categoryName}</strong>.</p>
        <p>Đã chi: <strong>${spent.toLocaleString("vi-VN")}đ</strong> / Hạn mức: <strong>${limit.toLocaleString("vi-VN")}đ</strong></p>
        <p style="color: #888;">Hãy kiểm soát chi tiêu để không vượt ngân sách.</p>
      </div>
    `,
  };
}

export function monthlyReportTemplate(
  month: string,
  totalIncome: number,
  totalExpense: number,
): EmailTemplate {
  const balance = totalIncome - totalExpense;
  return {
    subject: `Báo cáo tài chính tháng ${month} - My Money`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0ea5e9;">My Money</h2>
        <h3>Báo cáo tháng ${month}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #888;">Tổng thu</td>
            <td style="padding: 8px 0; text-align: right; color: #22c55e;">+${totalIncome.toLocaleString("vi-VN")}đ</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Tổng chi</td>
            <td style="padding: 8px 0; text-align: right; color: #ef4444;">-${totalExpense.toLocaleString("vi-VN")}đ</td>
          </tr>
          <tr style="border-top: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; font-weight: bold;">Còn lại</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${balance >= 0 ? "#22c55e" : "#ef4444"};">
              ${balance >= 0 ? "+" : ""}${balance.toLocaleString("vi-VN")}đ
            </td>
          </tr>
        </table>
        <p style="color: #888; margin-top: 16px;">Đăng nhập My Money để xem báo cáo chi tiết.</p>
      </div>
    `,
  };
}

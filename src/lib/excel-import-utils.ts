import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ImportRowPayload } from "@/app/api/cashflow/import/route";

export type Category = { id: string; categoryName: string };
export type Source = { id: string; sourceName: string };

export function generateExcelTemplate(
  sources: Source[],
  categories: Category[],
  secondaryCategories: Category[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Excel Import Form Template
  const templateHeaders = [
    "Loại giao dịch",
    "Tên giao dịch",
    "Số tiền",
    "Thời gian (hh:mm - dd/mm/yyyy)",
    "Nguồn tiền",
    "Nhãn chính",
    "Nhãn phụ (phân cách bằng dấu phẩy)",
    "Mô tả",
  ];

  const sampleSource = sources.length > 0 ? sources[0].sourceName : "Ví điện tử";
  const samplePrimaryCat = categories.length > 0 ? categories[0].categoryName : "Thiết yếu - Cố định";
  const sampleSecCat = secondaryCategories.length > 0 ? secondaryCategories[0].categoryName : "Tiền ăn, Cafe";

  const sampleRows = [
    [
      "Chi tiêu",
      "Ăn trưa văn phòng",
      45000,
      "12:15 - 05/08/2026",
      sampleSource,
      samplePrimaryCat,
      sampleSecCat,
      "Cơm tấm bì chả chả cá",
    ],
    [
      "Thu nhập",
      "Lương tháng 08",
      15000000,
      "08:00 - 01/08/2026",
      sampleSource,
      samplePrimaryCat,
      "",
      "Chuyển khoản lương định kỳ",
    ],
  ];

  const wsData = [templateHeaders, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [
    { wch: 18 }, // Loại giao dịch
    { wch: 30 }, // Tên giao dịch
    { wch: 16 }, // Số tiền
    { wch: 25 }, // Thời gian
    { wch: 22 }, // Nguồn tiền
    { wch: 25 }, // Nhãn chính
    { wch: 35 }, // Nhãn phụ
    { wch: 35 }, // Mô tả
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Khai_Bao_Giao_Dich");

  // Sheet 2: User Reference Data (Nguồn tiền & Nhãn chính & Nhãn phụ)
  const maxRows = Math.max(sources.length, categories.length, secondaryCategories.length, 1);
  const refRows = [
    ["NGUỒN TIỀN CỦA BẠN", "NHÃN CHÍNH CỦA BẠN", "NHÃN PHỤ CỦA BẠN"],
  ];

  for (let i = 0; i < maxRows; i++) {
    refRows.push([
      sources[i] ? sources[i].sourceName : "",
      categories[i] ? categories[i].categoryName : "",
      secondaryCategories[i] ? secondaryCategories[i].categoryName : "",
    ]);
  }

  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Danh_Sach_Nguon_Va_Nhan");

  // Trigger download in browser
  XLSX.writeFile(wb, "Template_Khai_Bao_Giao_Dich.xlsx");
}

export async function parseUploadedExcelFile(
  file: File
): Promise<ImportRowPayload[]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });

  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];

  const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (rawData.length <= 1) {
    return [];
  }

  // Row 0 is header
  const rowsPayload: ImportRowPayload[] = [];

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    // Check if row has any content
    const hasData = row.some((val) => val !== null && val !== undefined && String(val).trim() !== "");
    if (!hasData) continue;

    const cashTypeStr = row[0] !== undefined ? String(row[0]) : "";
    const title = row[1] !== undefined ? String(row[1]) : "";
    const amountOfMoney = row[2];
    const datetimeStr = row[3] !== undefined ? String(row[3]) : "";
    const sourceName = row[4] !== undefined ? String(row[4]) : "";
    const primaryCategoryName = row[5] !== undefined ? String(row[5]) : "";
    const secondaryCategoryNamesStr = row[6] !== undefined ? String(row[6]) : "";
    const description = row[7] !== undefined ? String(row[7]) : "";

    rowsPayload.push({
      cashTypeStr,
      title,
      amountOfMoney,
      datetimeStr,
      sourceName,
      primaryCategoryName,
      secondaryCategoryNamesStr,
      description,
    });
  }

  return rowsPayload;
}

export function exportCashflowToExcel(
  items: any[],
  sources: Source[],
  categories: Category[],
  secondaryCategories: Category[],
  scopeLabel: string
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Exported Cashflow Transactions
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
            .map((sc: any) => sc.secondaryCategory?.categoryName)
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

  const wsData = [headers, ...transactionRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

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

  // Sheet 2: User Reference Data
  const maxRows = Math.max(
    sources.length,
    categories.length,
    secondaryCategories.length,
    1
  );
  const refRows = [
    ["NGUỒN TIỀN CỦA BẠN", "NHÃN CHÍNH CỦA BẠN", "NHÃN PHỤ CỦA BẠN"],
  ];

  for (let i = 0; i < maxRows; i++) {
    refRows.push([
      sources[i] ? sources[i].sourceName : "",
      categories[i] ? categories[i].categoryName : "",
      secondaryCategories[i] ? secondaryCategories[i].categoryName : "",
    ]);
  }

  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Danh_Sach_Nguon_Va_Nhan");

  const cleanScopeLabel = scopeLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  XLSX.writeFile(wb, `Bao_Cao_Giao_Dich_${cleanScopeLabel}.xlsx`);
}

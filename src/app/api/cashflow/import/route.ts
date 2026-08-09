import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parse } from "date-fns";
import { adjustLiquidAssetBalance } from "@/lib/wealth-service";

export type ImportRowPayload = {
  cashTypeStr?: string; // "Chi tiêu" | "Thu nhập"
  title?: string; // Tên giao dịch (Required)
  amountOfMoney?: number | string; // Số tiền (Required)
  datetimeStr?: string; // "hh:mm - dd/mm/yyyy"
  sourceName?: string; // Nguồn tiền (Required - Map by lowercase)
  primaryCategoryName?: string; // Nhãn chính (Required - Map by lowercase)
  secondaryCategoryNamesStr?: string; // Nhãn phụ (Comma separated - Map by lowercase)
  description?: string; // Mô tả
};

export type ImportResultDetail = {
  rowNumber: number;
  title: string;
  reason: string;
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const rows: ImportRowPayload[] = body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Danh sách dữ liệu import rỗng" },
        { status: 400 }
      );
    }

    // 1. Fetch user's existing Sources, Primary Categories, and Secondary Categories
    const [userSources, userPrimaryCategories, userSecondaryCategories] =
      await Promise.all([
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

    // Create lowercase mapping maps
    const sourceMap = new Map<string, string>(); // lowercase name -> id
    userSources.forEach((s) => {
      sourceMap.set(s.sourceName.toLowerCase().trim(), s.id);
    });

    const primaryCategoryMap = new Map<string, string>(); // lowercase name -> id
    userPrimaryCategories.forEach((c) => {
      primaryCategoryMap.set(c.categoryName.toLowerCase().trim(), c.id);
    });

    const secondaryCategoryMap = new Map<string, string>(); // lowercase name -> id
    userSecondaryCategories.forEach((sc) => {
      secondaryCategoryMap.set(sc.categoryName.toLowerCase().trim(), sc.id);
    });

    const validItemsToCreate: Array<{
      userId: string;
      title: string;
      cashType: "Income" | "Expense";
      amountOfMoney: number;
      datetime: Date;
      sourceId: string;
      primaryCategoryId: string;
      description: string | null;
      secCatIds: string[];
    }> = [];

    const failedDetails: ImportResultDetail[] = [];

    // Process each row (Row 1 in Excel is headers, so row index + 2 is actual Excel row)
    rows.forEach((row, idx) => {
      const excelRowNumber = idx + 2;
      const title = row.title ? String(row.title).trim() : "";
      const rawAmount = row.amountOfMoney;
      const sourceNameRaw = row.sourceName ? String(row.sourceName).trim() : "";
      const primaryCategoryNameRaw = row.primaryCategoryName
        ? String(row.primaryCategoryName).trim()
        : "";

      // 1. Check Title (Required)
      if (!title) {
        failedDetails.push({
          rowNumber: excelRowNumber,
          title: title || "(Không tên)",
          reason: "Bỏ qua: Thiếu tên giao dịch",
        });
        return;
      }

      // 2. Check Amount (Required)
      let parsedAmount = 0;
      if (typeof rawAmount === "number") {
        parsedAmount = Math.abs(rawAmount);
      } else if (typeof rawAmount === "string") {
        const digitsOnly = rawAmount.replace(/\D/g, "");
        parsedAmount = digitsOnly ? parseInt(digitsOnly, 10) : 0;
      }

      if (parsedAmount <= 0) {
        failedDetails.push({
          rowNumber: excelRowNumber,
          title,
          reason: "Bỏ qua: Số tiền không hợp lệ hoặc bằng 0",
        });
        return;
      }

      // 3. Check Source (Required & Case-Insensitive Mapping)
      if (!sourceNameRaw) {
        failedDetails.push({
          rowNumber: excelRowNumber,
          title,
          reason: "Bỏ qua: Thiếu tên Nguồn tiền",
        });
        return;
      }

      const matchedSourceId = sourceMap.get(sourceNameRaw.toLowerCase());
      if (!matchedSourceId) {
        failedDetails.push({
          rowNumber: excelRowNumber,
          title,
          reason: `Bỏ qua: Không tìm thấy Nguồn tiền '${sourceNameRaw}'`,
        });
        return;
      }

      // 4. Check Primary Category (Required & Case-Insensitive Mapping)
      if (!primaryCategoryNameRaw) {
        failedDetails.push({
          rowNumber: excelRowNumber,
          title,
          reason: "Bỏ qua: Thiếu tên Nhãn chính",
        });
        return;
      }

      const matchedPrimaryCategoryId = primaryCategoryMap.get(
        primaryCategoryNameRaw.toLowerCase()
      );
      if (!matchedPrimaryCategoryId) {
        failedDetails.push({
          rowNumber: excelRowNumber,
          title,
          reason: `Bỏ qua: Không tìm thấy Nhãn chính '${primaryCategoryNameRaw}'`,
        });
        return;
      }

      // 5. Cash Type (Income vs Expense)
      const cashTypeStr = row.cashTypeStr
        ? String(row.cashTypeStr).trim().toLowerCase()
        : "";
      const cashType: "Income" | "Expense" =
        cashTypeStr === "thu nhập" || cashTypeStr === "income"
          ? "Income"
          : "Expense";

      // 6. Datetime parsing: format "hh:mm - dd/mm/yyyy" or fallback to current time
      let dt = new Date();
      if (row.datetimeStr && typeof row.datetimeStr === "string") {
        try {
          const parsedDate = parse(
            row.datetimeStr.trim(),
            "HH:mm - dd/MM/yyyy",
            new Date()
          );
          if (!isNaN(parsedDate.getTime())) {
            dt = parsedDate;
          }
        } catch {
          // fallback to now
        }
      }

      // 7. Secondary Categories (Comma-separated)
      const secCatIds: string[] = [];
      if (row.secondaryCategoryNamesStr) {
        const secNames = String(row.secondaryCategoryNamesStr)
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        secNames.forEach((secName) => {
          const secId = secondaryCategoryMap.get(secName);
          if (secId && !secCatIds.includes(secId)) {
            secCatIds.push(secId);
          }
        });
      }

      // 8. Description
      const description = row.description
        ? String(row.description).trim()
        : null;

      validItemsToCreate.push({
        userId,
        title,
        cashType,
        amountOfMoney: parsedAmount,
        datetime: dt,
        sourceId: matchedSourceId,
        primaryCategoryId: matchedPrimaryCategoryId,
        description,
        secCatIds,
      });
    });

    // Perform database insertion for valid items
    let createdCount = 0;

    for (const item of validItemsToCreate) {
      await prisma.cashFlow.create({
        data: {
          userId: item.userId,
          title: item.title,
          cashType: item.cashType,
          amountOfMoney: item.amountOfMoney,
          datetime: item.datetime,
          sourceId: item.sourceId,
          primaryCategoryId: item.primaryCategoryId,
          description: item.description,
          secondaryCategories: {
            create: item.secCatIds.map((secId) => ({
              secondaryCategoryId: secId,
            })),
          },
        },
      });
      createdCount++;

      const delta = item.cashType === "Income" ? item.amountOfMoney : -item.amountOfMoney;
      await adjustLiquidAssetBalance(userId, delta, item.sourceId);
    }

    return NextResponse.json({
      totalRows: rows.length,
      successCount: createdCount,
      failedCount: failedDetails.length,
      failedDetails,
    });
  } catch (error) {
    console.error("Failed to import cashflow items:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi hệ thống khi import dữ liệu" },
      { status: 500 }
    );
  }
}

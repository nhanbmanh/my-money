import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  parseMessageWithAI,
  capitalizeFirstLetter,
  cleanCalendarTitle,
  calculateCalendarDate,
} from "@/lib/ai-parser";
import { adjustLiquidAssetBalance } from "@/lib/wealth-service";

/**
 * Helper to normalize Vietnamese unicode strings to standard NFC format & lowercase
 */
function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text.normalize("NFC").toLowerCase().trim();
}

/**
 * Smart Source Resolver: Matches ONLY existing data in database. NEVER creates new sources!
 * Priority order:
 * 1. User custom sources (`userId` !== null) take precedence over default sources (`userId` === null).
 * 2. Token / word substring match (e.g., "TPBank" token matches "Ngân Hàng TPBank" or "Ví Momo").
 * 3. Brand Aliases map (e.g., "tpb" -> TPBank, "vcb" -> Vietcombank, "mb" -> MBBank).
 * 4. Generic type fallback (Bank / E-Wallet / Cash).
 */
async function resolveSource(userId: string, sourceNameRaw?: string | null, fullMessageText?: string) {
  const allSources = await prisma.source.findMany({
    where: { OR: [{ userId }, { userId: null }] },
  });

  if (allSources.length === 0) {
    return { id: null, name: "Tiền mặt" };
  }

  // Sort sources so user-specific custom sources (userId !== null) come FIRST
  const existingSources = [...allSources].sort((a, b) => {
    if (a.userId && !b.userId) return -1;
    if (!a.userId && b.userId) return 1;
    return 0;
  });

  const rawExtracted = normalizeText(sourceNameRaw);
  const rawText = normalizeText(fullMessageText);
  const combinedQuery = `${rawExtracted} ${rawText}`.trim();

  if (!combinedQuery) {
    const defaultCash = existingSources.find((src) => /tiền mặt|cash/i.test(normalizeText(src.sourceName)));
    return { id: defaultCash?.id || existingSources[0].id, name: defaultCash?.sourceName || existingSources[0].sourceName };
  }

  // Brand Alias Dictionary
  const BRAND_ALIASES: Record<string, string[]> = {
    tpbank: ["tpbank", "tpb", "tp bank", "tiền phong", "tien phong"],
    vcb: ["vcb", "vietcombank", "vietcom"],
    mb: ["mb", "mbbank", "mb bank", "quân đội", "quan doi"],
    tcb: ["tcb", "techcombank", "techcom"],
    bidv: ["bidv"],
    vpbank: ["vpbank", "vpb", "vp bank"],
    vietinbank: ["vietinbank", "vietin", "ctg"],
    acb: ["acb", "á châu", "a chau"],
    sacombank: ["sacombank", "stb", "sài gòn thương tín"],
    agribank: ["agribank", "nông nghiệp", "nong nghiep"],
    momo: ["momo"],
    zalopay: ["zalopay", "zalo pay", "zalo"],
    viettelpay: ["viettelpay", "viettel money", "viettel"],
    shopeepay: ["shopeepay", "airpay", "shopee"],
  };

  // Step 1: Direct or Word Token Match in DB Sources (Prioritizing User Custom Sources)
  for (const src of existingSources) {
    const srcLower = normalizeText(src.sourceName);

    // Exact or substring match in combinedQuery or extracted text
    if (combinedQuery.includes(srcLower) || (rawExtracted && srcLower.includes(rawExtracted))) {
      return { id: src.id, name: src.sourceName };
    }

    // Token match: check if any meaningful token in src.sourceName appears in query
    const srcTokens = srcLower.split(/[\s\-_()/]+/).filter((t) => t.length >= 2);
    for (const token of srcTokens) {
      if (
        token === "tiền" ||
        token === "mặt" ||
        token === "tài" ||
        token === "khoản" ||
        token === "ngân" ||
        token === "hàng" ||
        token === "ví" ||
        token === "điện" ||
        token === "tử"
      ) {
        continue; // Skip generic Vietnamese filler words
      }
      if (combinedQuery.includes(token)) {
        return { id: src.id, name: src.sourceName };
      }
    }
  }

  // Step 2: Brand Alias Matching (Find user source or default source matching brand aliases)
  for (const [brandKey, aliases] of Object.entries(BRAND_ALIASES)) {
    const isMatchedInQuery = aliases.some((alias) => {
      const regex = new RegExp(`\\b${alias.replace(/\s+/g, "\\s*")}\\b`, "i");
      return regex.test(combinedQuery);
    });

    if (isMatchedInQuery) {
      const matchedSource = existingSources.find((src) => {
        const nameLower = normalizeText(src.sourceName);
        return aliases.some((alias) => nameLower.includes(alias) || nameLower.includes(brandKey));
      });

      if (matchedSource) {
        return { id: matchedSource.id, name: matchedSource.sourceName };
      }
    }
  }

  // Step 3: Generic Category Fallback (Bank vs Wallet vs Cash)
  const isBankTerm = /vcb|vietcombank|mbbank|mb|tpb|tpbank|bidv|tcb|techcombank|acb|sacombank|vpbank|agribank|ngân hàng|bank|thẻ|atm|chuyển khoản|ck/i.test(combinedQuery);
  if (isBankTerm) {
    const bankSource =
      existingSources.find((src) => /ngân hàng|bank|tài khoản|thẻ|atm/i.test(normalizeText(src.sourceName))) ||
      existingSources.find((src) => !/tiền mặt|cash/i.test(normalizeText(src.sourceName)));
    if (bankSource) return { id: bankSource.id, name: bankSource.sourceName };
  }

  const isWalletTerm = /momo|zalopay|viettel|shopeepay|ví|wallet/i.test(combinedQuery);
  if (isWalletTerm) {
    const walletSource =
      existingSources.find((src) => /ví|wallet|e-wallet/i.test(normalizeText(src.sourceName))) ||
      existingSources.find((src) => !/tiền mặt|cash/i.test(normalizeText(src.sourceName)));
    if (walletSource) return { id: walletSource.id, name: walletSource.sourceName };
  }

  const isCashTerm = /tiền mặt|cash|tiền tươi/i.test(combinedQuery);
  if (isCashTerm) {
    const cashSource = existingSources.find((src) => /tiền mặt|cash/i.test(normalizeText(src.sourceName)));
    if (cashSource) return { id: cashSource.id, name: cashSource.sourceName };
  }

  // Step 4: Final Fallback -> Default Cash source or first source
  const cashFallback = existingSources.find((src) => /tiền mặt|cash/i.test(normalizeText(src.sourceName))) || existingSources[0];
  return { id: cashFallback.id, name: cashFallback.sourceName };
}

/**
 * Smart Category Resolver: Matches ONLY existing data in database. NEVER creates new categories!
 */
async function resolveCategory(userId: string, categoryNameRaw?: string | null) {
  const existingCategories = await prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
  });

  if (existingCategories.length === 0) {
    return { id: null, name: "Chưa phân loại" };
  }

  const c = normalizeText(categoryNameRaw);

  if (!c) {
    const defaultUncategorized = existingCategories.find((cat) =>
      /chưa phân loại|khác|general/i.test(normalizeText(cat.categoryName))
    );
    return {
      id: defaultUncategorized?.id || existingCategories[0].id,
      name: defaultUncategorized?.categoryName || existingCategories[0].categoryName,
    };
  }

  // 1. Direct or Partial Match
  const directMatch = existingCategories.find((cat) => {
    const nameLower = normalizeText(cat.categoryName);
    return nameLower.includes(c) || c.includes(nameLower);
  });
  if (directMatch) return { id: directMatch.id, name: directMatch.categoryName };

  // 2. Category Synonyms
  if (/lương|thu nhập|thưởng|báo hiếu/i.test(c)) {
    const found = existingCategories.find((cat) => /lương|thu nhập|thưởng/i.test(normalizeText(cat.categoryName)));
    if (found) return { id: found.id, name: found.categoryName };
  }

  if (/ăn|uống|cơm|phở|bún|cafe|cà phê|trà sữa|nhà hàng|bánh/i.test(c)) {
    const found = existingCategories.find((cat) => /ăn uống|ăn|thực phẩm/i.test(normalizeText(cat.categoryName)));
    if (found) return { id: found.id, name: found.categoryName };
  }

  if (/hóa đơn|điện|nước|mạng|wifi|sinh hoạt|tiền nhà/i.test(c)) {
    const found = existingCategories.find((cat) => /sinh hoạt|hóa đơn|tiện ích/i.test(normalizeText(cat.categoryName)));
    if (found) return { id: found.id, name: found.categoryName };
  }

  if (/mua|sắm|quần áo|đồ/i.test(c)) {
    const found = existingCategories.find((cat) => /mua sắm|tiêu dùng/i.test(normalizeText(cat.categoryName)));
    if (found) return { id: found.id, name: found.categoryName };
  }

  if (/xăng|xe|grab|taxi|di chuyển/i.test(c)) {
    const found = existingCategories.find((cat) => /di chuyển|giao thông|xe/i.test(cat.categoryName));
    if (found) return { id: found.id, name: found.categoryName };
  }

  // 3. STRICT FALLBACK: Pick existing "Chưa phân loại" or first existing category (NEVER CREATE)
  const fallback =
    existingCategories.find((cat) => /chưa phân loại|khác|general/i.test(cat.categoryName)) ||
    existingCategories[0];

  return { id: fallback.id, name: fallback.categoryName };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, selectedIntent, confirmSave, pendingData } = await req.json();

    // 1. CONFIRMATION SAVE EXECUTION (Save to DB when user clicks "Xác nhận & Lưu")
    if (confirmSave && pendingData) {
      const userId = session.user.id;

      if (pendingData.intent === "CASHFLOW") {
        const isExpense = pendingData.cashType !== "Income";
        const amountOfMoney = Number(pendingData.amountOfMoney) || 50000;

        const cashFlow = await prisma.cashFlow.create({
          data: {
            userId: userId,
            title: pendingData.title || (isExpense ? "Khoản chi từ AI Bot" : "Khoản thu từ AI Bot"),
            cashType: isExpense ? "Expense" : "Income",
            amountOfMoney: amountOfMoney,
            sourceId: pendingData.sourceId || null,
            primaryCategoryId: pendingData.categoryId || null,
            description: pendingData.description || "Ghi nhận qua Trợ Lý AI Chat",
            datetime: new Date(),
          },
        });

        // Synchronize liquid asset balance in Wealth Management (same as /api/cashflow route)
        const delta = isExpense ? -amountOfMoney : amountOfMoney;
        await adjustLiquidAssetBalance(userId, delta, pendingData.sourceId || null);

        const formattedAmount = amountOfMoney.toLocaleString("vi-VN");
        const typeLabel = isExpense ? "Chi tiêu" : "Thu nhập";

        return NextResponse.json({
          ok: true,
          confirmed: true,
          intent: "CASHFLOW",
          replyText: `✅ Đã lưu thành công giao dịch **${typeLabel}**: **${formattedAmount} đ** cho "*${cashFlow.title}*" (Nguồn: ${pendingData.sourceName}, Danh mục: ${pendingData.categoryName})`,
          createdData: {
            id: cashFlow.id,
            title: cashFlow.title,
            amountOfMoney: cashFlow.amountOfMoney,
            cashType: cashFlow.cashType,
            sourceName: pendingData.sourceName,
            categoryName: pendingData.categoryName,
          },
        });
      }

      if (pendingData.intent === "NOTE") {
        const note = await prisma.note.create({
          data: {
            userId: userId,
            title: pendingData.noteTitle || "Ghi chú từ AI Bot",
            content: pendingData.noteContent || "Nội dung ghi chú",
          },
        });

        return NextResponse.json({
          ok: true,
          confirmed: true,
          intent: "NOTE",
          replyText: `📝 Đã lưu ghi chú mới "*${note.title}*": "${note.content}"`,
          createdData: note,
        });
      }

      if (pendingData.intent === "CALENDAR") {
        let eventDate = new Date();
        if (pendingData.calendarDate) {
          const d = new Date(pendingData.calendarDate);
          if (!isNaN(d.getTime())) eventDate = d;
        }

        const plan = await prisma.calendarPlan.create({
          data: {
            userId: userId,
            title: pendingData.calendarTitle || "Lịch hẹn từ AI Bot",
            content: pendingData.calendarContent || pendingData.calendarTitle || "Nội dung công việc",
            date: eventDate,
            status: 0,
          },
        });

        const dateStr = eventDate.toLocaleDateString("vi-VN", {
          weekday: "short",
          day: "numeric",
          month: "numeric",
          year: "numeric",
        });

        return NextResponse.json({
          ok: true,
          confirmed: true,
          intent: "CALENDAR",
          replyText: `📅 Đã lưu lịch hẹn "*${plan.title}*" vào ngày **${dateStr}**`,
          createdData: plan,
        });
      }
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const text = message.trim();
    const userId = session.user.id;

    // 2. PARSE NATURAL COMMAND FOR PREVIEW (NON-DESTRUCTIVE STEP)
    const parsed = await parseMessageWithAI(text, new Date().toISOString(), selectedIntent);

    // CASHFLOW PREVIEW
    if (parsed.intent === "CASHFLOW") {
      const amountOfMoney = parsed.amountOfMoney && parsed.amountOfMoney > 0 ? parsed.amountOfMoney : 50000;
      const sourceInfo = await resolveSource(userId, parsed.sourceName, text);
      const isExpense = parsed.cashType !== "Income";

      // Extract description from parentheses if present and capitalize first letter
      let description = parsed.description;
      const parenMatch = text.match(/\(([^)]+)\)/);
      if (parenMatch) {
        description = parenMatch[1].trim();
      }
      if (description) {
        description = capitalizeFirstLetter(description);
      }

      // Clean title by stripping parenthesized text and capitalize first letter
      let cleanTitle = (parsed.title || (isExpense ? "Khoản chi mới" : "Khoản thu mới"))
        .replace(/\([^)]*\)/g, "")
        .trim();
      if (!cleanTitle) cleanTitle = isExpense ? "Khoản chi mới" : "Khoản thu mới";
      cleanTitle = capitalizeFirstLetter(cleanTitle);

      // Include specific bank/wallet tag in display name for maximum clarity
      let displaySourceName = sourceInfo.name;
      const recognizedTag = (parsed.sourceName || text.match(/\b(tpbank|tpb|vcb|vietcombank|mbbank|mb|bidv|tcb|techcombank|acb|sacombank|momo|zalopay)\b/i)?.[0])?.toUpperCase();
      if (recognizedTag && !sourceInfo.name.toUpperCase().includes(recognizedTag)) {
        displaySourceName = `${sourceInfo.name} (${recognizedTag})`;
      }

      const previewData = {
        intent: "CASHFLOW",
        cashType: isExpense ? "Expense" : "Income",
        amountOfMoney: amountOfMoney,
        title: cleanTitle,
        sourceId: sourceInfo.id,
        sourceName: displaySourceName,
        categoryId: null,
        categoryName: null,
        description: description || "Ghi nhận từ Trợ lý AI",
      };

      const formattedAmount = amountOfMoney.toLocaleString("vi-VN");
      const typeLabel = isExpense ? "Chi tiêu" : "Thu nhập";
      const hasDescription = description && !description.startsWith("Ghi nhận");

      return NextResponse.json({
        ok: true,
        previewOnly: true,
        intent: "CASHFLOW",
        replyText: `🔍 **Xác Nhận Giao Dịch**\n• Loại: **${typeLabel}**\n• Số tiền: **${formattedAmount} đ**\n• Tên giao dịch: "*${cleanTitle}*"${hasDescription ? `\n• Mô tả: "*${description}*"` : ""}\n• Nguồn tiền: **${displaySourceName}**`,
        parsedData: previewData,
      });
    }

    // NOTE PREVIEW
    if (parsed.intent === "NOTE" && (parsed.noteTitle || parsed.noteContent || text)) {
      const rawNote = text.replace(/^(note:|ghi chú:|ghichu:|ghi:|lưu:)\s*/i, "").trim();
      const parenMatch = rawNote.match(/\(([^)]+)\)/);

      let noteTitle = parsed.noteTitle || rawNote;
      let noteContent = parsed.noteContent || rawNote;

      if (parenMatch) {
        noteContent = parenMatch[1].trim();
        noteTitle = rawNote.replace(/\([^)]*\)/g, "").trim();
      }

      noteTitle = capitalizeFirstLetter(noteTitle || "Ghi chú mới");
      noteContent = capitalizeFirstLetter(noteContent || noteTitle);

      const previewData = {
        intent: "NOTE",
        noteTitle: noteTitle,
        noteContent: noteContent,
      };

      return NextResponse.json({
        ok: true,
        previewOnly: true,
        intent: "NOTE",
        replyText: `🔍 **Xác Nhận Ghi Chú**\n• Tiêu đề: "*${previewData.noteTitle}*"\n• Nội dung: "${previewData.noteContent}"`,
        parsedData: previewData,
      });
    }

    // CALENDAR PREVIEW
    if (parsed.intent === "CALENDAR") {
      const calendarTitle = cleanCalendarTitle(text);
      const dateStrISO = calculateCalendarDate(text, new Date().toISOString());

      let eventDate = new Date();
      if (dateStrISO) {
        const parsedD = new Date(dateStrISO);
        if (!isNaN(parsedD.getTime())) eventDate = parsedD;
      }

      const dateStr = eventDate.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        year: "numeric",
      });

      const previewData = {
        intent: "CALENDAR",
        calendarTitle: calendarTitle,
        calendarContent: capitalizeFirstLetter(parsed.calendarContent || text),
        calendarDate: eventDate.toISOString().split("T")[0],
      };

      return NextResponse.json({
        ok: true,
        previewOnly: true,
        intent: "CALENDAR",
        replyText: `🔍 **Xác Nhận Lịch Công Việc**\n• Công việc: "*${calendarTitle}*"\n• Ngày thực hiện: **${dateStr}**`,
        parsedData: previewData,
      });
    }

    // UNKNOWN INTENT
    return NextResponse.json({
      ok: true,
      intent: "UNKNOWN",
      replyText:
        "🤖 Tôi chưa hiểu rõ yêu cầu của bạn. Bạn có thể thử các câu lệnh mẫu sau:\n" +
        "• *'Chi 50k ăn phở tiền mặt'*\n" +
        "• *'Thu 15tr tiền lương VCB'*\n" +
        "• *'Ghi chú: Mật khẩu wifi là 123456'*\n" +
        "• *'Lịch: Mai 14h họp team'*",
    });
  } catch (error) {
    console.error("[Chat Assistant API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

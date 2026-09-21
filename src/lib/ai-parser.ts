/**
 * AI Parser using Google Gemini 1.5 Flash API
 * Acts as an AI Normalizer Engine: converts unstructured user Vietnamese input into a machine-readable JSON schema.
 */

export interface ParsedCommand {
  intent: "CASHFLOW" | "NOTE" | "CALENDAR" | "UNKNOWN";
  // CashFlow fields
  cashType?: "Expense" | "Income";
  amountOfMoney?: number;
  title?: string;
  sourceName?: string;
  categoryName?: string;
  description?: string;
  // Note fields
  noteTitle?: string;
  noteContent?: string;
  // Calendar fields
  calendarTitle?: string;
  calendarContent?: string;
  calendarDate?: string; // YYYY-MM-DD or ISO string
  explanation?: string;
}

export function capitalizeFirstLetter(text?: string | null): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function cleanCalendarTitle(text: string): string {
  let cleaned = text
    .replace(/^(tạo lịch:|tạo lịch|lịch:|lịch hẹn:|plan:|hẹn:|nhắc:|nhắc lịch:)\s*/i, "")
    .replace(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?:?\s*/i, "")
    .replace(/\b(thứ\s*([2-7]|hai|ba|tư|bốn|năm|sáu|bảy)|t[2-7]|chủ\s*nhật|cn)\s*(tuần\s*(sau|tới|này)|sang\s*tuần|này)?\b/gi, "")
    .replace(/\b(hôm qua|hôm nay|ngày mai|mai|ngày kia|mốt|cuối tuần|sang tuần|tuần sau|tuần tới|tuần này)\b/gi, "")
    .replace(/\b(sáng|chiều|tối|đêm)\s*(nay|mai|qua)?\b/gi, "")
    .replace(/\b\d{1,2}h(\d{1,2})?\b/gi, "")
    .replace(/\b\d{1,2}:\d{2}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return capitalizeFirstLetter(cleaned || text);
}

export function calculateCalendarDate(text: string, currentTimeISO: string): string {
  const lower = text.toLowerCase();
  let targetDate = new Date(currentTimeISO);

  // 1. Check explicit date format: DD/MM or DD/MM/YYYY or DD-MM
  const explicitDateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i);
  if (explicitDateMatch) {
    const day = parseInt(explicitDateMatch[1], 10);
    const month = parseInt(explicitDateMatch[2], 10) - 1;
    const currentYear = targetDate.getFullYear();
    const year = explicitDateMatch[3] ? parseInt(explicitDateMatch[3], 10) : currentYear;
    const fullYear = year < 100 ? 2000 + year : year;
    const dateObj = new Date(fullYear, month, day, 12, 0, 0);
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split("T")[0];
  }

  // 2. Check Weekday Pattern: "thứ 2 tuần sau", "thứ 3 tuần tới", "t2 tuần sau", "chủ nhật tuần này", "thứ 5"
  const weekdayMatch = lower.match(/(thứ\s*([2-7]|hai|ba|tư|bốn|năm|sáu|bảy)|t([2-7])|chủ\s*nhật|cn)\s*(tuần\s*(sau|tới|này)|sang\s*tuần|này)?/i);
  if (weekdayMatch) {
    const rawDay = (weekdayMatch[2] || weekdayMatch[3] || weekdayMatch[1]).trim().toLowerCase();
    const isNextWeek = lower.includes("tuần sau") || lower.includes("tuần tới") || lower.includes("sang tuần");

    // Map weekday to JS day index (Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6)
    let targetDayInJS = 1; // Default Monday
    if (rawDay === "2" || rawDay === "hai") targetDayInJS = 1;
    else if (rawDay === "3" || rawDay === "ba") targetDayInJS = 2;
    else if (rawDay === "4" || rawDay === "tư" || rawDay === "bốn") targetDayInJS = 3;
    else if (rawDay === "5" || rawDay === "năm") targetDayInJS = 4;
    else if (rawDay === "6" || rawDay === "sáu") targetDayInJS = 5;
    else if (rawDay === "7" || rawDay === "bảy") targetDayInJS = 6;
    else if (rawDay.includes("chủ") || rawDay === "cn") targetDayInJS = 0;

    const currentDayInJS = targetDate.getDay();
    const daysUntilThisWeekDay = (targetDayInJS - currentDayInJS + 7) % 7;

    let daysToAdd = 0;
    if (isNextWeek) {
      daysToAdd = daysUntilThisWeekDay === 0 ? 7 : daysUntilThisWeekDay + 7;
    } else {
      daysToAdd = daysUntilThisWeekDay;
    }

    targetDate.setDate(targetDate.getDate() + daysToAdd);
    return targetDate.toISOString().split("T")[0];
  }

  // 3. Check Relative Days: hôm qua, ngày mai, ngày kia...
  if (lower.includes("hôm qua")) {
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (lower.includes("mai") || lower.includes("ngày mai")) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lower.includes("ngày kia") || lower.includes("mốt") || lower.includes("ngày mốt")) {
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (lower.includes("tuần sau") || lower.includes("tuần tới") || lower.includes("sang tuần")) {
    targetDate.setDate(targetDate.getDate() + 7);
  }

  return targetDate.toISOString().split("T")[0];
}

const SYSTEM_PROMPT = `
Bạn là Bộ Chuẩn Hóa Cú Pháp AI (AI Normalizer Engine) cho ứng dụng quản lý cá nhân "MyNOTE".
Nhiệm vụ của bạn là đọc cú pháp tiếng Việt bất kỳ do người dùng nhập vào, phân tích ý định (Intent) và chuyển đổi nó thành CÚ PHÁP CHUẨN ĐỊNH DẠNG JSON mà hệ thống backend của máy có thể xử lý chính xác 100%.

QUY TẮC CHUẨN HÓA CÚ PHÁP (NORMALIZATION RULES):

1. "CALENDAR" (Lịch Hẹn & Công Việc):
   - Áp dụng khi tin nhắn đề cập đến công việc, cuộc họp, lịch hẹn, nhắc nhở, thời gian làm gì.
   - BÓC TÁCH TÊN HÀNH ĐỘNG VÀ TÍNH NGÀY THỰC HIỆN:
     • calendarTitle: BẮT BUỘC BÓC TÁCH LOẠI BỎ hoàn toàn các cụm từ chỉ thời gian (như "Thứ 2 tuần sau", "thứ 5", "hôm qua", "hôm nay", "ngày mai", "mai", "chiều nay", "20/9", "14h"...).
     • Tự động viết hoa chữ cái đầu tiên của hành động.
     • calendarDate: Tính toán ngày chính xác dạng YYYY-MM-DD dựa trên thời gian thực tế ("Thứ 2 tuần sau" = Thứ 2 của tuần tiếp theo, "hôm qua" = ngày hiện tại trừ 1 ngày, "mai" = ngày hiện tại cộng 1 ngày).
     Ví dụ: "Thứ 2 tuần sau đi học thêm" -> calendarTitle: "Đi học thêm", calendarDate: "2026-09-28".
     Ví dụ: "hôm qua đi họp phụ huynh cho cherry" -> calendarTitle: "Đi họp phụ huynh cho cherry", calendarDate: "2026-09-20".
   - Chuẩn hóa đầu ra (Normalized Schema):
     • intent: "CALENDAR"
     • calendarTitle: Tiêu đề hành động làm sạch (Bóc tách bỏ từ chỉ thời gian, tự động viết hoa chữ cái đầu).
     • calendarContent: Nội dung câu nhắn ban đầu.
     • calendarDate: Chuỗi ngày dạng YYYY-MM-DD. Tính toán chính xác dựa trên "Hôm nay" được cung cấp.

2. "CASHFLOW" (Thu & Chi Tiền Bạc):
   - Áp dụng khi tin nhắn đề cập đến việc chi tiêu, thu nhập, trả tiền, nhận tiền, chuyển khoản, mua sắm hoặc có số tiền kèm đơn vị tiền tệ (k, tr, triệu, nghìn, đ, vnd).
   - CHÚ Ý VỀ NGUỒN TIỀN, DANH MỤC VÀ MÔ TẢ TRONG NGOẶC:
     • Trích xuất nguồn tiền (sourceName) nếu được đề cập: "tpbank", "vcb", "momo", "zalopay", "mb", "vietcombank", "tiền mặt"...
     • Trích xuất nhãn danh mục (categoryName) dựa trên hành động/đồ mua: "bánh", "phở", "cơm", "tiền điện", "lương", "áo"...
     • TRÍCH XUẤT MÔ TẢ TRONG NGOẶC: Nếu tin nhắn chứa đoạn trong ngoặc đơn (...) (VD: "50k ăn bún đậu (bún đậu nhà mình) tpbank"), trích xuất nội dung trong ngoặc làm description (VD: description: "bún đậu nhà mình").
     • Tiêu đề (title) PHẢI LÀM SẠCH: Loại bỏ số tiền, tên nguồn tiền VÀ BỎ ĐOẠN NGOẶC ĐƠN (...) khỏi tiêu đề (VD: "50k ăn bún đậu (bún đậu nhà mình) tpbank" -> title: "Ăn bún đậu", description: "bún đậu nhà mình", sourceName: "tpbank", amountOfMoney: 50000).
   - Chuẩn hóa đầu ra (Normalized Schema):
     • intent: "CASHFLOW"
     • cashType: "Expense" (chi/trả/mua) hoặc "Income" (thu/nhận/lương/thưởng).
     • amountOfMoney: Giá trị số tiền dạng number thuần (VD: 40k -> 40000, 15tr -> 15000000).
     • title: Tên làm sạch của khoản thu/chi (VD: "Ăn bún đậu", "Ăn phở").
     • sourceName: Nguồn tiền nếu có ("tpbank", "vcb", "momo", "tiền mặt"...) hoặc null.
     • categoryName: Gợi ý danh mục ("bánh", "ăn uống", "lương"...) hoặc null.
     • description: Nội dung mô tả (nếu có đoạn trong ngoặc (...) hoặc mô tả chi tiết).

3. "NOTE" (Ghi Chú & Lưu Trữ):
   - Áp dụng khi tin nhắn cần ghi nhớ thông tin, lưu trữ mật khẩu, mã số, địa chỉ, ý tưởng, danh sách.
   - BÓC TÁCH TIÊU ĐỀ VÀ NỘI DUNG:
     • Nếu tin nhắn có đoạn trong ngoặc đơn (...) (VD: "Tạo gem lật sử (đâu là mô tả)"):
       - noteTitle: Tiêu đề bóc tách BỎ ĐOẠN NGOẶC ĐƠN (...), tự động viết hoa chữ cái đầu (VD: "Tạo gem lật sử").
       - noteContent: Nội dung lấy ĐOẠN BÊN TRONG NGOẶC ĐƠN (...), tự động viết hoa chữ cái đầu (VD: "Đâu là mô tả").
     • Nếu không chứa ngoặc đơn (...):
       - Cả noteTitle và noteContent đều là nội dung tin nhắn ban đầu, tự động viết hoa chữ cái đầu (VD: noteTitle: "Pass wifi là 123456", noteContent: "Pass wifi là 123456").
   - Chuẩn hóa đầu ra (Normalized Schema):
     • intent: "NOTE"
     • noteTitle: Tiêu đề ghi chú làm sạch (tự động viết hoa chữ cái đầu).
     • noteContent: Nội dung ghi chú (tự động viết hoa chữ cái đầu).

4. "UNKNOWN":
   - Chỉ trả về khi câu nhắn chỉ là lời chào hỏi xã giao (VD: "Chào bot", "Hello") không chứa thông tin công việc, tiền bạc hay ghi chú.

YÊU CẦU ĐẦU RA: Trả về ĐÚNG 1 đối tượng JSON duy nhất theo schema trên.
`;

export async function parseMessageWithAI(
  messageText: string,
  userCurrentTimeISO: string = new Date().toISOString(),
  forcedIntent?: "CASHFLOW" | "NOTE" | "CALENDAR" | "AUTO"
): Promise<ParsedCommand> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (GEMINI_API_KEY) {
    let prompt = `Hôm nay là: ${userCurrentTimeISO}.\nNội dung người dùng nhập vào: "${messageText}"`;
    if (forcedIntent && forcedIntent !== "AUTO") {
      prompt += `\n\nLƯU Ý QUAN TRỌNG: Người dùng đã chủ động chọn chế độ: "${forcedIntent}". Bạn BẮT BUỘC phải gán intent: "${forcedIntent}" và bóc tách các trường tương ứng cho chế độ này.`;
    }

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-2.0-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-flash",
    ];

    for (const modelName of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }],
              },
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.1,
              },
            }),
          }
        );

        const data = await response.json();
        if (response.ok) {
          let rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJsonText) {
            rawJsonText = rawJsonText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
            const parsed: ParsedCommand = JSON.parse(rawJsonText);
            if (parsed.intent) {
              if (forcedIntent && forcedIntent !== "AUTO") {
                parsed.intent = forcedIntent;
              }
              return parsed;
            }
          }
        } else {
          if (response.status !== 404) {
            console.error(`[AI Normalizer] Gemini API Error (${modelName}):`, response.status, JSON.stringify(data));
          }
        }
      } catch (error) {
        console.error(`[AI Normalizer] Gemini API Fetch Exception (${modelName}):`, error);
      }
    }
  } else {
    console.warn("[AI Normalizer] GEMINI_API_KEY is missing in process.env. Using context-aware fallback parser.");
  }

  // Fallback Context-Aware Parser if API key missing or network fails
  return fallbackContextParser(messageText, userCurrentTimeISO, forcedIntent);
}

/**
 * Smart Context-Aware Fallback Parser with Source & Category Regex Extraction
 */
function fallbackContextParser(
  text: string,
  currentTimeISO: string,
  forcedIntent?: "CASHFLOW" | "NOTE" | "CALENDAR" | "AUTO"
): ParsedCommand {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 0. FORCED INTENTS HANDLER
  if (forcedIntent === "CASHFLOW") {
    const explicitCurrencyMatch = lower.match(/(\d+[\d.,]*)\s*(k|củ|tr|m|triệu|nghìn|đ|vnd)?\b/i);
    let amount = 0;
    if (explicitCurrencyMatch) {
      let rawNum = parseFloat(explicitCurrencyMatch[1].replace(/,/g, "."));
      const unit = (explicitCurrencyMatch[2] || "").toLowerCase();
      if (unit === "k" || unit === "nghìn") rawNum *= 1000;
      else if (unit === "tr" || unit === "m" || unit === "triệu" || unit === "củ") rawNum *= 1000000;
      else if (!unit && rawNum < 1000) rawNum *= 1000;
      amount = rawNum;
    }

    const sourcePatterns = ["tpbank", "tpb", "vcb", "vietcombank", "momo", "zalopay", "mbbank", "mb", "bidv", "tcb", "techcombank", "acb", "sacombank", "tiền mặt"];
    let extractedSource: string | undefined = undefined;
    for (const pat of sourcePatterns) {
      if (lower.includes(pat)) {
        extractedSource = pat;
        break;
      }
    }

    const isIncome = lower.startsWith("thu ") || lower.includes("nhận lương") || lower.includes("thưởng");

    let extractedDesc: string | undefined = undefined;
    const parenMatch = clean.match(/\(([^)]+)\)/);
    if (parenMatch) {
      extractedDesc = capitalizeFirstLetter(parenMatch[1]);
    }

    let cleanTitle = clean
      .replace(/\([^)]*\)/g, "")
      .replace(/^(chi|thu|trả|mua|đóng)\s+/i, "")
      .replace(/(\d+[\d.,]*)\s*(k|củ|tr|m|triệu|nghìn|đ|vnd)?/gi, "")
      .replace(/\bhết\b/gi, "")
      .replace(new RegExp(`\\b(${sourcePatterns.join("|")})\\b`, "gi"), "")
      .trim();

    if (!cleanTitle) cleanTitle = isIncome ? "Khoản thu mới" : "Khoản chi mới";
    else cleanTitle = capitalizeFirstLetter(cleanTitle);

    const categoryHint = cleanTitle.split(" ")[0];

    return {
      intent: "CASHFLOW",
      cashType: isIncome ? "Income" : "Expense",
      amountOfMoney: amount > 0 ? amount : 50000,
      title: cleanTitle,
      sourceName: extractedSource,
      categoryName: categoryHint,
      description: extractedDesc || "Ghi nhận qua Trợ Lý AI (Chế độ Thu/Chi)",
    };
  }

  if (forcedIntent === "NOTE") {
    const rawNote = clean.replace(/^(note:|ghi chú:|ghichu:|ghi:|lưu:)\s*/i, "").trim();
    const parenMatch = rawNote.match(/\(([^)]+)\)/);
    let noteTitle = rawNote;
    let noteContent = rawNote;

    if (parenMatch) {
      noteContent = parenMatch[1].trim();
      noteTitle = rawNote.replace(/\([^)]*\)/g, "").trim();
    }

    noteTitle = capitalizeFirstLetter(noteTitle || "Ghi chú mới");
    noteContent = capitalizeFirstLetter(noteContent || noteTitle);

    return {
      intent: "NOTE",
      noteTitle,
      noteContent,
    };
  }

  if (forcedIntent === "CALENDAR") {
    const calendarTitle = cleanCalendarTitle(clean);
    const calendarDate = calculateCalendarDate(clean, currentTimeISO);
    return {
      intent: "CALENDAR",
      calendarTitle,
      calendarContent: capitalizeFirstLetter(clean),
      calendarDate,
    };
  }

  // 1. DATE FORMAT DETECTION (e.g., "20/9:", "20/09/2026", "20-9", "15/10")
  const datePatternRegex = /^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?:?\s*(.*)$/i;
  const dateMatch = clean.match(datePatternRegex);

  if (dateMatch) {
    const calendarTitle = cleanCalendarTitle(clean);
    const calendarDate = calculateCalendarDate(clean, currentTimeISO);

    return {
      intent: "CALENDAR",
      calendarTitle,
      calendarContent: capitalizeFirstLetter(clean),
      calendarDate,
    };
  }

  // 2. CALENDAR Check: Contains event/time/action keywords (họp, hẹn, nhắc, lịch, mai, hôm nay, hôm qua, thứ, tuần, đi, phỏng vấn, đón, gặp...)
  const isCalendar =
    lower.includes("lịch") ||
    lower.includes("họp") ||
    lower.includes("hẹn") ||
    lower.includes("nhắc") ||
    lower.includes("phỏng vấn") ||
    lower.includes("đón ") ||
    lower.includes("gặp ") ||
    lower.includes("đi ") ||
    lower.includes("hôm qua") ||
    lower.includes("hôm nay") ||
    lower.includes("tuần") ||
    lower.includes("thứ") ||
    /\bt[2-7]\b/i.test(lower) ||
    lower.includes("chủ nhật") ||
    /\bcn\b/i.test(lower) ||
    lower.startsWith("mai ") ||
    lower.startsWith("hôm nay ");

  if (isCalendar) {
    const calendarTitle = cleanCalendarTitle(clean);
    const calendarDate = calculateCalendarDate(clean, currentTimeISO);

    return {
      intent: "CALENDAR",
      calendarTitle,
      calendarContent: capitalizeFirstLetter(clean),
      calendarDate,
    };
  }

  // 3. NOTE Check: Information storage, notes, passwords
  const isNote =
    lower.includes("mật khẩu") ||
    lower.includes("tài khoản") ||
    lower.includes("danh sách") ||
    lower.includes("ghi nhớ") ||
    lower.includes("mã ") ||
    lower.includes("note") ||
    lower.includes("lưu ");

  if (isNote) {
    const rawNote = clean.replace(/^(note:|ghi chú:|ghichu:|ghi:|lưu:)\s*/i, "").trim();
    const parenMatch = rawNote.match(/\(([^)]+)\)/);
    let noteTitle = rawNote;
    let noteContent = rawNote;

    if (parenMatch) {
      noteContent = parenMatch[1].trim();
      noteTitle = rawNote.replace(/\([^)]*\)/g, "").trim();
    }

    noteTitle = capitalizeFirstLetter(noteTitle || "Ghi chú mới");
    noteContent = capitalizeFirstLetter(noteContent || noteTitle);

    return {
      intent: "NOTE",
      noteTitle,
      noteContent,
    };
  }

  // 4. CASHFLOW Check: CASHFLOW intent extraction
  const explicitCurrencyMatch = lower.match(/(\d+[\d.,]*)\s*(k|củ|tr|m|triệu|nghìn|đ|vnd)\b/i);
  const isIncome = lower.startsWith("thu ") || lower.includes("nhận lương") || lower.includes("thưởng");
  const isExpense = lower.startsWith("chi ") || lower.startsWith("trả ") || lower.startsWith("mua ") || lower.includes("tiền") || lower.includes("hết") || lower.includes("chuyển khoản");

  if (explicitCurrencyMatch || isIncome || isExpense) {
    let amount = 0;
    if (explicitCurrencyMatch) {
      let rawNum = parseFloat(explicitCurrencyMatch[1].replace(/,/g, "."));
      const unit = explicitCurrencyMatch[2].toLowerCase();
      if (unit === "k" || unit === "nghìn") rawNum *= 1000;
      else if (unit === "tr" || unit === "m" || unit === "triệu" || unit === "củ") rawNum *= 1000000;
      amount = rawNum;
    }

    // Extract Source Name from text (e.g. tpbank, vcb, momo, zalopay, vietcombank, mbbank, tiền mặt)
    let extractedSource: string | undefined = undefined;
    const sourcePatterns = ["tpbank", "tpb", "vcb", "vietcombank", "momo", "zalopay", "mbbank", "mb", "bidv", "tcb", "techcombank", "acb", "sacombank", "tiền mặt", "vcb"];
    for (const pat of sourcePatterns) {
      if (lower.includes(pat)) {
        extractedSource = pat;
        break;
      }
    }

    let extractedDesc: string | undefined = undefined;
    const parenMatch = clean.match(/\(([^)]+)\)/);
    if (parenMatch) {
      extractedDesc = parenMatch[1].trim();
    }

    // Clean Title (Remove amount, source name, "hết", "mua", parenthesized text)
    let cleanTitle = clean
      .replace(/\([^)]*\)/g, "")
      .replace(/^(chi|thu|trả|mua|đóng)\s+/i, "")
      .replace(/(\d+[\d.,]*)\s*(k|củ|tr|m|triệu|nghìn|đ|vnd)?/gi, "")
      .replace(/\bhết\b/gi, "")
      .replace(new RegExp(`\\b(${sourcePatterns.join("|")})\\b`, "gi"), "")
      .trim();

    if (!cleanTitle) {
      cleanTitle = isIncome ? "Khoản thu mới" : "Khoản chi mới";
    } else {
      // Capitalize first letter
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }

    // Extract Category hint from clean title (e.g. "bánh", "phở", "lương")
    const categoryHint = cleanTitle.split(" ")[0];

    return {
      intent: "CASHFLOW",
      cashType: isIncome ? "Income" : "Expense",
      amountOfMoney: amount > 0 ? amount : 50000,
      title: cleanTitle,
      sourceName: extractedSource,
      categoryName: categoryHint,
      description: extractedDesc || "Ghi nhận tự động từ Trợ Lý AI",
    };
  }

  // 5. Default Fallback for any non-greeting sentence -> CALENDAR
  const isGreetingOnly = /^(chào|hi|hello|cảm ơn|thanks|tạm biệt)$/i.test(clean);
  if (!isGreetingOnly) {
    return {
      intent: "CALENDAR",
      calendarTitle: cleanCalendarTitle(clean),
      calendarContent: capitalizeFirstLetter(clean),
      calendarDate: calculateCalendarDate(clean, currentTimeISO),
    };
  }

  return {
    intent: "UNKNOWN",
    explanation: "Câu chào xã giao.",
  };
}


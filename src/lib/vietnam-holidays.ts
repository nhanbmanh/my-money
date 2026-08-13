import { getLunarDate } from "./lunar-calendar";

export interface SpecialDayInfo {
  name: string;
  nameEn: string;
  type: "solar" | "lunar" | "birthday";
  description: string;
  descriptionEn: string;
  iconType: "gold_star" | "blue_star";
}

// Fixed Solar Holidays & Special Observances (Key: "DD/MM")
const SOLAR_HOLIDAYS: Record<string, Omit<SpecialDayInfo, "type" | "iconType">> = {
  "01/01": {
    name: "Tết Dương Lịch",
    nameEn: "New Year's Day",
    description: "Ngày đầu tiên của năm mới Dương lịch (Ngày lễ nghỉ chính thức).",
    descriptionEn: "The first day of the Solar New Year (Official Public Holiday).",
  },
  "14/02": {
    name: "Ngày Lễ Tình Yêu (Valentine)",
    nameEn: "Valentine's Day",
    description: "Ngày lễ tình yêu dành cho các cặp đôi trên toàn thế giới.",
    descriptionEn: "Worldwide celebration of love and romance.",
  },
  "08/03": {
    name: "Ngày Quốc Tế Phụ Nữ",
    nameEn: "International Women's Day",
    description: "Tôn vinh những đóng góp và giá trị của phụ nữ trên thế giới.",
    descriptionEn: "Honoring the achievements and contributions of women.",
  },
  "26/03": {
    name: "Ngày Thành Lập Đoàn TNCS Hồ Chí Minh",
    nameEn: "Ho Chi Minh Youth Union Founding Day",
    description: "Kỷ niệm ngày thành lập Đoàn Thanh niên Cộng sản Hồ Chí Minh.",
    descriptionEn: "Founding anniversary of Ho Chi Minh Communist Youth Union.",
  },
  "30/04": {
    name: "Ngày Giải Phóng Miền Nam",
    nameEn: "Reunification Day / Liberation Day",
    description: "Ngày giải phóng miền Nam, thống nhất đất nước (Ngày lễ quốc gia lớn).",
    descriptionEn: "National holiday celebrating the liberation of South Vietnam and unification.",
  },
  "01/05": {
    name: "Ngày Quốc Tế Lao Động",
    nameEn: "International Workers' Day",
    description: "Tôn vinh giai cấp công nhân và người lao động (Ngày lễ nghỉ chính thức).",
    descriptionEn: "Global celebration of workers and labor movement.",
  },
  "19/05": {
    name: "Ngày Sinh Chủ Tịch Hồ Chí Minh",
    nameEn: "President Ho Chi Minh's Birthday",
    description: "Kỷ niệm ngày sinh Chủ tịch Hồ Chí Minh (19/05/1890).",
    descriptionEn: "Anniversary of President Ho Chi Minh's birth.",
  },
  "01/06": {
    name: "Ngày Quốc Tế Thiếu Nhi",
    nameEn: "International Children's Day",
    description: "Ngày hội dành riêng cho trẻ em và thiếu nhi.",
    descriptionEn: "Special day dedicated to children and youth.",
  },
  "28/06": {
    name: "Ngày Gia Đình Việt Nam",
    nameEn: "Vietnam Family Day",
    description: "Tôn vinh các giá trị văn hóa gia đình Việt Nam truyền thống.",
    descriptionEn: "Honoring traditional Vietnamese family values.",
  },
  "27/07": {
    name: "Ngày Thương Binh Liệt Sĩ",
    nameEn: "Vietnam Martyrs and Wounded Soldiers Day",
    description: "Tri ân các anh hùng thương binh, liệt sĩ đã hy sinh vì Tổ quốc.",
    descriptionEn: "Honoring wounded soldiers and fallen martyrs.",
  },
  "19/08": {
    name: "Ngày Cách Mạng Tháng Tám Thành Công",
    nameEn: "August Revolution Commemoration Day",
    description: "Kỷ niệm thắng lợi của Cách mạng tháng Tám năm 1945.",
    descriptionEn: "Commemorating the success of the 1945 August Revolution.",
  },
  "02/09": {
    name: "Ngày Quốc Khánh Việt Nam",
    nameEn: "Vietnam National Day",
    description: "Ngày Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập khai sinh nước CHXHCN Việt Nam.",
    descriptionEn: "Independence Day of Vietnam celebrating the 1945 Declaration of Independence.",
  },
  "10/10": {
    name: "Ngày Giải Phóng Thủ Đô",
    nameEn: "Capital Liberation Day",
    description: "Kỷ niệm ngày tiếp quản và giải phóng Thủ đô Hà Nội (10/10/1954).",
    descriptionEn: "Commemorating the liberation of Hanoi capital in 1954.",
  },
  "20/10": {
    name: "Ngày Phụ Nữ Việt Nam",
    nameEn: "Vietnamese Women's Day",
    description: "Ngày tôn vinh phụ nữ Việt Nam.",
    descriptionEn: "Special day celebrating Vietnamese women.",
  },
  "20/11": {
    name: "Ngày Nhà Giáo Việt Nam",
    nameEn: "Vietnamese Teachers' Day",
    description: "Tôn vinh công ơn thầy cô giáo và sự nghiệp giáo dục Việt Nam.",
    descriptionEn: "Honoring teachers and educator contributions in Vietnam.",
  },
  "22/12": {
    name: "Ngày Thành Lập QĐND Việt Nam",
    nameEn: "Vietnam People's Army Foundation Day",
    description: "Kỷ niệm ngày thành lập Quân đội Nhân dân Việt Nam và Ngày hội Quốc phòng toàn dân.",
    descriptionEn: "Foundation anniversary of the Vietnam People's Army.",
  },
  "24/12": {
    name: "Đêm Lễ Giáng Sinh (Christmas Eve)",
    nameEn: "Christmas Eve",
    description: "Đêm Lễ Giáng Sinh ấm áp và an lành.",
    descriptionEn: "Celebration of Christmas Eve.",
  },
  "25/12": {
    name: "Lễ Giáng Sinh (Christmas Day)",
    nameEn: "Christmas Day",
    description: "Ngày Lễ Giáng Sinh chính thức.",
    descriptionEn: "Official Christmas Day holiday.",
  },
};

// Fixed Lunar Holidays & Special Observances (Key: "DD/MM")
const LUNAR_HOLIDAYS: Record<string, Omit<SpecialDayInfo, "type" | "iconType">> = {
  "30/12": {
    name: "Đêm Giao Thừa (30 Tết)",
    nameEn: "Lunar New Year's Eve (30th Tet)",
    description: "Đêm Giao Thừa thiêng liêng chào đón năm mới Âm lịch.",
    descriptionEn: "Sacred Lunar New Year's Eve welcoming the new spring.",
  },
  "29/12": {
    name: "Đêm Giao Thừa (29 Tết)",
    nameEn: "Lunar New Year's Eve (29th Tet)",
    description: "Đêm Giao Thừa cho những năm tháng Chạp có 29 ngày.",
    descriptionEn: "Lunar New Year's Eve for 29-day 12th lunar months.",
  },
  "01/01": {
    name: "Mùng 1 Tết Nguyên Đán",
    nameEn: "1st Day of Lunar New Year (Tet)",
    description: "Ngày đầu tiên của năm mới Âm lịch (Tết cổ truyền lớn nhất Việt Nam).",
    descriptionEn: "The premier day of Tet Lunar New Year festival in Vietnam.",
  },
  "02/01": {
    name: "Mùng 2 Tết Nguyên Đán",
    nameEn: "2nd Day of Lunar New Year (Tet)",
    description: "Ngày Mùng 2 Tết Nguyên Đán (Thăm hỏi họ hàng chúc Tết).",
    descriptionEn: "The second day of Lunar New Year celebrations.",
  },
  "03/01": {
    name: "Mùng 3 Tết Nguyên Đán",
    nameEn: "3rd Day of Lunar New Year (Tet)",
    description: "Ngày Mùng 3 Tết Nguyên Đán (Mùng 3 Tết Thầy).",
    descriptionEn: "The third day of Lunar New Year celebrations.",
  },
  "15/01": {
    name: "Tết Nguyên Tiêu (Rằm Tháng Giêng)",
    nameEn: "First Full Moon Festival (Nguyen Tieu)",
    description: "Lễ Rằm đầu tiên của năm mới Âm lịch (Cầu an lành, may mắn).",
    descriptionEn: "First full moon of the Lunar Year.",
  },
  "03/03": {
    name: "Tết Hàn Thực",
    nameEn: "Cold Food Festival (Tet Han Thuc)",
    description: "Tục lệ làm bánh trôi, bánh chay dâng cúng tổ tiên.",
    descriptionEn: "Traditional festival making glutinous rice balls.",
  },
  "10/03": {
    name: "Ngày Giỗ Tổ Hùng Vương",
    nameEn: "Hung Kings Commemoration Day",
    description: "Tưởng nhớ công ơn các Vua Hùng đã có công dựng nước (Ngày lễ nghỉ quốc gia).",
    descriptionEn: "National holiday honoring the founding Hung Kings of Vietnam.",
  },
  "15/04": {
    name: "Lễ Phật Đản",
    nameEn: "Buddha's Birthday",
    description: "Kỷ niệm ngày Đức Phật Thích Ca Mâu Ni ra đời.",
    descriptionEn: "Grand Buddhist celebration of Lord Buddha's birth.",
  },
  "05/05": {
    name: "Tết Đoan Ngọ",
    nameEn: "Dragon Boat / Pest-Killing Festival",
    description: "Tết diệt sâu bọ truyền thống của người Việt (Ăn rượu nếp, hoa quả).",
    descriptionEn: "Mid-year festival eliminating pests and promoting health.",
  },
  "15/07": {
    name: "Lễ Vu Lan (Rằm Tháng Bảy)",
    nameEn: "Ghost Festival / Vu Lan Báo Hiếu",
    description: "Lễ báo hiếu cha mẹ và ngày Xá tội vong nhân truyền thống.",
    descriptionEn: "Filial Piety Festival and Ghost Month full moon.",
  },
  "15/08": {
    name: "Tết Trung Thu (Rằm Tháng Tám)",
    nameEn: "Mid-Autumn Moon Festival",
    description: "Tết trông trăng, phá cỗ rước đèn dành cho thiếu nhi và gia đình.",
    descriptionEn: "Mid-Autumn Festival featuring mooncakes and lanterns.",
  },
  "23/12": {
    name: "Ngày Ông Công Ông Táo Về Trời",
    nameEn: "Kitchen Gods' Day to Heaven",
    description: "Lễ cúng tiễn Táo Quân về chầu trời báo cáo việc hạ giới.",
    descriptionEn: "Sending off the Kitchen Gods to Heaven.",
  },
};

export function getSpecialDaysForDate(
  date: Date,
  userBod?: Date | string | null
): SpecialDayInfo[] {
  const result: SpecialDayInfo[] = [];

  const dayNum = date.getDate();
  const monthNum = date.getMonth() + 1;
  const solarKey = `${dayNum < 10 ? `0${dayNum}` : dayNum}/${monthNum < 10 ? `0${monthNum}` : monthNum}`;

  // 1. Check User Birthday
  if (userBod) {
    const bodDate = typeof userBod === "string" ? new Date(userBod) : userBod;
    if (!isNaN(bodDate.getTime())) {
      if (bodDate.getDate() === dayNum && bodDate.getMonth() + 1 === monthNum) {
        result.push({
          name: "Sinh Nhật Của Bạn 🎉",
          nameEn: "Your Birthday 🎉",
          type: "birthday",
          description: "Chúc mừng sinh nhật! Chúc bạn một tuổi mới nhiều sức khỏe, niềm vui và thành công!",
          descriptionEn: "Happy Birthday! Wishing you health, happiness, and great success!",
          iconType: "blue_star",
        });
      }
    }
  }

  // 2. Check Solar Holidays
  if (SOLAR_HOLIDAYS[solarKey]) {
    const item = SOLAR_HOLIDAYS[solarKey];
    result.push({
      ...item,
      type: "solar",
      iconType: "gold_star",
    });
  }

  // 3. Check Lunar Holidays
  const lunar = getLunarDate(date);
  const lunarKey = `${lunar.day < 10 ? `0${lunar.day}` : lunar.day}/${lunar.month < 10 ? `0${lunar.month}` : lunar.month}`;

  if (LUNAR_HOLIDAYS[lunarKey]) {
    const item = LUNAR_HOLIDAYS[lunarKey];
    result.push({
      ...item,
      type: "lunar",
      iconType: "gold_star",
    });
  }

  return result;
}

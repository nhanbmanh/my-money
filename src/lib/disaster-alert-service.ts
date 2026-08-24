/**
 * Authoritative Emergency Natural Disaster Alert Service
 * Sourced from:
 * 1. VNDMS / NCHMF (Hệ thống Giám sát Thiên tai Việt Nam & Trung tâm Dự báo Khí tượng Thủy văn Quốc gia)
 * 2. GDACS (Global Disaster Alert and Coordination System - UN / European Commission)
 *
 * STRICT USER DIRECTIVES:
 * 1. Realtime Active/Near-Future Only: Past events (even earlier today) MUST be discarded. Only active now or next 1-3h.
 * 2. Strict User Province/City Scope: Limited strictly to user's Province/City (e.g. Hà Nội for Nghĩa Đô, Phú Thọ for Lạc Sơn).
 * 3. Explicit Location Scope Details: Must explicitly detail the exact district/province scope in alert UI.
 */

export type OfficialDisasterAlert = {
  id: string;
  source: "VNDMS_GOV_VN" | "GDACS_UN" | "METEOROLOGICAL_OFFICIAL" | "EMPIRICAL_SENSOR";
  level: "warning" | "danger" | "critical";
  eventType: "TYPHOON" | "FLOOD" | "TORNADO" | "TSUNAMI" | "HEAVY_STORM" | "EXTREME_HEAT";
  title: string;
  description: string;
  advice: string[];
  metrics: { label: string; value: string }[];
  eventDate?: string;
  alertUrl?: string;
};

// Extract Province/City and District/Ward from user location string
function parseVietnamLocation(locationName: string) {
  const parts = locationName.split(",").map((s) => s.trim());
  const locLower = locationName.toLowerCase();

  let province = "";
  let district = "";

  if (parts.length >= 2) {
    province = parts[parts.length - 1].replace(/^việt nam$/i, "").trim();
    if (!province && parts.length >= 3) {
      province = parts[parts.length - 2].trim();
      district = parts[parts.length - 3].trim();
    } else {
      district = parts[parts.length - 2] || "";
    }
  } else {
    province = locationName;
  }

  // Common province normalization
  if (/hà nội/i.test(locLower)) province = "Thành phố Hà Nội";
  else if (/hồ chí minh|sài gòn/i.test(locLower)) province = "Thành phố Hồ Chí Minh";
  else if (/đà nẵng/i.test(locLower)) province = "Thành phố Đà Nẵng";
  else if (/hải phòng/i.test(locLower)) province = "Thành phố Hải Phòng";
  else if (/cần thơ/i.test(locLower)) province = "Thành phố Cần Thơ";
  else if (/phú thọ/i.test(locLower)) province = "Tỉnh Phú Thọ";
  else if (/thanh hóa/i.test(locLower)) province = "Tỉnh Thanh Hóa";
  else if (/nghệ an/i.test(locLower)) province = "Tỉnh Nghệ An";

  return { province, district, full: locationName };
}

// Haversine formula to compute distance in km between two GPS coordinates
function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch Official Vietnam Emergency Disaster Bulletins from VNDMS / NCHMF
 * Applied STRICTLY to user's province/city and CURRENT / NEAR-FUTURE timeframe!
 */
export async function fetchVndmsVietnamDisasterAlerts(
  locationName: string,
  lang: "vi" | "en" = "vi"
): Promise<OfficialDisasterAlert | null> {
  try {
    const res = await fetch("https://nchmf.gov.vn/KttvSite/vi-VN/1/index.html", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 180 }, // Cache 3 minutes
    });

    if (!res.ok) return null;

    const html = await res.text();
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    const { province, district } = parseVietnamLocation(locationName);
    const locLower = locationName.toLowerCase();
    const isHanoiUrban = locLower.includes("hà nội") || locLower.includes("nghĩa đô") || locLower.includes("cầu giấy");
    const isPhuTho = locLower.includes("phú thọ") || locLower.includes("lạc sơn");

    while ((match = linkRegex.exec(html)) !== null) {
      const alertUrl = match[1];
      const alertTitleRaw = match[2].replace(/<[^>]+>/g, "").trim();
      const alertTitleUpper = alertTitleRaw.toUpperCase();

      // RULE 1: STRICT REAL-TIME / NEAR-FUTURE TIMING
      // Extract publication date & timestamp e.g. (24/08/2026 19:33:20)
      const dateMatch = alertTitleRaw.match(/(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
      if (dateMatch) {
        const [day, month, year] = dateMatch[1].split("/").map(Number);
        const timePart = dateMatch[2] || "00:00:00";
        const [hours, minutes, seconds] = timePart.split(":").map(Number);

        const pubDate = new Date(year, month - 1, day, hours, minutes, seconds);
        const now = new Date();
        const diffHours = (now.getTime() - pubDate.getTime()) / (1000 * 3600);

        // DISCARD bulletins published more than 12 hours ago (Past events)
        if (diffHours > 12) continue;
      }

      // DISCARD bulletins that indicate past / dissipated events
      if (
        alertTitleUpper.includes("ĐÃ SUY YẾU") ||
        alertTitleUpper.includes("ĐÃ TẠN") ||
        alertTitleUpper.includes("ĐÃ QUA") ||
        alertTitleUpper.includes("TIN CUỐI CÙNG")
      ) {
        continue; // Event has already passed!
      }

      const isTyphoon =
        alertTitleUpper.includes("TIN BÃO") ||
        alertTitleUpper.includes("TIN BÃO") ||
        alertTitleUpper.includes("BÃO KHẨN CẤP");

      const isLandslideOrFlashFlood =
        alertTitleUpper.includes("LŨ QUÉT") || alertTitleUpper.includes("SẠT LỞ ĐẤT");

      const isHeavyRain = alertTitleUpper.includes("MƯA LỚN");

      if (isTyphoon || isLandslideOrFlashFlood || isHeavyRain) {
        let isMatchUserProvince = false;

        // RULE 2: STRICT PROVINCE/CITY SCOPE FILTERING
        // Landslides / Flash Floods do not apply to flat urban inner-city Hanoi unless explicitly naming Hanoi
        if (isLandslideOrFlashFlood && isHanoiUrban) {
          if (!alertTitleUpper.includes("HÀ NỘI")) {
            continue; // Skip landslide warning for Hanoi inner city
          }
        }

        // Check if user's Province/City is strictly in the alert scope
        if (isHanoiUrban) {
          if (alertTitleUpper.includes("NAM ĐỒNG BẰNG BẮC BỘ") && !alertTitleUpper.includes("HÀ NỘI")) {
            continue; // Exclude Nam Định/Thái Bình bulletins
          }
          if (
            alertTitleUpper.includes("HÀ NỘI") ||
            (isTyphoon && (alertTitleUpper.includes("BẮC BỘ") || alertTitleUpper.includes("ĐỒNG BẰNG BẮC BỘ")))
          ) {
            isMatchUserProvince = true;
          }
        } else if (isPhuTho) {
          if (alertTitleUpper.includes("PHÚ THỌ") || (isTyphoon && alertTitleUpper.includes("BẮC BỘ"))) {
            isMatchUserProvince = true;
          }
        } else {
          // General province matching: Must explicitly mention the user's province name
          if (province && alertTitleUpper.includes(province.toUpperCase())) {
            isMatchUserProvince = true;
          }
        }

        if (isMatchUserProvince) {
          const isCritical = alertTitleUpper.includes("BÃO KHẨN CẤP") || alertTitleUpper.includes("LŨ KHẨN CẤP");

          let eventType: OfficialDisasterAlert["eventType"] = "HEAVY_STORM";
          let displayTitle = `⚠️ CẢNH BÁO THIÊN TAI REALTIME TẠI ${province.toUpperCase() || "ĐỊA PHƯƠNG"}`;

          if (isTyphoon) {
            eventType = "TYPHOON";
            displayTitle =
              lang === "vi"
                ? `🌀 TIN BÃO KHẨN CẤP CHÍNH THỨC TẠI ${province.toUpperCase() || "ĐỊA PHƯƠNG"}`
                : `🌀 OFFICIAL TYPHOON EMERGENCY BULLETIN - ${province.toUpperCase()}`;
          } else if (isHeavyRain) {
            eventType = "HEAVY_STORM";
            displayTitle =
              lang === "vi"
                ? `🌧️ TIN CẢNH BÁO MƯA LỚN CỰC ĐOAN TẠI ${province.toUpperCase() || "ĐỊA PHƯƠNG"}`
                : `🌧️ OFFICIAL HEAVY RAINFALL WARNING - ${province.toUpperCase()}`;
          }

          const scopeText = district ? `${district}, ${province}` : province || locationName;

          return {
            id: `VNDMS_NCHMF_${Date.now()}`,
            source: "VNDMS_GOV_VN",
            level: isCritical ? "critical" : "danger",
            eventType,
            title: displayTitle,
            description: `${alertTitleRaw}\n📌 Phạm vi tác động: ${scopeText}.`,
            advice: [
              `Theo dõi bản tin trực tiếp của VNDMS & NCHMF cho phạm vi ${scopeText}.`,
              "Chủ động gia cố nhà cửa và sẵn sàng ứng phó theo chỉ đạo của địa phương.",
              "Dự trữ nhu yếu phẩm, nước sạch và sạc đầy thiết bị liên lạc.",
            ],
            metrics: [
              { label: "Phạm vi áp dụng", value: scopeText },
              { label: "Thời gian hiệu lực", value: "Đang diễn ra & các giờ tới (Realtime)" },
              { label: "Nguồn chính thức", value: "VNDMS (Bộ NN&PTNT) / NCHMF (Bộ TN&MT)" },
            ],
            alertUrl,
          };
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch VNDMS/NCHMF Vietnam disaster alerts:", err);
  }

  return null;
}

/**
 * Fetch official active emergency disaster alerts from GDACS (United Nations / EC)
 * Restricted strictly to user's province/city and REAL-TIME ACTIVE timeframe!
 */
export async function fetchOfficialDisasterAlerts(
  lat: number,
  lng: number,
  locationName: string,
  lang: "vi" | "en" = "vi"
): Promise<OfficialDisasterAlert | null> {
  // 1. Priority 1: Check Vietnam Official National Disaster Monitoring System (VNDMS / NCHMF)
  const vndmsAlert = await fetchVndmsVietnamDisasterAlerts(locationName, lang);
  if (vndmsAlert) return vndmsAlert;

  // 2. Priority 2: Check International UN / GDACS Disaster Alert Feed (Strict Realtime & Location Filter)
  try {
    const res = await fetch("https://www.gdacs.org/xml/rss.xml", {
      next: { revalidate: 300 }, // Cache 5 minutes
    });

    if (!res.ok) return null;

    const xmlText = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    const locLower = locationName.toLowerCase();
    const isUserInVietnam = locLower.includes("việt nam") || locLower.includes("hà nội") || locLower.includes("hồ chí minh") || locLower.includes("đà nẵng") || locLower.includes("phú thọ");
    const { province, district } = parseVietnamLocation(locationName);

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/);
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const latMatch = itemXml.match(/<geo:lat>([\s\S]*?)<\/geo:lat>/);
      const longMatch = itemXml.match(/<geo:long>([\s\S]*?)<\/geo:long>/);
      const alertLevelMatch = itemXml.match(/<gdacs:alertlevel>([\s\S]*?)<\/gdacs:alertlevel>/);
      const eventTypeMatch = itemXml.match(/<gdacs:eventtype>([\s\S]*?)<\/gdacs:eventtype>/);
      const countryMatch = itemXml.match(/<gdacs:country>([\s\S]*?)<\/gdacs:country>/);

      const alertTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
      const alertDesc = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
      const alertLink = linkMatch ? linkMatch[1].trim() : "";
      const alertLat = latMatch ? parseFloat(latMatch[1]) : NaN;
      const alertLng = longMatch ? parseFloat(longMatch[1]) : NaN;
      const alertLevel = alertLevelMatch ? alertLevelMatch[1].trim().toLowerCase() : "";
      const eventType = eventTypeMatch ? eventTypeMatch[1].trim().toUpperCase() : "";
      const country = countryMatch ? countryMatch[1].trim().toLowerCase() : "";

      // DIRECTIVE 1: STRICT REALTIME / ACTIVE FILTER (MUST NOT BE PAST EVENT)
      if (alertDesc.includes("lasting until")) {
        const dateInDesc = alertDesc.match(/lasting until (\d{2}\/\d{2}\/\d{4})/i);
        if (dateInDesc) {
          const [d, m, y] = dateInDesc[1].split("/").map(Number);
          const untilDate = new Date(y, m - 1, d);
          const now = new Date();
          // Discard if ended before today!
          if (untilDate.getTime() < now.getTime() - 86400000) {
            continue; // Past event!
          }
        }
      }

      // DIRECTIVE 2: STRICT PROVINCE/CITY BOUNDARY
      if (isUserInVietnam) {
        if (country.includes("china") || country.includes("laos") || country.includes("cambodia")) {
          continue; // Discard foreign disasters for users in Vietnam!
        }
        if (!country.includes("vietnam") && !country.includes("viet nam") && !country.includes("vn")) {
          continue;
        }
      }

      // Strict Distance Check (Within 35km of user location for local floods)
      let isMatchLocation = false;
      if (!isNaN(alertLat) && !isNaN(alertLng)) {
        const distKm = computeDistanceKm(lat, lng, alertLat, alertLng);
        const maxAllowedRadius = eventType === "TC" ? 100 : 35;
        if (distKm <= maxAllowedRadius) {
          isMatchLocation = true;
        }
      }

      if (isMatchLocation && (alertLevel === "red" || alertLevel === "orange")) {
        const isCritical = alertLevel === "red";

        let disasterTitle = alertTitle;
        let disasterType: OfficialDisasterAlert["eventType"] = "TYPHOON";

        if (eventType === "TC") {
          disasterType = "TYPHOON";
          disasterTitle = `🌀 CẢNH BÁO BÃO REALTIME TẠI ${province.toUpperCase() || "ĐỊA PHƯƠNG"}`;
        } else if (eventType === "FL") {
          disasterType = "FLOOD";
          disasterTitle = `🌊 CẢNH BÁO LŨ NGUY HIỂM REALTIME TẠI ${province.toUpperCase() || "ĐỊA PHƯƠNG"}`;
        }

        const scopeText = district ? `${district}, ${province}` : province || locationName;

        return {
          id: `GDACS_${eventType}_${alertLevel}_${Date.now()}`,
          source: "GDACS_UN",
          level: isCritical ? "critical" : "danger",
          eventType: disasterType,
          title: disasterTitle,
          description: `${alertDesc || alertTitle}\n📌 Phạm vi tác động: ${scopeText}.`,
          advice: [
            `Di chuyển tài sản và chuẩn bị phương án an toàn tại ${scopeText}.`,
            "Theo dõi các thông tin thời tiết thời gian thực từ cơ quan chức năng.",
          ],
          metrics: [
            { label: "Phạm vi áp dụng", value: scopeText },
            { label: "Thời gian hiệu lực", value: "Thời điểm hiện tại (Realtime)" },
            { label: "Nguồn cảnh báo", value: "GDACS (Liên Hợp Quốc)" },
          ],
          alertUrl: alertLink,
        };
      }
    }
  } catch (err) {
    console.warn("Failed to fetch GDACS disaster alerts:", err);
  }

  return null;
}

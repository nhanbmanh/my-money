import { format } from "date-fns";

export type WeatherLocation = {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
  admin1?: string;
};

export type CurrentWeather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGusts?: number;
  pressure: number;
  weatherCode: number;
  weatherDesc: string;
  isDay: boolean;
  uvIndex: number;
  rain: number;
  sunrise: string;
  sunset: string;
};

export type HourlyForecastItem = {
  time: string; // HH:mm
  temperature: number;
  weatherCode: number;
  weatherDesc: string;
  pop: number; // Precipitation probability %
  isDay: boolean;
};

export type DailyForecastItem = {
  date: string; // yyyy-MM-dd
  dayName: string; // Hôm nay, Thứ 2...
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  weatherDesc: string;
  popMax: number; // Max rain chance %
  rainSum?: number; // Total daily rainfall mm
  uvMax: number;
};

export type SevereAlertLevel = "warning" | "danger" | "critical";

export type SevereAlert = {
  id: string;
  level: SevereAlertLevel;
  title: string;
  description: string;
  advice: string[];
  metrics: { label: string; value: string }[];
};

export type WeatherData = {
  location: WeatherLocation;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  severeAlert?: SevereAlert | null;
};

export function checkSevereWeatherAlerts(
  current: CurrentWeather,
  locationName: string,
  lang: "vi" | "en" = "vi"
): SevereAlert | null {
  const code = current.weatherCode;
  const wind = current.windSpeed;
  const gusts = current.windGusts || wind;
  const rain = current.rain;
  const temp = current.temperature;
  const uv = current.uvIndex;
  const pressure = current.pressure;

  const isCoastalLocation =
    /đà nẵng|nha trang|hải phòng|quảng ninh|vũng tàu|phú quốc|phan thiết|quy nhơn|huế|quảng nam|quảng ngãi|thanh hóa|nam định|thái bình|kiên giang|bạc liêu|cà mau/i.test(
      locationName
    );

  // 1. TYPHOON / TROPICAL CYCLONE (🌀 Bão / Áp Thấp Nhiệt Đới Cực Mạnh)
  if (wind >= 55 || (gusts >= 70 && pressure <= 998) || (wind >= 40 && pressure <= 992)) {
    return {
      id: "TYPHOON_CYCLONE",
      level: "critical",
      title: lang === "vi" ? "🌀 CẢNH BÁO BÃO / ÁP THẤP NHIỆT ĐỚI NGUY HIỂM" : "🌀 TYPHOON & TROPICAL STORM WARNING",
      description:
        lang === "vi"
          ? `Bão / Áp thấp nhiệt đới đang càn quét khu vực ${locationName} với sức gió ${wind} km/h (gió giật ${gusts} km/h), khí áp giảm sâu (${pressure} hPa).`
          : `Typhoon / Tropical storm is striking ${locationName} with wind speeds of ${wind} km/h (gusts ${gusts} km/h), surface pressure ${pressure} hPa.`,
      advice:
        lang === "vi"
          ? [
              "Gia cố nhà cửa, chốt chặn toàn bộ hệ thống cửa sổ, mái tôn.",
              "Tuyệt đối KHÔNG ra khỏi nhà khi tâm bão đang quét qua.",
              "Dự trữ nước sạch, lương thực khô, đèn pin và sạc dự phòng.",
              "Sẵn sàng sơ tán theo hướng dẫn của chính quyền địa phương nếu ở vùng thấp trũng.",
            ]
          : [
              "Secure all windows, doors, and roofing structures.",
              "Do NOT step outdoors while the storm eye passes.",
              "Store clean water, dry food, flashlights, and power banks.",
              "Be ready to evacuate if ordered by local authorities.",
            ],
      metrics: [
        { label: lang === "vi" ? "Tốc độ gió" : "Wind Speed", value: `${wind} km/h` },
        { label: lang === "vi" ? "Gió giật" : "Wind Gusts", value: `${gusts} km/h` },
        { label: lang === "vi" ? "Khí áp" : "Pressure", value: `${pressure} hPa` },
      ],
    };
  }

  // 2. TORNADO / WHIRLWIND (🌪️ Lốc Xoáy & Vòng Xoáy Dông Cực Mạnh)
  if (gusts >= 80 || (code === 99 && gusts >= 65)) {
    return {
      id: "TORNADO_WHIRLWIND",
      level: "critical",
      title: lang === "vi" ? "🌪️ CẢNH BÁO LỐC XOÁY & DÔNG LỐC CỰC MẠNH" : "🌪️ SEVERE TORNADO & WHIRLWIND WARNING",
      description:
        lang === "vi"
          ? `Phát hiện vòi rồng / dông lốc xoáy cực mạnh với gió giật ${gusts} km/h tại ${locationName}. Nguy cơ quật ngã cây cối và cuốn trôi vật thể.`
          : `Severe tornado / whirlwind detected with gusts of ${gusts} km/h at ${locationName}. Extreme risk of structural damage.`,
      advice:
        lang === "vi"
          ? [
              "Tìm nơi trú ẩn kiên cố ngay lập tức (phòng kín không cửa sổ, tầng hầm hoặc góc tường chắc chắn).",
              "Tránh xa cửa kính, cửa sổ gỗ và khu vực ban công.",
              "Nằm áp sát xuống sàn nhà và dùng chăn/gối bảo vệ đầu.",
            ]
          : [
              "Seek shelter immediately in an interior room without windows.",
              "Stay away from glass windows and balconies.",
              "Protect your head and neck with arms and pillows.",
            ],
      metrics: [
        { label: lang === "vi" ? "Gió giật xoáy" : "Tornado Gusts", value: `${gusts} km/h` },
        { label: lang === "vi" ? "Trạng thái" : "Status", value: current.weatherDesc },
      ],
    };
  }

  // 3. TSUNAMI / COASTAL STORM SURGE (🌊 Sóng Thần / Sóng Lớn Bờ Biển)
  if (isCoastalLocation && (wind >= 50 || pressure <= 990 || (rain >= 20 && wind >= 35))) {
    return {
      id: "TSUNAMI_COASTAL_SURGE",
      level: "critical",
      title: lang === "vi" ? "🌊 CẢNH BÁO SÓNG LỚN BỜ BIỂN & NGUY CƠ SÓNG THẦN" : "🌊 TSUNAMI & SEVERE STORM SURGE WARNING",
      description:
        lang === "vi"
          ? `Vùng biển ven bờ ${locationName} có dông bão lớn, sóng biển dâng cao và nguy cơ tràn đê bờ biển.`
          : `Coastal area of ${locationName} is facing dangerous storm surge, high waves, and sea inundation risk.`,
      advice:
        lang === "vi"
          ? [
              "Rời khỏi bãi biển và khu vực ven bờ ngay lập tức.",
              "Cấm tuyệt đối các tàu thuyền nhỏ và hoạt động bơi lội ven biển.",
              "Di chuyển lên khu vực địa hình cao cách xa bờ biển ít nhất 500m.",
            ]
          : [
              "Evacuate beaches and coastal waterfront areas immediately.",
              "Prohibit all small vessels and swimming activities.",
              "Move to high ground at least 500m away from shoreline.",
            ],
      metrics: [
        { label: lang === "vi" ? "Gió biển" : "Coastal Wind", value: `${wind} km/h` },
        { label: lang === "vi" ? "Khí áp" : "Pressure", value: `${pressure} hPa` },
      ],
    };
  }

  // 4. Severe Thunderstorm / Hail / Heavy Lightning (Code 96, 99 or 95 with rain/wind)
  if (code === 96 || code === 99 || (code === 95 && (rain >= 5 || wind >= 30))) {
    return {
      id: "SEVERE_THUNDERSTORM_HAIL",
      level: "critical",
      title: lang === "vi" ? "⚡ CẢNH BÁO MƯA DÔNG LỚN & MƯA ĐÁ" : "⚡ SEVERE THUNDERSTORM & HAIL WARNING",
      description:
        lang === "vi"
          ? `Khu vực ${locationName} đang xuất hiện dông lốc mạnh, sấm chớp dữ dội và có nguy cơ mưa đá.`
          : `Area ${locationName} is experiencing severe thunderstorm, heavy lightning and potential hail.`,
      advice:
        lang === "vi"
          ? [
              "Hạn chế tối đa việc di chuyển ngoài đường lúc này.",
              "Tránh xa các cây lớn, cột điện, bảng quảng cáo và vật thể cao.",
              "Rút các thiết bị điện đắt tiền khỏi ổ cắm để phòng sét đánh.",
              "Gửi xe vào khu vực có mái che an toàn đề phòng mưa đá gây vỡ kính.",
            ]
          : [
              "Avoid traveling outdoors at this time.",
              "Stay away from tall trees, power lines, and billboards.",
              "Unplug high-value electronic devices to prevent power surges.",
            ],
      metrics: [
        { label: lang === "vi" ? "Trạng thái" : "Status", value: current.weatherDesc },
        { label: lang === "vi" ? "Gió thổi" : "Wind Speed", value: `${wind} km/h` },
        { label: lang === "vi" ? "Nhiệt độ" : "Temperature", value: `${temp}°C` },
      ],
    };
  }

  // 2. High Wind / Gale / Storm Gusts (windSpeed >= 45 km/h)
  if (wind >= 45) {
    return {
      id: "HIGH_WIND_GALE",
      level: "danger",
      title: lang === "vi" ? "💨 CẢNH BÁO GIÓ GIẬT MẠNH (CẤP 6 - CẤP 8)" : "💨 HIGH WIND & GALE WARNING",
      description:
        lang === "vi"
          ? `Gió tại ${locationName} đang thổi rất mạnh (${wind} km/h), có thể làm gãy cành cây và bật mái tôn.`
          : `Wind speed at ${locationName} is very high (${wind} km/h), capable of snapping tree branches and damaging structures.`,
      advice:
        lang === "vi"
          ? [
              "Chốt chặt toàn bộ cửa sổ và cửa ra vào nhà.",
              "Di chuyển chậu cây, đồ đạc trên ban công vào trong nhà.",
              "Chú ý quan sát cây xanh gãy đổ và vật cản khi lái xe.",
            ]
          : [
              "Secure all windows and doors.",
              "Move balcony furniture and potted plants indoors.",
              "Watch for falling tree branches while driving.",
            ],
      metrics: [
        { label: lang === "vi" ? "Tốc độ gió" : "Wind Speed", value: `${wind} km/h` },
        { label: lang === "vi" ? "Thời tiết" : "Condition", value: current.weatherDesc },
      ],
    };
  }

  // 3. Torrential Downpour & Flood Risk (rain >= 15 mm/h or code 65, 82)
  if (rain >= 15 || code === 65 || code === 82) {
    return {
      id: "TORRENTIAL_RAIN_FLOOD",
      level: "danger",
      title: lang === "vi" ? "🌧️ CẢNH BÁO MƯA XỐI XẢ & NGUY CƠ NGẬP LỤT" : "🌧️ TORRENTIAL DOWNPOUR & FLOOD WARNING",
      description:
        lang === "vi"
          ? `Mưa đang trút xuống rất to tại ${locationName}. Cảnh báo nguy cơ ngập cục bộ tại các tuyến đường thấp trũng.`
          : `Heavy torrential downpour at ${locationName}. High risk of localized urban flooding.`,
      advice:
        lang === "vi"
          ? [
              "Tránh di chuyển vào các tuyến đường hầm hoặc điểm ngập sâu.",
              "Di chuyển xe cộ lên vị trí cao nếu đỗ ở khu vực hay ngập.",
              "Chú ý quan sát các nắp cống bị trôi hoặc vũng nước sâu.",
            ]
          : [
              "Avoid driving through flooded underpasses or low-lying streets.",
              "Move vehicles to higher ground.",
              "Be alert for open manholes and deep puddles.",
            ],
      metrics: [
        { label: lang === "vi" ? "Lượng mưa" : "Rainfall", value: `${rain} mm` },
        { label: lang === "vi" ? "Tốc độ gió" : "Wind", value: `${wind} km/h` },
      ],
    };
  }

  // 4. Extreme Heatwave (temperature >= 38°C)
  if (temp >= 38) {
    return {
      id: "EXTREME_HEATWAVE",
      level: "warning",
      title: lang === "vi" ? "🌡️ CẢNH BÁO NẮNG NÓNG GAY GẮT CỰC ĐOAN" : "🌡️ EXTREME HEATWAVE WARNING",
      description:
        lang === "vi"
          ? `Nhiệt độ ngoài trời tại ${locationName} đã lên tới ${temp}°C. Nguy cơ cao bị sốc nhiệt và kiệt sức.`
          : `Outdoor temperature at ${locationName} has reached ${temp}°C. High risk of heat stroke and exhaustion.`,
      advice:
        lang === "vi"
          ? [
              "Hạn chế các hoạt động thể lực ngoài trời trong khung giờ 11h - 15h.",
              "Uống đủ nước và bổ sung điện giải liên tục.",
              "Không để trẻ em hoặc thú cưng trong xe ô tô đỗ ngoài trời.",
            ]
          : [
              "Limit outdoor physical activities between 11 AM and 3 PM.",
              "Stay hydrated with water and electrolytes.",
              "Never leave children or pets inside parked cars.",
            ],
      metrics: [
        { label: lang === "vi" ? "Nhiệt độ" : "Temperature", value: `${temp}°C` },
        { label: lang === "vi" ? "Cảm giác như" : "Feels Like", value: `${current.feelsLike}°C` },
      ],
    };
  }

  // 5. Dangerous Extreme UV Index (uvIndex >= 10)
  if (uv >= 10) {
    return {
      id: "EXTREME_UV_RADIATION",
      level: "warning",
      title: lang === "vi" ? "☀️ CẢNH BÁO TIA UV NGUY HẠI CẤP ĐỘ CAO" : "☀️ DANGEROUS UV RADIATION WARNING",
      description:
        lang === "vi"
          ? `Chỉ số tia UV tại ${locationName} đang ở mức cực kỳ nguy hại (${uv}/12). Có thể gây bỏng da và tổn hại mắt.`
          : `UV Index at ${locationName} is extremely high (${uv}/12). Potential risk of skin burn and eye damage.`,
      advice:
        lang === "vi"
          ? [
              "Thoa kem chống nắng SPF 50+ trước khi ra ngoài 20 phút.",
              "Đeo kính râm chống tia UV và mặc quần áo dài tay bảo vệ.",
              "Tìm bóng râm khi ở ngoài trời.",
            ]
          : [
              "Apply SPF 50+ sunscreen 20 minutes before going outside.",
              "Wear UV-blocking sunglasses and protective long sleeves.",
            ],
      metrics: [
        { label: lang === "vi" ? "Chỉ số UV" : "UV Index", value: `${uv} / 12 (Rất cao)` },
        { label: lang === "vi" ? "Nhiệt độ" : "Temperature", value: `${temp}°C` },
      ],
    };
  }

  return null;
}

export function getRefinedDailyWeatherInfo(
  code: number,
  rainSum?: number,
  popMax?: number,
  tempMax?: number,
  lang: "vi" | "en" = "vi"
): { desc: string; icon: string } {
  const rSum = rainSum ?? 0;
  const pMax = popMax ?? 0;
  const tMax = tempMax ?? 28;

  // WMO Thunderstorm Weather Codes (95, 96, 99) — Common in tropical afternoon convective storms
  if (code === 95 || code === 96 || code === 99) {
    if (tMax >= 32 && pMax < 75) {
      return {
        desc: lang === "vi" ? "Nắng nóng, chiều tối có thể có mưa dông" : "Hot & Sunny, Evening Thunderstorm",
        icon: "🌤️",
      };
    }
    if (tMax >= 31) {
      return {
        desc: lang === "vi" ? "Nắng oi nóng, chiều tối có mưa dông" : "Hot & Humid, Evening Thunderstorm",
        icon: "⛈️",
      };
    }
    return {
      desc: lang === "vi" ? "Mưa dông, sấm chớp" : "Thunderstorm",
      icon: "⛈️",
    };
  }

  // WMO Heavy Rain Weather Codes (63, 65, 81, 82) OR High Rain Probability (>= 75%) OR Significant Rain Sum (>= 5.0mm)
  if (code === 63 || code === 65 || code === 81 || code === 82 || pMax >= 75 || rSum >= 5.0) {
    return {
      desc: lang === "vi" ? "Mưa rào nặng hạt" : "Heavy Rain Showers",
      icon: "🌧️",
    };
  }

  // Moderate Rain / Rain Showers (code 51..61, 80 OR popMax >= 50% OR rainSum >= 2.0mm)
  if ((code >= 51 && code <= 62) || code === 80 || pMax >= 50 || rSum >= 2.0) {
    return {
      desc: lang === "vi" ? "Có lúc có mưa rào" : "Scattered Showers",
      icon: "🌧️",
    };
  }

  // Light Rain Chance (popMax >= 30% OR rainSum >= 0.5mm)
  if (pMax >= 30 || rSum >= 0.5) {
    return {
      desc: lang === "vi" ? "Chiều tối có thể có mưa rải rác" : "Chance of Rain",
      icon: "🌦️",
    };
  }

  // Dry / Sunny / Hot Days (popMax < 30% AND rainSum < 0.5mm AND code < 50)
  if (tMax >= 35) {
    return {
      desc: lang === "vi" ? "Nắng nóng gay gắt" : "Very Hot & Sunny",
      icon: "☀️",
    };
  }

  if (tMax >= 33) {
    return {
      desc: lang === "vi" ? "Nắng nóng, mây rải rác" : "Hot & Partly Cloudy",
      icon: "🌤️",
    };
  }

  if (code === 0 || code === 1) {
    return {
      desc: lang === "vi" ? "Trời quang, nắng đẹp" : "Sunny & Clear",
      icon: "☀️",
    };
  }

  if (code === 2) {
    return {
      desc: lang === "vi" ? "Nắng nhẹ, có mây" : "Partly Cloudy",
      icon: "🌤️",
    };
  }

  if (code === 3) {
    return {
      desc: lang === "vi" ? "Nhiều mây, âm u" : "Overcast",
      icon: "☁️",
    };
  }

  return {
    desc: lang === "vi" ? "Trời khô ráo, nắng nhẹ" : "Dry & Clear",
    icon: tMax >= 31 ? "☀️" : "🌤️",
  };
}

export function getWmoWeatherInfo(code: number, isDay = true, lang: "vi" | "en" = "vi"): { desc: string; icon: string } {
  if (lang === "en") {
    switch (code) {
      case 0:
        return { desc: isDay ? "Clear sky" : "Clear night", icon: isDay ? "☀️" : "🌙" };
      case 1:
        return { desc: isDay ? "Mainly clear" : "Clear night", icon: isDay ? "🌤️" : "🌙" };
      case 2:
        return { desc: "Partly cloudy", icon: isDay ? "⛅" : "☁️" };
      case 3:
        return { desc: "Overcast", icon: "☁️" };
      case 45:
      case 48:
        return { desc: "Foggy", icon: "🌫️" };
      case 51:
      case 53:
      case 55:
        return { desc: "Light drizzle", icon: isDay ? "🌦️" : "🌧️" };
      case 56:
      case 57:
        return { desc: "Freezing drizzle", icon: "🌧️" };
      case 61:
      case 63:
        return { desc: "Rain showers", icon: "🌧️" };
      case 65:
        return { desc: "Heavy rain", icon: "🌧️" };
      case 66:
      case 67:
        return { desc: "Freezing rain", icon: "🌨️" };
      case 71:
      case 73:
      case 75:
      case 77:
        return { desc: "Snowfall", icon: "❄️" };
      case 80:
      case 81:
      case 82:
        return { desc: "Heavy rain showers", icon: "🌧️" };
      case 85:
      case 86:
        return { desc: "Snow showers", icon: "🌨️" };
      case 95:
        return { desc: "Thunderstorm", icon: "⛈️" };
      case 96:
      case 99:
        return { desc: "Heavy thunderstorm", icon: "⛈️" };
      default:
        return { desc: "Fair weather", icon: isDay ? "⛅" : "☁️" };
    }
  }

  switch (code) {
    case 0:
      return { desc: isDay ? "Trời quang, nắng đẹp" : "Đêm quang mây", icon: isDay ? "☀️" : "🌙" };
    case 1:
      return { desc: isDay ? "Nắng rải rác" : "Đêm ít mây", icon: isDay ? "🌤️" : "🌙" };
    case 2:
      return { desc: "Có mây", icon: isDay ? "⛅" : "☁️" };
    case 3:
      return { desc: "Nhiều mây, âm u", icon: "☁️" };
    case 45:
    case 48:
      return { desc: "Sương mù bao phủ", icon: "🌫️" };
    case 51:
    case 53:
    case 55:
      return { desc: "Mưa phun nhẹ", icon: isDay ? "🌦️" : "🌧️" };
    case 56:
    case 57:
      return { desc: "Mưa phùn lạnh", icon: "🌧️" };
    case 61:
    case 63:
      return { desc: "Mưa rào", icon: "🌧️" };
    case 65:
      return { desc: "Mưa to nặng hạt", icon: "🌧️" };
    case 66:
    case 67:
      return { desc: "Mưa rào lớn", icon: "🌧️" };
    case 71:
    case 73:
    case 75:
    case 77:
      return { desc: "Tuyết rơi", icon: "❄️" };
    case 80:
    case 81:
    case 82:
      return { desc: "Mưa rào xối xả", icon: "🌧️" };
    case 85:
    case 86:
      return { desc: "Tuyết rào", icon: "🌨️" };
    case 95:
      return { desc: "Mưa dông, sấm chớp", icon: "⛈️" };
    case 96:
    case 99:
      return { desc: "Mưa dông lớn, sấm chớp", icon: "⛈️" };
    default:
      return { desc: "Thời tiết bình thường", icon: isDay ? "⛅" : "☁️" };
  }
}

export async function searchLocations(query: string): Promise<WeatherLocation[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query.trim()
      )}&count=10&language=vi&format=json`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((r: any) => ({
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Method 1: Try OpenStreetMap Nominatim with proper headers
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
      { headers: { "User-Agent": "MyMoneyApp/1.0 (Weather Module)" } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address;
      if (addr) {
        const ward =
          addr.suburb ||
          addr.quarter ||
          addr.neighbourhood ||
          addr.village ||
          addr.town ||
          addr.residential ||
          "";
        const district =
          addr.city_district ||
          addr.district ||
          addr.county ||
          addr.subdistrict ||
          "";
        const city =
          addr.city ||
          addr.state ||
          addr.province ||
          addr.municipality ||
          "";
        const country = addr.country || "Việt Nam";

        const parts = [ward, district, city, country].filter(Boolean);
        const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index);
        if (uniqueParts.length > 0) {
          return uniqueParts.join(", ");
        }
      }
    }
  } catch {
    // Fallback to BigDataCloud
  }

  // Method 2: BigDataCloud Fallback
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`
    );
    if (res.ok) {
      const data = await res.json();
      const ward = data.locality || "";
      const city = data.city || data.principalSubdivision || "";
      const country = data.countryName || "Việt Nam";

      const parts = [ward, city, country].filter(Boolean);
      const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index);
      if (uniqueParts.length > 0) return uniqueParts.join(", ");
    }
  } catch {
    // Fallback
  }

  return `Vị trí (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
}

export async function detectLocationByIp(): Promise<WeatherLocation | null> {
  // Method 1: BigDataCloud Client IP Reverse Geocode (free, high accuracy in VN)
  try {
    const res = await fetch(
      "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=vi"
    );
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const city = data.city || data.principalSubdivision || data.locality || "";
        const country = data.countryName || "Việt Nam";
        const parts = [city, country].filter(Boolean);
        const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index);
        const name = uniqueParts.join(", ") || "Vị trí của bạn";
        return {
          name,
          latitude: data.latitude,
          longitude: data.longitude,
          country,
        };
      }
    }
  } catch {
    // Fallback to ip-api.com
  }

  // Method 2: ip-api.com
  try {
    const res = await fetch("https://ip-api.com/json/?lang=vi");
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.lat && data.lon) {
        const name = [data.city, data.country].filter(Boolean).join(", ");
        return {
          name: name || "Vị trí của bạn",
          latitude: data.lat,
          longitude: data.lon,
          country: data.country,
        };
      }
    }
  } catch {
    // Fallback
  }

  return null;
}

export async function fetchWeatherData(
  lat: number,
  lng: number,
  locationName?: string
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,surface_pressure,wind_speed_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,uv_index_max&timezone=auto&_t=${Date.now()}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Không thể lấy dữ liệu thời tiết từ Open-Meteo");
  }

  const data = await res.json();
  const currentData = data.current;
  const hourlyData = data.hourly;
  const dailyData = data.daily;

  let resolvedLocationName = locationName;
  if (!resolvedLocationName) {
    resolvedLocationName = await reverseGeocode(lat, lng);
  }

  const isDay = currentData.is_day === 1;

  // Process 24-hour hourly forecast (from current hour in local time)
  const nowTimestamp = Date.now();
  let startIndex = hourlyData.time.findIndex((t: string) => {
    const itemTime = new Date(t).getTime();
    return itemTime >= nowTimestamp - 3599000;
  });
  if (startIndex === -1) startIndex = 0;

  // Calculate real-time current UV Index (0 at night)
  let currentUv = 0;
  if (isDay) {
    if (currentData.uv_index !== undefined) {
      currentUv = Math.round(currentData.uv_index);
    } else if (hourlyData.uv_index && hourlyData.uv_index[startIndex] !== undefined) {
      currentUv = Math.round(hourlyData.uv_index[startIndex]);
    } else {
      currentUv = dailyData?.uv_index_max?.[0] ? Math.round(dailyData.uv_index_max[0]) : 0;
    }
  } else {
    currentUv = 0; // Night time always has 0 UV index
  }

  const formatLocalTimeStr = (isoStr?: string) => {
    if (!isoStr) return "";
    const parts = isoStr.split("T");
    if (parts.length > 1) {
      return parts[1].slice(0, 5); // e.g. "22:00" or "05:32"
    }
    return isoStr;
  };

  // Standardized Realtime Weather Refinement
  const currentRain = currentData.rain || currentData.showers || currentData.precipitation || 0;
  const currentPop = hourlyData.precipitation_probability?.[startIndex] || 0;
  let currentCode = currentData.weather_code;

  // If current rain volume < 0.5mm or probability < 40%, override thunderstorm codes
  if (currentRain < 0.5 && currentPop < 40 && (currentCode >= 50 || currentCode === 95 || currentCode === 96 || currentCode === 99)) {
    currentCode = isDay ? 2 : 1;
  }

  let currentInfo = getWmoWeatherInfo(currentCode, isDay);
  const curTemp = Math.round(currentData.temperature_2m);
  if (currentRain < 0.5 && currentPop < 40) {
    if (isDay && curTemp >= 35) {
      currentInfo = { desc: "Nắng nóng gay gắt", icon: "☀️" };
    } else if (isDay && curTemp >= 33) {
      currentInfo = { desc: "Nắng nóng, mây rải rác", icon: "🌤️" };
    } else if (isDay && curTemp >= 31) {
      currentInfo = { desc: "Nắng nóng, ít mây", icon: "☀️" };
    }
  }

  const current: CurrentWeather = {
    temperature: curTemp,
    feelsLike: Math.round(currentData.apparent_temperature),
    humidity: currentData.relative_humidity_2m,
    windSpeed: Math.round(currentData.wind_speed_10m),
    pressure: Math.round(currentData.surface_pressure),
    weatherCode: currentCode,
    weatherDesc: currentInfo.desc,
    isDay,
    uvIndex: currentUv,
    rain: currentRain,
    sunrise: formatLocalTimeStr(dailyData?.sunrise?.[0]) || "05:32",
    sunset: formatLocalTimeStr(dailyData?.sunset?.[0]) || "18:32",
  };

  const hourly: HourlyForecastItem[] = [];
  for (let i = startIndex; i < Math.min(startIndex + 12, hourlyData.time.length); i++) {
    const timeStr = hourlyData.time[i];
    const hourStr = formatLocalTimeStr(timeStr); // e.g. "22:00"
    const hourNum = parseInt(hourStr.split(":")[0], 10) || 0;
    const isDayTime = hourNum >= 6 && hourNum <= 18;
    const hTemp = Math.round(hourlyData.temperature_2m[i]);

    const hourlyPop = hourlyData.precipitation_probability[i] || 0;
    let hourlyCode = hourlyData.weather_code[i];

    // If hourly precipitation probability is low (< 40%), override thunderstorm codes to clear/cloudy/sunny
    if (hourlyPop < 40 && (hourlyCode >= 50 || hourlyCode === 95 || hourlyCode === 96 || hourlyCode === 99)) {
      hourlyCode = isDayTime ? (hTemp >= 33 ? 1 : 2) : 1;
    }

    let wInfo = getWmoWeatherInfo(hourlyCode, isDayTime);
    if (hourlyPop < 40 && isDayTime && hTemp >= 35) {
      wInfo = { desc: "Nắng nóng gay gắt", icon: "☀️" };
    } else if (hourlyPop < 40 && isDayTime && hTemp >= 33) {
      wInfo = { desc: "Nắng nóng, mây rải rác", icon: "🌤️" };
    }

    hourly.push({
      time: hourStr,
      temperature: hTemp,
      weatherCode: hourlyCode,
      weatherDesc: wInfo.desc,
      pop: hourlyPop,
      isDay: isDayTime,
    });
  }

  // Process 7-day daily forecast
  const daily: DailyForecastItem[] = [];
  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  for (let i = 0; i < Math.min(7, dailyData.time.length); i++) {
    const dStr = dailyData.time[i];
    const dDate = new Date(dStr);
    const isToday = i === 0;
    const dayName = isToday ? "Hôm nay" : daysOfWeek[dDate.getDay()];

    const tempMax = Math.round(dailyData.temperature_2m_max[i]);
    const tempMin = Math.round(dailyData.temperature_2m_min[i]);
    const rainSum = dailyData.precipitation_sum ? dailyData.precipitation_sum[i] : 0;
    const popMax = dailyData.precipitation_probability_max ? dailyData.precipitation_probability_max[i] : 0;

    const wInfo = getRefinedDailyWeatherInfo(dailyData.weather_code[i], rainSum, popMax, tempMax);

    daily.push({
      date: dStr,
      dayName,
      tempMax,
      tempMin,
      weatherCode: dailyData.weather_code[i],
      weatherDesc: wInfo.desc,
      popMax,
      rainSum,
      uvMax: Math.round(dailyData.uv_index_max?.[i] || 5),
    });
  }

  const severeAlert = checkSevereWeatherAlerts(current, resolvedLocationName);

  return {
    location: {
      name: resolvedLocationName,
      latitude: lat,
      longitude: lng,
    },
    current,
    hourly,
    daily,
    severeAlert,
  };
}

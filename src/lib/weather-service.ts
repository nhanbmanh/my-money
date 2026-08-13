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
  uvMax: number;
};

export type WeatherData = {
  location: WeatherLocation;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
};

export function getRefinedDailyWeatherInfo(
  code: number,
  rainSum?: number,
  popMax?: number,
  tempMax?: number,
  lang: "vi" | "en" = "vi"
): { desc: string; icon: string } {
  // If rain volume is negligible (< 1.0mm) or rain probability is low (< 35%), the day is effectively DRY
  const isDry = (rainSum !== undefined && rainSum < 1.0) || (popMax !== undefined && popMax < 35);

  if (isDry) {
    if (tempMax !== undefined && tempMax >= 35) {
      return { desc: lang === "vi" ? "Nắng nóng gay gắt" : "Very Hot & Sunny", icon: "☀️" };
    }
    if (tempMax !== undefined && tempMax >= 33) {
      return { desc: lang === "vi" ? "Nắng nóng, mây rải rác" : "Hot & Partly Cloudy", icon: "🌤️" };
    }
    if (code === 0 || code === 1) {
      return { desc: lang === "vi" ? "Trời quang, nắng đẹp" : "Sunny & Clear", icon: "☀️" };
    }
    if (code === 2) {
      return { desc: lang === "vi" ? "Nắng nhẹ, có mây" : "Partly Cloudy", icon: "🌤️" };
    }
    if (code === 3) {
      return { desc: lang === "vi" ? "Nhiều mây, âm u" : "Cloudy", icon: "⛅" };
    }
    return {
      desc: tempMax !== undefined && tempMax >= 32
        ? (lang === "vi" ? "Nắng nóng, ít mây" : "Hot & Mostly Sunny")
        : (lang === "vi" ? "Nắng nhẹ, khô ráo" : "Dry & Pleasant"),
      icon: tempMax !== undefined && tempMax >= 32 ? "☀️" : "🌤️",
    };
  }

  // Moderate rain (1.0mm to 5.0mm)
  if (rainSum !== undefined && rainSum < 5.0) {
    if (code === 95 || code === 96) {
      return { desc: lang === "vi" ? "Chiều tối có dông rải rác" : "Scattered Evening Storms", icon: "⛈️" };
    }
    return { desc: lang === "vi" ? "Có lúc có mưa rào" : "Passing Showers", icon: "🌦️" };
  }

  // Heavy rain (>= 5.0mm)
  return getWmoWeatherInfo(code, true, lang);
}

export function getWmoWeatherInfo(code: number, isDay = true, lang: "vi" | "en" = "vi"): { desc: string; icon: string } {
  if (lang === "en") {
    switch (code) {
      case 0:
        return { desc: isDay ? "Clear sky" : "Clear night", icon: isDay ? "☀️" : "🌙" };
      case 1:
        return { desc: "Mainly clear", icon: isDay ? "🌤️" : "🌙" };
      case 2:
        return { desc: "Partly cloudy", icon: "⛅" };
      case 3:
        return { desc: "Overcast", icon: "☁️" };
      case 45:
      case 48:
        return { desc: "Foggy", icon: "🌫️" };
      case 51:
      case 53:
      case 55:
        return { desc: "Light drizzle", icon: "🌦️" };
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
        return { desc: "Thunderstorm with hail", icon: "⛈️" };
      default:
        return { desc: "Fair weather", icon: "⛅" };
    }
  }

  switch (code) {
    case 0:
      return { desc: isDay ? "Trời quang, nắng đẹp" : "Đêm quang mây", icon: isDay ? "☀️" : "🌙" };
    case 1:
      return { desc: "Nắng rải rác", icon: isDay ? "🌤️" : "🌙" };
    case 2:
      return { desc: "Có mây", icon: "⛅" };
    case 3:
      return { desc: "Nhiều mây, âm u", icon: "☁️" };
    case 45:
    case 48:
      return { desc: "Sương mù bao phủ", icon: "🌫️" };
    case 51:
    case 53:
    case 55:
      return { desc: "Mưa phun nhẹ", icon: "🌦️" };
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
      return { desc: "Mưa đá", icon: "🌨️" };
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
      return { desc: "Dông bão, sấm chớp", icon: "⛈️" };
    case 96:
    case 99:
      return { desc: "Dông bão kèm mưa đá", icon: "⛈️" };
    default:
      return { desc: "Thời tiết bình thường", icon: "⛅" };
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

  const currentInfo = getWmoWeatherInfo(
    currentData.weather_code,
    currentData.is_day === 1
  );

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

  const current: CurrentWeather = {
    temperature: Math.round(currentData.temperature_2m),
    feelsLike: Math.round(currentData.apparent_temperature),
    humidity: currentData.relative_humidity_2m,
    windSpeed: Math.round(currentData.wind_speed_10m),
    pressure: Math.round(currentData.surface_pressure),
    weatherCode: currentData.weather_code,
    weatherDesc: currentInfo.desc,
    isDay,
    uvIndex: currentUv,
    rain: currentData.rain || currentData.showers || currentData.precipitation || 0,
    sunrise: formatLocalTimeStr(dailyData?.sunrise?.[0]) || "05:32",
    sunset: formatLocalTimeStr(dailyData?.sunset?.[0]) || "18:32",
  };

  const hourly: HourlyForecastItem[] = [];
  for (let i = startIndex; i < Math.min(startIndex + 12, hourlyData.time.length); i++) {
    const timeStr = hourlyData.time[i];
    const hourStr = formatLocalTimeStr(timeStr); // e.g. "22:00"
    const hourNum = parseInt(hourStr.split(":")[0], 10) || 0;
    const isDayTime = hourNum >= 6 && hourNum <= 18;
    const wInfo = getWmoWeatherInfo(hourlyData.weather_code[i], isDayTime);

    hourly.push({
      time: hourStr,
      temperature: Math.round(hourlyData.temperature_2m[i]),
      weatherCode: hourlyData.weather_code[i],
      weatherDesc: wInfo.desc,
      pop: hourlyData.precipitation_probability[i] || 0,
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
      uvMax: Math.round(dailyData.uv_index_max?.[i] || 5),
    });
  }

  return {
    location: {
      name: resolvedLocationName,
      latitude: lat,
      longitude: lng,
    },
    current,
    hourly,
    daily,
  };
}

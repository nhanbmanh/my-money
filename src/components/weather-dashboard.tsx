"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapPin,
  Search,
  RefreshCw,
  Wind,
  Droplets,
  Sun,
  Gauge,
  CloudRain,
  Compass,
  Sunrise,
  Sunset,
  Shirt,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Navigation,
  FileText,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  fetchWeatherData,
  searchLocations,
  getWmoWeatherInfo,
  detectLocationByIp,
  WeatherData,
  WeatherLocation,
} from "@/lib/weather-service";
import {
  fetchAirVisualFullData,
  AirVisualFullData,
  AirVisualWeatherData,
  getAirVisualWeatherInfo,
  getAqiLevelInfo,
} from "@/lib/airvisual-service";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";

const PRESET_CITIES: WeatherLocation[] = [
  { name: "Hà Nội", latitude: 21.0285, longitude: 105.8542, country: "Việt Nam" },
  { name: "TP. Hồ Chí Minh", latitude: 10.8231, longitude: 106.6297, country: "Việt Nam" },
  { name: "Đà Nẵng", latitude: 16.0544, longitude: 108.2022, country: "Việt Nam" },
  { name: "Nha Trang", latitude: 12.2388, longitude: 109.1967, country: "Việt Nam" },
  { name: "Đà Lạt", latitude: 11.9404, longitude: 108.4583, country: "Việt Nam" },
  { name: "Cần Thơ", latitude: 10.0452, longitude: 105.7469, country: "Việt Nam" },
  { name: "Huế", latitude: 16.4637, longitude: 107.5909, country: "Việt Nam" },
  { name: "Phú Quốc", latitude: 10.2899, longitude: 103.984, country: "Việt Nam" },
];

function WeatherSkeletonLoader({
  language,
  locatingStatus,
}: {
  language: string;
  locatingStatus?: string | null;
}) {
  return (
    <div className="space-y-4 animate-pulse">
      {locatingStatus && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-sky-500/15 border border-sky-400/30 flex items-center justify-center gap-3 text-sky-700 dark:text-sky-300 font-black text-sm shadow-xs">
          <MapPin className="h-5 w-5 text-sky-500 animate-bounce shrink-0" />
          <span>{locatingStatus}</span>
        </div>
      )}
      {/* SECTION 2 SKELETON: Hero Realtime Card */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-4 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <Skeleton className="h-4 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        
        <div className="rounded-3xl p-6 bg-slate-900/80 border border-slate-800 space-y-6 min-h-[280px] flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-52 rounded-full bg-slate-800" />
              <Skeleton className="h-6 w-28 rounded-full bg-slate-800" />
            </div>
            <div className="flex items-baseline gap-3 pt-2">
              <Skeleton className="h-16 w-36 rounded-2xl bg-slate-800" />
              <Skeleton className="h-12 w-12 rounded-full bg-slate-800" />
            </div>
            <Skeleton className="h-6 w-48 rounded-xl bg-slate-800" />
            <Skeleton className="h-4 w-64 rounded-xl bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800">
            <Skeleton className="h-14 rounded-2xl col-span-2 sm:col-span-1 bg-slate-800" />
            <Skeleton className="h-14 rounded-2xl bg-slate-800" />
            <Skeleton className="h-14 rounded-2xl bg-slate-800" />
            <Skeleton className="h-14 rounded-2xl bg-slate-800" />
          </div>
        </div>
      </div>

      {/* SECTION 3 SKELETON: Hourly 12h Forecast Grid */}
      <Card className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full bg-sky-500/20" />
          <Skeleton className="h-5 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-6 lg:grid-cols-12 gap-2.5">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </Card>

      {/* SECTION 4 SKELETON: 7-Day Forecast & Tips Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-5 rounded-full bg-amber-500/20" />
            <Skeleton className="h-5 w-56 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </Card>

        <Card className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full bg-indigo-500/20" />
              <Skeleton className="h-5 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
            <Skeleton className="h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40" />
            <Skeleton className="h-24 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40" />
            <Skeleton className="h-24 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40" />
          </div>
          <Skeleton className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </Card>
      </div>
    </div>
  );
}

export function WeatherDashboard() {
  const { t, language } = useLanguage();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [airVisualFullData, setAirVisualFullData] = useState<AirVisualFullData | null>(null);
  const [hourlySource, setHourlySource] = useState<"airvisual" | "openmeteo">("airvisual");
  const [dailySource, setDailySource] = useState<"airvisual" | "openmeteo">("airvisual");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary Dialog State
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const loadWeather = useCallback(async (lat: number, lng: number, locName?: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [data, avFullData] = await Promise.all([
        fetchWeatherData(lat, lng, locName),
        fetchAirVisualFullData(lat, lng),
      ]);
      setWeatherData(data);
      setAirVisualFullData(avFullData);
    } catch (err: any) {
      if (!isSilent) setError(err?.message || "Không thể tải dữ liệu thời tiết");
    } finally {
      setLoading(false);
    }
  }, []);

  const [locatingStatus, setLocatingStatus] = useState<string | null>(null);

  // Detect user geolocation (GPS -> Client IP Geolocation -> Presets)
  const detectUserLocation = useCallback((forceGps: boolean | React.MouseEvent = false) => {
    const isForce = typeof forceGps === "boolean" ? forceGps : true;
    if (isForce) setLoading(true);
    setLocatingStatus(
      language === "vi"
        ? "Đang xác định vị trí thực tế của bạn..."
        : "Detecting your exact live location..."
    );

    const runFallback = async () => {
      setLocatingStatus(
        language === "vi"
          ? "Đang dò tìm vị trí qua mạng IP..."
          : "Locating via network IP..."
      );
      const ipLoc = await detectLocationByIp();
      if (ipLoc) {
        await loadWeather(ipLoc.latitude, ipLoc.longitude, ipLoc.name);
        setLocatingStatus(null);
        return;
      }

      // Ultimate Fallback preset city
      await loadWeather(PRESET_CITIES[0].latitude, PRESET_CITIES[0].longitude, PRESET_CITIES[0].name);
      setLocatingStatus(null);
    };

    if (typeof window === "undefined" || !navigator.geolocation) {
      runFallback();
      return;
    }

    setLocatingStatus(
      language === "vi"
        ? "Đang xin vị trí từ thiết bị (GPS)..."
        : "Requesting GPS location from device..."
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocatingStatus(
          language === "vi"
            ? "Đang xác định địa chỉ thời gian thực..."
            : "Resolving live address..."
        );
        await loadWeather(latitude, longitude);
        setLocatingStatus(null);
      },
      () => {
        runFallback();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [loadWeather, language]);

  useEffect(() => {
    // Clear any legacy location cache from localStorage
    try {
      localStorage.removeItem("my_money_last_weather_location");
      localStorage.removeItem("my_money_cached_weather_data");
      localStorage.removeItem("my_money_cached_airvisual_data");
    } catch {}

    // Always auto-detect current live location on page load / mount
    detectUserLocation(true);

    const handleOpenSummary = () => setSummaryOpen(true);
    const handleRefreshLocation = () => detectUserLocation(true);

    window.addEventListener("open-weather-summary", handleOpenSummary);
    window.addEventListener("refresh-weather-location", handleRefreshLocation);

    return () => {
      window.removeEventListener("open-weather-summary", handleOpenSummary);
      window.removeEventListener("refresh-weather-location", handleRefreshLocation);
    };
  }, [detectUserLocation]);

  // Handle Search Input Change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
      setSearching(false);
      setShowDropdown(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (loc: WeatherLocation) => {
    setShowDropdown(false);
    setSearchQuery("");
    const fullName = loc.country ? `${loc.name}, ${loc.country}` : loc.name;
    loadWeather(loc.latitude, loc.longitude, fullName);
  };

  const getWeatherTheme = (code: number, isDay: boolean) => {
    const isRain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code);
    const isStorm = [95, 96, 99].includes(code);
    const isSnow = [71, 73, 75, 77, 85, 86].includes(code);

    if (isStorm) {
      return {
        type: "storm",
        gradient: "bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950",
      };
    }
    if (isRain) {
      return {
        type: "rain",
        gradient: "bg-gradient-to-br from-sky-800 via-blue-900 to-indigo-950",
      };
    }
    if (isSnow) {
      return {
        type: "snow",
        gradient: "bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-900",
      };
    }
    if (!isDay) {
      return {
        type: "night",
        gradient: "bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900",
      };
    }
    if (code === 0 || code === 1) {
      return {
        type: "sun",
        gradient: "bg-gradient-to-br from-amber-400 via-sky-500 to-blue-600",
      };
    }
    return {
      type: "cloud",
      gradient: "bg-gradient-to-br from-sky-500 via-sky-600 to-slate-700",
    };
  };

  const getUvLevelInfo = (uv: number) => {
    if (uv === 0) return { text: language === "vi" ? "Ban đêm" : "Nighttime", color: "text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200" };
    if (uv <= 2) return { text: language === "vi" ? "Thấp" : "Low", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200" };
    if (uv <= 5) return { text: language === "vi" ? "Vừa" : "Moderate", color: "text-amber-500 bg-amber-50 dark:bg-amber-950/60 border-amber-200" };
    if (uv <= 7) return { text: language === "vi" ? "Cao" : "High", color: "text-orange-500 bg-orange-50 dark:bg-orange-950/60 border-orange-200" };
    if (uv <= 10) return { text: language === "vi" ? "Rất cao" : "Very High", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200" };
    return { text: language === "vi" ? "Nguy hiểm" : "Extreme", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/60 border-purple-200" };
  };

  // Generate Weather Summary Texts (Build based primarily on AirVisual data)
  const getSummaryInfo = () => {
    if (!weatherData) return null;

    const avCurrent = airVisualFullData?.current;

    const currentTemp = avCurrent ? avCurrent.temperature : weatherData.current.temperature;
    const feelsLike = avCurrent ? avCurrent.feelsLike : weatherData.current.feelsLike;
    const humidityVal = avCurrent ? avCurrent.humidity : weatherData.current.humidity;
    const pressureVal = avCurrent ? avCurrent.pressure : weatherData.current.pressure;
    const weatherDesc = avCurrent
      ? getAirVisualWeatherInfo(avCurrent.weatherDesc, language).desc
      : getWmoWeatherInfo(weatherData.current.weatherCode, weatherData.current.isDay, language).desc;

    // Use AirVisual hourly if available
    const hourlyForecast = (airVisualFullData?.hourly && airVisualFullData.hourly.length > 0)
      ? airVisualFullData.hourly
      : weatherData.hourly;

    const nextHour1 = hourlyForecast[1] || weatherData.hourly[1];
    const nextHour2 = hourlyForecast[2] || weatherData.hourly[2];

    let next2HoursText = "";
    if (nextHour1 && nextHour2) {
      const isRain = nextHour1.pop > 30 || nextHour2.pop > 30;
      const h1Desc = getWmoWeatherInfo(nextHour1.weatherCode, nextHour1.isDay, language).desc;
      if (isRain) {
        next2HoursText = language === "vi"
          ? `Trong 2 giờ tiếp theo, khả năng có mưa là ${Math.max(nextHour1.pop, nextHour2.pop)}%, dự báo ${h1Desc.toLowerCase()}.`
          : `In the next 2 hours, precipitation chance is ${Math.max(nextHour1.pop, nextHour2.pop)}%, forecast ${h1Desc.toLowerCase()}.`;
      } else {
        next2HoursText = language === "vi"
          ? `Trong 2 giờ tiếp theo, thời tiết tiếp tục ${h1Desc.toLowerCase()}, nhiệt độ giữ khoảng ${nextHour1.temperature}°C.`
          : `In the next 2 hours, weather remains ${h1Desc.toLowerCase()}, temp around ${nextHour1.temperature}°C.`;
      }
    }

    let adviceText = "";
    if (avCurrent) {
      const aqiStatusText = getAqiLevelInfo(avCurrent.aqi, language).text;
      if (avCurrent.aqi > 100) {
        adviceText += language === "vi"
          ? `Chất lượng không khí ở mức ${avCurrent.aqi} (${aqiStatusText}), bạn nên đeo khẩu trang chống bụi mịn N95 khi ra ngoài. `
          : `Air quality is at ${avCurrent.aqi} (${aqiStatusText}), wear an N95 mask outdoors. `;
      } else {
        adviceText += language === "vi"
          ? `Chất lượng không khí ở mức ${avCurrent.aqi} (${aqiStatusText}), rất thích hợp cho các hoạt động ngoài trời. `
          : `Air quality is at ${avCurrent.aqi} (${aqiStatusText}), great for outdoor activities. `;
      }
    } else if (weatherData.current.uvIndex >= 6) {
      adviceText += language === "vi"
        ? `Chỉ số UV ở mức ${weatherData.current.uvIndex} (Khá cao), bạn nên dùng kem chống nắng và đội mũ rộng vành khi ra ngoài. `
        : `UV index is at ${weatherData.current.uvIndex} (High), wear sunscreen and a hat outdoors. `;
    }

    if (weatherData.current.rain > 0 || (nextHour1 && nextHour1.pop > 40)) {
      adviceText += language === "vi"
        ? `Khả năng cao có mưa rào, bạn nhớ chuẩn bị sẵn áo mưa hoặc ô dù. `
        : `High chance of rain showers, remember to bring an umbrella or raincoat. `;
    } else if (currentTemp >= 28) {
      adviceText += language === "vi"
        ? `Thời tiết oi nóng (${currentTemp}°C), nên chọn trang phục vải mỏng nhẹ thoáng mát và bổ sung đủ nước. `
        : `Hot weather (${currentTemp}°C), wear lightweight breathable clothes and stay hydrated. `;
    } else {
      adviceText += language === "vi"
        ? `Thời tiết mát mẻ dễ chịu (${currentTemp}°C), chọn trang phục thoải mái. `
        : `Pleasant cool weather (${currentTemp}°C), wear comfortable clothes. `;
    }

    // Explanations for key metrics
    const uvVal = weatherData.current.uvIndex;
    let uvExplanation = "";
    if (uvVal === 0 || !weatherData.current.isDay) {
      uvExplanation = language === "vi"
        ? `Chỉ số UV bằng 0 (Ban đêm) - Mặt Trời đã lặn, hoàn toàn không có bức xạ cực tím.`
        : `UV Index 0 (Nighttime) - Sun has set, zero ultraviolet radiation.`;
    } else if (uvVal <= 2) {
      uvExplanation = language === "vi"
        ? `Chỉ số UV ở mức ${uvVal} (Thấp) - Bức xạ cực tím an toàn, không lo sạm da hay tổn thương mắt khi ra ngoài.`
        : `UV Index ${uvVal} (Low) - Safe ultraviolet level, minimal sunburn risk.`;
    } else if (uvVal <= 5) {
      uvExplanation = language === "vi"
        ? `Chỉ số UV ở mức ${uvVal} (Vừa) - Cần chú ý đeo khẩu trang hoặc đội mũ khi di chuyển lâu dưới nắng.`
        : `UV Index ${uvVal} (Moderate) - Wear a hat or mask during prolonged sun exposure.`;
    } else if (uvVal <= 7) {
      uvExplanation = language === "vi"
        ? `Chỉ số UV ở mức ${uvVal} (Cao) - Tia cực tím mạnh, dễ gây cháy nắng và hại mắt. Nên thoa kem chống nắng & đeo kính râm.`
        : `UV Index ${uvVal} (High) - Strong UV rays. Apply sunscreen and wear sunglasses.`;
    } else {
      uvExplanation = language === "vi"
        ? `Chỉ số UV ở mức ${uvVal} (Rất cao / Cực nguy hiểm) - Cực kỳ độc hại cho da. Tránh ra ngoài vào khoảng giữa trưa từ 10h đến 14h.`
        : `UV Index ${uvVal} (Very High/Extreme) - Harmful to skin. Avoid midday sun between 10am and 2pm.`;
    }

    let pressureExplanation = "";
    if (pressureVal < 1008) {
      pressureExplanation = language === "vi"
        ? `Áp suất khí quyển ${pressureVal} hPa (Thấp) - Khí quyển nhẹ làm không khí bốc lên cao tích tụ mây đen, báo hiệu dễ có mưa rào hoặc dông.`
        : `Atmospheric pressure ${pressureVal} hPa (Low) - Indicates potential rain showers or thunderstorms.`;
    } else if (pressureVal > 1018) {
      pressureExplanation = language === "vi"
        ? `Áp suất khí quyển ${pressureVal} hPa (Cao) - Nén không khí giữ bầu trời tạnh ráo, khô khoắn và bừng sáng.`
        : `Atmospheric pressure ${pressureVal} hPa (High) - Clear and bright skies.`;
    } else {
      pressureExplanation = language === "vi"
        ? `Áp suất khí quyển ${pressureVal} hPa (Bình thường) - Khí quyển ổn định, thời tiết dễ chịu.`
        : `Atmospheric pressure ${pressureVal} hPa (Normal) - Stable atmosphere and pleasant weather.`;
    }

    let humidityExplanation = "";
    if (humidityVal >= 85) {
      humidityExplanation = language === "vi"
        ? `Độ ẩm không khí ${humidityVal}% (Rất cao) - Mồ hôi khó bay hơi, tạo cảm giác oi rít và dễ đọng sương/mưa rào.`
        : `Humidity ${humidityVal}% (Very High) - Feels humid and sticky.`;
    } else if (humidityVal <= 45) {
      humidityExplanation = language === "vi"
        ? `Độ ẩm không khí ${humidityVal}% (Thấp) - Khí khô, nên bổ sung nhiều nước và dưỡng ẩm da.`
        : `Humidity ${humidityVal}% (Low) - Dry air, drink plenty of water and hydrate.`;
    } else {
      humidityExplanation = language === "vi"
        ? `Độ ẩm không khí ${humidityVal}% (Lý tưởng) - Cảm giác không khí thoáng đãng, vô cùng thoải mái.`
        : `Humidity ${humidityVal}% (Ideal) - Comfortable and fresh air.`;
    }

    return {
      location: weatherData.location.name,
      currentTemp,
      feelsLike,
      humidity: humidityVal,
      weatherDesc,
      next2HoursText,
      adviceText,
      uvExplanation,
      pressureExplanation,
      humidityExplanation,
    };
  };

  const summary = getSummaryInfo();
  const weatherTheme = weatherData
    ? getWeatherTheme(weatherData.current.weatherCode, weatherData.current.isDay)
    : null;

  const airVisualData = airVisualFullData?.current;
  const hourlyList = airVisualFullData?.hourly?.slice(0, 12) || [];
  const dailyList = airVisualFullData?.daily || [];

  return (
    <div className="space-y-4 w-full max-w-[1400px] mx-auto pb-8 min-w-0">
      {/* SECTION 1: HEADER CONTROLS & CITY SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 sm:p-5 rounded-3xl border border-sky-100 dark:border-slate-800 shadow-xs relative z-30">
        {/* Left Location Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs">
            <MapPin className="h-6 w-6 animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base sm:text-base font-black text-slate-900 dark:text-slate-100 leading-snug break-words">
                {weatherData?.location.name || (language === "vi" ? "Đang xác định vị trí..." : "Locating...")}
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-400">
              {language === "vi" ? "Dự báo thời tiết thời gian thực" : "Realtime Weather Forecast"}
            </p>
          </div>
        </div>

        {/* Right Search Input & GPS Locator */}
        <div className="flex items-center gap-2 relative z-40">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 z-10" />
            <Input
              type="text"
              placeholder={language === "vi" ? "Tìm thành phố (Hà Nội, Đà Nẵng...)" : "Search city (Tokyo, New York...)"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              className="pl-10 pr-8 h-11 sm:h-9 text-sm sm:text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
            />
            {searching && (
              <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500 z-10" />
            )}

            {/* Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto p-1">
                {searchResults.map((loc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <span>
                      {loc.name}
                      {loc.admin1 ? `, ${loc.admin1}` : ""}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {loc.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              try {
                localStorage.removeItem("my_money_last_weather_location");
                localStorage.removeItem("my_money_cached_weather_data");
                localStorage.removeItem("my_money_cached_airvisual_data");
              } catch {}
              detectUserLocation(true);
            }}
            className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl border-sky-200 dark:border-slate-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
            title={language === "vi" ? "Định vị vị trí GPS / IP hiện tại" : "Detect current GPS / IP location"}
          >
            <Navigation className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              weatherData &&
              loadWeather(
                weatherData.location.latitude,
                weatherData.location.longitude,
                weatherData.location.name
              )
            }
            className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
            title={language === "vi" ? "Tải lại dữ liệu thời tiết" : "Reload weather data"}
          >
            <RefreshCw className={cn("h-5 w-5 sm:h-4 sm:w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        <span className="text-xs font-black text-slate-400 shrink-0 mr-1">
          {language === "vi" ? "Nhanh:" : "Quick:"}
        </span>
        {PRESET_CITIES.map((city, idx) => {
          const isSelected = Boolean(
            weatherData?.location.name?.toLowerCase().includes(city.name.toLowerCase())
          );
          return (
            <Button
              key={idx}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleSelectLocation(city)}
              className={cn(
                "h-8 sm:h-7 text-xs font-black px-3.5 sm:px-3 rounded-full transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "bg-sky-600 text-white hover:bg-sky-700 shadow-xs border-sky-600"
                  : "border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400"
              )}
            >
              {city.name}
            </Button>
          );
        })}
      </div>

      {(loading && (!weatherData || !airVisualFullData)) ? (
        <WeatherSkeletonLoader language={language} locatingStatus={locatingStatus} />
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/40 rounded-3xl border border-rose-200 text-rose-600 text-sm font-bold space-y-2">
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={detectUserLocation}
            className="text-xs font-bold border-rose-300 text-rose-700 bg-white cursor-pointer"
          >
            {language === "vi" ? "Thử lại" : "Retry"}
          </Button>
        </div>
      ) : weatherData && weatherTheme ? (
        <>
          {/* SECTION 2: AIRVISUAL REAL-TIME HERO CARD */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4 text-sky-500" /> {language === "vi" ? "DỰ BÁO THỜI TIẾT THỜI GIAN THỰC (AIRVISUAL / IQAIR)" : "REALTIME WEATHER FORECAST (AIRVISUAL / IQAIR)"}
              </div>
              <span className="text-[11px] font-extrabold text-slate-400">
                {language === "vi" ? "Đồng bộ từ Trạm Khí Tượng AirVisual" : "Synced from AirVisual Weather Station"}
              </span>
            </div>

            {airVisualData ? (
              <div className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-6 shadow-xl border border-white/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 transition-all duration-700 flex flex-col justify-between min-h-[280px]">
                {/* Decorative Background Glow */}
                <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Badge className="bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-200 border-emerald-400/30 backdrop-blur text-xs font-black px-3 py-1 rounded-full w-fit max-w-full truncate">
                      💨 {language === "vi" ? "Trạm AirVisual / IQAir (Mỹ - Trực Tiếp)" : "AirVisual / IQAir Station (US - Live)"}
                    </Badge>
                    <Badge className={cn("text-xs font-black px-2.5 py-1 rounded-full border shadow-xs w-fit shrink-0", airVisualData.aqiColor)}>
                      AQI {airVisualData.aqi} • {getAqiLevelInfo(airVisualData.aqi, language).text}
                    </Badge>
                  </div>

                  <div className="flex items-baseline gap-3 pt-1">
                    <h1 className="text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md text-white">
                      {airVisualData.temperature}°
                      <span className="text-3xl font-black text-indigo-200">C</span>
                    </h1>
                    <div className="text-4xl drop-shadow-sm">{airVisualData.icon}</div>
                  </div>

                  <h3 className="text-lg font-black text-white tracking-wide truncate">
                    {airVisualData.weatherDesc}
                  </h3>

                  <p className="text-xs font-extrabold text-indigo-200 flex items-center gap-2 truncate">
                    <span>{language === "vi" ? `Cảm giác như ${airVisualData.feelsLike}°C` : `Feels like ${airVisualData.feelsLike}°C`}</span>
                    <span>•</span>
                    <span>{language === "vi" ? `Độ ẩm ${airVisualData.humidity}%` : `Humidity ${airVisualData.humidity}%`}</span>
                  </p>
                </div>

                {/* AirVisual Grid of Key Weather Metrics */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/20">
                  <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2.5 text-center col-span-1">
                    <div className="text-[10px] font-black text-indigo-200 truncate">🍃 {language === "vi" ? "Chất Lượng US AQI" : "US AQI Quality"}</div>
                    <div className="text-xs sm:text-sm font-black text-emerald-300 truncate">{language === "vi" ? `AQI ${airVisualData.aqi} • ${getAqiLevelInfo(airVisualData.aqi, language).text}` : `AQI ${airVisualData.aqi} • ${getAqiLevelInfo(airVisualData.aqi, language).text}`}</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2.5 text-center col-span-1">
                    <div className="text-[10px] font-black text-indigo-200 truncate">💧 {language === "vi" ? "Độ Ẩm" : "Humidity"}</div>
                    <div className="text-sm font-black text-white">{airVisualData.humidity}%</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2.5 text-center col-span-1">
                    <div className="text-[10px] font-black text-indigo-200 truncate">💨 {language === "vi" ? "Tốc Độ Gió" : "Wind Speed"}</div>
                    <div className="text-sm font-black text-white">{airVisualData.windSpeed} km/h</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2.5 text-center col-span-1">
                    <div className="text-[10px] font-black text-indigo-200 truncate">⏲️ {language === "vi" ? "Áp Suất" : "Pressure"}</div>
                    <div className="text-sm font-black text-white">{airVisualData.pressure} hPa</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* SECTION 3: HOURLY FORECAST (12 HOURS - AIRVISUAL) */}
          <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-sky-100 dark:border-slate-800 shadow-xs rounded-3xl overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <CardTitle className="text-lg sm:text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-5.5 w-5.5 text-sky-500" />
                {language === "vi" ? "Thời Tiết Trong Ngày (12 Giờ Tới - AirVisual)" : "Hourly Forecast (Next 12 Hours - AirVisual)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {/* Mobile View: Vertical 1 Item/Row List (< 640px) */}
              <div className="flex sm:hidden flex-col space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {hourlyList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/95 dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700 gap-3 shadow-xs"
                  >
                    {/* Time & Weather Description */}
                    <div className="w-32 flex flex-col justify-center min-w-0 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-slate-900 dark:text-slate-100">
                          {idx === 0 ? (language === "vi" ? "Bây giờ" : "Now") : item.time}
                        </span>
                        {idx === 0 && (
                          <Badge className="bg-sky-500 text-white text-[9px] px-1.5 py-0.5 font-bold rounded-md">
                            {language === "vi" ? "Hiện tại" : "Current"}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                        {getWmoWeatherInfo(item.weatherCode, item.isDay, language).desc}
                      </span>
                    </div>

                    {/* Icon & Rain Probability */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                      <span className="text-2xl shrink-0">
                        {getWmoWeatherInfo(item.weatherCode, item.isDay, language).icon}
                      </span>
                      {item.pop > 0 ? (
                        <span className="text-xs font-black text-sky-700 dark:text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-lg shrink-0">
                          💧 {item.pop}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold shrink-0">—</span>
                      )}
                    </div>

                    {/* Temperature */}
                    <div className="text-xl font-black text-slate-900 dark:text-white shrink-0 w-16 text-right">
                      {item.temperature}°C
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Grid 12 items filling 100% width (>= 640px) */}
              <div className="hidden sm:grid grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-2.5 w-full">
                {hourlyList.map((item, idx) => (
                  <div
                    key={idx}
                    title={`${item.time}: ${getWmoWeatherInfo(item.weatherCode, item.isDay, language).desc} • ${item.temperature}°C`}
                    className="flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 w-full min-w-0 space-y-1 hover:border-sky-300 dark:hover:border-sky-700 transition-all text-center cursor-help"
                  >
                    <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate w-full">
                      {idx === 0 ? (language === "vi" ? "Bây giờ" : "Now") : item.time}
                    </span>

                    <span className="text-xl sm:text-2xl py-0.5">
                      {getWmoWeatherInfo(item.weatherCode, item.isDay, language).icon}
                    </span>

                    {/* Weather Description Text Label */}
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate w-full leading-tight">
                      {getWmoWeatherInfo(item.weatherCode, item.isDay, language).desc}
                    </span>

                    <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate w-full">
                      {item.temperature}°C
                    </span>

                    {item.pop > 0 ? (
                      <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-md flex items-center justify-center gap-0.5 w-full truncate">
                        💧 {item.pop}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">—</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: 7-DAY EXTENDED FORECAST & HEALTH ADVICE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 7-Day Forecast Column */}
            <Card className="lg:col-span-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-sky-100 dark:border-slate-800 shadow-xs rounded-3xl overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <CardTitle className="text-lg sm:text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sun className="h-5.5 w-5.5 text-amber-500" />
                  {language === "vi" ? "Dự Báo Thời Tiết 1 Tuần Tới (7 Ngày - AirVisual)" : "7-Day Extended Forecast (AirVisual)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Mobile View 1 Item/Row for 7-Day Forecast (< 640px) */}
                <div className="flex sm:hidden flex-col space-y-3">
                  {dailyList.map((day, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50/95 dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900 dark:text-slate-100">
                            {idx === 0 ? (language === "vi" ? "Hôm nay" : "Today") : day.dayName}
                          </span>
                          {idx === 0 && (
                            <Badge className="bg-sky-500 text-white text-[10px] px-1.5 py-0.5 font-bold rounded-md">
                              {language === "vi" ? "Hôm nay" : "Today"}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                          {day.popMax > 0 ? (language === "vi" ? `💧 Mưa ${day.popMax}%` : `💧 Rain ${day.popMax}%`) : (language === "vi" ? "Trời khô ráo" : "Dry")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-3xl shrink-0">
                            {getWmoWeatherInfo(day.weatherCode, true, language).icon}
                          </span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                            {getWmoWeatherInfo(day.weatherCode, true, language).desc}
                          </span>
                        </div>

                        <div className="text-lg font-black text-slate-900 dark:text-white shrink-0">
                          <span className="text-slate-400 font-bold text-base mr-2">{day.tempMin}°</span>
                          <span>{day.tempMax}°C</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View Table for 7-Day Forecast (>= 640px) */}
                <div className="hidden sm:flex flex-col space-y-2.5">
                  {dailyList.map((day, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold gap-3 hover:bg-sky-50/60 dark:hover:bg-slate-800 transition-colors"
                    >
                      {/* Day Name */}
                      <div className="w-28 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{idx === 0 ? (language === "vi" ? "Hôm nay" : "Today") : day.dayName}</span>
                        {idx === 0 && (
                          <Badge className="bg-sky-500 text-white text-[9px] px-1.5 py-0 rounded-md">
                            {language === "vi" ? "Hôm nay" : "Today"}
                          </Badge>
                        )}
                      </div>

                      {/* Weather Icon & Desc */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xl shrink-0">
                          {getWmoWeatherInfo(day.weatherCode, true, language).icon}
                        </span>
                        <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
                          {getWmoWeatherInfo(day.weatherCode, true, language).desc}
                        </span>
                      </div>

                      {/* Rain Chance % */}
                      <div className="w-16 text-right shrink-0">
                        {day.popMax > 0 ? (
                          <span className="text-sky-600 dark:text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-md">
                            💧 {day.popMax}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </div>

                      {/* Temperature Range Bar */}
                      <div className="flex items-center gap-2 shrink-0 w-32 justify-end">
                        <span className="text-slate-500 font-bold">{day.tempMin}°</span>
                        <div className="w-14 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-amber-500 rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                        <span className="text-slate-800 dark:text-slate-100 font-black">{day.tempMax}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weather Insights & Clothing Advice Column */}
            <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-sky-100 dark:border-slate-800 shadow-xs rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg sm:text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Shirt className="h-5.5 w-5.5 text-indigo-500" />
                  {language === "vi" ? "Lời Khuyên Bỏ Túi (Từ AirVisual)" : "Pocket Tips (By AirVisual)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Air Quality & UV Warning Card */}
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-sm text-emerald-900 dark:text-emerald-300">
                      <Wind className="h-4.5 w-4.5 text-emerald-500" />
                      <span>
                        {airVisualData
                          ? (language === "vi" ? `AirVisual AQI: ${airVisualData.aqi} (${getAqiLevelInfo(airVisualData.aqi, language).text})` : `AirVisual AQI: ${airVisualData.aqi} (${getAqiLevelInfo(airVisualData.aqi, language).text})`)
                          : (language === "vi" ? `Chỉ số UV: ${weatherData.current.uvIndex} (${getUvLevelInfo(weatherData.current.uvIndex).text})` : `UV Index: ${weatherData.current.uvIndex} (${getUvLevelInfo(weatherData.current.uvIndex).text})`)}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                      {airVisualData && airVisualData.aqi > 100
                        ? (language === "vi" ? "Cảnh báo bụi mịn không khí kém! Nên đeo khẩu trang N95 khi di chuyển ngoài trời." : "Air pollution warning! Wear an N95 mask outdoors.")
                        : (language === "vi" ? "Chất lượng không khí và chỉ số môi trường ở mức tốt, thích hợp cho mọi hoạt động ngoài trời." : "Air quality is good, suitable for all outdoor activities.")}
                    </p>
                  </div>

                  {/* Clothing Advice */}
                  <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-sm text-sky-900 dark:text-sky-300">
                      <Shirt className="h-4.5 w-4.5 text-sky-500" />
                      <span>{language === "vi" ? "Gợi ý trang phục hôm nay" : "Today's Outfit Suggestion"}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                      {(airVisualData?.temperature ?? weatherData.current.temperature) >= 28
                        ? (language === "vi" ? "Thời tiết khá oi nóng! Nên ưu tiên quần áo chất liệu cotton mỏng nhẹ, thoáng khí và uống nhiều nước." : "Hot weather! Choose thin, breathable cotton clothing and stay hydrated.")
                        : (airVisualData?.temperature ?? weatherData.current.temperature) <= 20
                        ? (language === "vi" ? "Thời tiết se lạnh! Bạn nên mặc áo khoác giữ ấm nhẹ khi ra đường." : "Chilly weather! Wear a light warm jacket when going outside.")
                        : (language === "vi" ? "Thời tiết vô cùng dễ chịu! Thích hợp chọn các trang phục thoải mái." : "Very pleasant weather! Feel free to wear comfortable casual clothes.")}
                    </p>
                  </div>

                  {/* Rain & Wind Reminder */}
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-sm text-indigo-900 dark:text-indigo-300">
                      <CloudRain className="h-4.5 w-4.5 text-indigo-500" />
                      <span>{language === "vi" ? "Gió & Khả năng mưa" : "Wind & Rain Probability"}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                      {weatherData.current.rain > 0 || weatherData.hourly[0]?.pop > 40
                        ? (language === "vi" ? "Khả năng có mưa cao! Nhớ mang theo ô/dù hoặc áo mưa khi đi ra ngoài." : "High chance of rain! Bring an umbrella or raincoat with you.")
                        : (language === "vi" ? "Tốc độ gió " + (airVisualData?.windSpeed ?? weatherData.current.windSpeed) + " km/h, không lo có mưa rào bất chợt." : `Wind speed ${airVisualData?.windSpeed ?? weatherData.current.windSpeed} km/h, low chance of sudden rain.`)}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold text-slate-500 text-center">
                  {language === "vi" ? "Dữ liệu đồng bộ trực tiếp từ Trạm Khí Tượng AirVisual / IQAir 💨" : "Data synced directly from AirVisual / IQAir Station 💨"}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {/* WEATHER SUMMARY DIALOG */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[94vw] max-w-xl sm:w-full rounded-3xl p-0 overflow-hidden max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900"
        >
          {/* Sticky Header with Large X Close Button */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <FileText className="h-6 w-6 text-amber-500" /> {language === "vi" ? "Tóm Tắt Thời Tiết Nhanh" : "Quick Weather Summary"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                {language === "vi" ? "Tổng hợp thông tin thời tiết & lời khuyên dành cho bạn." : "Weather summary & tips tailored for you."}
              </DialogDescription>
            </div>

            <DialogClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 dark:hover:border-rose-800 text-slate-800 dark:text-slate-100 shadow-md shrink-0 cursor-pointer transition-all hover:scale-110"
                title={language === "vi" ? "Đóng bảng tóm tắt" : "Close summary panel"}
              >
                <X className="h-6 w-6 sm:h-7 sm:w-7 font-black" />
                <span className="sr-only">{language === "vi" ? "Đóng" : "Close"}</span>
              </Button>
            </DialogClose>
          </div>

          {/* Scrollable Content Area */}
          {summary && (
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 max-h-[calc(85vh-90px)]">
              {/* Location Card */}
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 space-y-1">
                <div className="text-sm font-black text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                  <MapPin className="h-4.5 w-4.5" /> {language === "vi" ? "Vị trí tra cứu:" : "Search location:"}
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                  {summary.location}
                </p>
              </div>

              {/* Current Weather Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-sm font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-amber-500" /> {language === "vi" ? "Thời tiết hiện tại:" : "Current weather:"}
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                  <span>{summary.weatherDesc}</span>
                  <span className="text-sky-600 dark:text-sky-400 text-3xl font-black">{summary.currentTemp}°C</span>
                </div>
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                  {language === "vi" ? `Cảm giác như ` : `Feels like `}<b className="text-slate-900 dark:text-white font-black">{summary.feelsLike}°C</b> • {language === "vi" ? `Độ ẩm ` : `Humidity `}<b className="text-slate-900 dark:text-white font-black">{summary.humidity}%</b>
                </p>
              </div>

              {/* Next 2 Hours Card */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                <div className="text-sm font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <CloudRain className="h-4.5 w-4.5 text-indigo-500" /> {language === "vi" ? "Biến động 2 giờ tới:" : "Next 2 hours forecast:"}
                </div>
                <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {summary.next2HoursText}
                </p>
              </div>

              {/* Detailed Metrics Explanation Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-2.5">
                <div className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 border-b border-emerald-200 dark:border-emerald-800/80 pb-2">
                  <Gauge className="h-4.5 w-4.5 text-emerald-600" /> {language === "vi" ? "Giải thích các chỉ số khí tượng (Dễ hiểu):" : "Meteorological indices explanation:"}
                </div>

                <div className="space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <p className="leading-relaxed">
                    <span className="text-amber-700 dark:text-amber-300 font-black">☀️ {language === "vi" ? "Chỉ số UV:" : "UV Index:"}</span>{" "}
                    {summary.uvExplanation}
                  </p>
                  <p className="leading-relaxed">
                    <span className="text-sky-700 dark:text-sky-300 font-black">🎈 {language === "vi" ? "Áp suất:" : "Pressure:"}</span>{" "}
                    {summary.pressureExplanation}
                  </p>
                  <p className="leading-relaxed">
                    <span className="text-indigo-700 dark:text-indigo-300 font-black">💧 {language === "vi" ? "Độ ẩm:" : "Humidity:"}</span>{" "}
                    {summary.humidityExplanation}
                  </p>
                </div>
              </div>

              {/* Advice Card */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 space-y-1.5">
                <div className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Shirt className="h-4.5 w-4.5 text-amber-500" /> {language === "vi" ? "Lời khuyên bỏ túi:" : "Pocket Tips:"}
                </div>
                <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {summary.adviceText}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

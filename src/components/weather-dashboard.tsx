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
  WeatherData,
  WeatherLocation,
} from "@/lib/weather-service";
import {
  fetchAirVisualFullData,
  AirVisualFullData,
  AirVisualWeatherData,
} from "@/lib/airvisual-service";
import { fetchJmaWeatherData } from "@/lib/jma-weather-service";
import { cn } from "@/lib/utils";

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

export function WeatherDashboard() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [airVisualFullData, setAirVisualFullData] = useState<AirVisualFullData | null>(null);
  const [jmaData, setJmaData] = useState<WeatherData | null>(null);
  const [hourlySource, setHourlySource] = useState<"openmeteo" | "airvisual" | "jma">("openmeteo");
  const [dailySource, setDailySource] = useState<"openmeteo" | "airvisual" | "jma">("openmeteo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary Dialog State
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const loadWeather = useCallback(async (lat: number, lng: number, locName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [data, avFullData, jmaDataResult] = await Promise.all([
        fetchWeatherData(lat, lng, locName),
        fetchAirVisualFullData(lat, lng),
        fetchJmaWeatherData(lat, lng, locName).catch(() => null),
      ]);
      setWeatherData(data);
      setAirVisualFullData(avFullData);
      setJmaData(jmaDataResult);
    } catch (err: any) {
      setError(err?.message || "Không thể tải dữ liệu thời tiết");
    } finally {
      setLoading(false);
    }
  }, []);

  // Detect user geolocation
  const detectUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      loadWeather(PRESET_CITIES[0].latitude, PRESET_CITIES[0].longitude, PRESET_CITIES[0].name);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        loadWeather(latitude, longitude);
      },
      () => {
        loadWeather(PRESET_CITIES[0].latitude, PRESET_CITIES[0].longitude, PRESET_CITIES[0].name);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [loadWeather]);

  useEffect(() => {
    detectUserLocation();

    const handleOpenSummary = () => setSummaryOpen(true);
    const handleRefreshLocation = () => detectUserLocation();

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
    if (uv === 0) return { text: "Ban đêm", color: "text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200" };
    if (uv <= 2) return { text: "Thấp", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200" };
    if (uv <= 5) return { text: "Vừa", color: "text-amber-500 bg-amber-50 dark:bg-amber-950/60 border-amber-200" };
    if (uv <= 7) return { text: "Cao", color: "text-orange-500 bg-orange-50 dark:bg-orange-950/60 border-orange-200" };
    if (uv <= 10) return { text: "Rất cao", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200" };
    return { text: "Nguy hiểm", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/60 border-purple-200" };
  };

  // Generate Weather Summary Texts
  const getSummaryInfo = () => {
    if (!weatherData) return null;

    const nextHour1 = weatherData.hourly[1];
    const nextHour2 = weatherData.hourly[2];

    let next2HoursText = "";
    if (nextHour1 && nextHour2) {
      const isRain = nextHour1.pop > 30 || nextHour2.pop > 30;
      if (isRain) {
        next2HoursText = `Trong 2 giờ tiếp theo, khả năng có mưa là ${Math.max(
          nextHour1.pop,
          nextHour2.pop
        )}%, dự báo ${nextHour1.weatherDesc}.`;
      } else {
        next2HoursText = `Trong 2 giờ tiếp theo, thời tiết tiếp tục ${nextHour1.weatherDesc}, nhiệt độ giữ khoảng ${nextHour1.temperature}°C.`;
      }
    }

    let adviceText = "";
    if (weatherData.current.uvIndex >= 6) {
      adviceText += `Chỉ số UV ở mức ${weatherData.current.uvIndex} (Khá cao), bạn nên dùng kem chống nắng và đội mũ rộng vành khi ra ngoài. `;
    }
    if (weatherData.current.rain > 0 || (nextHour1 && nextHour1.pop > 40)) {
      adviceText += `Khả năng cao có mưa rào, bạn nhớ chuẩn bị sẵn áo mưa hoặc ô dù. `;
    } else if (weatherData.current.temperature >= 28) {
      adviceText += `Thời tiết oi nóng, nên chọn trang phục vải mỏng nhẹ thoáng mát và bổ sung đủ nước. `;
    } else {
      adviceText += `Thời tiết mát mẻ dễ chịu, rất thích hợp cho các hoạt động ngoài trời. `;
    }

    // Explanations for key metrics
    const uvVal = weatherData.current.uvIndex;
    let uvExplanation = "";
    if (uvVal === 0 || !weatherData.current.isDay) {
      uvExplanation = `Chỉ số UV bằng 0 (Ban đêm) - Mặt Trời đã lặn, hoàn toàn không có bức xạ cực tím.`;
    } else if (uvVal <= 2) {
      uvExplanation = `Chỉ số UV ở mức ${uvVal} (Thấp) - Bức xạ cực tím an toàn, không lo sạm da hay tổn thương mắt khi ra ngoài.`;
    } else if (uvVal <= 5) {
      uvExplanation = `Chỉ số UV ở mức ${uvVal} (Vừa) - Cần chú ý đeo khẩu trang hoặc đội mũ khi di chuyển lâu dưới nắng.`;
    } else if (uvVal <= 7) {
      uvExplanation = `Chỉ số UV ở mức ${uvVal} (Cao) - Tia cực tím mạnh, dễ gây cháy nắng và hại mắt. Nên thoa kem chống nắng & đeo kính râm.`;
    } else {
      uvExplanation = `Chỉ số UV ở mức ${uvVal} (Rất cao / Cực nguy hiểm) - Cực kỳ độc hại cho da. Tránh ra ngoài vào khoảng giữa trưa từ 10h đến 14h.`;
    }

    const pressureVal = weatherData.current.pressure;
    let pressureExplanation = "";
    if (pressureVal < 1008) {
      pressureExplanation = `Áp suất khí quyển ${pressureVal} hPa (Thấp) - Khí quyển nhẹ làm không khí bốc lên cao tích tụ mây đen, báo hiệu dễ có mưa rào hoặc dông. Người nhạy cảm có thể thấy hơi mệt mỏi nhẹ.`;
    } else if (pressureVal > 1018) {
      pressureExplanation = `Áp suất khí quyển ${pressureVal} hPa (Cao) - Nén không khí giữ bầu trời tạnh ráo, khô khoắn và bừng sáng.`;
    } else {
      pressureExplanation = `Áp suất khí quyển ${pressureVal} hPa (Bình thường) - Khí quyển ổn định, thời tiết dễ chịu.`;
    }

    const humidityVal = weatherData.current.humidity;
    let humidityExplanation = "";
    if (humidityVal >= 85) {
      humidityExplanation = `Độ ẩm không khí ${humidityVal}% (Rất cao) - Mồ hôi khó bay hơi, tạo cảm giác oi rít và dễ đọng sương/mưa rào.`;
    } else if (humidityVal <= 45) {
      humidityExplanation = `Độ ẩm không khí ${humidityVal}% (Thấp) - Khí khô, nên bổ sung nhiều nước và dưỡng ẩm da.`;
    } else {
      humidityExplanation = `Độ ẩm không khí ${humidityVal}% (Lý tưởng) - Cảm giác không khí thoáng đãng, vô cùng thoải mái.`;
    }

    return {
      location: weatherData.location.name,
      currentTemp: weatherData.current.temperature,
      feelsLike: weatherData.current.feelsLike,
      humidity: weatherData.current.humidity,
      weatherDesc: weatherData.current.weatherDesc,
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
  const hourlyList = (
    hourlySource === "airvisual"
      ? airVisualFullData?.hourly
      : hourlySource === "jma"
      ? jmaData?.hourly
      : weatherData?.hourly
  )?.slice(0, 12) || [];

  const dailyList = (
    dailySource === "airvisual"
      ? airVisualFullData?.daily
      : dailySource === "jma"
      ? jmaData?.daily
      : weatherData?.daily
  ) || [];

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
                {weatherData?.location.name || "Đang xác định vị trí..."}
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-400">
              Dự báo thời tiết thời gian thực
            </p>
          </div>
        </div>

        {/* Right Search Input & GPS Locator */}
        <div className="flex items-center gap-2 relative z-40">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 z-10" />
            <Input
              type="text"
              placeholder="Tìm thành phố (Hà Nội, Đà Nẵng...)"
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
            onClick={detectUserLocation}
            className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl border-sky-200 dark:border-slate-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 shrink-0"
            title="Định vị vị trí GPS hiện tại"
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
            className="h-11 w-11 sm:h-9 sm:w-9 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
            title="Tải lại dữ liệu thời tiết"
          >
            <RefreshCw className={cn("h-5 w-5 sm:h-4 sm:w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Preset Cities Quick Select Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        <span className="text-xs font-black text-slate-400 shrink-0 mr-1">
          Nhanh:
        </span>
        {PRESET_CITIES.map((city, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => handleSelectLocation(city)}
            className="h-8 sm:h-7 text-xs font-black px-3.5 sm:px-3 rounded-full border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400 transition-all shrink-0"
          >
            {city.name}
          </Button>
        ))}
      </div>

      {loading && !weatherData ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
          <Spinner className="h-10 w-10 text-sky-500" />
          <p className="text-sm font-black text-slate-400">
            Đang tải dự báo thời tiết thời gian thực...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/40 rounded-3xl border border-rose-200 text-rose-600 text-sm font-bold space-y-2">
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={detectUserLocation}
            className="text-xs font-bold border-rose-300 text-rose-700 bg-white"
          >
            Thử lại
          </Button>
        </div>
      ) : weatherData && weatherTheme ? (
        <>
          {/* SECTION 2: COMPARISON OF 3 REAL-TIME WEATHER APIS (OPEN-METEO, AIRVISUAL, JMA JAPAN) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4 text-sky-500" /> SO SÁNH THỜI TIẾT THỜI GIAN THỰC (3 NGUỒN API DỰ BÁO)
              </div>
              <span className="text-[11px] font-extrabold text-slate-400">
                Đồng bộ cùng vị trí GPS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* CARD 1: OPEN-METEO API */}
              <div
                className={cn(
                  "relative overflow-hidden rounded-3xl text-white p-5 sm:p-6 shadow-xl border border-white/20 transition-all duration-700 flex flex-col justify-between min-h-[300px]",
                  weatherTheme.gradient
                )}
              >
                {/* 1. ANIMATED FALLING RAINDROPS */}
                {(weatherTheme.type === "rain" || weatherTheme.type === "storm") && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-60">
                    {[...Array(15)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-[1.5px] bg-gradient-to-b from-transparent via-sky-200 to-transparent rounded-full animate-raindrop"
                        style={{
                          left: `${(i * 6.5 + 1) % 100}%`,
                          height: `${24 + (i % 6) * 6}px`,
                          animationDuration: `${0.45 + (i % 5) * 0.12}s`,
                          animationDelay: `${(i % 7) * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* 2. ANIMATED DRIFTING CLOUDS */}
                {(weatherTheme.type === "cloud" || weatherTheme.type === "rain") && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-15 animate-cloud-float">
                    <div className="absolute top-2 left-6 text-6xl">☁️</div>
                    <div className="absolute top-8 right-12 text-5xl">☁️</div>
                  </div>
                )}

                {/* 3. ANIMATED SUNBURST PULSE */}
                {weatherTheme.type === "sun" && (
                  <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-300/35 blur-2xl pointer-events-none animate-sun-pulse z-0" />
                )}

                {/* 4. ANIMATED NIGHT STARS */}
                {weatherTheme.type === "night" && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1.5 h-1.5 bg-white rounded-full animate-pulse"
                        style={{
                          top: `${(i * 8 + 4) % 85}%`,
                          left: `${(i * 9 + 2) % 95}%`,
                          animationDuration: `${1.2 + (i % 3) * 0.6}s`,
                          animationDelay: `${(i % 5) * 0.25}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-white/25 hover:bg-white/35 text-white border-white/40 backdrop-blur text-xs font-black px-3 py-1 rounded-full truncate">
                      🌐 Nguồn 1: Open-Meteo (Châu Âu)
                    </Badge>
                    <span className="text-[11px] font-extrabold text-sky-100">
                      {weatherData.current.isDay ? "☀️ Ban Ngày" : "🌙 Ban Đêm"}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 pt-1">
                    <h1 className="text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md">
                      {weatherData.current.temperature}°
                      <span className="text-3xl font-black text-sky-100">C</span>
                    </h1>
                    <div className="text-4xl drop-shadow-sm">
                      {getWmoWeatherInfo(weatherData.current.weatherCode, weatherData.current.isDay).icon}
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white tracking-wide truncate">
                    {weatherData.current.weatherDesc}
                  </h3>

                  <p className="text-xs font-extrabold text-sky-100 flex items-center gap-2 truncate">
                    <span>Cảm giác như {weatherData.current.feelsLike}°C</span>
                    <span>•</span>
                    <span>Độ ẩm {weatherData.current.humidity}%</span>
                  </p>
                </div>

                {/* Open-Meteo Grid of Key Weather Metrics */}
                <div className="relative z-10 grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/20">
                  <div className="bg-white/15 backdrop-blur border border-white/25 rounded-2xl p-2 text-center">
                    <div className="text-[10px] font-black text-sky-100 truncate">💧 Độ Ẩm</div>
                    <div className="text-sm font-black text-white">{weatherData.current.humidity}%</div>
                  </div>

                  <div className="bg-white/15 backdrop-blur border border-white/25 rounded-2xl p-2 text-center">
                    <div className="text-[10px] font-black text-sky-100 truncate">💨 Tốc Độ Gió</div>
                    <div className="text-sm font-black text-white">{weatherData.current.windSpeed} km/h</div>
                  </div>

                  <div className="bg-white/15 backdrop-blur border border-white/25 rounded-2xl p-2 text-center">
                    <div className="text-[10px] font-black text-sky-100 truncate">☀️ Chỉ Số UV</div>
                    <div className="text-sm font-black text-white">
                      {weatherData.current.uvIndex} ({getUvLevelInfo(weatherData.current.uvIndex).text})
                    </div>
                  </div>

                  <div className="bg-white/15 backdrop-blur border border-white/25 rounded-2xl p-2 text-center">
                    <div className="text-[10px] font-black text-sky-100 truncate">⏲️ Áp Suất</div>
                    <div className="text-sm font-black text-white">{weatherData.current.pressure} hPa</div>
                  </div>

                  <div className="bg-white/15 backdrop-blur border border-white/25 rounded-2xl p-2 text-center">
                    <div className="text-[10px] font-black text-sky-100 truncate">🌧️ Lượng Mưa</div>
                    <div className="text-sm font-black text-white">{weatherData.current.rain} mm</div>
                  </div>

                  <div className="bg-white/15 backdrop-blur border border-white/25 rounded-2xl p-2 text-center">
                    <div className="text-[10px] font-black text-sky-100 truncate">🌅 Mọc / Lặn</div>
                    <div className="text-[11px] font-black text-white truncate">{weatherData.current.sunrise} / {weatherData.current.sunset}</div>
                  </div>
                </div>
              </div>

              {/* CARD 2: AIRVISUAL / IQAIR API */}
              {airVisualData ? (
                <div className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-6 shadow-xl border border-white/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 transition-all duration-700 flex flex-col justify-between min-h-[300px]">
                  {/* Decorative Background Glow */}
                  <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-200 border-emerald-400/30 backdrop-blur text-xs font-black px-3 py-1 rounded-full truncate">
                        💨 Nguồn 2: AirVisual / IQAir (Mỹ)
                      </Badge>
                      <Badge className={cn("text-xs font-black px-2.5 py-0.5 rounded-full border shadow-xs shrink-0", airVisualData.aqiColor)}>
                        AQI {airVisualData.aqi} • {airVisualData.aqiStatus}
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
                      <span>Cảm giác như {airVisualData.feelsLike}°C</span>
                      <span>•</span>
                      <span>Độ ẩm {airVisualData.humidity}%</span>
                    </p>
                  </div>

                  {/* AirVisual Grid of Key Weather Metrics */}
                  <div className="relative z-10 grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/20">
                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center col-span-2">
                      <div className="text-[10px] font-black text-indigo-200 truncate">🍃 Chất Lượng Không Khí US AQI</div>
                      <div className="text-xs sm:text-sm font-black text-emerald-300 truncate">Chỉ số {airVisualData.aqi} • {airVisualData.aqiStatus}</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-indigo-200 truncate">💧 Độ Ẩm</div>
                      <div className="text-sm font-black text-white">{airVisualData.humidity}%</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-indigo-200 truncate">💨 Tốc Độ Gió</div>
                      <div className="text-sm font-black text-white">{airVisualData.windSpeed} km/h</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-indigo-200 truncate">⏲️ Áp Suất</div>
                      <div className="text-sm font-black text-white">{airVisualData.pressure} hPa</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-indigo-200 truncate">⏰ Cập Nhật</div>
                      <div className="text-xs font-bold text-white truncate">{airVisualData.updatedAt}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* CARD 3: JMA JAPAN METEOROLOGICAL AGENCY */}
              {jmaData ? (
                <div className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-6 shadow-xl border border-white/20 bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 transition-all duration-700 flex flex-col justify-between min-h-[300px]">
                  {/* Background Decorative Glow */}
                  <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 border-rose-400/30 backdrop-blur text-xs font-black px-3 py-1 rounded-full truncate">
                        🇯🇵 Nguồn 3: JMA (Nhật Bản - Himawari)
                      </Badge>
                      <span className="text-[11px] font-extrabold text-rose-200">
                        {jmaData.current.isDay ? "☀️ Ban Ngày" : "🌙 Ban Đêm"}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3 pt-1">
                      <h1 className="text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md text-white">
                        {jmaData.current.temperature}°
                        <span className="text-3xl font-black text-rose-200">C</span>
                      </h1>
                      <div className="text-4xl drop-shadow-sm">
                        {getWmoWeatherInfo(jmaData.current.weatherCode, jmaData.current.isDay).icon}
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-white tracking-wide truncate">
                      {jmaData.current.weatherDesc}
                    </h3>

                    <p className="text-xs font-extrabold text-rose-200 flex items-center gap-2 truncate">
                      <span>Cảm giác như {jmaData.current.feelsLike}°C</span>
                      <span>•</span>
                      <span>Độ ẩm {jmaData.current.humidity}%</span>
                    </p>
                  </div>

                  {/* JMA Grid of Key Weather Metrics */}
                  <div className="relative z-10 grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/20">
                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-rose-200 truncate">💧 Độ Ẩm</div>
                      <div className="text-sm font-black text-white">{jmaData.current.humidity}%</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-rose-200 truncate">💨 Tốc Độ Gió</div>
                      <div className="text-sm font-black text-white">{jmaData.current.windSpeed} km/h</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-rose-200 truncate">☀️ Chỉ Số UV</div>
                      <div className="text-sm font-black text-white">
                        {jmaData.current.uvIndex}
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-rose-200 truncate">⏲️ Áp Suất</div>
                      <div className="text-sm font-black text-white">{jmaData.current.pressure} hPa</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-rose-200 truncate">🌧️ Lượng Mưa</div>
                      <div className="text-sm font-black text-white">{jmaData.current.rain} mm</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-rose-200 truncate">🌅 Mọc / Lặn</div>
                      <div className="text-[11px] font-black text-white truncate">{jmaData.current.sunrise} / {jmaData.current.sunset}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* SECTION 3: HOURLY FORECAST (12 HOURS) */}
          <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-sky-100 dark:border-slate-800 shadow-xs rounded-3xl overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-lg sm:text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-5.5 w-5.5 text-sky-500" />
                Thời Tiết Trong Ngày (12 Giờ Tới)
              </CardTitle>

              {/* Source Switcher Tabs: Open-Meteo vs AirVisual vs JMA */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 self-stretch sm:self-auto overflow-x-auto">
                <button
                  onClick={() => setHourlySource("openmeteo")}
                  className={cn(
                    "flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                    hourlySource === "openmeteo"
                      ? "bg-sky-500 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  )}
                >
                  🌐 Open-Meteo (Châu Âu)
                </button>
                <button
                  onClick={() => setHourlySource("airvisual")}
                  className={cn(
                    "flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                    hourlySource === "airvisual"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  )}
                >
                  💨 AirVisual (Mỹ)
                </button>
                <button
                  onClick={() => setHourlySource("jma")}
                  className={cn(
                    "flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                    hourlySource === "jma"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  )}
                >
                  🇯🇵 JMA (Nhật Bản)
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {/* Mobile View: Vertical 1 Item/Row List (< 640px) */}
              <div className="flex sm:hidden flex-col space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {hourlyList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/95 dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700 gap-3 shadow-xs"
                  >
                    {/* Time */}
                    <div className="w-28 flex items-center gap-1.5 shrink-0">
                      <span className="text-base font-black text-slate-900 dark:text-slate-100">
                        {idx === 0 ? "Bây giờ" : item.time}
                      </span>
                      {idx === 0 && (
                        <Badge className="bg-sky-500 text-white text-[10px] px-1.5 py-0.5 font-bold rounded-md">
                          Hiện tại
                        </Badge>
                      )}
                    </div>

                    {/* Icon & Weather Description */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-3xl shrink-0">
                        {getWmoWeatherInfo(item.weatherCode, item.isDay).icon}
                      </span>
                      <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                        {item.weatherDesc}
                      </span>
                    </div>

                    {/* Rain Probability */}
                    <div className="w-20 text-right shrink-0">
                      {item.pop > 0 ? (
                        <span className="text-xs font-black text-sky-700 dark:text-sky-300 bg-sky-500/15 px-2.5 py-1 rounded-lg">
                          💧 {item.pop}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold">—</span>
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
                    className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 w-full min-w-0 space-y-1.5 hover:border-sky-300 dark:hover:border-sky-700 transition-all text-center"
                  >
                    <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate w-full">
                      {idx === 0 ? "Bây giờ" : item.time}
                    </span>

                    <span className="text-xl sm:text-2xl py-0.5">
                      {getWmoWeatherInfo(item.weatherCode, item.isDay).icon}
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
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-lg sm:text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sun className="h-5.5 w-5.5 text-amber-500" />
                  Dự Báo Thời Tiết 1 Tuần Tới (7 Ngày)
                </CardTitle>

                {/* Source Switcher Tabs for 7-Day: Open-Meteo vs AirVisual vs JMA */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 self-stretch sm:self-auto overflow-x-auto">
                  <button
                    onClick={() => setDailySource("openmeteo")}
                    className={cn(
                      "flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                      dailySource === "openmeteo"
                        ? "bg-sky-500 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    )}
                  >
                    🌐 Open-Meteo
                  </button>
                  <button
                    onClick={() => setDailySource("airvisual")}
                    className={cn(
                      "flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                      dailySource === "airvisual"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    )}
                  >
                    💨 AirVisual
                  </button>
                  <button
                    onClick={() => setDailySource("jma")}
                    className={cn(
                      "flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                      dailySource === "jma"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    )}
                  >
                    🇯🇵 JMA Nhật Bản
                  </button>
                </div>
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
                            {day.dayName}
                          </span>
                          {idx === 0 && (
                            <Badge className="bg-sky-500 text-white text-[10px] px-1.5 py-0.5 font-bold rounded-md">
                              Hôm nay
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                          {day.popMax > 0 ? `💧 Mưa ${day.popMax}%` : "Trời khô ráo"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-3xl shrink-0">
                            {getWmoWeatherInfo(day.weatherCode, true).icon}
                          </span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                            {day.weatherDesc}
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
                        <span>{day.dayName}</span>
                        {idx === 0 && (
                          <Badge className="bg-sky-500 text-white text-[9px] px-1.5 py-0 rounded-md">
                            Hôm nay
                          </Badge>
                        )}
                      </div>

                      {/* Weather Icon & Desc */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xl shrink-0">
                          {getWmoWeatherInfo(day.weatherCode, true).icon}
                        </span>
                        <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
                          {day.weatherDesc}
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
                  Lời Khuyên Bỏ Túi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* UV Warning Card */}
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-300">
                      <Sun className="h-4.5 w-4.5 text-amber-500" />
                      <span>Chỉ số UV: {weatherData.current.uvIndex} ({getUvLevelInfo(weatherData.current.uvIndex).text})</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                      {weatherData.current.uvIndex >= 6
                        ? "Cảnh báo chỉ số UV ở mức cao! Nên dùng kem chống nắng, mặc áo dài tay và mang kính râm khi ra ngoài vào giữa trưa."
                        : "Chỉ số UV ở mức an toàn, thích hợp cho các hoạt động ngoài trời."}
                    </p>
                  </div>

                  {/* Clothing Advice */}
                  <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-sm text-sky-900 dark:text-sky-300">
                      <Shirt className="h-4.5 w-4.5 text-sky-500" />
                      <span>Gợi ý trang phục hôm nay</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                      {weatherData.current.temperature >= 28
                        ? "Thời tiết khá oi nóng! Nên ưu tiên quần áo chất liệu cotton mỏng nhẹ, thoáng khí và uống nhiều nước."
                        : weatherData.current.temperature <= 20
                        ? "Thời tiết se lạnh! Bạn nên mặc áo khoác giữ ấm nhẹ khi ra đường."
                        : "Thời tiết vô cùng dễ chịu! Thích hợp chọn các trang phục thoải mái."}
                    </p>
                  </div>

                  {/* Rain & Wind Reminder */}
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-sm text-indigo-900 dark:text-indigo-300">
                      <CloudRain className="h-4.5 w-4.5 text-indigo-500" />
                      <span>Gió & Khả năng mưa</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                      {weatherData.current.rain > 0 || weatherData.hourly[0]?.pop > 40
                        ? "Khả năng có mưa cao! Nhớ mang theo ô/dù hoặc áo mưa khi đi ra ngoài."
                        : "Tốc độ gió " + weatherData.current.windSpeed + " km/h, không lo có mưa rào bất chợt."}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold text-slate-500 text-center">
                  Dữ liệu đồng bộ trực tiếp từ Trạm Khí Tượng Open-Meteo 🌍
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
                <FileText className="h-6 w-6 text-amber-500" /> Tóm Tắt Thời Tiết Nhanh
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                Tổng hợp thông tin thời tiết & lời khuyên dành cho bạn.
              </DialogDescription>
            </div>

            <DialogClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 dark:hover:border-rose-800 text-slate-800 dark:text-slate-100 shadow-md shrink-0 cursor-pointer transition-all hover:scale-110"
                title="Đóng bảng tóm tắt"
              >
                <X className="h-6 w-6 sm:h-7 sm:w-7 font-black" />
                <span className="sr-only">Đóng</span>
              </Button>
            </DialogClose>
          </div>

          {/* Scrollable Content Area */}
          {summary && (
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 max-h-[calc(85vh-90px)]">
              {/* Location Card */}
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 space-y-1">
                <div className="text-sm font-black text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                  <MapPin className="h-4.5 w-4.5" /> Vị trí tra cứu:
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                  {summary.location}
                </p>
              </div>

              {/* Current Weather Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-sm font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-amber-500" /> Thời tiết hiện tại:
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                  <span>{summary.weatherDesc}</span>
                  <span className="text-sky-600 dark:text-sky-400 text-3xl font-black">{summary.currentTemp}°C</span>
                </div>
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                  Cảm giác như <b className="text-slate-900 dark:text-white font-black">{summary.feelsLike}°C</b> • Độ ẩm <b className="text-slate-900 dark:text-white font-black">{summary.humidity}%</b>
                </p>
              </div>

              {/* Next 2 Hours Card */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                <div className="text-sm font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <CloudRain className="h-4.5 w-4.5 text-indigo-500" /> Biến động 2 giờ tới:
                </div>
                <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {summary.next2HoursText}
                </p>
              </div>

              {/* Detailed Metrics Explanation Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-2.5">
                <div className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 border-b border-emerald-200 dark:border-emerald-800/80 pb-2">
                  <Gauge className="h-4.5 w-4.5 text-emerald-600" /> Giải thích các chỉ số khí tượng (Dễ hiểu):
                </div>

                <div className="space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <p className="leading-relaxed">
                    <span className="text-amber-700 dark:text-amber-300 font-black">☀️ Chỉ số UV:</span>{" "}
                    {summary.uvExplanation}
                  </p>
                  <p className="leading-relaxed">
                    <span className="text-sky-700 dark:text-sky-300 font-black">🎈 Áp suất:</span>{" "}
                    {summary.pressureExplanation}
                  </p>
                  <p className="leading-relaxed">
                    <span className="text-indigo-700 dark:text-indigo-300 font-black">💧 Độ ẩm:</span>{" "}
                    {summary.humidityExplanation}
                  </p>
                </div>
              </div>

              {/* Advice Card */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 space-y-1.5">
                <div className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Shirt className="h-4.5 w-4.5 text-amber-500" /> Lời khuyên bỏ túi:
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

import {
  WeatherData,
  CurrentWeather,
  HourlyForecastItem,
  DailyForecastItem,
  getWmoWeatherInfo,
} from "./weather-service";

export async function fetchJmaWeatherData(
  lat: number,
  lng: number,
  locationName?: string
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&models=jma_seamless&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,surface_pressure,wind_speed_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,uv_index_max&timezone=auto&_t=${Date.now()}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Không thể lấy dữ liệu thời tiết từ JMA (Nhật Bản)");
  }

  const data = await res.json();
  const currentData = data.current;
  const hourlyData = data.hourly;
  const dailyData = data.daily;

  const isDay = currentData.is_day === 1;
  const currentInfo = getWmoWeatherInfo(currentData.weather_code, isDay);

  const formatLocalTimeStr = (isoStr?: string) => {
    if (!isoStr) return "";
    const parts = isoStr.split("T");
    if (parts.length > 1) {
      return parts[1].slice(0, 5);
    }
    return isoStr;
  };

  const nowTimestamp = Date.now();
  let startIndex = hourlyData.time.findIndex((t: string) => {
    return new Date(t).getTime() >= nowTimestamp - 3599000;
  });
  if (startIndex === -1) startIndex = 0;

  let currentUv = 0;
  if (isDay) {
    if (currentData.uv_index !== null && currentData.uv_index !== undefined) {
      currentUv = Math.round(currentData.uv_index);
    } else if (hourlyData.uv_index && hourlyData.uv_index[startIndex] !== undefined) {
      currentUv = Math.round(hourlyData.uv_index[startIndex]);
    } else {
      currentUv = dailyData?.uv_index_max?.[0] ? Math.round(dailyData.uv_index_max[0]) : 0;
    }
  }

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
    sunrise: formatLocalTimeStr(dailyData?.sunrise?.[0]) || "05:30",
    sunset: formatLocalTimeStr(dailyData?.sunset?.[0]) || "18:30",
  };

  const hourly: HourlyForecastItem[] = [];
  for (let i = startIndex; i < Math.min(startIndex + 12, hourlyData.time.length); i++) {
    const timeStr = hourlyData.time[i];
    const hourStr = formatLocalTimeStr(timeStr);
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

  const daily: DailyForecastItem[] = [];
  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  for (let i = 0; i < Math.min(7, dailyData.time.length); i++) {
    const dStr = dailyData.time[i];
    const dDate = new Date(dStr);
    const dayName = i === 0 ? "Hôm nay" : daysOfWeek[dDate.getDay()];
    const wInfo = getWmoWeatherInfo(dailyData.weather_code[i], true);

    daily.push({
      date: dStr,
      dayName,
      tempMax: Math.round(dailyData.temperature_2m_max[i]),
      tempMin: Math.round(dailyData.temperature_2m_min[i]),
      weatherCode: dailyData.weather_code[i],
      weatherDesc: wInfo.desc,
      popMax: dailyData.precipitation_probability_max[i] || 0,
      uvMax: Math.round(dailyData.uv_index_max?.[i] || 5),
    });
  }

  return {
    location: {
      name: locationName || "Vị trí GPS",
      latitude: lat,
      longitude: lng,
    },
    current,
    hourly,
    daily,
  };
}

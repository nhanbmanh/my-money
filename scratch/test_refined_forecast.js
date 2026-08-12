function getRefinedDailyWeatherInfo(code, rainSum, popMax, tempMax, lang = "vi") {
  // If rain is negligible (< 1.0mm) or rain probability is low (< 35%), the day is effectively DRY
  const isDry = (rainSum !== undefined && rainSum < 1.0) || (popMax !== undefined && popMax < 35);

  if (isDry) {
    if (tempMax >= 35) {
      return { desc: lang === "vi" ? "Nắng nóng gay gắt" : "Very Hot & Sunny", icon: "☀️" };
    }
    if (tempMax >= 33) {
      return { desc: lang === "vi" ? "Nắng nóng, mây rải rác" : "Hot & Partly Cloudy", icon: "🌤️" };
    }
    if (code === 0 || code === 1) {
      return { desc: lang === "vi" ? "Trời quang, nắng đẹp" : "Sunny & Clear", icon: "☀️" };
    }
    if (code === 2) {
      return { desc: lang === "vi" ? "Nắng nhẹ, có mây" : "Partly Cloudy", icon: "🌤️" };
    }
    if (code === 3) {
      return { desc: lang === "vi" ? "Nhiều mây, mây rải rác" : "Cloudy", icon: "⛅" };
    }
    // Default for low rain sum even if WMO assigned a rain code
    return { desc: tempMax >= 32 ? (lang === "vi" ? "Nắng nóng, ít mây" : "Hot & Mostly Sunny") : (lang === "vi" ? "Nắng nhẹ, khô ráo" : "Dry & Pleasant"), icon: tempMax >= 32 ? "☀️" : "🌤️" };
  }

  // Moderate rain (1.0mm to 5.0mm)
  if (rainSum !== undefined && rainSum < 5.0) {
    if (code === 95 || code === 96) {
      return { desc: lang === "vi" ? "Chiều tối có dông rải rác" : "Scattered Evening Storms", icon: "⛈️" };
    }
    return { desc: lang === "vi" ? "Có lúc có mưa rào" : "Passing Showers", icon: "🌦️" };
  }

  // Heavy rain (>= 5.0mm)
  switch (code) {
    case 51:
    case 53:
    case 55:
      return { desc: lang === "vi" ? "Mưa phun diện rộng" : "Drizzle", icon: "🌦️" };
    case 61:
    case 63:
      return { desc: lang === "vi" ? "Mưa rào vừa" : "Moderate Rain", icon: "🌧️" };
    case 65:
    case 80:
    case 81:
    case 82:
      return { desc: lang === "vi" ? "Mưa to xối xả" : "Heavy Rain Showers", icon: "🌧️" };
    case 95:
    case 96:
    case 99:
      return { desc: lang === "vi" ? "Dông bão, sấm chớp" : "Thunderstorms", icon: "⛈️" };
    default:
      return { desc: lang === "vi" ? "Có mưa rào" : "Rain Showers", icon: "🌧️" };
  }
}

async function testRefinedForecast() {
  const lat = 21.0285;
  const lng = 105.8542; // Hanoi

  const omForecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max&timezone=auto`;
  const res = await fetch(omForecastUrl);
  const json = await res.json();
  
  console.log("=== Original vs Refined 7-Day Forecast for Hanoi ===");
  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  for (let i = 0; i < json.daily.time.length; i++) {
    const dStr = json.daily.time[i];
    const dDate = new Date(dStr);
    const dayName = i === 0 ? "Hôm nay" : daysOfWeek[dDate.getDay()];
    const code = json.daily.weather_code[i];
    const rainSum = json.daily.precipitation_sum[i];
    const popMax = json.daily.precipitation_probability_max[i];
    const tempMax = Math.round(json.daily.temperature_2m_max[i]);
    const tempMin = Math.round(json.daily.temperature_2m_min[i]);

    const refined = getRefinedDailyWeatherInfo(code, rainSum, popMax, tempMax, "vi");
    console.log(`${dayName} (${dStr}): Temp ${tempMin}° - ${tempMax}°C | Code ${code} | Rain ${rainSum}mm | Pop ${popMax}%`);
    console.log(`  => RESULT: ${refined.icon} ${refined.desc}`);
  }
}

testRefinedForecast();

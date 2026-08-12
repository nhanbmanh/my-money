const fs = require('fs');

async function testAPIs() {
  const lat = 21.0285;
  const lng = 105.8542; // Hanoi

  console.log("=== 1. Testing Open-Meteo Forecast (Best Match) ===");
  const omForecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m,uv_index&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;
  try {
    const res = await fetch(omForecastUrl);
    const json = await res.json();
    console.log("Open-Meteo Current:", json.current);
    console.log("Open-Meteo Daily Weather Codes:", json.daily.weather_code);
    console.log("Open-Meteo Daily Rain Pop Max:", json.daily.precipitation_probability_max);
    console.log("Open-Meteo Daily Temp Max:", json.daily.temperature_2m_max);
    console.log("Open-Meteo Daily Temp Min:", json.daily.temperature_2m_min);
  } catch (err) {
    console.error("Open-Meteo error:", err.message);
  }

  console.log("\n=== 2. Testing Open-Meteo GFS Model ===");
  const gfsUrl = `https://api.open-meteo.com/v1/gfs?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;
  try {
    const res = await fetch(gfsUrl);
    const json = await res.json();
    console.log("GFS Daily Weather Codes:", json.daily.weather_code);
    console.log("GFS Daily Rain Pop Max:", json.daily.precipitation_probability_max);
  } catch (err) {
    console.error("GFS error:", err.message);
  }

  console.log("\n=== 3. Testing Open-Meteo Air Quality API ===");
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10,european_aqi&timezone=auto`;
  try {
    const res = await fetch(aqiUrl);
    const json = await res.json();
    console.log("Open-Meteo Air Quality Current:", json.current);
  } catch (err) {
    console.error("AQI error:", err.message);
  }

  console.log("\n=== 4. Testing WAQI (World Air Quality Index) API ===");
  const waqiUrl = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=demo`;
  try {
    const res = await fetch(waqiUrl);
    const json = await res.json();
    console.log("WAQI Response status:", json.status);
    if (json.status === "ok") {
      console.log("WAQI AQI:", json.data.aqi);
      console.log("WAQI City:", json.data.city?.name);
      console.log("WAQI Dominant Pol:", json.data.dominentpol);
    }
  } catch (err) {
    console.error("WAQI error:", err.message);
  }

  console.log("\n=== 5. Testing WeatherAPI.com (Public/Free) ===");
  const weatherApiUrl = `https://api.weatherapi.com/v1/forecast.json?key=c2b1db1420794939b4b123616230808&q=${lat},${lng}&days=7&aqi=yes`;
  try {
    const res = await fetch(weatherApiUrl);
    const json = await res.json();
    if (json.current) {
      console.log("WeatherAPI Temp:", json.current.temp_c);
      console.log("WeatherAPI Condition:", json.current.condition.text);
      console.log("WeatherAPI AQI (US EPA Index):", json.current.air_quality?.['us-epa-index']);
      console.log("WeatherAPI PM2.5:", json.current.air_quality?.pm2_5);
      console.log("WeatherAPI 7-Day Forecast Days:", json.forecast?.forecastday?.map(d => ({
        date: d.date,
        maxTemp: d.day.maxtemp_c,
        minTemp: d.day.mintemp_c,
        condition: d.day.condition.text,
        daily_chance_of_rain: d.day.daily_chance_of_rain
      })));
    } else {
      console.log("WeatherAPI error response:", json);
    }
  } catch (err) {
    console.error("WeatherAPI error:", err.message);
  }
}

testAPIs();

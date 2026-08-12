async function testPrecipitation() {
  const lat = 21.0285;
  const lng = 105.8542; // Hanoi

  const omForecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max&timezone=auto`;
  const res = await fetch(omForecastUrl);
  const json = await res.json();
  console.log("Daily Forecast Detail:");
  for (let i = 0; i < json.daily.time.length; i++) {
    console.log(`Day ${i} (${json.daily.time[i]}): Code=${json.daily.weather_code[i]}, RainSum=${json.daily.precipitation_sum[i]}mm, PopMax=${json.daily.precipitation_probability_max[i]}%`);
  }
}
testPrecipitation();

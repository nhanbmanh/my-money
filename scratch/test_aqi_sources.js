async function testAQISources() {
  const coords = [
    { name: "Hà Nội (Nghĩa Đô / Cầu Giấy)", lat: 21.037, lng: 105.794 },
    { name: "Hà Nội (Hoàn Kiếm)", lat: 21.0285, lng: 105.8542 },
    { name: "TP. Hồ Chí Minh (Q1)", lat: 10.7769, lng: 106.7009 },
    { name: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
  ];

  for (const loc of coords) {
    console.log(`\n=================== ${loc.name} ===================`);
    
    // 1. Open-Meteo Air Quality API
    try {
      const omUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lng}&current=us_aqi,pm2_5,pm10,dust,nitrogen_dioxide&timezone=auto`;
      const res = await fetch(omUrl);
      const json = await res.json();
      console.log("Open-Meteo US AQI:", json.current?.us_aqi, "| PM2.5:", json.current?.pm2_5, "µg/m³");
    } catch (e) {
      console.log("Open-Meteo AQI error:", e.message);
    }

    // 2. WAQI (World Air Quality Index - real physical station data)
    try {
      const waqiUrl = `https://api.waqi.info/feed/geo:${loc.lat};${loc.lng}/?token=demo`;
      const res = await fetch(waqiUrl);
      const json = await res.json();
      if (json.status === "ok") {
        console.log("WAQI (Real station) AQI:", json.data.aqi, "| Station:", json.data.city?.name, "| Dominant:", json.data.dominentpol);
      } else {
        console.log("WAQI error status:", json.data);
      }
    } catch (e) {
      console.log("WAQI error:", e.message);
    }

    // 3. OpenWeatherMap Air Pollution (free public endpoint without key? Let's check open APIs)
    try {
      const owmUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${loc.lat}&lon=${loc.lng}&appid=b6907d289e10d714a6e88b30761fae22`;
      const res = await fetch(owmUrl);
      const json = await res.json();
      if (json.list && json.list[0]) {
        const components = json.list[0].components;
        const aqi = json.list[0].main.aqi; // 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
        console.log("OpenWeatherMap AQI Index (1-5):", aqi, "| PM2.5:", components.pm2_5, "µg/m³");
      }
    } catch (e) {
      console.log("OWM error:", e.message);
    }
  }
}

testAQISources();

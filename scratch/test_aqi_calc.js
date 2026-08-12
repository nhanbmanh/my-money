function calculateUsAqiFromPm25(pm25) {
  if (pm25 < 0) return 0;
  if (pm25 <= 12.0) {
    return Math.round(((50 - 0) / (12.0 - 0.0)) * (pm25 - 0.0));
  }
  if (pm25 <= 35.4) {
    return Math.round(51 + ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1));
  }
  if (pm25 <= 55.4) {
    return Math.round(101 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5));
  }
  if (pm25 <= 150.4) {
    return Math.round(151 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5));
  }
  if (pm25 <= 250.4) {
    return Math.round(201 + ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5));
  }
  if (pm25 <= 500.4) {
    return Math.round(301 + ((500 - 301) / (500.4 - 250.5)) * (pm25 - 250.5));
  }
  return 500;
}

async function testAQICalc() {
  const coords = [
    { name: "Hà Nội (Nghĩa Đô)", lat: 21.037, lng: 105.794 },
    { name: "TP. Hồ Chí Minh", lat: 10.7769, lng: 106.7009 },
    { name: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
  ];

  for (const loc of coords) {
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lng}&current=us_aqi,pm2_5,pm10&timezone=auto`;
    const res = await fetch(aqiUrl);
    const json = await res.json();
    const pm25 = json.current?.pm2_5 || 0;
    const rawUsAqi = json.current?.us_aqi;
    const calculatedAqi = calculateUsAqiFromPm25(pm25);

    console.log(`${loc.name}: PM2.5 = ${pm25} µg/m³`);
    console.log(`  Raw Open-Meteo us_aqi: ${rawUsAqi} (Over-inflated)`);
    console.log(`  Calculated Standard EPA US AQI: ${calculatedAqi}`);
  }
}

testAQICalc();

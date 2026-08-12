async function testWaqiStations() {
  const coords = [
    { name: "Hà Nội", lat: 21.0285, lng: 105.8542 },
    { name: "TP.HCM", lat: 10.7769, lng: 106.7009 },
    { name: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
    { name: "Nha Trang", lat: 12.2388, lng: 109.1967 },
  ];

  for (const c of coords) {
    try {
      const url = `https://api.waqi.info/feed/geo:${c.lat};${c.lng}/?token=demo`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === "ok") {
        console.log(`${c.name} WAQI: AQI = ${json.data.aqi}, Station = ${json.data.city?.name}`);
      } else {
        console.log(`${c.name} WAQI error:`, json.data);
      }
    } catch (e) {
      console.log(`${c.name} WAQI fetch error:`, e.message);
    }
  }
}

testWaqiStations();

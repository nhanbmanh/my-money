async function testIQAirPublicEndpoints() {
  const lat = 21.0285;
  const lng = 105.8542;

  // 1. Test WAQI API with token=demo vs waqi search
  console.log("=== 1. Testing WAQI Search for Vietnam ===");
  try {
    const searchUrl = `https://api.waqi.info/search/?keyword=vietnam&token=demo`;
    const res = await fetch(searchUrl);
    const json = await res.json();
    console.log("WAQI Search status:", json.status);
    if (json.data && json.data.length > 0) {
      console.log("Found stations:", json.data.slice(0, 5).map(s => ({ name: s.station.name, aqi: s.aqi, uid: s.uid })));
    }
  } catch (e) {
    console.error(e.message);
  }

  // 2. Test IQAir website public widget/city endpoint
  console.log("\n=== 2. Testing IQAir Web API ===");
  try {
    const iqUrl = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=824b2b3a-d688-466d-9686-2a8d3b7625bf`;
    const res = await fetch(iqUrl);
    console.log("AirVisual API Status:", res.status);
  } catch (e) {
    console.error(e.message);
  }

  // 3. Test OpenWeatherMap Air Quality (Free appid)
  console.log("\n=== 3. Testing OpenWeatherMap Air Pollution ===");
  // Let's test a couple of public OWM appids
  const owmKeys = ["b6907d289e10d714a6e88b30761fae22", "886705b43de116b16961879f7051792f", "4d88b024b771e1d63c9624f7e902345c"];
  for (const k of owmKeys) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${k}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        console.log(`OWM Key ${k} SUCCESS! Data:`, json.list[0]);
        break;
      }
    } catch (e) {}
  }
}

testIQAirPublicEndpoints();

const fs = require('fs');

async function testUserKey() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/NEXT_PUBLIC_AIRVISUAL_API_KEY=(.+)/);
  if (!match) {
    console.log("No key found in .env");
    return;
  }
  const apiKey = match[1].trim().replace(/^["']|["']$/g, '');
  console.log("Found API Key in .env:", apiKey.slice(0, 6) + "..." + apiKey.slice(-4));

  const lat = 21.0285;
  const lng = 105.8542;
  const url = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log("AirVisual Status:", res.status, json.status);
    if (json.status === "success" && json.data) {
      console.log("City:", json.data.city);
      console.log("State:", json.data.state);
      console.log("Country:", json.data.country);
      console.log("Pollution:", json.data.current.pollution);
      console.log("Weather:", json.data.current.weather);
      console.log("\n🎉 AIRVISUAL API KEY IS WORKING PERFECTLY!");
    } else {
      console.log("AirVisual Error message:", json.data?.message || json);
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testUserKey();

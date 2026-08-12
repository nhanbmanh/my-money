const fs = require('fs');

async function testEnvKey() {
  let envKey = "";
  if (fs.existsSync('.env.local')) {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/NEXT_PUBLIC_AIRVISUAL_API_KEY=(.+)/) || content.match(/AIRVISUAL_API_KEY=(.+)/);
    if (match) {
      envKey = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  console.log("Found key in .env.local:", envKey ? (envKey.slice(0, 5) + "..." + envKey.slice(-4)) : "NOT FOUND");

  if (envKey) {
    const lat = 21.0285;
    const lng = 105.8542;
    const url = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=${envKey}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      console.log("AirVisual API Response Status:", res.status, json.status);
      if (json.status === "success" && json.data) {
        console.log("City:", json.data.city);
        console.log("Station Pollution:", json.data.current.pollution);
        console.log("Station Weather:", json.data.current.weather);
        console.log("SUCCESS! AirVisual API key is valid & live!");
      } else {
        console.log("AirVisual Error response:", json);
      }
    } catch (err) {
      console.error("Fetch error:", err.message);
    }
  }
}

testEnvKey();

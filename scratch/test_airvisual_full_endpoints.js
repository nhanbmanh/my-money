const fs = require('fs');

async function testAirVisualEndpoints() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/NEXT_PUBLIC_AIRVISUAL_API_KEY=(.+)/);
  if (!match) {
    console.log("No key found in .env");
    return;
  }
  const apiKey = match[1].trim().replace(/^["']|["']$/g, '');

  const lat = 21.0285;
  const lng = 105.8542; // Hanoi

  console.log("=== 1. Testing nearest_city ===");
  try {
    const url = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    console.log("nearest_city Status:", res.status, json.status);
    console.log("nearest_city Data:", JSON.stringify(json.data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testAirVisualEndpoints();

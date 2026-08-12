const fs = require('fs');

async function testAirVisualKeys() {
  const lat = 21.0285; // Hanoi
  const lng = 105.8542;

  // Let's test if there are keys in process.env or try standard public keys
  const keysToTest = [
    process.env.NEXT_PUBLIC_AIRVISUAL_API_KEY,
    process.env.AIRVISUAL_API_KEY,
    "demo", // IQAir demo key if any
  ].filter(Boolean);

  console.log("Found keys in env:", keysToTest);

  // Let's also check if .env or .env.local has any keys
  try {
    if (fs.existsSync('.env.local')) {
      console.log(".env.local content:\n", fs.readFileSync('.env.local', 'utf8'));
    }
    if (fs.existsSync('.env')) {
      console.log(".env content:\n", fs.readFileSync('.env', 'utf8'));
    }
  } catch (e) {
    console.error(e);
  }

  // Test AirVisual API endpoint directly
  for (const key of ["demo", "c2b1db1420794939b4b123616230808", "824b2b3a-d688-466d-9686-2a8d3b7625bf"]) {
    try {
      const url = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=${key}`;
      console.log(`\nTesting AirVisual API with key=${key}...`);
      const res = await fetch(url);
      const json = await res.json();
      console.log("Status:", res.status, json.status);
      if (json.status === "success") {
        console.log("City:", json.data.city);
        console.log("State:", json.data.state);
        console.log("Country:", json.data.country);
        console.log("Pollution:", json.data.current.pollution);
        console.log("Weather:", json.data.current.weather);
      } else {
        console.log("Error msg:", json.data?.message || json);
      }
    } catch (err) {
      console.error("AirVisual fetch error:", err.message);
    }
  }
}

testAirVisualKeys();

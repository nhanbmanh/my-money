import http from "http";

/**
 * Standalone Automated Midnight 00:00 VNT Snapshot & Email Cron Worker.
 * Executes automatically at 00:00:00 VNT every single midnight (Vietnam Time GMT+7),
 * even if the user never opens the web browser or logs into the app.
 */

function getMsUntilNextMidnightVN(): number {
  const now = new Date();
  // Vietnam Time is UTC+7
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnNow = new Date(utcMs + 7 * 3600000);

  const nextMidnightVN = new Date(vnNow);
  nextMidnightVN.setDate(vnNow.getDate() + 1);
  nextMidnightVN.setHours(0, 0, 0, 0);

  return nextMidnightVN.getTime() - vnNow.getTime();
}

async function triggerDailySnapshotCron() {
  console.log(`[${new Date().toLocaleString("vi-VN")}] ⏳ Triggering Automated 00:00 VNT Snapshot & Email Cron...`);

  try {
    const res = await fetch("http://localhost:3000/api/cron/daily-snapshot");
    if (res.ok) {
      const json = await res.json();
      console.log(`[${new Date().toLocaleString("vi-VN")}] ✅ Daily Snapshot & Email Cron completed successfully:`, json);
    } else {
      console.error(`[${new Date().toLocaleString("vi-VN")}] ❌ Daily Snapshot Cron failed with status:`, res.status);
    }
  } catch (err: any) {
    console.error(`[${new Date().toLocaleString("vi-VN")}] ❌ Error connecting to daily snapshot cron endpoint:`, err.message);
  }
}

function scheduleMidnightCron() {
  const msUntilMidnight = getMsUntilNextMidnightVN();
  const hours = (msUntilMidnight / 3600000).toFixed(2);
  console.log(`[${new Date().toLocaleString("vi-VN")}] 🚀 Snapshot Cron Worker active. Next 00:00 VNT trigger in ${hours} hours.`);

  setTimeout(async () => {
    await triggerDailySnapshotCron();
    // Re-schedule for next midnight
    scheduleMidnightCron();
  }, msUntilMidnight);
}

// Execute immediately if passed --now flag
if (process.argv.includes("--now")) {
  triggerDailySnapshotCron();
} else {
  scheduleMidnightCron();
}

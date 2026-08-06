"use client";

import { WeatherDashboard } from "@/components/weather-dashboard";

export default function WeatherPage() {
  return (
    <div className="w-full flex-1 min-h-0 flex flex-col xl:overflow-hidden">
      <main className="w-full px-4 py-4 lg:px-6 flex-1 min-h-0 flex flex-col xl:overflow-y-auto">
        <WeatherDashboard />
      </main>
    </div>
  );
}

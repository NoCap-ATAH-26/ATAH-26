"use client";

import { useEffect, useState } from "react";

/** Real local time + timezone abbreviation, ticking every second. No fake data. */
export function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return { time: "--:--:--", zone: "" };

  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  const zone =
    Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()?.replace("_", " ") ?? "";

  return { time, zone };
}

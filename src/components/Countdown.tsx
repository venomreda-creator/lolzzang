"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { getCountdown, getWeekEnd, getWeekStart, pad2 } from "@/lib/week";

interface CountdownProps {
  variant?: "pill" | "inline";
}

export default function Countdown({ variant = "pill" }: CountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parts = now
    ? getCountdown(getWeekEnd(getWeekStart(now)), now)
    : null;

  const time = parts
    ? `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`
    : "--:--:--";
  const days = parts ? parts.days : 0;

  if (variant === "inline") {
    return (
      <span className="week-countdown" title="매주 월요일 00:00 (KST) 초기화">
        다음 초기화{" "}
        <b>
          D-{days} {time}
        </b>
      </span>
    );
  }

  return (
    <span className="countdown-pill" title="매주 월요일 00:00 (KST) 초기화">
      <Icon name="clock" size={15} className="icon" />
      <span>주간 초기화</span>
      <span className="countdown-time" aria-label={`다음 주간 초기화까지 ${days}일 ${time}`}>
        D-{days} {time}
      </span>
    </span>
  );
}

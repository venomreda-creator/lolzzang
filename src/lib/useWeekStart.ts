"use client";

import { useEffect, useState } from "react";
import { getWeekStart } from "./week";

/** KST 월요일 00:00을 1분마다 갱신 */
export function useWeekStart(): number | null {
  const [weekStart, setWeekStart] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setWeekStart(getWeekStart());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return weekStart;
}

/** 마운트 여부 (localStorage 등 클라이언트 전용 값 보호) */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

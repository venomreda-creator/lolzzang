export const KST_OFFSET = 9 * 60 * 60 * 1000;
export const DAY = 24 * 60 * 60 * 1000;
export const WEEK = 7 * DAY;

/** KST 월요일 00:00 (epoch ms) */
export function getWeekStart(now: number = Date.now()): number {
  const kst = new Date(now + KST_OFFSET);
  const day = kst.getUTCDay(); // 0 = 일요일
  const daysSinceMonday = (day + 6) % 7;
  const startKst = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  );
  return startKst - KST_OFFSET;
}

export function getWeekEnd(weekStart: number): number {
  return weekStart + WEEK;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function getCountdown(target: number, now: number = Date.now()): CountdownParts {
  const totalMs = Math.max(0, target - now);
  return {
    days: Math.floor(totalMs / DAY),
    hours: Math.floor((totalMs % DAY) / 3_600_000),
    minutes: Math.floor((totalMs % 3_600_000) / 60_000),
    seconds: Math.floor((totalMs % 60_000) / 1000),
    totalMs,
  };
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** KST 기준 M.D */
export function formatKstShort(ts: number): string {
  const d = new Date(ts + KST_OFFSET);
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
}

/** KST 기준 YYYY.MM.DD HH:mm */
export function formatKstDateTime(ts: number): string {
  const d = new Date(ts + KST_OFFSET);
  return `${d.getUTCFullYear()}.${pad2(d.getUTCMonth() + 1)}.${pad2(d.getUTCDate())} ${pad2(
    d.getUTCHours()
  )}:${pad2(d.getUTCMinutes())}`;
}

/** KST 기준 MM.DD HH:mm */
export function formatKstShortTime(ts: number): string {
  const d = new Date(ts + KST_OFFSET);
  return `${pad2(d.getUTCMonth() + 1)}.${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(
    d.getUTCMinutes()
  )}`;
}

export function formatWeekRange(weekStart: number): string {
  const end = getWeekEnd(weekStart);
  const a = new Date(weekStart + KST_OFFSET);
  const b = new Date(end + KST_OFFSET);
  return `${a.getUTCFullYear()}.${pad2(a.getUTCMonth() + 1)}.${pad2(a.getUTCDate())} 00:00 ~ ${pad2(
    b.getUTCMonth() + 1
  )}.${pad2(b.getUTCDate())} 00:00 (KST)`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${pad2(s)}`;
}

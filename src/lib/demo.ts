import { CHAMPIONS, CHAMPION_MAP } from "./champions";
import type { AccountResult, RiotAccount, WeeklyMatch } from "./types";

/** 결정적 난수 (데모 데이터가 새로고침마다 동일하게 보이도록) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FALLBACK_PRACTICE = ["Ahri", "Lissandra", "Orianna", "Sylas", "Azir"];
const EXTRA_POOL = [
  "Aatrox",
  "Jinx",
  "LeeSin",
  "Thresh",
  "Yasuo",
  "Kaisa",
  "LeBlanc",
  "Camille",
  "Viktor",
  "Nautilus",
];

export function buildDemoResults(
  accounts: RiotAccount[],
  practiceIds: string[],
  weekStart: number
): AccountResult[] {
  const now = Date.now();
  const practicePool = (practiceIds.length ? practiceIds : FALLBACK_PRACTICE).filter((id) =>
    CHAMPION_MAP.has(id)
  );
  const extraPool = EXTRA_POOL.filter((id) => CHAMPION_MAP.has(id));
  const fallbackAny = CHAMPIONS.map((c) => c.id);

  return accounts.map((account) => {
    const random = mulberry32(hashString(`${account.gameName}#${account.tagLine}:${weekStart}`));
    const gameCount = 4 + Math.floor(random() * 8); // 4 ~ 11
    const span = Math.max(60 * 60 * 1000, now - weekStart);
    const matches: WeeklyMatch[] = [];

    for (let i = 0; i < gameCount; i++) {
      const usePractice = random() < 0.72 && practicePool.length > 0;
      const pool = usePractice
        ? practicePool
        : extraPool.length
          ? extraPool
          : fallbackAny;
      const championId = pool[Math.floor(random() * pool.length)];
      const champion = CHAMPION_MAP.get(championId);
      const win = random() < 0.53;
      const kills = Math.floor(random() * 12);
      const deaths = Math.floor(random() * 8);
      const assists = Math.floor(random() * 18);
      const queueId = [420, 420, 440, 400, 490][Math.floor(random() * 5)];
      const gameEndTimestamp = Math.min(
        now - 60_000,
        weekStart + Math.floor((span * (i + 1)) / (gameCount + 1))
      );

      matches.push({
        matchId: `DEMO_${account.region}_${hashString(account.id + i)}`,
        champion: championId,
        win,
        kills,
        deaths,
        assists,
        queueId,
        gameEndTimestamp,
        gameDuration: 1200 + Math.floor(random() * 1400),
        role: champion?.roles[0] ?? "MIDDLE",
        remake: false,
      });
    }

    matches.sort((a, b) => b.gameEndTimestamp - a.gameEndTimestamp);

    return {
      account,
      matches,
      error: null,
      fetchedMatches: matches.length,
      summonerLevel: 100 + Math.floor(random() * 500),
    };
  });
}

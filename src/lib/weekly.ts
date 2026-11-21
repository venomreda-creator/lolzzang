import { getChampion } from "./champions";
import type { AccountResult, Champion, PracticeEntry, WeeklyMatch } from "./types";

export interface ChampionStat {
  champion: Champion;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
}

export interface AccountStat {
  account: AccountResult["account"];
  games: number;
  wins: number;
  losses: number;
  error?: string | null;
  fetchedMatches: number;
}

export interface WeeklyAggregate {
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  championStats: ChampionStat[];
  accountStats: AccountStat[];
  recent: WeeklyMatch[];
  totalFetched: number;
  accountsOk: number;
  accountsFailed: number;
}

export function winrate(wins: number, losses: number): number {
  const total = wins + losses;
  if (!total) return 0;
  return (wins / total) * 100;
}

export function kda(kills: number, deaths: number, assists: number): number {
  return (kills + assists) / Math.max(1, deaths);
}

export function aggregateWeekly(
  results: AccountResult[],
  practice: PracticeEntry[],
  weekStart: number
): WeeklyAggregate {
  const practiceSet = new Set(practice.map((p) => p.id));
  const championStats = new Map<string, ChampionStat>();
  const accountStats: AccountStat[] = [];
  const all: WeeklyMatch[] = [];

  for (const result of results) {
    const matches = result.matches.filter(
      (m) =>
        practiceSet.has(m.champion) &&
        !m.remake &&
        m.gameEndTimestamp >= weekStart
    );
    all.push(...matches);

    let wins = 0;
    let losses = 0;
    for (const m of matches) {
      if (m.win) wins++;
      else losses++;

      const champion = getChampion(m.champion);
      if (!champion) continue;
      const stat =
        championStats.get(m.champion) ??
        ({
          champion,
          games: 0,
          wins: 0,
          losses: 0,
          winrate: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          kda: 0,
        } satisfies ChampionStat);
      stat.games += 1;
      if (m.win) stat.wins += 1;
      else stat.losses += 1;
      stat.kills += m.kills;
      stat.deaths += m.deaths;
      stat.assists += m.assists;
      championStats.set(m.champion, stat);
    }

    accountStats.push({
      account: result.account,
      games: matches.length,
      wins,
      losses,
      error: result.error,
      fetchedMatches: result.matches.length,
    });
  }

  const stats = [...championStats.values()]
    .map((s) => ({
      ...s,
      winrate: winrate(s.wins, s.losses),
      kda: kda(s.kills, s.deaths, s.assists),
    }))
    .sort((a, b) => b.games - a.games || b.winrate - a.winrate);

  const wins = all.filter((m) => m.win).length;
  const losses = all.length - wins;
  const kills = all.reduce((sum, m) => sum + m.kills, 0);
  const deaths = all.reduce((sum, m) => sum + m.deaths, 0);
  const assists = all.reduce((sum, m) => sum + m.assists, 0);

  return {
    games: all.length,
    wins,
    losses,
    winrate: winrate(wins, losses),
    kills,
    deaths,
    assists,
    kda: kda(kills, deaths, assists),
    championStats: stats,
    accountStats,
    recent: [...all].sort((a, b) => b.gameEndTimestamp - a.gameEndTimestamp).slice(0, 8),
    totalFetched: results.reduce((sum, r) => sum + r.matches.length, 0),
    accountsOk: results.filter((r) => !r.error).length,
    accountsFailed: results.filter((r) => r.error).length,
  };
}

import { REGION_MAP } from "./regions";
import { RIFT_QUEUES } from "./regions";
import type { RiotAccount, WeeklyErrorCode, WeeklyMatch } from "./types";

const API_KEY = process.env.RIOT_API_KEY?.trim() ?? "";
const MATCH_LIMIT = clampNumber(Number(process.env.RIOT_MATCH_LIMIT ?? 30), 1, 100);
const MAX_RPS = clampNumber(Number(process.env.RIOT_MAX_RPS ?? 15), 1, 500);
const MAX_PER_2MIN = clampNumber(Number(process.env.RIOT_MAX_PER_2MIN ?? 90), 1, 5000);

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export class RiotApiError extends Error {
  code: WeeklyErrorCode;
  status: number;

  constructor(code: WeeklyErrorCode, status: number, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/* 레이트 리밋: 초당 요청 수 + 2분 윈도우 (Riot 개발 키 대응)          */
/* ------------------------------------------------------------------ */

const requestTimes: number[] = [];
let slotChain: Promise<void> = Promise.resolve();

function prune(now: number) {
  while (requestTimes.length > 0 && now - requestTimes[0] > 120_000) {
    requestTimes.shift();
  }
}

async function waitForSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    prune(now);
    const last = requestTimes[requestTimes.length - 1] ?? 0;
    const waitRps = last + 1000 / MAX_RPS - now;
    const waitWindow =
      requestTimes.length >= MAX_PER_2MIN ? requestTimes[0] + 120_000 - now : 0;
    const wait = Math.max(0, waitRps, waitWindow);
    if (wait <= 0) {
      requestTimes.push(Date.now());
      return;
    }
    await sleep(Math.min(wait, 1000));
  }
}

function takeSlot(): Promise<void> {
  const next = slotChain.then(() => waitForSlot());
  slotChain = next.catch(() => undefined);
  return next;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* Riot fetch                                                          */
/* ------------------------------------------------------------------ */

async function riotFetch<T>(url: string): Promise<T> {
  if (!API_KEY) {
    throw new RiotApiError("NO_API_KEY", 0, "RIOT_API_KEY가 설정되지 않았습니다.");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    await takeSlot();
    const res = await fetch(url, {
      headers: { "X-Riot-Token": API_KEY },
      cache: "no-store",
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "2");
      await sleep((Number.isFinite(retryAfter) ? retryAfter : 2) * 1000 + 250);
      continue;
    }

    if (res.status === 401 || res.status === 403) {
      throw new RiotApiError("FORBIDDEN", res.status, "Riot API 키가 유효하지 않거나 만료되었습니다.");
    }

    if (res.status === 404) {
      throw new RiotApiError("NOT_FOUND", 404, "라이엇 ID를 찾을 수 없습니다.");
    }

    if (res.status === 400) {
      throw new RiotApiError("NOT_FOUND", 400, "잘못된 라이엇 ID 형식입니다.");
    }

    throw new RiotApiError("UNKNOWN", res.status, `Riot API 오류 (${res.status})`);
  }

  throw new RiotApiError("RATE_LIMITED", 429, "Riot API 요청 한도를 초과했습니다.");
}

/* ------------------------------------------------------------------ */
/* 캐시                                                                */
/* ------------------------------------------------------------------ */

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const accountCache = new Map<string, CacheEntry<RiotAccountDto>>();
const matchCache = new Map<string, CacheEntry<RiotMatchDto>>();

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    map.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttl: number) {
  if (map.size > 2000) {
    const oldest = map.keys().next().value;
    if (oldest) map.delete(oldest);
  }
  map.set(key, { value, expires: Date.now() + ttl });
}

/* ------------------------------------------------------------------ */
/* Riot 응답 타입                                                      */
/* ------------------------------------------------------------------ */

interface RiotAccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface RiotMatchParticipant {
  puuid: string;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  teamPosition?: string;
  individualPosition?: string;
  gameEndedInEarlySurrender?: boolean;
}

interface RiotMatchDto {
  metadata: { matchId: string };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameMode: string;
    queueId: number;
    participants: RiotMatchParticipant[];
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function getMatchLimit(): number {
  return MATCH_LIMIT;
}

export function hasRiotKey(): boolean {
  return Boolean(API_KEY);
}

function routeFor(account: RiotAccount): string {
  return REGION_MAP.get(account.region)?.route ?? "asia";
}

export async function fetchAccount(account: RiotAccount): Promise<RiotAccountDto> {
  const cacheKey = `${account.region}:${account.gameName.toLowerCase()}#${account.tagLine.toLowerCase()}`;
  const cached = getCached(accountCache, cacheKey);
  if (cached) return cached;

  const route = routeFor(account);
  const url = `https://${route}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    account.gameName
  )}/${encodeURIComponent(account.tagLine)}`;
  const dto = await riotFetch<RiotAccountDto>(url);
  setCached(accountCache, cacheKey, dto, 10 * 60 * 1000);
  return dto;
}

async function fetchMatch(matchId: string, route: string): Promise<RiotMatchDto> {
  const cacheKey = `${route}:${matchId}`;
  const cached = getCached(matchCache, cacheKey);
  if (cached) return cached;

  const dto = await riotFetch<RiotMatchDto>(
    `https://${route}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`
  );
  setCached(matchCache, cacheKey, dto, 60 * 60 * 1000);
  return dto;
}

function toWeeklyMatch(dto: RiotMatchDto, puuid: string): WeeklyMatch | null {
  if (!RIFT_QUEUES.has(dto.info.queueId)) return null;

  const participant = dto.info.participants.find((p) => p.puuid === puuid);
  if (!participant) return null;

  const end =
    dto.info.gameEndTimestamp ?? dto.info.gameCreation + dto.info.gameDuration * 1000;

  return {
    matchId: dto.metadata.matchId,
    champion: participant.championName,
    win: participant.win,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    queueId: dto.info.queueId,
    gameEndTimestamp: end,
    gameDuration: dto.info.gameDuration,
    role: participant.teamPosition || participant.individualPosition || "",
    remake:
      Boolean(participant.gameEndedInEarlySurrender) || dto.info.gameDuration < 300,
  };
}

export interface WeeklyAccountPayload {
  puuid: string;
  matches: WeeklyMatch[];
  fetchedMatches: number;
}

const weeklyResultCache = new Map<string, CacheEntry<WeeklyAccountPayload>>();

export async function fetchWeeklyMatches(
  account: RiotAccount,
  weekStart: number,
  matchLimit = MATCH_LIMIT
): Promise<WeeklyAccountPayload> {
  const limit = clampNumber(matchLimit, 1, 100);
  const cacheKey = `${account.region}:${account.gameName.toLowerCase()}#${account.tagLine.toLowerCase()}:${weekStart}:${limit}`;
  const cached = getCached(weeklyResultCache, cacheKey);
  if (cached) return cached;

  const dto = await fetchAccount(account);
  const route = routeFor(account);

  const ids = await riotFetch<string[]>(
    `https://${route}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(
      dto.puuid
    )}/ids?startTime=${Math.floor(weekStart / 1000)}&count=${limit}&start=0`
  );

  const settled = await Promise.allSettled(ids.map((id) => fetchMatch(id, route)));

  const matches: WeeklyMatch[] = [];
  let authError: RiotApiError | null = null;

  for (const item of settled) {
    if (item.status === "rejected") {
      const error = item.reason;
      if (
        error instanceof RiotApiError &&
        (error.code === "FORBIDDEN" ||
          error.code === "NO_API_KEY" ||
          error.code === "RATE_LIMITED")
      ) {
        authError = error;
        break;
      }
      continue;
    }
    const match = toWeeklyMatch(item.value, dto.puuid);
    if (match && match.gameEndTimestamp >= weekStart) {
      matches.push(match);
    }
  }

  if (authError) throw authError;

  matches.sort((a, b) => b.gameEndTimestamp - a.gameEndTimestamp);
  const result = { puuid: dto.puuid, matches, fetchedMatches: ids.length };
  setCached(weeklyResultCache, cacheKey, result, 5 * 60 * 1000);
  return result;
}

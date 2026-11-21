export type Role = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";

export interface Champion {
  id: string;
  numericId: number;
  name: string;
  nameEn: string;
  title: string;
  qName: string;
  qRange: number;
  rawRange: number;
  adjusted: boolean;
  attackRange: number;
  roles: Role[];
  classes: string[];
  image: string;
  splash: string;
  qIcon: string;
}

export interface ChampionMeta {
  patch: string;
  generatedAt: string;
  count: number;
  source: string;
  adjustedCount: number;
}

export type RegionId =
  | "KR"
  | "NA"
  | "EUW"
  | "EUNE"
  | "JP"
  | "BR"
  | "LAN"
  | "LAS"
  | "OCE"
  | "TR"
  | "RU"
  | "PH"
  | "SG"
  | "TH"
  | "TW"
  | "VN";

export interface RiotAccount {
  id: string;
  gameName: string;
  tagLine: string;
  region: RegionId;
}

export interface PracticeEntry {
  id: string;
  target: number;
  count: number;
  addedAt: number;
}

export interface WeeklyMatch {
  matchId: string;
  champion: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  queueId: number;
  gameEndTimestamp: number;
  gameDuration: number;
  role: string;
  remake: boolean;
}

export interface AccountResult {
  account: RiotAccount;
  matches: WeeklyMatch[];
  error?: string | null;
  profileIconId?: number;
  summonerLevel?: number;
  fetchedMatches?: number;
}

export type WeeklyErrorCode =
  | "NO_API_KEY"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "REGION_MISMATCH"
  | "UNKNOWN";

export interface ApiError {
  code: WeeklyErrorCode;
  message: string;
}

export interface WeeklyStartLine {
  type: "start";
  weekStart: number;
  weekEnd: number;
  total: number;
  demo: boolean;
}

export interface WeeklyAccountLine {
  type: "account";
  result: AccountResult;
}

export interface WeeklyDoneLine {
  type: "done";
  ok: number;
  failed: number;
}

export type WeeklyStreamLine = WeeklyStartLine | WeeklyAccountLine | WeeklyDoneLine;

export type WeeklyStatus = "idle" | "loading" | "done" | "cancelled" | "error";

export interface WeeklyState {
  status: WeeklyStatus;
  results: AccountResult[];
  error: ApiError | null;
  weekStart: number | null;
  demo: boolean;
  savedAt: number | null;
  progress: { done: number; total: number };
}

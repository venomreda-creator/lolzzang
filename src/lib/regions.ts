import type { RegionId, Role } from "./types";

export interface RegionInfo {
  id: RegionId;
  label: string;
  route: "asia" | "americas" | "europe" | "sea";
}

export const REGIONS: RegionInfo[] = [
  { id: "KR", label: "한국 (KR)", route: "asia" },
  { id: "NA", label: "북미 (NA)", route: "americas" },
  { id: "EUW", label: "서유럽 (EUW)", route: "europe" },
  { id: "EUNE", label: "북유럽 (EUNE)", route: "europe" },
  { id: "JP", label: "일본 (JP)", route: "asia" },
  { id: "BR", label: "브라질 (BR)", route: "americas" },
  { id: "LAN", label: "라틴북 (LAN)", route: "americas" },
  { id: "LAS", label: "라틴남 (LAS)", route: "americas" },
  { id: "OCE", label: "오세아니아 (OCE)", route: "sea" },
  { id: "TR", label: "터키 (TR)", route: "europe" },
  { id: "RU", label: "러시아 (RU)", route: "europe" },
  { id: "PH", label: "필리핀 (PH)", route: "sea" },
  { id: "SG", label: "싱가포르 (SG)", route: "sea" },
  { id: "TH", label: "태국 (TH)", route: "sea" },
  { id: "TW", label: "대만 (TW)", route: "sea" },
  { id: "VN", label: "베트남 (VN)", route: "sea" },
];

export const REGION_MAP = new Map(REGIONS.map((r) => [r.id, r]));

export function isRegionId(value: string): value is RegionId {
  return REGION_MAP.has(value as RegionId);
}

export const ROLE_LABELS: Record<Role, string> = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "서폿",
};

export const ROLE_ORDER: Role[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

/** 소환사의 협곡 큐 */
export const RIFT_QUEUES = new Set([400, 420, 430, 440, 490, 700]);

export const QUEUE_LABELS: Record<number, string> = {
  400: "일반",
  420: "솔로랭크",
  430: "일반",
  440: "자유랭크",
  490: "빠른대전",
  700: "클래시",
};

export function queueLabel(queueId: number): string {
  return QUEUE_LABELS[queueId] ?? `큐 ${queueId}`;
}

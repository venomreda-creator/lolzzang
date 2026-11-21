import championsJson from "@/data/champions.json";
import metaJson from "@/data/meta.json";
import type { Champion, ChampionMeta, Role } from "./types";
import { ROLE_LABELS, ROLE_ORDER } from "./regions";

export const CHAMPIONS = championsJson as Champion[];
export const CHAMPION_META = metaJson as ChampionMeta;
export const CHAMPION_MAP = new Map(CHAMPIONS.map((c) => [c.id, c]));

export function getChampion(id: string | null | undefined): Champion | undefined {
  return id ? CHAMPION_MAP.get(id) : undefined;
}

export type RoleFilter = "ALL" | Role;

export const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: "ALL", label: "전체" },
  ...ROLE_ORDER.map((role) => ({ id: role as RoleFilter, label: ROLE_LABELS[role] })),
];

export function searchChampions(query: string, role: RoleFilter = "ALL"): Champion[] {
  const q = query.trim().toLowerCase();
  return CHAMPIONS.filter((c) => {
    if (role !== "ALL" && !c.roles.includes(role)) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.qName.toLowerCase().includes(q)
    );
  });
}

export type SortKey = "added" | "range-desc" | "range-asc" | "name" | "progress";

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "added", label: "추가한 순서" },
  { id: "range-desc", label: "Q 사정거리 높은순" },
  { id: "range-asc", label: "Q 사정거리 낮은순" },
  { id: "name", label: "이름순" },
  { id: "progress", label: "진행률순" },
];

export type GlowTier = 0 | 1 | 2 | 3;

/** 상대 Q보다 긴 거리 차이를 3단계로 분류 */
export function glowTier(diff: number): GlowTier {
  if (diff <= 0) return 0;
  if (diff <= 100) return 1;
  if (diff <= 250) return 2;
  return 3;
}

export const GLOW_LEGEND: { tier: Exclude<GlowTier, 0>; label: string; detail: string }[] = [
  { tier: 1, label: "골드", detail: "+1 ~ 100" },
  { tier: 2, label: "앰버", detail: "+101 ~ 250" },
  { tier: 3, label: "백금", detail: "+251 이상" },
];

export function clampTarget(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(200, Math.max(1, Math.round(value)));
}

export function clampCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(200, Math.max(0, Math.round(value)));
}

export function practiceProgress(entry: { count: number; target: number }): number {
  if (entry.target <= 0) return 0;
  return Math.min(100, (entry.count / entry.target) * 100);
}

export function sortPractice<T extends { id: string; count: number; target: number }>(
  entries: T[],
  sort: SortKey
): T[] {
  const copy = [...entries];
  switch (sort) {
    case "range-desc":
      return copy.sort((a, b) => (getChampion(b.id)?.qRange ?? 0) - (getChampion(a.id)?.qRange ?? 0));
    case "range-asc":
      return copy.sort((a, b) => (getChampion(a.id)?.qRange ?? 0) - (getChampion(b.id)?.qRange ?? 0));
    case "name":
      return copy.sort((a, b) =>
        (getChampion(a.id)?.name ?? a.id).localeCompare(getChampion(b.id)?.name ?? b.id, "ko")
      );
    case "progress":
      return copy.sort((a, b) => practiceProgress(b) - practiceProgress(a));
    case "added":
    default:
      return copy;
  }
}

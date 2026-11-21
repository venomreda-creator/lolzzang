"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChampionPicker from "./ChampionPicker";
import Countdown from "./Countdown";
import EnemySection from "./EnemySection";
import { Icon, type IconName } from "./Icons";
import PracticeSection from "./PracticeSection";
import { ToastStack, type ToastItem, type ToastTone } from "./Toast";
import WeeklySection from "./WeeklySection";
import {
  CHAMPIONS,
  CHAMPION_MAP,
  CHAMPION_META,
  SORT_OPTIONS,
  clampCount,
  clampTarget,
  getChampion,
  type SortKey,
} from "@/lib/champions";
import { loadJson, removeKey, saveJson, STORAGE_KEYS } from "@/lib/storage";
import type {
  AccountResult,
  ApiError,
  PracticeEntry,
  RegionId,
  RiotAccount,
  WeeklyState,
  WeeklyStreamLine,
} from "@/lib/types";
import { useWeekStart } from "@/lib/useWeekStart";
import { getWeekStart } from "@/lib/week";
import { aggregateWeekly } from "@/lib/weekly";

function createInitialWeekly(): WeeklyState {
  return {
    status: "idle",
    results: [],
    error: null,
    weekStart: null,
    demo: false,
    savedAt: null,
    progress: { done: 0, total: 0 },
  };
}

function isValidPractice(value: unknown): value is PracticeEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string" && CHAMPION_MAP.has(entry.id);
}

function isValidAccount(value: unknown): value is RiotAccount {
  if (!value || typeof value !== "object") return false;
  const account = value as Record<string, unknown>;
  return (
    typeof account.id === "string" &&
    typeof account.gameName === "string" &&
    typeof account.tagLine === "string" &&
    typeof account.region === "string"
  );
}

interface HeroStatProps {
  icon: IconName;
  label: string;
  value: string | number;
  unit?: string;
}

function HeroStat({ icon, label, value, unit }: HeroStatProps) {
  return (
    <div className="stat-chip">
      <span className="stat-chip-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="stat-chip-body">
        <span className="stat-chip-label">{label}</span>
        <span className="stat-chip-value">
          {value}
          {unit && <small> {unit}</small>}
        </span>
      </span>
    </div>
  );
}

export default function HomeClient({ matchLimit }: { matchLimit: number }) {
  const [practice, setPractice] = useState<PracticeEntry[]>([]);
  const [enemyId, setEnemyId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<RiotAccount[]>([]);
  const [sort, setSort] = useState<SortKey>("added");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [picker, setPicker] = useState<"practice" | "enemy" | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [weekly, setWeekly] = useState<WeeklyState>(createInitialWeekly);

  const weekStart = useWeekStart();
  const abortRef = useRef<AbortController | null>(null);
  const toastSeq = useRef(0);
  const highlightTimer = useRef<number | null>(null);

  const pushToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  /* ---------------- localStorage load ---------------- */
  useEffect(() => {
    const storedPractice = loadJson<unknown>(STORAGE_KEYS.practice, []);
    if (Array.isArray(storedPractice)) {
      const clean = storedPractice
        .filter(isValidPractice)
        .slice(0, CHAMPIONS.length)
        .map((entry, index) => ({
          id: entry.id,
          target: clampTarget(Number(entry.target)),
          count: clampCount(Number(entry.count)),
          addedAt:
            typeof entry.addedAt === "number" ? entry.addedAt : Date.now() + index,
        }));
      setPractice(clean);
    }

    const storedEnemy = loadJson<unknown>(STORAGE_KEYS.enemy, null);
    if (typeof storedEnemy === "string" && CHAMPION_MAP.has(storedEnemy)) {
      setEnemyId(storedEnemy);
    }

    const storedAccounts = loadJson<unknown>(STORAGE_KEYS.accounts, []);
    if (Array.isArray(storedAccounts)) {
      const clean = storedAccounts.filter(isValidAccount).slice(0, 10);
      setAccounts(clean);
    }

    const storedSort = loadJson<unknown>(STORAGE_KEYS.sort, "added");
    if (SORT_OPTIONS.some((option) => option.id === storedSort)) {
      setSort(storedSort as SortKey);
    }

    const storedTheme = loadJson<unknown>(STORAGE_KEYS.theme, "dark");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    }

    const cached = loadJson<unknown>(STORAGE_KEYS.weekly, null);
    if (cached && typeof cached === "object") {
      const data = cached as {
        weekStart?: number;
        savedAt?: number;
        demo?: boolean;
        results?: AccountResult[];
      };
      const current = getWeekStart();
      const fresh =
        typeof data.savedAt === "number" && Date.now() - data.savedAt < 10 * 60 * 1000;
      if (
        data.weekStart === current &&
        fresh &&
        Array.isArray(data.results) &&
        data.results.every((item) => item && item.account && Array.isArray(item.matches))
      ) {
        setWeekly({
          status: "done",
          results: data.results,
          error: null,
          weekStart: data.weekStart,
          demo: Boolean(data.demo),
          savedAt: data.savedAt ?? null,
          progress: { done: data.results.length, total: data.results.length },
        });
      }
    }

    setLoaded(true);
  }, []);

  /* ---------------- persistence ---------------- */
  useEffect(() => {
    if (!loaded) return;
    saveJson(STORAGE_KEYS.practice, practice);
  }, [practice, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveJson(STORAGE_KEYS.accounts, accounts);
  }, [accounts, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveJson(STORAGE_KEYS.enemy, enemyId);
  }, [enemyId, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveJson(STORAGE_KEYS.sort, sort);
  }, [sort, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveJson(STORAGE_KEYS.theme, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme, loaded]);

  /* ---------------- derived ---------------- */
  const enemy = getChampion(enemyId) ?? null;
  const totalCount = practice.reduce((sum, entry) => sum + entry.count, 0);
  const totalTarget = practice.reduce((sum, entry) => sum + entry.target, 0);
  const completed = practice.filter((entry) => entry.count >= entry.target).length;
  const advantageCount = enemy
    ? practice.filter((entry) => {
        const champion = getChampion(entry.id);
        return champion ? champion.qRange > enemy.qRange : false;
      }).length
    : 0;

  const aggregate = useMemo(() => {
    if (weekly.results.length === 0) return null;
    return aggregateWeekly(
      weekly.results,
      practice,
      weekly.weekStart ?? weekStart ?? getWeekStart()
    );
  }, [weekly.results, weekly.weekStart, practice, weekStart]);

  /* ---------------- practice handlers ---------------- */
  const addPractice = useCallback(
    (ids: string[], target: number) => {
      const existing = new Set(practice.map((entry) => entry.id));
      const additions = ids.filter((id) => CHAMPION_MAP.has(id) && !existing.has(id));
      const slots = Math.max(0, CHAMPIONS.length - practice.length);
      const accepted = additions.slice(0, slots);
      const clampedTarget = clampTarget(target);

      if (accepted.length === 0) {
        pushToast(
          `추가할 수 있는 연습 챔피언이 없습니다. (최대 ${CHAMPIONS.length}개)`,
          "warning"
        );
        return;
      }

      setPractice((prev) => [
        ...prev,
        ...accepted.map((id, index) => ({
          id,
          target: clampedTarget,
          count: 0,
          addedAt: Date.now() + index,
        })),
      ]);

      if (accepted.length < additions.length || accepted.length < ids.length) {
        pushToast(
          `현재 데이터 기준 최대 ${CHAMPIONS.length}개까지 등록됩니다. ${accepted.length}개를 추가했습니다.`,
          "warning"
        );
      } else {
        pushToast(
          `${accepted.length}개 챔피언을 추가했습니다. 목표 ${clampedTarget}회.`,
          "success"
        );
      }
    },
    [practice, pushToast]
  );

  const increment = useCallback(
    (id: string) => {
      const entry = practice.find((item) => item.id === id);
      if (!entry) return;
      if (entry.count >= 200) {
        pushToast("연습 횟수는 최대 200회입니다.", "warning");
        return;
      }
      if (entry.count + 1 === entry.target) {
        const champion = getChampion(id);
        pushToast(`${champion?.name ?? "챔피언"} 목표 ${entry.target}회 달성!`, "success");
      }
      setPractice((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, count: Math.min(200, item.count + 1) } : item
        )
      );
    },
    [practice, pushToast]
  );

  const decrement = useCallback((id: string) => {
    setPractice((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, count: Math.max(0, item.count - 1) } : item
      )
    );
  }, []);

  const changeTarget = useCallback((id: string, target: number) => {
    setPractice((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, target: clampTarget(target) } : item
      )
    );
  }, []);

  const resetEntry = useCallback(
    (id: string) => {
      setPractice((prev) =>
        prev.map((item) => (item.id === id ? { ...item, count: 0 } : item))
      );
      pushToast("연습 횟수를 초기화했습니다.", "info");
    },
    [pushToast]
  );

  const removeEntry = useCallback(
    (id: string) => {
      const champion = getChampion(id);
      setPractice((prev) => prev.filter((item) => item.id !== id));
      pushToast(`${champion?.name ?? "챔피언"} 카드를 삭제했습니다.`, "info");
    },
    [pushToast]
  );

  const clearAll = useCallback(() => {
    setPractice([]);
    pushToast("모든 연습 카드를 삭제했습니다.", "info");
  }, [pushToast]);

  const selectEnemy = useCallback(
    (id: string) => {
      const champion = getChampion(id);
      setEnemyId(id);
      if (champion) pushToast(`상대 챔피언: ${champion.name}`, "info");
    },
    [pushToast]
  );

  const clearEnemy = useCallback(() => {
    setEnemyId(null);
    pushToast("상대 챔피언을 해제했습니다.", "info");
  }, [pushToast]);

  const focusPractice = useCallback((id: string) => {
    setHighlightId(id);
    const node = document.getElementById(`practice-card-${id}`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1400);
  }, []);

  /* ---------------- account handlers ---------------- */
  const resetWeekly = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setWeekly(createInitialWeekly());
    removeKey(STORAGE_KEYS.weekly);
  }, []);

  const addAccount = useCallback(
    (gameName: string, tagLine: string, region: RegionId): boolean => {
      if (accounts.length >= 10) {
        pushToast("계정은 최대 10개까지 등록할 수 있습니다.", "warning");
        return false;
      }
      const duplicate = accounts.some(
        (account) =>
          account.region === region &&
          account.gameName.toLowerCase() === gameName.toLowerCase() &&
          account.tagLine.toLowerCase() === tagLine.toLowerCase()
      );
      if (duplicate) {
        pushToast("이미 등록된 계정입니다.", "warning");
        return false;
      }

      setAccounts((prev) => [
        ...prev,
        {
          id: `${region}:${gameName}#${tagLine}`,
          gameName,
          tagLine,
          region,
        },
      ]);
      resetWeekly();
      pushToast(`${gameName}#${tagLine} 계정을 추가했습니다.`, "success");
      return true;
    },
    [accounts, pushToast, resetWeekly]
  );

  const removeAccount = useCallback(
    (id: string) => {
      setAccounts((prev) => prev.filter((account) => account.id !== id));
      resetWeekly();
      pushToast("계정을 삭제했습니다.", "info");
    },
    [pushToast, resetWeekly]
  );

  /* ---------------- weekly fetch ---------------- */
  const loadWeekly = useCallback(
    async (demo = false) => {
      if (accounts.length === 0) {
        pushToast("롤 계정을 먼저 등록하세요.", "warning");
        return;
      }
      if (practice.length === 0) {
        pushToast("연습 챔피언을 먼저 추가하세요.", "warning");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const startedWeek = weekStart ?? getWeekStart();

      setWeekly({
        status: "loading",
        results: [],
        error: null,
        weekStart: startedWeek,
        demo,
        savedAt: null,
        progress: { done: 0, total: accounts.length },
      });

      try {
        const response = await fetch("/api/weekly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accounts,
            practiceChampions: practice.map((entry) => entry.id),
            demo,
            matchLimit,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let error: ApiError = {
            code: "UNKNOWN",
            message: `요청에 실패했습니다. (${response.status})`,
          };
          try {
            const data = (await response.json()) as Partial<ApiError>;
            if (data.code) {
              error = {
                code: data.code,
                message: data.message ?? "잠시 후 다시 시도해주세요.",
              };
            }
          } catch {
            /* ignore */
          }
          setWeekly((prev) => ({ ...prev, status: "error", error }));
          return;
        }

        if (!response.body) {
          setWeekly((prev) => ({
            ...prev,
            status: "error",
            error: { code: "UNKNOWN", message: "응답 스트림을 읽을 수 없습니다." },
          }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let results: AccountResult[] = [];
        let streamWeek = startedWeek;

        const handleLine = (line: string) => {
          if (!line.trim()) return;
          let payload: WeeklyStreamLine;
          try {
            payload = JSON.parse(line) as WeeklyStreamLine;
          } catch {
            return;
          }

          if (payload.type === "start") {
            streamWeek = payload.weekStart;
            setWeekly((prev) => ({
              ...prev,
              weekStart: payload.weekStart,
              demo: payload.demo,
              progress: { done: 0, total: payload.total },
            }));
            return;
          }

          if (payload.type === "account") {
            results = [...results, payload.result];
            setWeekly((prev) => ({
              ...prev,
              results,
              progress: { ...prev.progress, done: results.length },
            }));
            return;
          }

          if (payload.type === "done") {
            const savedAt = Date.now();
            setWeekly((prev) => ({
              ...prev,
              status: "done",
              results,
              weekStart: streamWeek,
              savedAt,
              progress: { done: results.length, total: prev.progress.total },
            }));
            saveJson(STORAGE_KEYS.weekly, {
              weekStart: streamWeek,
              savedAt,
              results,
              demo,
            });
            pushToast(
              demo ? "데모 전적을 불러왔습니다." : "이번 주 전적을 불러왔습니다.",
              "success"
            );
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) handleLine(line);
        }
        if (buffer.trim()) handleLine(buffer);

        setWeekly((prev) =>
          prev.status === "loading"
            ? { ...prev, status: "done", results, weekStart: streamWeek, savedAt: Date.now() }
            : prev
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setWeekly((prev) => ({
          ...prev,
          status: "error",
          error: {
            code: "UNKNOWN",
            message: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          },
        }));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [accounts, practice, weekStart, matchLimit, pushToast]
  );

  const cancelWeekly = useCallback(() => {
    abortRef.current?.abort();
    setWeekly((prev) =>
      prev.status === "loading"
        ? { ...prev, status: "cancelled", savedAt: Date.now() }
        : prev
    );
    pushToast("전적 조회를 중단했습니다.", "info");
  }, [pushToast]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="app-shell" id="top">
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#top">
            <svg className="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path
                d="M20 2.5 35.5 11v18L20 37.5 4.5 29V11Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M20 10v18M13.5 16.5 20 10l6.5 6.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="20" cy="26.5" r="2.2" fill="currentColor" />
            </svg>
            <span className="brand-copy">
              <span className="brand-name">RIFT DRILL</span>
              <span className="brand-sub">LoL Champion Practice Lab</span>
            </span>
          </a>

          <nav className="header-nav" aria-label="주요 섹션">
            <a className="nav-link" href="#practice">
              연습 챔피언
            </a>
            <a className="nav-link" href="#matchup">
              상대 챔피언
            </a>
            <a className="nav-link" href="#weekly">
              이번 주 전적
            </a>
          </nav>

          <div className="header-tools">
            <Countdown />
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
              title={theme === "dark" ? "라이트 모드" : "다크 모드"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
            </button>
          </div>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">RIFT DRILL · CHAMPION PRACTICE PROTOCOL</div>
            <h1 className="hero-title" id="hero-title">
              거리 감각을
              <br />
              <em>이기는 연습.</em>
            </h1>
            <p className="hero-desc">
              연습할 챔피언의 목표를 세우고, 상대의 <strong>Q 사정거리</strong>보다 긴 카드를
              찾아내세요. 이번 주 실제 전적으로 <strong>연습이 통하고 있는지</strong> 확인할 수
              있습니다.
            </p>
            <div className="hero-stats">
              <HeroStat
                icon="sword"
                label="연습 챔피언"
                value={practice.length}
                unit="종"
              />
              <HeroStat
                icon="flame"
                label="누적 연습"
                value={totalCount.toLocaleString("ko-KR")}
                unit={`/ ${totalTarget.toLocaleString("ko-KR")}회`}
              />
              <HeroStat
                icon="check"
                label="목표 달성"
                value={completed}
                unit={`/ ${practice.length}`}
              />
              <HeroStat
                icon="crosshair"
                label="상대 우위"
                value={advantageCount}
                unit={enemy ? `${enemy.name} 기준` : "상대 미선택"}
              />
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="orbit">
              <span className="orbit-dot" />
            </div>
            <div className="orbit orbit-2">
              <span className="orbit-dot" />
            </div>
            <div className="hex-core">
              <Icon name="sword" size={54} />
            </div>
            <span className="hero-note">HEXTECH PRACTICE PROTOCOL</span>
          </div>
        </div>
      </section>

      <main className="container main-stack">
        <div className="main-grid">
          <PracticeSection
            practice={practice}
            enemy={enemy}
            sort={sort}
            onSortChange={setSort}
            onOpenPicker={() => setPicker("practice")}
            onIncrement={increment}
            onDecrement={decrement}
            onTargetChange={changeTarget}
            onReset={resetEntry}
            onRemove={removeEntry}
            onClearAll={clearAll}
            highlightId={highlightId}
          />

          <div className="side-stack">
            <EnemySection
              enemy={enemy}
              practice={practice}
              onOpenPicker={() => setPicker("enemy")}
              onClear={clearEnemy}
              onFocusPractice={focusPractice}
            />
          </div>
        </div>

        <WeeklySection
          accounts={accounts}
          practiceCount={practice.length}
          weekStart={weekStart}
          weekly={weekly}
          aggregate={aggregate}
          matchLimit={matchLimit}
          onAddAccount={addAccount}
          onRemoveAccount={removeAccount}
          onLoad={() => void loadWeekly(false)}
          onDemo={() => void loadWeekly(true)}
          onCancel={cancelWeekly}
        />
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span className="footer-brand">
            <Icon name="sword" size={14} />
            RIFT DRILL
          </span>
          <div className="footer-note">
            <span>Q 사정거리 · Riot Data Dragon {CHAMPION_META.patch}</span>
            <span className="dot" />
            <span>일부 스킬 실효 사거리 보정</span>
            <span className="dot" />
            <span>Riot Games와 무관한 팬 프로젝트</span>
          </div>
        </div>
      </footer>

      <ChampionPicker
        open={picker !== null}
        mode={picker ?? "practice"}
        existingIds={practice.map((entry) => entry.id)}
        currentEnemyId={enemyId}
        onClose={() => setPicker(null)}
        onAddPractice={addPractice}
        onSelectEnemy={selectEnemy}
      />

      <ToastStack
        items={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
      />
    </div>
  );
}

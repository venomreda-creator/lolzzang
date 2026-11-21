"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHAMPIONS,
  ROLE_FILTERS,
  SORT_OPTIONS,
  getChampion,
  searchChampions,
  sortPractice,
  type RoleFilter,
  type SortKey,
} from "@/lib/champions";
import type { Champion, PracticeEntry } from "@/lib/types";
import { Icon } from "./Icons";
import PracticeCard from "./PracticeCard";

interface PracticeSectionProps {
  practice: PracticeEntry[];
  enemy: Champion | null;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onOpenPicker: () => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onTargetChange: (id: string, target: number) => void;
  onReset: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  highlightId: string | null;
}

export default function PracticeSection({
  practice,
  enemy,
  sort,
  onSortChange,
  onOpenPicker,
  onIncrement,
  onDecrement,
  onTargetChange,
  onReset,
  onRemove,
  onClearAll,
  highlightId,
}: PracticeSectionProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [confirmClear, setConfirmClear] = useState(false);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, []);

  const allowed = new Set(searchChampions(query, role).map((c) => c.id));
  const filtered = practice.filter((entry) => allowed.has(entry.id));
  const sorted = sortPractice(filtered, sort);

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      clearTimer.current = window.setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    setConfirmClear(false);
    onClearAll();
  };

  return (
    <section className="section" id="practice" aria-labelledby="practice-title">
      <div className="section-head">
        <div className="section-head-copy">
          <div className="section-kicker">
            01 <span>·</span> PRACTICE ROSTER
          </div>
          <h2 className="section-title" id="practice-title">
            연습 챔피언
          </h2>
          <p className="section-desc">
            챔피언과 목표 횟수를 정하면 카드가 만들어집니다. <strong>+ 1회</strong> 버튼으로
            연습 횟수를 쌓고 진행률을 확인하세요.
          </p>
        </div>
        <div className="section-side">
          <span className="section-count">
            <b>{practice.length}</b> / {CHAMPIONS.length}
          </span>
          {practice.length > 0 && (
            <button
              type="button"
              className={`btn btn-sm ${confirmClear ? "btn-danger" : "btn-ghost"}`}
              onClick={handleClearAll}
              title="모든 연습 카드 삭제"
            >
              <Icon name="trash" size={13} />
              {confirmClear ? "정말 전체 삭제?" : "전체 초기화"}
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenPicker}>
            <Icon name="plus" size={15} />
            챔피언 추가
          </button>
        </div>
      </div>

      <div className="practice-toolbar">
        <div className="search-field">
          <Icon name="search" size={15} className="icon" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="연습 챔피언 검색"
            aria-label="연습 챔피언 검색"
          />
        </div>
        <div className="role-chips" role="group" aria-label="역할 필터">
          {ROLE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${role === item.id ? "active" : ""}`}
              onClick={() => setRole(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <div className="select-wrap">
            <select
              className="select"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortKey)}
              aria-label="연습 카드 정렬"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={13} />
          </div>
        </div>
      </div>

      {practice.length === 0 ? (
        <div className="practice-empty">
          <div className="empty-icon">
            <Icon name="sword" size={26} />
          </div>
          <h3>첫 연습 챔피언을 골라보세요</h3>
          <p>
            원하는 챔피언을 등록하고 목표 횟수(최대 200회)를 설정할 수 있습니다.
            등록한 카드는 상대 챔피언의 Q 사정거리와 비교됩니다.
          </p>
          <button type="button" className="btn btn-primary" onClick={onOpenPicker}>
            <Icon name="plus" size={16} />
            연습 챔피언 추가
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="no-results">
          <p>조건에 맞는 연습 챔피언이 없습니다.</p>
          <p style={{ marginTop: 4, fontSize: 11 }}>
            검색어를 지우거나 다른 역할 필터를 선택해 보세요.
          </p>
        </div>
      ) : (
        <div className="practice-grid">
          {sorted.map((entry) => {
            const champion = getChampion(entry.id);
            if (!champion) return null;
            return (
              <PracticeCard
                key={entry.id}
                entry={entry}
                champion={champion}
                enemy={enemy}
                highlight={highlightId === entry.id}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onTargetChange={onTargetChange}
                onReset={onReset}
                onRemove={onRemove}
              />
            );
          })}
          {practice.length < CHAMPIONS.length && (
            <button type="button" className="add-card" onClick={onOpenPicker}>
              <span className="add-card-icon">
                <Icon name="plus" size={20} />
              </span>
              <strong>챔피언 추가</strong>
              <span>{CHAMPIONS.length - practice.length}개 더 등록 가능</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}

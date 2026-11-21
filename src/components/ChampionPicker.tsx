"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHAMPIONS,
  ROLE_FILTERS,
  clampTarget,
  searchChampions,
  type RoleFilter,
} from "@/lib/champions";
import { Icon } from "./Icons";

interface ChampionPickerProps {
  open: boolean;
  mode: "practice" | "enemy";
  existingIds: string[];
  currentEnemyId?: string | null;
  onClose: () => void;
  onAddPractice: (ids: string[], target: number) => void;
  onSelectEnemy: (id: string) => void;
}

const TARGET_PRESETS = [5, 10, 20, 50];

export default function ChampionPicker({
  open,
  mode,
  existingIds,
  currentEnemyId,
  onClose,
  onAddPractice,
  onSelectEnemy,
}: ChampionPickerProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetText, setTargetText] = useState("10");
  const [limitMessage, setLimitMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);
  const remaining = Math.max(0, CHAMPIONS.length - existingIds.length);
  const filtered = useMemo(() => searchChampions(query, role), [query, role]);
  const target = clampTarget(Number(targetText) || 1);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setRole("ALL");
    setSelected(new Set());
    setTargetText("10");
    setLimitMessage("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 70);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (id: string) => {
    if (mode !== "practice" || existingSet.has(id)) return;
    setLimitMessage("");

    if (selected.has(id)) {
      const next = new Set(selected);
      next.delete(id);
      setSelected(next);
      return;
    }

    if (selected.size >= remaining) {
      setLimitMessage(
        remaining === 0
          ? `연습 챔피언은 최대 ${CHAMPIONS.length}개까지 등록할 수 있습니다.`
          : `이번에는 최대 ${remaining}명까지 추가할 수 있습니다.`
      );
      return;
    }

    const next = new Set(selected);
    next.add(id);
    setSelected(next);
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    onAddPractice([...selected], target);
    onClose();
  };

  const handleEnemy = (id: string) => {
    onSelectEnemy(id);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={mode === "practice" ? "연습 챔피언 추가" : "상대 챔피언 선택"}>
        <div className="modal-head">
          <div>
            <h2 className="modal-title">
              {mode === "practice" ? "연습 챔피언 추가" : "상대 챔피언 선택"}
            </h2>
            <p className="modal-sub">
              {mode === "practice"
                ? "추가할 챔피언을 선택하고 목표 연습 횟수를 정하세요."
                : "상대의 Q 사정거리를 기준으로 연습 카드의 우위를 표시합니다."}
            </p>
          </div>
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="닫기">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="picker-toolbar">
          <div className="picker-toolbar-row">
            <div className="search-field" style={{ flex: "1 1 260px" }}>
              <Icon name="search" size={15} className="icon" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="챔피언 이름 · 영문명 · 스킬명 검색"
                aria-label="챔피언 검색"
              />
            </div>
            <span className="picker-count">{filtered.length} / {CHAMPIONS.length}명</span>
          </div>
          <div className="picker-toolbar-row">
            <div className="role-chips">
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
            {mode === "practice" && (
              <span className="modal-hint" style={{ marginLeft: "auto" }}>
                {existingIds.length} / {CHAMPIONS.length} 등록됨
              </span>
            )}
          </div>
        </div>

        <div className="modal-body">
          {filtered.length === 0 ? (
            <div className="pick-empty">
              <p>검색 결과가 없습니다.</p>
              <p style={{ marginTop: 4, fontSize: 11 }}>다른 이름이나 역할로 검색해 보세요.</p>
            </div>
          ) : (
            <div className="pick-grid">
              {filtered.map((champ) => {
                const isExisting = existingSet.has(champ.id);
                const isSelected =
                  mode === "practice" ? selected.has(champ.id) : currentEnemyId === champ.id;
                const disabled = mode === "practice" && isExisting;

                return (
                  <button
                    key={champ.id}
                    type="button"
                    className={`pick-tile ${isSelected ? "selected" : ""} ${disabled ? "added" : ""}`}
                    onClick={() => (mode === "practice" ? toggle(champ.id) : handleEnemy(champ.id))}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    title={`${champ.name} · Q ${champ.qRange}`}
                  >
                    <img src={champ.image} alt="" loading="lazy" width={64} height={64} />
                    {isSelected && (
                      <span className="pick-check">
                        <Icon name="check" size={12} />
                      </span>
                    )}
                    {disabled && <span className="pick-added-label">추가됨</span>}
                    <span className="pick-name">{champ.name}</span>
                    <span className="pick-q">Q {champ.qRange}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {mode === "practice" ? (
          <div className="modal-foot">
            <span className="selection-count">
              <b>{selected.size}</b>명 선택
              {limitMessage && (
                <span style={{ display: "block", color: "var(--red)", fontSize: 10 }}>
                  {limitMessage}
                </span>
              )}
            </span>

            <div className="target-stepper" aria-label="목표 연습 횟수">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setTargetText(String(clampTarget(target - 1)))}
                aria-label="목표 횟수 감소"
              >
                <Icon name="minus" size={14} />
              </button>
              <input
                className="stepper-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={targetText}
                onChange={(event) => setTargetText(event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                onBlur={() => setTargetText(String(target))}
                aria-label="목표 연습 횟수 (1~200)"
              />
              <span className="stepper-suffix">회</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setTargetText(String(clampTarget(target + 1)))}
                aria-label="목표 횟수 증가"
              >
                <Icon name="plus" size={14} />
              </button>
            </div>

            <div className="preset-row" aria-label="목표 횟수 빠른 선택">
              {TARGET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="preset"
                  onClick={() => setTargetText(String(preset))}
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={selected.size === 0}
            >
              <Icon name="plus" size={16} />
              {selected.size}명 추가
            </button>
          </div>
        ) : (
          <div className="modal-foot">
            <span className="modal-hint">챔피언을 클릭하면 상대가 바로 적용됩니다.</span>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ marginLeft: "auto" }}>
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

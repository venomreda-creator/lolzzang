"use client";

import { useEffect, useRef, useState } from "react";
import { clampTarget, glowTier, practiceProgress } from "@/lib/champions";
import type { Champion, PracticeEntry } from "@/lib/types";
import { Icon } from "./Icons";

interface PracticeCardProps {
  entry: PracticeEntry;
  champion: Champion;
  enemy: Champion | null;
  highlight: boolean;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onTargetChange: (id: string, target: number) => void;
  onReset: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function PracticeCard({
  entry,
  champion,
  enemy,
  highlight,
  onIncrement,
  onDecrement,
  onTargetChange,
  onReset,
  onRemove,
}: PracticeCardProps) {
  const [targetText, setTargetText] = useState(String(entry.target));
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    setTargetText(String(entry.target));
  }, [entry.target]);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const pct = practiceProgress(entry);
  const complete = entry.count >= entry.target;
  const diff = enemy ? champion.qRange - enemy.qRange : 0;
  const tier = glowTier(diff);
  const className = [
    "practice-card",
    tier > 0 ? `glow-${tier}` : "",
    complete ? "is-complete" : "",
    highlight ? "is-highlight" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const commitTarget = () => {
    const next = clampTarget(Number(targetText));
    onTargetChange(entry.id, next);
    setTargetText(String(next));
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      resetTimer.current = window.setTimeout(() => setConfirmReset(false), 2600);
      return;
    }
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setConfirmReset(false);
    onReset(entry.id);
  };

  return (
    <article
      className={className}
      id={`practice-card-${entry.id}`}
      aria-label={`${champion.name} 연습 카드`}
    >
      <div className="pcard-top">
        <img
          className="pcard-portrait"
          src={champion.image}
          alt=""
          width={54}
          height={54}
          loading="lazy"
        />
        <div className="pcard-id">
          <span className="pcard-name">{champion.name}</span>
          <span className="pcard-title">{champion.title}</span>
        </div>
        <button
          type="button"
          className="icon-btn danger pcard-remove"
          onClick={() => onRemove(entry.id)}
          aria-label={`${champion.name} 카드 삭제`}
          title="카드 삭제"
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      <div className="pcard-tags">
        <span
          className="q-tag"
          title={`${champion.name} · ${champion.qName} — Q ${champion.qRange}`}
        >
          <img className="q-tag-icon" src={champion.qIcon} alt="" width={15} height={15} loading="lazy" />
          <span className="q-key">Q</span>
          <b>{champion.qRange}</b>
        </span>
        {tier > 0 && enemy && (
          <span
            className={`diff-chip tier-${tier}`}
            title={`${enemy.name}의 Q ${enemy.qRange}보다 ${diff} 김`}
          >
            +{diff}
          </span>
        )}
        {complete && (
          <span className="complete-badge">
            <Icon name="check" size={10} /> 완료
          </span>
        )}
      </div>

      <div className="pcard-countrow">
        <span className="pcard-count">{entry.count}</span>
        <span className="pcard-target">/ {entry.target}회</span>
        <span className="pcard-pct">{Math.round(pct)}%</span>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`${champion.name} 연습 진행률`}
      >
        <span className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="pcard-controls">
        <button
          type="button"
          className="step-btn"
          onClick={() => onDecrement(entry.id)}
          disabled={entry.count <= 0}
          aria-label={`${champion.name} 연습 횟수 1 감소`}
          title="1회 감소"
        >
          <Icon name="minus" size={15} />
        </button>
        <button
          type="button"
          className="step-btn plus"
          onClick={() => onIncrement(entry.id)}
          disabled={entry.count >= 200}
          aria-label={`${champion.name} 연습 횟수 1회 증가`}
          title={entry.count >= 200 ? "최대 200회입니다" : "1회 증가"}
        >
          <Icon name="plus" size={15} />1회
        </button>
        <div className="target-edit">
          <label htmlFor={`target-${entry.id}`}>목표</label>
          <input
            id={`target-${entry.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            value={targetText}
            onChange={(event) =>
              setTargetText(event.target.value.replace(/[^\d]/g, "").slice(0, 3))
            }
            onBlur={commitTarget}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            aria-label={`${champion.name} 목표 연습 횟수 (1~200)`}
          />
          <span style={{ fontSize: 9, color: "var(--faint)", fontWeight: 800 }}>회</span>
        </div>
      </div>

      <div className="pcard-foot">
        <button
          type="button"
          className={`reset-link ${confirmReset ? "confirm" : ""}`}
          onClick={handleReset}
          title={confirmReset ? "한 번 더 누르면 초기화됩니다" : "연습 횟수를 0으로 초기화"}
        >
          <Icon name="reset" size={11} />
          {confirmReset ? "정말 초기화?" : "초기화"}
        </button>
        <span className="pcard-qname" title={champion.qName}>
          {champion.qName}
        </span>
      </div>
    </article>
  );
}

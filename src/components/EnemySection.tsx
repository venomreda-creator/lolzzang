"use client";

import { getChampion, glowTier, GLOW_LEGEND } from "@/lib/champions";
import { ROLE_LABELS } from "@/lib/regions";
import type { Champion, PracticeEntry } from "@/lib/types";
import { Icon } from "./Icons";

interface EnemySectionProps {
  enemy: Champion | null;
  practice: PracticeEntry[];
  onOpenPicker: () => void;
  onClear: () => void;
  onFocusPractice: (id: string) => void;
}

export default function EnemySection({
  enemy,
  practice,
  onOpenPicker,
  onClear,
  onFocusPractice,
}: EnemySectionProps) {
  const advantages = enemy
    ? practice
        .map((entry) => {
          const champion = getChampion(entry.id);
          return champion ? { champion, diff: champion.qRange - enemy.qRange } : null;
        })
        .filter(
          (item): item is { champion: Champion; diff: number } =>
            item !== null && item.diff > 0
        )
        .sort((a, b) => b.diff - a.diff)
    : [];

  return (
    <section className="section" id="matchup" aria-labelledby="matchup-title">
      <div className="section-head">
        <div className="section-head-copy">
          <div className="section-kicker">
            02 <span>·</span> MATCHUP
          </div>
          <h2 className="section-title" id="matchup-title">
            상대 챔피언
          </h2>
        </div>
        <div className="section-side">
          <button type="button" className="btn btn-sm btn-soft" onClick={onOpenPicker}>
            <Icon name="crosshair" size={14} />
            {enemy ? "변경" : "선택"}
          </button>
        </div>
      </div>

      <div className="panel matchup-panel">
        <div className="matchup-head">
          <div>
            <div className="eyebrow">LANE OPPONENT</div>
            <h2 style={{ marginTop: 3 }}>거리 우위 분석</h2>
          </div>
          <span className="section-count">Q RANGE</span>
        </div>

        {enemy ? (
          <>
            <div className="enemy-showcase">
              <div className="enemy-art" aria-hidden="true">
                <img className="enemy-bg" src={enemy.image} alt="" />
                <img
                  className="enemy-splash"
                  src={enemy.splash}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div className="enemy-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onOpenPicker}
                  aria-label="상대 챔피언 변경"
                  title="상대 챔피언 변경"
                >
                  <Icon name="crosshair" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onClear}
                  aria-label="상대 챔피언 해제"
                  title="상대 챔피언 해제"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
              <div className="enemy-info">
                <div className="enemy-roles">
                  {enemy.roles.map((role) => (
                    <span key={role}>{ROLE_LABELS[role]}</span>
                  ))}
                </div>
                <h3 className="enemy-name">{enemy.name}</h3>
                <p className="enemy-title">{enemy.title}</p>
                <div className="enemy-q-row">
                  <span className="q-tag q-tag-lg" title={`${enemy.name} · ${enemy.qName}`}>
                    <span className="q-key">Q</span>
                    <b>{enemy.qRange}</b>
                  </span>
                  <span className="enemy-q-name">{enemy.qName}</span>
                </div>
              </div>
            </div>

            <div className="enemy-body">
              <div>
                <div className="advantage-head">
                  <span className="advantage-title">우위 연습 챔피언</span>
                  <span className="advantage-count">
                    <b>{advantages.length}</b>개
                  </span>
                </div>

                {advantages.length === 0 ? (
                  <div className="advantage-empty">
                    {practice.length === 0
                      ? "연습 챔피언을 먼저 추가하면 거리 우위를 비교할 수 있습니다."
                      : `${enemy.name}보다 Q 사정거리가 긴 연습 챔피언이 없습니다. 더 긴 챔피언을 추가해 보세요.`}
                  </div>
                ) : (
                  <div className="advantage-list">
                    {advantages.slice(0, 5).map(({ champion, diff }) => (
                      <button
                        key={champion.id}
                        type="button"
                        className="advantage-row"
                        onClick={() => onFocusPractice(champion.id)}
                        title={`${champion.name} 카드로 이동`}
                      >
                        <img
                          className="advantage-portrait"
                          src={champion.image}
                          alt=""
                          width={34}
                          height={34}
                          loading="lazy"
                        />
                        <span className="advantage-name">{champion.name}</span>
                        <span className="advantage-q">Q {champion.qRange}</span>
                        <span className={`diff-chip tier-${glowTier(diff)}`}>+{diff}</span>
                      </button>
                    ))}
                    {advantages.length > 5 && (
                      <span
                        style={{
                          padding: "5px 9px",
                          fontSize: 10,
                          color: "var(--faint)",
                        }}
                      >
                        외 {advantages.length - 5}명은 연습 카드에서 확인하세요
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="glow-legend" aria-label="거리 차이 범례">
                {GLOW_LEGEND.map((item) => (
                  <div className="legend-item" key={item.tier}>
                    <span className={`legend-swatch tier-${item.tier}`} />
                    <span className="legend-label">{item.label}</span>
                    <span className="legend-detail">{item.detail}</span>
                  </div>
                ))}
              </div>

              <div className="matchup-tip">
                <Icon name="info" size={13} />
                <span>
                  상대 Q보다 긴 카드만 빛납니다. 차이가 클수록 더 강하게 표시됩니다.
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <button type="button" className="enemy-empty" onClick={onOpenPicker}>
              <span className="enemy-empty-icon">
                <Icon name="crosshair" size={28} />
              </span>
              <strong>상대 챔피언을 선택하세요</strong>
              <span>Q 사정거리가 더 긴 연습 챔피언을 찾아드립니다</span>
            </button>
            <div className="enemy-body">
              <div className="advantage-empty">
                상대를 선택하면 연습 카드가 거리 차이에 따라 골드 · 앰버 · 백금으로 빛납니다.
              </div>
              <div className="glow-legend" aria-label="거리 차이 범례">
                {GLOW_LEGEND.map((item) => (
                  <div className="legend-item" key={item.tier}>
                    <span className={`legend-swatch tier-${item.tier}`} />
                    <span className="legend-label">{item.label}</span>
                    <span className="legend-detail">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { getChampion } from "@/lib/champions";
import { REGIONS, queueLabel } from "@/lib/regions";
import { formatDuration, formatKstDateTime, formatKstShortTime, formatWeekRange } from "@/lib/week";
import type { RegionId, RiotAccount, WeeklyState } from "@/lib/types";
import type { WeeklyAggregate } from "@/lib/weekly";
import { Icon } from "./Icons";
import Countdown from "./Countdown";

interface WeeklySectionProps {
  accounts: RiotAccount[];
  practiceCount: number;
  weekStart: number | null;
  weekly: WeeklyState;
  aggregate: WeeklyAggregate | null;
  matchLimit: number;
  onAddAccount: (gameName: string, tagLine: string, region: RegionId) => boolean;
  onRemoveAccount: (id: string) => void;
  onLoad: () => void;
  onDemo: () => void;
  onCancel: () => void;
}

const ERROR_LABELS: Record<string, string> = {
  NOT_FOUND: "ID 없음",
  FORBIDDEN: "키 오류",
  RATE_LIMITED: "한도 초과",
  NO_API_KEY: "키 없음",
  REGION_MISMATCH: "지역 오류",
  UNKNOWN: "조회 오류",
};

function StatTile({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      {sub && <span className="stat-tile-sub">{sub}</span>}
    </div>
  );
}

export default function WeeklySection({
  accounts,
  practiceCount,
  weekStart,
  weekly,
  aggregate,
  matchLimit,
  onAddAccount,
  onRemoveAccount,
  onLoad,
  onDemo,
  onCancel,
}: WeeklySectionProps) {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState<RegionId>("KR");
  const [inputError, setInputError] = useState("");

  const loading = weekly.status === "loading";
  const canLoad = accounts.length > 0 && practiceCount > 0;
  const showWeekStart = weekly.weekStart ?? weekStart;
  const staleWeek =
    weekly.weekStart != null && weekStart != null && weekly.weekStart !== weekStart;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = riotId.trim();
    const hashIndex = raw.lastIndexOf("#");

    if (hashIndex <= 0 || hashIndex === raw.length - 1) {
      setInputError("닉네임#태그 형식으로 입력해주세요. 예: Hide on bush#KR1");
      return;
    }

    const gameName = raw.slice(0, hashIndex).trim();
    const tagLine = raw.slice(hashIndex + 1).trim();

    if (!gameName || !tagLine) {
      setInputError("닉네임과 태그를 모두 입력해주세요.");
      return;
    }

    if (onAddAccount(gameName, tagLine, region)) {
      setRiotId("");
      setInputError("");
    } else {
      setInputError("이미 등록된 계정이거나 최대 10개를 초과했습니다.");
    }
  };

  const handleDemo = () => {
    onDemo();
  };

  return (
    <section className="section" id="weekly" aria-labelledby="weekly-title">
      <div className="section-head">
        <div className="section-head-copy">
          <div className="section-kicker">
            03 <span>·</span> WEEKLY REPORT
          </div>
          <h2 className="section-title" id="weekly-title">
            이번 주 전적
          </h2>
          <p className="section-desc">
            최대 10개의 롤 계정을 등록하면 이번 주(월요일 00:00 KST 초기화) 연습 챔피언
            전적을 합산합니다. <strong>소환사의 협곡 · 연습 챔피언만</strong> 집계됩니다.
          </p>
        </div>
        <div className="section-side">
          <span className="section-count">
            <b>{accounts.length}</b> / 10 계정
          </span>
        </div>
      </div>

      <div className="panel weekly-panel">
        <div className="weekly-head">
          <div>
            <div className="eyebrow">WEEKLY REPORT</div>
            <h2 style={{ marginTop: 3, fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>
              이번 주 연습 리포트
            </h2>
            <p style={{ marginTop: 2, fontSize: 10.5, color: "var(--faint)" }}>
              소환사의 협곡 · 연습 챔피언 · 리메이크 제외
            </p>
          </div>
          <div className="week-meta">
            <span className="week-range">
              {showWeekStart ? formatWeekRange(showWeekStart) : "이번 주 (KST)"}
            </span>
            <Countdown variant="inline" />
          </div>
        </div>

        <div className="weekly-body">
          <div className="account-panel">
            <form className="account-form" onSubmit={handleSubmit}>
              <input
                className="account-input"
                value={riotId}
                onChange={(event) => {
                  setRiotId(event.target.value);
                  if (inputError) setInputError("");
                }}
                placeholder="닉네임#태그 (예: Hide on bush#KR1)"
                aria-label="라이엇 ID (닉네임#태그)"
                maxLength={60}
                autoComplete="off"
              />
              <select
                className="account-region"
                value={region}
                onChange={(event) => setRegion(event.target.value as RegionId)}
                aria-label="계정 지역"
              >
                {REGIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-soft" disabled={accounts.length >= 10}>
                <Icon name="plus" size={15} />
                추가
              </button>
            </form>
            <p className={`account-hint ${inputError ? "error" : ""}`}>
              {inputError ||
                "최대 10개 · 입력한 계정은 이 브라우저(localStorage)에만 저장됩니다."}
            </p>

            {accounts.length === 0 ? (
              <div className="account-empty">아직 등록된 계정이 없습니다.</div>
            ) : (
              <div className="account-list">
                {accounts.map((account) => (
                  <span className="account-chip" key={account.id}>
                    <span className="account-chip-region">{account.region}</span>
                    <span className="account-chip-name">
                      {account.gameName}#{account.tagLine}
                    </span>
                    <button
                      type="button"
                      className="account-chip-remove"
                      onClick={() => onRemoveAccount(account.id)}
                      aria-label={`${account.gameName}#${account.tagLine} 계정 삭제`}
                    >
                      <Icon name="x" size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="weekly-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onLoad}
              disabled={!canLoad || loading}
            >
              {loading ? (
                <Icon name="spinner" size={16} className="loading-spinner" style={{ width: 16, height: 16, margin: 0 }} />
              ) : (
                <Icon name="trophy" size={16} />
              )}
              {loading ? "불러오는 중…" : "이번 주 전적 불러오기"}
            </button>
            <button
              type="button"
              className="btn btn-soft"
              onClick={handleDemo}
              disabled={accounts.length === 0 || practiceCount === 0 || loading}
              title="Riot API 키 없이 화면을 미리 볼 수 있습니다"
            >
              <Icon name="flame" size={15} />
              데모 데이터
            </button>
            {loading && (
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                <Icon name="x" size={14} />
                중단
              </button>
            )}
            <span className="spacer" />
            {!canLoad && (
              <span style={{ fontSize: 10.5, color: "var(--faint)" }}>
                {accounts.length === 0
                  ? "계정을 먼저 등록하세요"
                  : "연습 챔피언을 먼저 추가하세요"}
              </span>
            )}
          </div>

          <div className="api-note">
            <Icon name="info" size={13} />
            <span>
              Riot 개발 키는 <code>100 req / 2min</code> 제한이 있습니다. 개발 키는 보통 24시간 후 만료됩니다. 계정당 최근{" "}
              <code>{matchLimit}경기</code>를 분석하며, 결과는 서버에 5분간 캐시됩니다. 계정이
              많으면 조회에 1~3분 걸릴 수 있습니다.
            </span>
          </div>

          {loading && (
            <div className="loading-box">
              <Icon name="spinner" size={42} className="loading-spinner" />
              <div className="loading-head">
                {weekly.progress.done} / {weekly.progress.total || accounts.length} 계정 분석 중
              </div>
              <p className="loading-meta">
                {weekly.demo
                  ? "데모 데이터를 만들고 있습니다."
                  : "Riot Match-V5에서 이번 주 경기를 가져오고 있습니다."}
              </p>
              <div className="loading-bar">
                <span
                  className="loading-fill"
                  style={{
                    width: `${
                      weekly.progress.total
                        ? Math.max(4, (weekly.progress.done / weekly.progress.total) * 100)
                        : 4
                    }%`,
                  }}
                />
              </div>
              <p className="loading-tip">
                창을 닫지 마세요. 완료된 계정부터 결과가 표시됩니다.
              </p>
            </div>
          )}

          {weekly.status === "error" && weekly.error?.code === "NO_API_KEY" && (
            <div className="weekly-error">
              <div className="weekly-error-head">
                <Icon name="alert" size={17} />
                Riot API 키가 필요합니다
              </div>
              <p>
                서버의 <code>.env.local</code>에 키를 추가하면 실제 주간 전적을 불러옵니다. 키는
                브라우저에 노출되지 않습니다.
              </p>
              <pre className="setup-code">
                <span className="comment"># .env.local</span>
                {"\n"}RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
              </pre>
              <div className="setup-actions">
                <a
                  className="btn btn-soft btn-sm"
                  href="https://developer.riotgames.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  키 발급받기
                  <Icon name="external" size={13} />
                </a>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleDemo}
                  disabled={accounts.length === 0 || practiceCount === 0}
                >
                  <Icon name="flame" size={14} />
                  데모 데이터 보기
                </button>
              </div>
            </div>
          )}

          {weekly.status === "error" && weekly.error?.code !== "NO_API_KEY" && (
            <div className="weekly-error">
              <div className="weekly-error-head">
                <Icon name="alert" size={17} />
                전적을 불러오지 못했습니다
              </div>
              <p>{weekly.error?.message ?? "잠시 후 다시 시도해주세요."}</p>
              <div className="setup-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={onLoad}>
                  <Icon name="reset" size={14} />
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {(weekly.status === "done" || weekly.status === "cancelled") && aggregate && (
            <div className="weekly-result">
              {weekly.demo && (
                <div className="partial-banner">
                  <Icon name="flame" size={14} />
                  데모 데이터입니다. 실제 Riot API 결과가 아닙니다.
                </div>
              )}
              {staleWeek && (
                <div className="partial-banner">
                  <Icon name="clock" size={14} />
                  새 주가 시작되었습니다. 새로고침을 눌러 이번 주 데이터를 다시 불러오세요.
                </div>
              )}
              {weekly.status === "cancelled" && (
                <div className="partial-banner">
                  <Icon name="alert" size={14} />
                  조회가 중단되었습니다. 현재까지 수집된 {weekly.results.length}개 계정 결과만
                  표시합니다.
                </div>
              )}
              {aggregate.accountsFailed > 0 && (
                <div className="partial-banner">
                  <Icon name="alert" size={14} />
                  {aggregate.accountsFailed}개 계정은 조회에 실패했습니다. 계정별 상태를
                  확인하세요.
                </div>
              )}
              {aggregate.accountStats.some((stat) => stat.error === "FORBIDDEN") && (
                <div className="partial-banner">
                  <Icon name="alert" size={14} />
                  Riot API 키가 유효하지 않거나 만료됐습니다. 서버의 .env.local에서
                  RIOT_API_KEY를 갱신한 뒤 재시작해주세요.
                </div>
              )}

              {aggregate.games === 0 ? (
                <div className="weekly-empty">
                  <Icon name="shield" size={26} />
                  <h4>이번 주에는 집계할 경기가 없습니다</h4>
                  <p>
                    {practiceCount === 0
                      ? "연습 챔피언을 추가하면 해당 챔피언의 전적만 집계됩니다."
                      : "연습 챔피언으로 플레이한 소환사의 협곡 경기가 아직 없습니다."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <div
                        className={`winrate-ring ${
                          aggregate.winrate >= 50 ? "is-positive" : "is-negative"
                        }`}
                      >
                        <svg viewBox="0 0 100 100" aria-hidden="true">
                          <circle className="ring-track" cx="50" cy="50" r="44" />
                          <circle
                            className="ring-value"
                            cx="50"
                            cy="50"
                            r="44"
                            strokeDasharray={2 * Math.PI * 44}
                            strokeDashoffset={
                              2 * Math.PI * 44 * (1 - Math.min(100, aggregate.winrate) / 100)
                            }
                          />
                        </svg>
                        <div className="winrate-ring-text">
                          <strong>{aggregate.winrate.toFixed(1)}%</strong>
                          <span>WIN RATE</span>
                        </div>
                      </div>
                      <span className="summary-caption">
                        {aggregate.wins}승 {aggregate.losses}패 · {aggregate.games}전
                      </span>
                    </div>

                    <div className="stat-grid">
                      <StatTile
                        label="총 전적"
                        value={aggregate.games}
                        unit="전"
                        sub={`분석 ${aggregate.totalFetched}경기`}
                      />
                      <StatTile
                        label="승 / 패"
                        value={`${aggregate.wins} / ${aggregate.losses}`}
                        sub={`${aggregate.accountsOk}개 계정 정상`}
                      />
                      <StatTile
                        label="종합 KDA"
                        value={aggregate.kda.toFixed(2)}
                        sub={`${aggregate.kills} / ${aggregate.deaths} / ${aggregate.assists}`}
                      />
                      <StatTile
                        label="연습 챔피언"
                        value={aggregate.championStats.length}
                        unit="종"
                        sub="이번 주 플레이 기준"
                      />
                    </div>
                  </div>

                  <div className="breakdown">
                    <div className="breakdown-head">
                      <span className="breakdown-title">
                        <Icon name="sword" size={14} />
                        챔피언별 전적
                      </span>
                      <span className="breakdown-note">승률 높은 순 · 게임 수 우선</span>
                    </div>
                    <div className="champ-stat-list">
                      {aggregate.championStats.map((stat) => (
                        <div className="champ-stat" key={stat.champion.id}>
                          <img
                            className="champ-stat-portrait"
                            src={stat.champion.image}
                            alt=""
                            width={40}
                            height={40}
                            loading="lazy"
                          />
                          <div className="champ-stat-main">
                            <div className="champ-stat-name-row">
                              <span className="champ-stat-name">{stat.champion.name}</span>
                              <span className="champ-stat-q">Q {stat.champion.qRange}</span>
                            </div>
                            <div className="champ-stat-bar">
                              <span
                                className={stat.winrate >= 50 ? "is-positive" : ""}
                                style={{ width: `${Math.max(2, stat.winrate)}%` }}
                              />
                            </div>
                          </div>
                          <div className="champ-stat-record">
                            {stat.wins}승 {stat.losses}패
                            <small>
                              {stat.games}전 · {stat.winrate.toFixed(0)}%
                            </small>
                          </div>
                          <div className="champ-stat-kda">
                            <b>{stat.kda.toFixed(2)}</b> KDA
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="breakdown">
                    <div className="breakdown-head">
                      <span className="breakdown-title">
                        <Icon name="shield" size={14} />
                        계정별 전적
                      </span>
                      <span className="breakdown-note">
                        {aggregate.accountsOk} / {aggregate.accountStats.length} 정상
                      </span>
                    </div>
                    <div className="account-grid">
                      {aggregate.accountStats.map((stat) => (
                        <div className="account-stat" key={stat.account.id}>
                          <div className="account-stat-top">
                            <span className="account-chip-region">{stat.account.region}</span>
                            <span className="account-stat-name">
                              {stat.account.gameName}#{stat.account.tagLine}
                            </span>
                            {stat.error && (
                              <span className="error-badge">
                                {ERROR_LABELS[stat.error] ?? "오류"}
                              </span>
                            )}
                          </div>
                          <div className="account-stat-bottom">
                            {stat.error ? (
                              <span className="account-stat-note">조회 실패</span>
                            ) : (
                              <>
                                <span className="account-stat-record">
                                  {stat.wins}승 {stat.losses}패
                                </span>
                                <span className="account-stat-note">
                                  {stat.games}전 · {stat.fetchedMatches}경기 조회
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {aggregate.recent.length > 0 && (
                    <div className="breakdown">
                      <div className="breakdown-head">
                        <span className="breakdown-title">
                          <Icon name="clock" size={14} />
                          최근 연습 경기
                        </span>
                        <span className="breakdown-note">최신 8경기</span>
                      </div>
                      <div className="recent-list">
                        {aggregate.recent.map((match) => {
                          const champion = getChampion(match.champion);
                          if (!champion) return null;
                          return (
                            <div className="recent-row" key={match.matchId}>
                              <img
                                className="recent-portrait"
                                src={champion.image}
                                alt=""
                                width={32}
                                height={32}
                                loading="lazy"
                              />
                              <div className="recent-main">
                                <div className="recent-champ">
                                  <span>{champion.name}</span>
                                  <span className={`badge ${match.win ? "badge-win" : "badge-loss"}`}>
                                    {match.win ? "승리" : "패배"}
                                  </span>
                                </div>
                                <div className="recent-meta">
                                  {queueLabel(match.queueId)} · {formatDuration(match.gameDuration)}
                                </div>
                              </div>
                              <span className="recent-kda">
                                {match.kills} / {match.deaths} / {match.assists}
                              </span>
                              <span className="recent-time">
                                {formatKstShortTime(match.gameEndTimestamp)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="weekly-footer">
                <div className="left">
                  <span>Riot Match-V5</span>
                  <span className="dot" />
                  <span>소환사의 협곡</span>
                  <span className="dot" />
                  <span>리메이크 제외</span>
                  <span className="dot" />
                  <span>계정당 최대 {matchLimit}경기</span>
                  {weekly.savedAt && (
                    <>
                      <span className="dot" />
                      <span>업데이트 {formatKstDateTime(weekly.savedAt)}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={onLoad}
                  disabled={loading || !canLoad}
                >
                  <Icon name="reset" size={13} />
                  새로고침
                </button>
              </div>
            </div>
          )}

          {weekly.status === "cancelled" && !aggregate && (
            <div className="weekly-empty">
              <Icon name="alert" size={26} />
              <h4>전적 조회가 중단되었습니다</h4>
              <p>수집된 결과가 없습니다. 다시 불러오기를 눌러 계속 진행할 수 있습니다.</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 12 }}
                onClick={onLoad}
                disabled={!canLoad}
              >
                <Icon name="reset" size={13} />
                다시 불러오기
              </button>
            </div>
          )}

          {weekly.status === "idle" && (
            <div className="weekly-empty">
              <Icon name="trophy" size={28} />
              <h4>이번 주 연습 성과를 확인하세요</h4>
              <p>
                {accounts.length === 0
                  ? "롤 계정을 등록하면 연습 챔피언의 전적과 승률을 자동으로 집계합니다."
                  : practiceCount === 0
                    ? "연습 챔피언을 추가하면 해당 챔피언의 경기만 집계합니다."
                    : "‘이번 주 전적 불러오기’를 누르면 계정별 결과가 순서대로 표시됩니다."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

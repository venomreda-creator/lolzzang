# RIFT DRILL — LoL 챔피언 연습 도우미

연습 챔피언의 목표 횟수를 관리하고, Q 사정거리로 상대와 비교하며, 최대 10개 계정의 이번 주 협곡 전적을 집계하는 한국어 웹 앱입니다.

## 기능

- 모든 챔피언의 Q 사정거리 태그 (Data Dragon 기반, 예외 데이터 보정 포함)
- 연습 챔피언 선택, 목표 1~200회 설정, 진행 횟수 `+1`, 진행률·완료 표시
- 상대 챔피언 Q 사정거리보다 긴 연습 카드를 차이별 골드/앰버/백금 글로우로 강조
- 최대 10개 Riot ID의 이번 주 연습 챔피언 협곡 전적 통합 (승/패/승률/KDA)
- 월요일 00:00 KST 주간 초기화, 다크/라이트 테마, 검색·역할 필터·정렬
- 연습 목록, 계정, 테마는 현재 브라우저의 `localStorage`에 저장

## 실행

요구 사항: Node.js 20.9 이상

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

### 실제 Riot 전적 연결 (선택)

전적 조회에는 Riot 개발자 키가 필요합니다. [Riot Developer Portal](https://developer.riotgames.com/)에서 발급한 키를 서버의 `.env.local` 파일에 넣으세요.

```env
RIOT_API_KEY=RGAPI-발급받은-키
RIOT_MATCH_LIMIT=30
```

`.env.local`을 만든 뒤 개발 서버를 재시작합니다. 키는 서버에서만 사용되며 브라우저에 전달되지 않습니다. Riot 개발 키는 보통 24시간 후 만료되므로 주기적으로 재발급해야 합니다. 키가 없어도 `데모 데이터` 버튼으로 UI를 확인할 수 있습니다.

> Riot Match-V5 개발 키는 요청 제한이 있습니다. 서버는 요청을 보수적으로 순차 처리하고, 주간 결과를 5분 캐시합니다. 계정별 최근 경기 수는 `RIOT_MATCH_LIMIT`(1~100)으로 조정할 수 있습니다.

## 챔피언 데이터 갱신

Data Dragon의 현재 패치에서 한글 챔피언/Q 스킬 정보와 사정거리를 가져옵니다. 이미지도 로컬에 저장합니다.

```bash
npm run data
```

Data Dragon은 일부 스킬의 원시 사정거리를 0 또는 내부 구현값으로 제공하므로, `scripts/build-data.mjs`의 보정 테이블을 적용합니다. 데이터 생성 결과는 `src/data/champions.json`, 패치 메타데이터는 `src/data/meta.json`에 저장됩니다. 현재 데이터에는 173개 챔피언이 포함되며, 리산드라 Q 사정거리는 725로 검증했습니다.

## 프로덕션 빌드

```bash
npm run build
npm start
```

## 환경 변수

| 변수 | 기본값 | 설명 |
|---|---:|---|
| `RIOT_API_KEY` | 없음 | Riot Developer API 키 |
| `RIOT_MATCH_LIMIT` | `30` | 계정당 조회할 최근 경기 최대 수 (1~100) |
| `RIOT_MAX_RPS` | `15` | 프로세스당 초당 요청 제한 |
| `RIOT_MAX_PER_2MIN` | `90` | 프로세스당 2분 요청 제한 |

## 기술 스택

- Next.js App Router / React / TypeScript
- Riot Data Dragon, Riot Account-V1, Match-V5
- 인라인 CSS 디자인 시스템, `localStorage`

## 참고

- Riot API/Data Dragon에서 일반적으로 제공하는 챔피언 스킬 사정거리 값을 이용합니다. 일부 Q는 기본 공격 강화/충전/다단계 등 특성이 있어 별도 보정하며, 실제 게임 내 사거리 판정과 완전히 동일하지 않을 수 있습니다.
- 본 프로젝트는 Riot Games와 제휴·후원 관계가 없는 팬 프로젝트입니다. League of Legends 및 관련 자산의 권리는 Riot Games에 있습니다.

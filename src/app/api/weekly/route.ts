import { CHAMPION_MAP } from "@/lib/champions";
import { buildDemoResults } from "@/lib/demo";
import { fetchWeeklyMatches, getMatchLimit, hasRiotKey, RiotApiError } from "@/lib/riot";
import { isRegionId } from "@/lib/regions";
import { getWeekEnd, getWeekStart } from "@/lib/week";
import type {
  AccountResult,
  RiotAccount,
  WeeklyAccountLine,
  WeeklyDoneLine,
  WeeklyErrorCode,
  WeeklyStartLine,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RequestBody {
  accounts?: unknown;
  practiceChampions?: unknown;
  matchLimit?: unknown;
  demo?: unknown;
}

function jsonError(code: WeeklyErrorCode, message: string, status = 400) {
  return Response.json({ code, message }, { status });
}

function parseAccounts(value: unknown): RiotAccount[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) return null;

  const seen = new Set<string>();
  const accounts: RiotAccount[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const gameName = typeof item.gameName === "string" ? item.gameName.trim() : "";
    const tagLine =
      typeof item.tagLine === "string" ? item.tagLine.trim().replace(/^#/, "") : "";
    const region = typeof item.region === "string" ? item.region : "";

    if (!gameName || gameName.length > 40) return null;
    if (!tagLine || tagLine.length > 10) return null;
    if (!isRegionId(region)) return null;

    const key = `${region}:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    accounts.push({
      id:
        typeof item.id === "string" && item.id
          ? item.id
          : `${region}:${gameName}#${tagLine}`,
      gameName,
      tagLine,
      region,
    });
  }

  return accounts.length > 0 ? accounts : null;
}

function parsePractice(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((v): v is string => typeof v === "string")
    .filter((id) => CHAMPION_MAP.has(id));
  return [...new Set(ids)].slice(0, CHAMPION_MAP.size);
}

function errorCode(error: unknown): WeeklyErrorCode {
  if (error instanceof RiotApiError) return error.code;
  return "UNKNOWN";
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError("UNKNOWN", "요청 형식이 올바르지 않습니다.");
  }

  const accounts = parseAccounts(body.accounts);
  if (!accounts) {
    return jsonError("UNKNOWN", "계정은 1~10개까지 등록할 수 있습니다.");
  }

  const practiceChampions = parsePractice(body.practiceChampions);
  const demo = body.demo === true;

  if (!demo && !hasRiotKey()) {
    return jsonError(
      "NO_API_KEY",
      "서버에 RIOT_API_KEY가 설정되어 있지 않습니다. .env.local에 키를 추가하거나 데모 데이터를 사용하세요."
    );
  }

  const requestedLimit = Number(body.matchLimit);
  const matchLimit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, Math.round(requestedLimit)))
    : getMatchLimit();

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: WeeklyStartLine | WeeklyAccountLine | WeeklyDoneLine) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
        } catch {
          cancelled = true;
        }
      };

      send({
        type: "start",
        weekStart,
        weekEnd,
        total: accounts.length,
        demo,
      });

      let ok = 0;
      let failed = 0;
      let fatal: WeeklyErrorCode | null = null;

      if (demo) {
        const results = buildDemoResults(accounts, practiceChampions, weekStart);
        for (const result of results) {
          if (cancelled) break;
          await new Promise((resolve) => setTimeout(resolve, 220));
          ok++;
          send({ type: "account", result });
        }
      } else {
        for (const account of accounts) {
          if (cancelled) break;

          if (fatal) {
            failed++;
            send({
              type: "account",
              result: {
                account,
                matches: [],
                error: fatal,
                fetchedMatches: 0,
              },
            });
            continue;
          }

          try {
            const payload = await fetchWeeklyMatches(account, weekStart, matchLimit);
            ok++;
            const result: AccountResult = {
              account,
              matches: payload.matches,
              error: null,
              fetchedMatches: payload.fetchedMatches,
            };
            send({ type: "account", result });
          } catch (error) {
            failed++;
            const code = errorCode(error);
            if (code === "FORBIDDEN" || code === "NO_API_KEY") {
              fatal = code;
            }
            send({
              type: "account",
              result: {
                account,
                matches: [],
                error: code,
                fetchedMatches: 0,
              },
            });
          }
        }
      }

      send({ type: "done", ok, failed });
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

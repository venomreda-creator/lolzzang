/**
 * RIFT DRILL — 챔피언 데이터 빌더
 *
 * Data Dragon(ko_KR)에서 챔피언/스킬/사정거리를 수집하고,
 * Meraki Analytics에서 포지션을 병합한 뒤 이미지를 로컬에 저장한다.
 *
 * 실행: npm run data
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHAMP_DIR = path.join(ROOT, "public", "champions");
const ABILITY_DIR = path.join(ROOT, "public", "abilities");
const DATA_DIR = path.join(ROOT, "src", "data");

const CONCURRENCY = 10;

/**
 * Data Dragon의 내부 구현값(0/20/10000/25000)을 실효 사정거리로 보정.
 * 근거는 PRD.md 4.2 참고.
 */
const RANGE_OVERRIDES = {
  Aatrox: 650,
  Bard: 850,
  Shyvana: 175,
  Sion: 1550,
  TwistedFate: 1450,
  Yuumi: 850,
  Zaahen: 175,
  Hwei: 900,
  Sett: 175,
  Yorick: 175,
  Yunara: 575,
  Darius: 460,
  Singed: 180,
  Tristana: 550,
  Twitch: 550,
  Leona: 175,
};

/** Meraki에 포지션이 없는 신규 챔피언 보정 */
const ROLE_OVERRIDES = {
  Zaahen: ["TOP"],
  Yunara: ["BOTTOM"],
};

const CLASS_TO_ROLE = {
  Fighter: "TOP",
  Tank: "TOP",
  Assassin: "MIDDLE",
  Mage: "MIDDLE",
  Marksman: "BOTTOM",
  Support: "UTILITY",
};

const ROLE_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

/** Meraki는 서포터를 SUPPORT로 표기 */
const ROLE_ALIAS = { SUPPORT: "UTILITY", ADC: "BOTTOM" };

function normalizeRoles(list) {
  return [...new Set(list.map((r) => ROLE_ALIAS[r] ?? r))]
    .filter((r) => ROLE_ORDER.includes(r))
    .sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
}

async function fetchJson(url, attempt = 0) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "rift-drill-data-builder/1.0" },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      return fetchJson(url, attempt + 1);
    }
    throw err;
  }
}

async function download(url, dest, force = false, attempt = 0) {
  try {
    await fs.access(dest);
    if (!force) return false;
  } catch {
    /* not cached */
  }
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "rift-drill-data-builder/1.0" },
    });
    if (!res.ok) throw new Error(`${res.status} — ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
    return true;
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return download(url, dest, force, attempt + 1);
    }
    console.warn(`  ! 이미지 실패: ${url}`);
    return false;
  }
}

async function pool(items, worker, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  console.log("◆ RIFT DRILL 데이터 빌드 시작");

  const versions = await fetchJson("https://ddragon.leagueoflegends.com/api/versions.json");
  const patch = versions[0];
  console.log(`  · 패치: ${patch}`);

  let previousPatch = null;
  try {
    const previousMeta = JSON.parse(
      await fs.readFile(path.join(DATA_DIR, "meta.json"), "utf8")
    );
    previousPatch = previousMeta.patch ?? null;
  } catch {
    /* first run */
  }
  const refreshAssets = previousPatch !== patch;

  const [ddragon, meraki] = await Promise.all([
    fetchJson(`https://ddragon.leagueoflegends.com/cdn/${patch}/data/ko_KR/champion.json`),
    fetchJson("https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json").catch(
      () => ({})
    ),
  ]);

  const list = Object.values(ddragon.data);
  console.log(`  · 챔피언: ${list.length}명`);

  await fs.mkdir(CHAMP_DIR, { recursive: true });
  await fs.mkdir(ABILITY_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  const champions = await pool(list, async (summary) => {
    const detail = await fetchJson(
      `https://ddragon.leagueoflegends.com/cdn/${patch}/data/ko_KR/champion/${summary.id}.json`
    );
    const champ = detail.data[summary.id];
    const q = champ.spells[0];
    const rawRange = q.range?.[0] ?? 0;
    const attackRange = champ.stats.attackrange;

    let qRange = rawRange;
    let adjusted = false;
    if (RANGE_OVERRIDES[champ.id] != null) {
      qRange = RANGE_OVERRIDES[champ.id];
      adjusted = true;
    } else if (rawRange <= 20 || rawRange >= 5000) {
      qRange = attackRange;
      adjusted = true;
    }

    const merakiPositions = meraki[champ.id]?.positions ?? [];
    const roles =
      ROLE_OVERRIDES[champ.id] ??
      (merakiPositions.length
        ? normalizeRoles(merakiPositions)
        : normalizeRoles(champ.tags.map((t) => CLASS_TO_ROLE[t]).filter(Boolean)));

    const squareUrl = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${champ.id}.png`;
    const spellUrl = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/spell/${q.image.full}`;
    await Promise.all([
      download(squareUrl, path.join(CHAMP_DIR, `${champ.id}.png`), refreshAssets),
      download(spellUrl, path.join(ABILITY_DIR, `${champ.id}Q.png`), refreshAssets),
    ]);

    return {
      id: champ.id,
      numericId: Number(champ.key),
      name: champ.name,
      nameEn: meraki[champ.id]?.name ?? champ.id,
      title: champ.title,
      qName: q.name,
      qRange,
      rawRange,
      adjusted,
      attackRange,
      roles,
      classes: champ.tags,
      image: `/champions/${champ.id}.png`,
      splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_0.jpg`,
      qIcon: `/abilities/${champ.id}Q.png`,
    };
  });

  champions.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  await fs.writeFile(
    path.join(DATA_DIR, "champions.json"),
    JSON.stringify(champions, null, 2) + "\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(DATA_DIR, "meta.json"),
    JSON.stringify(
      {
        patch,
        generatedAt: new Date().toISOString(),
        count: champions.length,
        source: "Riot Data Dragon + Meraki Analytics",
        adjustedCount: champions.filter((c) => c.adjusted).length,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  const missing = champions.filter((c) => !c.qRange || Number.isNaN(c.qRange));
  console.log(`  · 보정: ${champions.filter((c) => c.adjusted).length}명`);
  console.log(`  · 누락: ${missing.length}명`);
  console.log(`◆ 완료 → src/data/champions.json (${champions.length}명)`);

  const liss = champions.find((c) => c.id === "Lissandra");
  console.log(`  · 검증: 리산드라 Q = ${liss?.qRange}`);
}

main().catch((err) => {
  console.error("데이터 빌드 실패:", err);
  process.exit(1);
});

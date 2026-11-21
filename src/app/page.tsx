import HomeClient from "@/components/HomeClient";

export default function Page() {
  const raw = Number(process.env.RIOT_MATCH_LIMIT ?? 30);
  const matchLimit = Number.isFinite(raw)
    ? Math.min(100, Math.max(1, Math.round(raw)))
    : 30;

  return <HomeClient matchLimit={matchLimit} />;
}

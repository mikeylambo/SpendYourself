// Daily Descent leaderboard on Supabase, through its REST API (no SDK, so nothing extra ships).
// Configure at build time (Vercel → Project → Environment Variables):
//   VITE_SUPABASE_URL        https://<project>.supabase.co
//   VITE_SUPABASE_ANON_KEY   the project's anon (public) key; row-level security decides what it may do
//   VITE_LEADERBOARD_TABLE   table name (default "scores")
// The shared table holds every game's boards; `toRow`/`fromRow` are the only places that know its columns.
const env = import.meta.env ?? {};
const URL_ = (env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const KEY = (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
const TABLE = (env.VITE_LEADERBOARD_TABLE as string | undefined) ?? "scores";
const GAME = "spend-yourself";

export const leaderboardOn = (): boolean => !!(URL_ && KEY);

export interface DailyResult {
  date: string;
  molt: string;
  win: boolean;
  /** Depth reached across all acts (a win counts as past the bottom). */
  row: number;
  seed: string;
  player: string;
  maxHand: number;
}

export interface BoardEntry {
  player: string;
  score: number;
  molt: string;
  win: boolean;
  maxHand: number;
}

/** One score: a win beats any depth; deeper beats shallower; a bigger body breaks ties. */
export const scoreOf = (r: DailyResult): number => (r.win ? 1000 : 0) + r.row * 10 + Math.min(9, Math.floor(r.maxHand / 4));

// ---- the only two functions that know the table's columns ----
function toRow(r: DailyResult): Record<string, unknown> {
  return { game: GAME, board: `daily-${r.date}`, player: r.player, score: scoreOf(r), meta: { molt: r.molt, win: r.win, row: r.row, seed: r.seed, maxHand: r.maxHand } };
}
function fromRow(x: Record<string, unknown>): BoardEntry {
  const m = (x.meta ?? {}) as Record<string, unknown>;
  return { player: String(x.player ?? "?"), score: Number(x.score ?? 0), molt: String(m.molt ?? ""), win: !!m.win, maxHand: Number(m.maxHand ?? 0) };
}
// ----

const headers = (): Record<string, string> => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" });

export async function submitDaily(r: DailyResult): Promise<boolean> {
  if (!leaderboardOn()) return false;
  try {
    const res = await fetch(`${URL_}/rest/v1/${TABLE}`, { method: "POST", headers: { ...headers(), Prefer: "return=minimal" }, body: JSON.stringify(toRow(r)), keepalive: true });
    return res.ok;
  } catch {
    return false; // offline: the result is still in your history
  }
}

export async function fetchDaily(date: string, limit = 20): Promise<BoardEntry[] | null> {
  if (!leaderboardOn()) return null;
  try {
    const q = `game=eq.${encodeURIComponent(GAME)}&board=eq.${encodeURIComponent(`daily-${date}`)}&order=score.desc&limit=${limit}`;
    const res = await fetch(`${URL_}/rest/v1/${TABLE}?${q}`, { headers: headers() });
    if (!res.ok) return null;
    return ((await res.json()) as Array<Record<string, unknown>>).map(fromRow);
  } catch {
    return null;
  }
}

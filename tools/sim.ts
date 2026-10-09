// Headless balance sim (slifer-tuning.md §9). Bots play seeded runs with the same rules as the game.
//   npm run sim -- --runs 200 [--ci] [--out sim-report.json]
import { writeFileSync } from "node:fs";
import { Bot, type BotStyle } from "../src/game/bots.ts";
import { tuning } from "../src/data/tuning.ts";
import { newRun, RunController } from "../src/game/run.ts";
import type { Presenter } from "../src/game/types.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};
const RUNS = Number(opt("runs", "200"));
const CI = args.includes("--ci");
const OUT = opt("out", "");
const STYLES: BotStyle[] = ["balanced", "spender", "hoarder", "randomWounds"];
const MOLT = opt("molt", "venom") as "venom" | "tide" | "storm";
const ASC = Number(opt("turn", "0"));
const OPT_MOLT_ONLY = args.includes("--molt-cards");
// --set pressure.eatBonus=1 overrides any tuning number for experiments.
for (let i = 0; i < args.length; i++) {
  if (args[i] !== "--set") continue;
  const [path, val] = (args[i + 1] ?? "").split("=");
  const keys = path!.split(".");
  let o: Record<string, unknown> = tuning as unknown as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys.at(-1)!] = Number(val);
}

// Full-run pass bands at Turn 0 (slifer-tuning.md §9).
const BANDS: Record<string, [number, number]> = {
  balanced: [0.25, 0.45],
  spender: [0.08, 0.3],
  hoarder: [0.08, 0.3],
};

interface Result {
  win: boolean;
  row: number;
  diedTo: string | null;
  reason: string;
  maxHand: number;
  deck: string[];
  fights: number;
}

const silent: Presenter = { emit: () => {} };

async function playRun(style: BotStyle, seed: number): Promise<Result> {
  const run = newRun({ seed: `sim-${seed}`, molt: MOLT, onboarding: MOLT === "venom", ascension: ASC });
  const bot = new Bot(style, seed);
  const ctl = new RunController(run, bot, silent);
  bot.ctl = ctl;
  for (let steps = 0; steps < 5000 && run.screen.kind !== "over"; steps++) await bot.handleScreen();
  const sc = run.screen;
  return {
    win: sc.kind === "over" && sc.win,
    row: run.row + (run.act - 1) * 16,
    diedTo: run.stats.diedTo,
    reason: sc.kind === "over" ? sc.reason : "stuck",
    maxHand: run.maxHand - run.scars,
    deck: run.deck.map((d) => d.id),
    fights: run.stats.fights,
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};

const report: Record<string, unknown> = { runs: RUNS, molt: MOLT, turn: ASC };
const failures: string[] = [];
const t0 = Date.now();
const winRates: Record<string, number> = {};

for (const style of STYLES) {
  const results: Result[] = [];
  for (let i = 0; i < RUNS; i++) results.push(await playRun(style, 1000 + i));
  const wins = results.filter((r) => r.win);
  const deaths = results.filter((r) => !r.win);
  const deathBy: Record<string, number> = {};
  for (const d of deaths) deathBy[d.diedTo ?? d.reason] = (deathBy[d.diedTo ?? d.reason] ?? 0) + 1;
  const cardFreq: Record<string, number> = {};
  for (const w of wins) for (const id of new Set(w.deck)) cardFreq[id] = (cardFreq[id] ?? 0) + 1;
  const winRate = wins.length / RUNS;
  winRates[style] = winRate;
  const stats = {
    winRate: +winRate.toFixed(3),
    medianDeathRow: median(deaths.map((d) => d.row + 1)),
    avgMaxHandAtEnd: +(results.reduce((a, r) => a + r.maxHand, 0) / RUNS).toFixed(2),
    avgFights: +(results.reduce((a, r) => a + r.fights, 0) / RUNS).toFixed(2),
    deathsBy: Object.fromEntries(Object.entries(deathBy).sort((a, b) => b[1] - a[1])),
    stuck: results.filter((r) => r.reason === "stuck").length,
    topWinningCards: Object.entries(cardFreq)
      .filter(([id]) => !["card.fang", "card.scale", "card.venom_bite", "card.swallow", "tide.ebb", "tide.riptide", "storm.gather", "storm.thunderhead"].includes(id) && !(OPT_MOLT_ONLY && !id.startsWith(MOLT)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, n]) => `${id} ${Math.round((n / Math.max(1, wins.length)) * 100)}%`),
  };
  report[style] = stats;
  console.log(`\n${style.padEnd(13)} win ${(winRate * 100).toFixed(1)}%  median death row ${stats.medianDeathRow}  max hand ${stats.avgMaxHandAtEnd}`);
  console.log(`  deaths: ${JSON.stringify(stats.deathsBy)}`);
  console.log(`  top cards in wins: ${stats.topWinningCards.join(", ")}`);
  const band = BANDS[style];
  if (band && (winRate < band[0] || winRate > band[1])) failures.push(`${style} win rate ${winRate.toFixed(2)} outside ${band.join("-")}`);
  if (stats.stuck) failures.push(`${style}: ${stats.stuck} runs stuck`);
  if (style === "balanced" && stats.medianDeathRow && stats.medianDeathRow < 9) failures.push(`balanced median death row ${stats.medianDeathRow} < 9`);
  for (const [foe, n] of Object.entries(deathBy)) if (style === "balanced" && deaths.length >= 10 && n / RUNS > 0.18) failures.push(`${foe} causes ${((n / RUNS) * 100).toFixed(0)}% of balanced deaths`);
}

const woundCheck = winRates.randomWounds! <= winRates.balanced! * 0.6;
report.woundChoiceMatters = woundCheck;
if (!woundCheck) failures.push(`random wound choice wins ${winRates.randomWounds} vs balanced ${winRates.balanced} (needs ≤ 60%)`);
report.failures = failures;
console.log(`\nwound choice matters: ${woundCheck}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (failures.length) console.log(`\nBAND BREACHES:\n  ${failures.join("\n  ")}`);
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
if (CI && failures.length) process.exit(1);

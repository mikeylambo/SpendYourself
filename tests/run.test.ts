import { test } from "node:test";
import assert from "node:assert/strict";
import { Bot } from "../src/game/bots.ts";
import { newRun, RunController } from "../src/game/run.ts";
import { CARD_LIST, CARDS } from "../src/data/cards.ts";
import { FOES, ENCOUNTERS } from "../src/data/foes.ts";
import { EVENT_LIST } from "../src/data/events.ts";
import type { RunState } from "../src/game/state.ts";

const silent = { emit: () => {} };

async function play(run: RunState, seed: number, steps = 5000): Promise<RunState> {
  const bot = new Bot("balanced", seed);
  const ctl = new RunController(run, bot, silent);
  bot.ctl = ctl;
  for (let i = 0; i < steps && run.screen.kind !== "over"; i++) await bot.handleScreen();
  ctl.sync();
  return run;
}

test("content references resolve", () => {
  for (const f of Object.values(FOES)) assert.ok(CARDS[f.husk], `${f.id} husk ${f.husk}`);
  for (const pools of Object.values(ENCOUNTERS)) for (const enc of Object.values(pools).flat()) for (const id of enc) assert.ok(FOES[id], id);
  assert.equal(CARD_LIST.filter((c) => !c.molt && !c.special).length, 75);
  assert.equal(CARD_LIST.filter((c) => c.molt === "venom").length, 30);
  assert.ok(EVENT_LIST.length >= 10);
});

test("a seeded run is deterministic", async () => {
  const a = await play(newRun({ seed: "DET-1", molt: "venom", onboarding: true }), 7);
  const b = await play(newRun({ seed: "DET-1", molt: "venom", onboarding: true }), 7);
  assert.equal(a.screen.kind, "over");
  assert.deepEqual(a.stats, b.stats);
  assert.equal(a.row, b.row);
});

test("a run saved mid-fight resumes identically", async () => {
  const seed = "SAVE-1";
  const full = await play(newRun({ seed, molt: "venom", onboarding: true }), 3);
  // Play the same run to its third fight, round-trip it through JSON, and finish it.
  const run = newRun({ seed, molt: "venom", onboarding: true });
  const bot = new Bot("balanced", 3);
  let ctl = new RunController(run, bot, silent);
  bot.ctl = ctl;
  for (let i = 0; i < 5000 && !(run.screen.kind === "combat" && run.fightIndex === 2 && run.screen.combat.turn === 2); i++) await bot.handleScreen();
  assert.equal(run.screen.kind, "combat");
  const copy = JSON.parse(JSON.stringify(ctl.sync())) as RunState;
  const bot2 = new Bot("balanced", 3);
  bot2.rng = bot.rng; // the bot's own choices continue from the same point
  const resumed = new RunController(copy, bot2, silent);
  bot2.ctl = resumed;
  for (let i = 0; i < 5000 && copy.screen.kind !== "over"; i++) await bot2.handleScreen();
  assert.deepEqual(copy.stats, full.stats);
});

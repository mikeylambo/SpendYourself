// What a play would do, worked out on a throwaway copy of the fight (damage and block previews, bots).
import { DeterministicRng } from "@slu/web-shell";
import { Combat } from "./combat.ts";
import type { Agent, CombatState, Presenter } from "./types.ts";

const silent: Presenter = { emit: () => {} };

/** A copy of the fight that cards can't reach back out of. The map and history never change mid-fight, so they're shared. */
export function cloneCombat(e: Combat, agent: Agent): Combat {
  const s = structuredClone(e.s) as CombatState;
  const r = e.run;
  const run = { ...r, deck: r.deck.map((d) => ({ ...d })), bones: [...r.bones], nextFight: { ...r.nextFight }, stats: { ...r.stats, devoured: [...r.stats.devoured] } };
  const rng = new DeterministicRng((e.rng as DeterministicRng).state ?? 1);
  return new Combat(s, run, rng, agent, silent);
}

export interface PlayPreview {
  /** Foe HP after the play, by uid (foes that die read 0). */
  hp: Map<number, number>;
  dead: Set<number>;
  block: Map<number, number>;
  /** Wounds that would land at end of turn after the play. */
  landed: number;
  lethal: boolean;
  won: boolean;
  /** The play picks cards or hits at random, so the preview is a likely outcome, not a promise. */
  approx: boolean;
}

export async function previewPlay(e: Combat, uid: number, target?: number): Promise<PlayPreview | null> {
  let approx = false;
  // Sacrifices and choices: assume the first cards offered, and flag the preview as approximate.
  const agent: Agent = {
    pick: async (req) => {
      approx = true;
      return req.optional ? [] : req.cards.slice(0, req.count).map((c) => c.uid);
    },
  };
  const sim = cloneCombat(e, agent);
  const card = sim.body.hand.find((c) => c.uid === uid);
  if (!card || !sim.canPlay(card)) return null;
  const before = sim.rng.next.bind(sim.rng);
  sim.rng.next = () => { approx = true; return before(); };
  const ok = await sim.play(uid, target).catch(() => false);
  if (!ok) return null;
  const hp = new Map<number, number>();
  const dead = new Set<number>();
  const block = new Map<number, number>();
  for (const f of e.s.foes) {
    const g = sim.s.foes.find((x) => x.uid === f.uid);
    if (!g) continue;
    hp.set(f.uid, Math.max(0, g.hp));
    block.set(f.uid, g.block);
    if (f.alive && !g.alive) dead.add(f.uid);
  }
  const fc = sim.forecast();
  return { hp, dead, block, landed: fc.landed, lethal: fc.lethal, won: sim.s.over === "won", approx };
}

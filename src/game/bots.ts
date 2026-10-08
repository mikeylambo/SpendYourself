import { DeterministicRng } from "@slu/web-shell";
import type { BodyCard } from "../bodydeck/BodyDeck.ts";
import { BONES } from "../data/bones.ts";
import { CARDS } from "../data/cards.ts";
import { EVENTS } from "../data/events.ts";
import { Combat } from "./combat.ts";
import type { RunAgent, RunController } from "./run.ts";
import type { MapNode } from "./state.ts";
import type { Agent, CombatState, PickRequest, Presenter } from "./types.ts";

export type BotStyle = "balanced" | "spender" | "hoarder" | "randomWounds";

const silent: Presenter = { emit: () => {} };
const RARITY_VALUE: Record<string, number> = { C: 1, U: 2, R: 3, X: 0 };

function cardValue(c: BodyCard): number {
  const d = CARDS[c.id]!;
  return c.coil * 2 + RARITY_VALUE[d.rarity]! + (c.up ? 1 : 0) + (d.type === "strike" ? 0.5 : 0);
}

/** Wounds the current intents will land next enemy turn (before block). */
export function incomingWounds(e: Combat): number {
  let n = e.s.selfPoison > 0 ? 1 : 0;
  for (const f of e.alive()) {
    if (f.skip > 0) continue;
    for (const a of f.intent) if (a.k === "atk") n += e.attackValue(f, a.n) * e.attackHits(f, a.x ?? 1);
  }
  return n;
}

/** Heuristic value of a fight state from Uro's point of view. */
const SCAR_COST = 18;
function evaluate(e: Combat): number {
  const s = e.s;
  const hand = s.body.hand.length;
  const scars = (h: number) => Math.max(0, 4 - h);
  if (s.over === "won") return 400 - scars(hand) * SCAR_COST + hand * 2;
  if (s.over === "lost") return -1e6;
  const landed = Math.max(0, incomingWounds(e) - s.body.block);
  if (landed >= hand && !s.flags.spared) return -5e5 + hand;
  let v = 0;
  let hp = 0;
  for (const f of e.alive()) {
    hp += Math.max(0, f.hp - f.poison);
    v -= f.hp + 6 + f.block * 0.5 - f.poison * 0.9 - f.weak * 1.5;
  }
  const next = hand - landed + 3;
  v += (hand - landed) * 2.6;
  v += s.body.hand.reduce((a, c) => a + c.coil * 0.6, 0);
  // Likely to finish next turn with cards to spare: worth nearly as much as winning now.
  const perCard = 2 + Math.floor(next / 2);
  const cardsNeeded = Math.ceil(hp / perCard);
  if (cardsNeeded < next) v = Math.max(v, 400 - 40 - scars(next - cardsNeeded) * SCAR_COST + (next - cardsNeeded) * 2 - hp);
  return v;
}

function cloneCombat(e: Combat, agent: Agent): Combat {
  const s = structuredClone(e.s) as CombatState;
  const run = structuredClone(e.run);
  const rng = new DeterministicRng((e.rng as DeterministicRng).state ?? 1);
  return new Combat(s, run, rng, agent, silent);
}

export class Bot implements RunAgent {
  style: BotStyle;
  rng: DeterministicRng;
  ctl: RunController | null = null;

  constructor(style: BotStyle, seed: number) {
    this.style = style;
    this.rng = new DeterministicRng(seed);
  }

  async pick(req: PickRequest): Promise<number[]> {
    const cards = [...req.cards];
    if (req.kind === "wound" && this.style === "randomWounds") {
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng.next() * (i + 1));
        [cards[i], cards[j]] = [cards[j]!, cards[i]!];
      }
      return cards.slice(0, req.count).map((c) => c.uid);
    }
    const keepBest = req.kind === "choose" && !["shed", "discard"].includes(req.prompt);
    cards.sort((a, b) => (keepBest ? cardValue(b) - cardValue(a) : cardValue(a) - cardValue(b)));
    return cards.slice(0, req.count).map((c) => c.uid);
  }

  async chooseDeck(prompt: string, indices: number[]): Promise<number | null> {
    if (!indices.length || !this.ctl) return null;
    const deck = this.ctl.run.deck;
    const score = (i: number) => {
      const d = deck[i]!;
      const def = CARDS[d.id]!;
      return RARITY_VALUE[def.rarity]! * 2 + (def.type === "strike" ? 1 : 0) + (d.id === "card.fang" ? 1.5 : 0) + (d.id === "card.scale" ? -1 : 0);
    };
    const sorted = [...indices].sort((a, b) => score(a) - score(b));
    return prompt === "upgrade" || prompt === "duplicate" ? sorted[sorted.length - 1]! : sorted[0]!;
  }

  // ---------- fights ----------

  /** Choose the next card to play, or null to end the turn. */
  async choosePlay(e: Combat): Promise<{ uid: number; target?: number } | null> {
    const hand = e.body.hand;
    const playable = hand.filter((c) => e.canPlay(c));
    if (!playable.length) return null;
    const targets = (c: BodyCard) => (CARDS[c.id]!.tgt ? e.alive().map((f) => f.uid) : [undefined]);

    if (this.style === "spender") {
      if (hand.length <= 1) return null;
      for (const c of [...playable].sort((a, b) => cardValue(b) - cardValue(a))) {
        const t = e.alive().sort((a, b) => a.hp - b.hp)[0]?.uid;
        const before = e.alive().reduce((a, f) => a + f.hp, 0);
        const sim = cloneCombat(e, this);
        await sim.play(c.uid, t);
        const after = sim.alive().reduce((a, f) => a + f.hp, 0);
        if (after < before || sim.body.block > e.body.block || sim.s.over === "won") return { uid: c.uid, target: t };
      }
      return null;
    }

    let best: { uid: number; target?: number } | null = null;
    let bestScore = evaluate(e);
    for (const c of playable) {
      if (this.style === "hoarder" && c.coil < 2 && CARDS[c.id]!.type !== "guard") {
        const landed = incomingWounds(e) - e.body.block;
        if (landed < hand.length - 1) continue;
      }
      for (const t of targets(c)) {
        const sim = cloneCombat(e, this);
        await sim.play(c.uid, t);
        const v = evaluate(sim);
        if (v > bestScore + 0.01) {
          bestScore = v;
          best = { uid: c.uid, target: t };
        }
      }
    }
    return best;
  }

  async playTurn(e: Combat): Promise<void> {
    for (let guard = 0; guard < 30 && !e.s.over; guard++) {
      const move = await this.choosePlay(e);
      if (!move) break;
      const turn = e.s.turn;
      const ok = await e.play(move.uid, move.target);
      if (!ok || e.s.turn !== turn) break;
    }
    if (!e.s.over) await e.endTurn();
  }

  // ---------- run decisions ----------

  chooseNode(nodes: MapNode[]): MapNode {
    const run = this.ctl!.run;
    const eff = run.maxHand - run.scars;
    const rank = (n: MapNode): number => {
      switch (n.kind) {
        case "rest": return run.scars >= 2 ? 10 : 3;
        case "elite": return eff >= 9 && run.scars === 0 ? 7 : 1;
        case "shop": return run.glint >= 120 ? 6 : 2;
        case "treasure": return 8;
        case "event": return 4;
        case "fight": return 5;
        default: return 5;
      }
    };
    return [...nodes].sort((a, b) => rank(b) - rank(a) || a.col - b.col)[0]!;
  }

  async handleScreen(): Promise<void> {
    const ctl = this.ctl!;
    const run = ctl.run;
    const sc = run.screen;
    switch (sc.kind) {
      case "map": {
        const nodes = ctl.availableNodes();
        await ctl.enter(this.chooseNode(nodes));
        return;
      }
      case "combat": {
        const e = ctl.combat!;
        await this.playTurn(e);
        ctl.settleCombat();
        return;
      }
      case "reward": {
        while (sc.devours > 0 && sc.husks.length) {
          const order = sc.husks.map((h, i) => ({ i, v: (h.twin ? 3 : 0) + RARITY_VALUE[CARDS[h.id]!.rarity]! }));
          order.sort((a, b) => b.v - a.v);
          ctl.devour(order[0]!.i);
        }
        ctl.leave();
        return;
      }
      case "rest": {
        if (run.scars >= 2) await ctl.rest("mend");
        else if (!(await ctl.rest("coil"))) await ctl.rest("shed");
        ctl.leave();
        return;
      }
      case "shop": {
        if (run.scars) await ctl.buy("mend");
        const bones = sc.stock.bones.map((b, i) => ({ i, b })).filter((x) => !x.b.sold && x.b.price <= run.glint);
        if (bones.length) await ctl.buy("bone", bones[0]!.i);
        const cards = sc.stock.cards.map((c, i) => ({ i, c })).filter((x) => !x.c.sold && x.c.price <= run.glint);
        cards.sort((a, b) => RARITY_VALUE[CARDS[b.c.id]!.rarity]! - RARITY_VALUE[CARDS[a.c.id]!.rarity]!);
        if (cards.length) await ctl.buy("card", cards[0]!.i);
        ctl.leave();
        return;
      }
      case "treasure":
        ctl.takeTreasure();
        ctl.leave();
        return;
      case "event": {
        const choices = ctl.eventChoices(sc.id);
        const ok = choices.map((c, i) => ({ c, i })).filter((x) => !x.c.can || x.c.can(run));
        const pickI = ok.length ? ok[Math.floor(this.rng.next() * ok.length)]!.i : 0;
        if (!EVENTS[sc.id]) throw new Error(sc.id);
        await ctl.chooseEvent(pickI);
        if (run.screen.kind === "event") ctl.leave();
        return;
      }
      case "actEnd":
        ctl.leave();
        return;
      case "over":
        return;
    }
  }
}

export const boneName = (id: string) => BONES[id]?.name ?? id;

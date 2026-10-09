import { scarsFor, type Rng } from "../bodydeck/BodyDeck.ts";
import { BONE_LIST, BONES } from "../data/bones.ts";
import { CARDS, rewardPool, STARTERS } from "../data/cards.ts";
import { EVENT_LIST, EVENTS, type EventOps } from "../data/events.ts";
import { ENCOUNTERS, FOES } from "../data/foes.ts";
import { tuning } from "../data/tuning.ts";
import { asc } from "../data/turns.ts";
import { Combat, createCombat } from "./combat.ts";
import { int, pick, RunRng } from "./rng.ts";
import type { ActMap, MapNode, NodeKind, RunState, ShopStock } from "./state.ts";
import type { Agent, FoeTier, Husk, MoltId, Presenter, Rarity } from "./types.ts";

export const LAST_ACT = 3;
const BOSS_BONE: Record<number, string> = { 1: "bone.queen_carapace", 2: "bone.spore_heart", 3: "bone.drowned_pearl" };

/** Run-level decisions: deck picks at rests, events and the Burrower. */
export interface RunAgent extends Agent {
  chooseDeck(prompt: string, indices: number[]): Promise<number | null>;
}

export function newRun(opts: { seed: string; molt: MoltId; onboarding: boolean; ascension?: number; daily?: string }): RunState {
  const rng = new RunRng(opts.seed);
  const starter = STARTERS[opts.molt];
  if (!starter) throw new Error(`Molt ${opts.molt} is not playable yet`);
  const run: RunState = {
    v: 1,
    seed: opts.seed,
    molt: opts.molt,
    ascension: opts.ascension ?? 0,
    act: 1,
    deck: starter.map((id) => ({ id, up: false })),
    maxHand: tuning.body.startMaxHand,
    scars: 0,
    glint: 0,
    bones: [],
    lastDevoured: null,
    startBlock: 0,
    nextFight: { block: 0, draw: 0, selfPoisonFights: 0, poisonOnYou: 0 },
    shedCount: 0,
    map: { act: 1, rows: [] },
    row: -1,
    col: -1,
    rng: rng.states(),
    stats: { fights: 0, elites: 0, kills: 0, turns: 0, cardsPlayed: 0, woundsTaken: 0, maxHandPeak: tuning.body.startMaxHand, devoured: [], diedTo: null },
    onboarding: opts.onboarding,
    fightIndex: 0,
    wishboneAct: 0,
    ringOfAshUsed: false,
    egg: 0,
    actHuskBonus: 0,
    screen: { kind: "map" },
    startedAt: Date.now(),
    ...(opts.daily ? { daily: opts.daily } : {}),
  };
  const a = run.ascension;
  run.scars = asc(a, 11) ? 2 : asc(a, 4) ? 1 : 0;
  run.map = generateMap(1, rng.stream("map"), opts.onboarding, a);
  run.rng = rng.states();
  return run;
}

// ---------- map ----------

export function generateMap(act: number, rng: Rng, singleStart: boolean, ascension = 0): ActMap {
  const { rows: R, width: Wd, paths } = tuning.map;
  const grid: (MapNode | null)[][] = Array.from({ length: R }, () => Array<MapNode | null>(Wd).fill(null));
  const node = (r: number, c: number): MapNode => (grid[r]![c] ??= { row: r, col: c, kind: "fight", next: [] });
  const center = Math.floor(Wd / 2);
  for (let p = 0; p < paths; p++) {
    let col = singleStart ? center : p < 2 ? (p === 0 ? 1 : Wd - 2) : Math.floor(rng.next() * Wd);
    node(0, col);
    for (let r = 0; r < R - 1; r++) {
      let next = Math.max(0, Math.min(Wd - 1, col + Math.floor(rng.next() * 3) - 1));
      // Don't cross an existing edge from the neighbour column.
      const nb = grid[r]![next];
      if (next !== col && nb && nb.next.includes(col)) next = col;
      const n = node(r, col);
      node(r + 1, next);
      if (!n.next.includes(next)) n.next.push(next);
      col = next;
    }
  }
  const weights = tuning.map.weights;
  const kinds = Object.keys(weights) as NodeKind[];
  for (let r = 0; r < R; r++) {
    for (const n of grid[r]!) {
      if (!n) continue;
      n.next.sort((a, b) => a - b);
      if (r === 0) n.kind = "fight";
      else if (r === tuning.map.treasureRow) n.kind = "treasure";
      else if (r === R - 1) n.kind = "rest";
      else {
        for (let tries = 0; tries < 8; tries++) {
          const k = weighted(rng, kinds, kinds.map((x) => weights[x]!));
          if (k === "elite" && r < tuning.map.noElitesBefore) continue;
          if (k === "rest" && (r < 5 || r === R - 2)) continue;
          if (k === "shop" && r < 3) continue;
          if (k === "treasure") continue;
          n.kind = k;
          break;
        }
      }
    }
  }
  // Turns 2 and 17 take rests away (never the one before the boss).
  let cut = (asc(ascension, 2) ? 1 : 0) + (asc(ascension, 17) ? 1 : 0);
  for (let r = 5; r < R - 1 && cut > 0; r++) {
    for (const n of grid[r]!) {
      if (n && n.kind === "rest" && cut > 0) {
        n.kind = "fight";
        cut--;
      }
    }
  }
  const rows: MapNode[][] = grid.map((row) => row.filter((n): n is MapNode => !!n));
  for (const n of rows[R - 1]!) n.next = [0];
  rows.push([{ row: R, col: 0, kind: "boss", next: [] }]);
  return { act, rows };
}

function weighted<T>(rng: Rng, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

// ---------- controller ----------

/** Drives a run from node to node. Shared by the game UI and the balance sim. */
export class RunController {
  rng: RunRng;
  combat: Combat | null = null;
  run: RunState;
  agent: RunAgent;
  p: Presenter;

  constructor(run: RunState, agent: RunAgent, p: Presenter) {
    this.run = run;
    this.agent = agent;
    this.p = p;
    this.rng = new RunRng(run.seed, run.rng);
    if (run.screen.kind === "combat") this.combat = new Combat(run.screen.combat, run, this.rng.stream("combat"), agent, p);
  }

  has(b: string): boolean {
    return this.run.bones.includes(b);
  }

  /** Persist stream positions into the run before saving. */
  sync(): RunState {
    this.run.rng = this.rng.states();
    return this.run;
  }

  effectiveMaxHand(): number {
    return this.run.maxHand - this.run.scars;
  }

  // ----- map -----

  availableNodes(): MapNode[] {
    const { run } = this;
    const rows = run.map.rows;
    if (run.row < 0) return rows[0]!;
    const cur = rows[run.row]!.find((n) => n.col === run.col);
    if (!cur || run.row + 1 >= rows.length) return [];
    return rows[run.row + 1]!.filter((n) => cur.next.includes(n.col));
  }

  async enter(node: MapNode): Promise<void> {
    const run = this.run;
    if (run.screen.kind !== "map" || !this.availableNodes().includes(node)) return;
    run.row = node.row;
    run.col = node.col;
    switch (node.kind) {
      case "fight": return this.startFight(this.encounter("normal"), "normal");
      case "elite": return this.startFight(this.encounter("elite"), "elite");
      case "boss": return this.startFight(this.encounter("boss"), "boss");
      case "rest": run.screen = { kind: "rest", done: false }; return;
      case "shop": run.screen = { kind: "shop", stock: this.makeShop() }; return;
      case "treasure": run.screen = { kind: "treasure", bone: this.rollBone(), taken: false }; return;
      case "event": run.screen = { kind: "event", id: this.rollEvent() }; return;
    }
  }

  private encounter(kind: FoeTier): string[] {
    const pool = ENCOUNTERS[this.run.act]!;
    const rng = this.rng.stream("map");
    if (kind === "elite") return [...pick(rng, pool.elite)];
    if (kind === "boss") return [...pick(rng, pool.boss)];
    const i = this.run.fightIndex;
    if (this.run.onboarding && i < pool.onboarding.length) return [...pool.onboarding[i]!];
    return [...pick(rng, i < 3 ? pool.easy : pool.hard)];
  }

  async startFight(encounter: string[], kind: FoeTier, opts: { hp?: number; rare?: boolean; node?: NodeKind } = {}): Promise<void> {
    const run = this.run;
    const s = createCombat(run, encounter, kind, this.rng.stream("combat"));
    if (opts.hp) for (const f of s.foes) f.hp = Math.ceil(f.max * opts.hp);
    const eliteHp = asc(run.ascension, 15) ? 1.2 : asc(run.ascension, 1) ? 1.1 : 1;
    if (kind === "elite") for (const f of s.foes) f.hp = f.max = Math.ceil(f.max * eliteHp);
    run.screen = { kind: "combat", combat: s, node: opts.node ?? (kind === "normal" ? "fight" : kind) };
    this.pendingRare = !!opts.rare;
    this.combat = new Combat(s, run, this.rng.stream("combat"), this.agent, this.p);
    await this.combat.begin();
  }
  private pendingRare = false;

  /** Call after any combat action: settles a finished fight. Returns true if the fight ended. */
  settleCombat(): boolean {
    const run = this.run;
    const c = this.combat;
    if (!c || run.screen.kind !== "combat" || !c.s.over) return false;
    const s = c.s;
    const node = run.screen.node;
    this.combat = null;
    if (s.over === "lost") {
      run.stats.diedTo = s.foes.find((f) => f.alive)?.id ?? null;
      run.screen = { kind: "over", win: false, reason: s.lostReason };
      return true;
    }
    if (node === "finale") {
      run.stats.fights++;
      run.screen = { kind: "over", win: true, reason: "ring", ending: s.ending ?? "devour" };
      return true;
    }
    run.stats.fights++;
    if (s.turn === 1) run.stats.quickWins = (run.stats.quickWins ?? 0) + 1;
    (run.stats.fightTurns ??= []).push([run.act, s.kind, s.turn, s.encounter.join("+")]);
    run.fightIndex++;
    if (s.kind === "elite") run.stats.elites++;
    // Scars for ending thin.
    const hand = s.body.hand.length;
    let scars = scarsFor(hand, tuning.body.scarFloor);
    if (this.has("bone.sap") && hand === 3) scars = 0;
    this.scar(scars);
    if (s.kind === "elite" && this.has("bone.mushroom")) this.mend(1);
    // Shed Skin wears out after two uses.
    run.deck = run.deck.filter((d) => !(d.id === "card.shed_skin" && (d.uses ?? 0) >= 2));
    if (this.effectiveMaxHand() < tuning.body.wornAt) {
      run.screen = { kind: "over", win: false, reason: "worn" };
      return true;
    }
    const loot = this.rng.stream("loot");
    const e = tuning.economy;
    const base = s.kind === "boss" ? e.glintBoss : s.kind === "elite" ? int(loot, ...e.glintElite) : int(loot, ...e.glintFight);
    const glint = Math.round(base * (asc(run.ascension, 14) ? 0.75 : 1));
    run.glint += glint;
    let bone: string | null = null;
    if (s.kind === "elite") bone = this.rollBone();
    if (s.kind === "boss") bone = BOSS_BONE[run.act] ?? null;
    if (run.egg > 0 && --run.egg === 0) bone = bone ?? this.rollBone();
    if (bone) this.gainBone(bone);
    const husks = this.huskOptions(s.husks, s.kind);
    if (s.flags.devourRite) this.devourRitePending = true;
    run.screen = {
      kind: "reward",
      husks,
      devours: (this.has("bone.black_pearl") ? 2 : 1) * tuning.devour.perFight,
      glint,
      bone,
      rare: s.kind === "boss",
      node,
    };
    return true;
  }
  private devourRitePending = false;

  private huskOptions(killed: Husk[], kind: FoeTier): Husk[] {
    const out: Husk[] = [];
    for (const h of killed) {
      const prev = out.find((x) => x.id === h.id);
      if (prev) prev.twin ||= h.twin;
      else out.push({ ...h });
    }
    const loot = this.rng.stream("loot");
    const want = Math.max(1, tuning.devour.huskOptions + (this.has("bone.pearl") ? 1 : 0) + this.run.actHuskBonus + (kind === "boss" ? 1 : 0) - (asc(this.run.ascension, 9) ? 1 : 0));
    let guard = 0;
    while (out.length < want && guard++ < 50) {
      const id = this.randomCard(kind === "boss" || this.pendingRare ? "R" : this.rollRarity(kind === "elite"));
      if (!out.some((x) => x.id === id)) out.push({ id, from: "", twin: false });
    }
    this.pendingRare = false;
    return out.slice(0, Math.max(want, out.length));
  }

  devour(index: number): void {
    const run = this.run;
    const sc = run.screen;
    if (sc.kind !== "reward" || sc.devours <= 0) return;
    const h = sc.husks[index];
    if (!h) return;
    sc.husks.splice(index, 1);
    sc.devours--;
    // Venom's Hunger: a poisoned kill's husk comes in twice (both cards), one growth step.
    run.deck.push({ id: h.id, up: false });
    if (h.twin) run.deck.push({ id: h.id, up: false });
    if (run.maxHand < tuning.devour.maxHandCap) run.maxHand += tuning.devour.maxHandPerDevour;
    run.lastDevoured = h.id;
    run.stats.devoured.push(h.id);
    if (this.devourRitePending) {
      run.startBlock += 3;
      this.devourRitePending = false;
    }
    if (this.has("bone.gizzard")) run.nextFight.draw += 2;
    if (this.has("bone.lamprey")) this.mend(1);
    run.stats.maxHandPeak = Math.max(run.stats.maxHandPeak, run.maxHand);
    void this.p.emit({ type: "husk.devour", id: h.id, twin: h.twin });
  }

  /** Leave the reward, rest, shop, event or treasure screen. */
  /** Leaving a reward without devouring anything pays glint and mends a scar. */
  skipPays(): boolean {
    const sc = this.run.screen;
    return sc.kind === "reward" && sc.devours > 0 && sc.husks.length > 0 && sc.devours === (this.has("bone.black_pearl") ? 2 : 1);
  }

  leave(): void {
    const run = this.run;
    this.devourRitePending = false;
    // Choosing not to eat: a little glint and a mended scar, so growing is a real choice.
    if (this.skipPays()) {
      run.glint += tuning.devour.skipGlint;
      this.mend(1);
    }
    if (run.screen.kind === "reward" && run.screen.node === "boss") {
      run.screen = { kind: "actEnd" };
      return;
    }
    run.screen = { kind: "map" };
  }

  /** From the act-end plate: descend to the next act, or meet the Tail after the last. */
  async descend(): Promise<void> {
    const run = this.run;
    if (run.screen.kind !== "actEnd") return;
    if (run.act >= LAST_ACT) {
      await this.startFight(["boss.tail"], "boss", { node: "finale" });
      return;
    }
    run.act++;
    run.map = generateMap(run.act, this.rng.stream("map"), false, run.ascension);
    run.row = -1;
    run.col = -1;
    run.actHuskBonus = 0;
    run.screen = { kind: "map" };
    void this.p.emit({ type: "act.enter", act: run.act });
  }

  // ----- rest -----

  async rest(choice: "mend" | "coil" | "shed"): Promise<boolean> {
    const run = this.run;
    if (run.screen.kind !== "rest" || run.screen.done) return false;
    if (choice === "mend") {
      if (!run.scars) return false;
      this.mend((this.has("bone.salt_lick") ? 3 : tuning.economy.restMend) - (asc(run.ascension, 16) ? 1 : 0));
    } else if (choice === "coil") {
      const times = this.has("bone.cocoon") ? 2 : 1;
      let any = false;
      for (let t = 0; t < times; t++) {
        const i = await this.agent.chooseDeck("upgrade", this.deckIndices((d) => !d.up));
        if (i === null) break;
        run.deck[i]!.up = true;
        any = true;
      }
      if (!any) return false;
    } else {
      const i = await this.agent.chooseDeck("remove", this.deckIndices());
      if (i === null) return false;
      run.deck.splice(i, 1);
    }
    if (this.has("bone.pebble")) run.nextFight.block += 3;
    run.screen.done = true;
    void this.p.emit({ type: `rest.${choice}` });
    return true;
  }

  deckIndices(filter: (d: { id: string; up: boolean }) => boolean = () => true): number[] {
    return this.run.deck.map((d, i) => (filter(d) ? i : -1)).filter((i) => i >= 0);
  }

  // ----- shop -----

  price(base: number): number {
    return Math.round(base * (this.has("bone.shard") ? 0.85 : 1) * (this.run.ascension >= 8 ? 1.2 : 1));
  }

  private makeShop(): ShopStock {
    const loot = this.rng.stream("loot");
    const cards: ShopStock["cards"] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const id = this.randomCard(this.rollRarity(false), i >= 3);
      if (seen.has(id)) { i--; continue; }
      seen.add(id);
      const r = CARDS[id]!.rarity;
      cards.push({ id, price: this.price(tuning.economy.cardPrice[r]! + int(loot, -5, 5)), sold: false });
    }
    const bones: ShopStock["bones"] = [];
    for (let i = 0; i < 2; i++) {
      const id = this.rollBone(bones.map((b) => b.id));
      if (!id) break;
      const [lo, hi] = tuning.economy.bonePrice;
      const r = BONES[id]!.rarity;
      bones.push({ id, price: this.price(r === "C" ? lo : r === "U" ? Math.round((lo + hi) / 2) : hi), sold: false });
    }
    return { cards, bones, mendUsed: false, shedUsed: false };
  }

  shedPrice(): number {
    return this.price(tuning.economy.shedPrice + tuning.economy.shedStep * this.run.shedCount);
  }
  mendPrice(): number {
    return this.price(tuning.economy.mendPrice);
  }

  async buy(kind: "card" | "bone" | "mend" | "shed", index = 0): Promise<boolean> {
    const run = this.run;
    const sc = run.screen;
    if (sc.kind !== "shop") return false;
    const st = sc.stock;
    if (kind === "card") {
      const it = st.cards[index];
      if (!it || it.sold || run.glint < it.price) return false;
      run.glint -= it.price;
      it.sold = true;
      run.deck.push({ id: it.id, up: false });
    } else if (kind === "bone") {
      const it = st.bones[index];
      if (!it || it.sold || run.glint < it.price) return false;
      run.glint -= it.price;
      it.sold = true;
      this.gainBone(it.id);
    } else if (kind === "mend") {
      const p = this.mendPrice();
      if (st.mendUsed || !run.scars || run.glint < p) return false;
      run.glint -= p;
      st.mendUsed = true;
      this.mend(1);
    } else {
      const p = this.shedPrice();
      if (st.shedUsed || run.glint < p) return false;
      const i = await this.agent.chooseDeck("remove", this.deckIndices());
      if (i === null) return false;
      run.glint -= p;
      st.shedUsed = true;
      run.shedCount++;
      run.deck.splice(i, 1);
    }
    void this.p.emit({ type: "shop.buy", kind });
    return true;
  }

  // ----- treasure -----

  takeTreasure(): void {
    const sc = this.run.screen;
    if (sc.kind !== "treasure" || sc.taken) return;
    sc.taken = true;
    if (sc.bone) this.gainBone(sc.bone);
  }

  // ----- events -----

  private rollEvent(): string {
    const ev = this.rng.stream("event");
    const pool = EVENT_LIST.filter((e) => e.act.includes(this.run.act) && (!e.choices.every((c) => c.can && !c.can(this.run))));
    return pick(ev, pool).id;
  }

  async chooseEvent(index: number): Promise<void> {
    const run = this.run;
    const sc = run.screen;
    if (sc.kind !== "event") return;
    const def = EVENTS[sc.id]!;
    const choices = this.eventChoices(sc.id);
    const ch = choices[index];
    if (!ch || (ch.can && !ch.can(run))) return;
    let fought = false;
    const ops: EventOps = {
      run,
      gainBone: (r) => { const id = this.rollBone([], r); if (id) this.gainBone(id); return id; },
      loseBone: () => { const i = Math.floor(this.rng.stream("event").next() * run.bones.length); return run.bones.splice(i, 1)[0] ?? null; },
      addCard: (id, up = false) => void run.deck.push({ id, up }),
      randomCard: (r, m) => this.randomCard(r ?? this.rollRarity(false), m),
      chooseDeck: (prompt, filter) => this.agent.chooseDeck(prompt, this.deckIndices((d) => !filter || filter(d.id, d.up))),
      removeCard: (i) => void run.deck.splice(i, 1),
      upgrade: (i) => { const d = run.deck[i]; if (d) d.up = true; },
      scar: (n) => this.scar(n),
      mend: (n) => this.mend(n),
      maxHand: (n) => { run.maxHand += n; run.stats.maxHandPeak = Math.max(run.stats.maxHandPeak, run.maxHand); },
      glint: (n) => { run.glint = Math.max(0, run.glint + n); },
      fight: (enc, kind, bonus) => { fought = true; void this.startFight(enc, kind, bonus); },
      rng: () => this.rng.stream("event").next(),
    };
    await ch.apply(ops);
    void this.p.emit({ type: "event.choose", id: def.id });
    if (!fought) {
      if (this.effectiveMaxHand() < tuning.body.wornAt) run.screen = { kind: "over", win: false, reason: "worn" };
      else run.screen = { kind: "map" };
    }
  }

  eventChoices(id: string) {
    const def = EVENTS[id]!;
    const out = [...def.choices];
    if (this.has("bone.seed") && this.run.scars > 0) out.push({ label: "Mend", hint: "Mend 1 scar", apply: (o: EventOps) => o.mend(1) });
    return out;
  }

  // ----- shared -----

  scar(n: number): void {
    if (n <= 0) return;
    const run = this.run;
    run.scars += n;
    if (this.has("bone.old_skin")) run.scars = Math.min(2, run.scars);
    void this.p.emit({ type: "scar.gain", n });
  }

  mend(n: number): void {
    const run = this.run;
    const m = Math.min(run.scars, n);
    if (m <= 0) return;
    run.scars -= m;
    void this.p.emit({ type: "scar.mend", n: m });
  }

  rollRarity(elite: boolean): "C" | "U" | "R" {
    const r = this.rng.stream("loot").next();
    if (elite) return r < 0.4 ? "C" : r < 0.85 ? "U" : "R";
    return r < 0.6 ? "C" : r < 0.93 ? "U" : "R";
  }

  randomCard(rarity: Rarity, moltOnly = false): string {
    const pool = rewardPool(this.run.molt).filter((c) => c.rarity === rarity && (!moltOnly || c.molt));
    const fallback = rewardPool(this.run.molt).filter((c) => c.rarity === rarity);
    return pick(this.rng.stream("loot"), pool.length ? pool : fallback).id;
  }

  rollBone(exclude: string[] = [], rarity?: "C" | "U" | "R"): string {
    const loot = this.rng.stream("loot");
    const r = rarity ?? (loot.next() < 0.6 ? "C" : loot.next() < 0.75 ? "U" : "R");
    const owned = new Set([...this.run.bones, ...exclude]);
    let pool = BONE_LIST.filter((b) => b.rarity === r && !owned.has(b.id));
    if (!pool.length) pool = BONE_LIST.filter((b) => b.rarity !== "B" && !owned.has(b.id));
    return pool.length ? pick(loot, pool).id : "";
  }

  gainBone(id: string): void {
    const run = this.run;
    if (!id || run.bones.includes(id)) return;
    run.bones.push(id);
    if (id === "bone.rib") run.maxHand += 1;
    if (id === "bone.leviathan_rib") run.maxHand += 3;
    if (id === "bone.drowned_pearl") run.maxHand += 2;
    if (id === "bone.copper") run.glint += 25;
    if (id === "bone.old_skin") run.scars = Math.min(2, run.scars);
    run.stats.maxHandPeak = Math.max(run.stats.maxHandPeak, run.maxHand);
    void this.p.emit({ type: "bone.gain", id });
  }

  foeName(id: string): string {
    return FOES[id]?.name ?? id;
  }
}

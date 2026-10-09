import {
  absorb,
  addCoil,
  coilHeld,
  createBody,
  drawCards,
  eatTarget,
  isBig,
  might,
  shuffle,
  startTurnReset,
  takeFromHand,
  turnDrawCount,
  woundCard,
  type BodyCard,
  type Rng,
} from "../bodydeck/BodyDeck.ts";
import { tuning } from "../data/tuning.ts";
import { CARDS } from "../data/cards.ts";
import { FOES } from "../data/foes.ts";
import type { CardCtx, CardDef } from "./cardTypes.ts";
import type { RunState } from "./state.ts";
import type { Act, Agent, CombatState, FoeState, FoeTier, Intent, PickRequest, Presenter } from "./types.ts";
import { asc } from "../data/turns.ts";

const MAX_FOES = 4;

/** Opening hand for a body of this size (see tuning.body.openingGrowth). */
export function openingHand(maxHand: number): number {
  const t = tuning.body;
  const full = Math.min(maxHand, t.heavyAt) - 1;
  return Math.max(t.openingDraw, full + Math.floor(Math.max(0, maxHand - t.heavyAt) / t.openingGrowth));
}

export function newFoe(s: { nextUid: number }, id: string, rng: Rng): FoeState {
  const def = FOES[id];
  if (!def) throw new Error(`Unknown foe ${id}`);
  return {
    uid: ++s.nextUid,
    id,
    hp: def.hp,
    max: def.hp,
    block: 0,
    str: 0,
    weak: 0,
    poison: 0,
    slowRot: false,
    step: def.stagger ? Math.floor(rng.next() * def.pattern.length) : 0,
    phase: 1,
    intent: [{ k: "rest" }],
    mark: 0,
    skip: 0,
    revealed: 0,
    attackedLast: false,
    coaxed: false,
    blind: false,
    cancelEat: false,
    alive: true,
  };
}

export function createCombat(run: RunState, encounter: string[], kind: FoeTier, rng: Rng): CombatState {
  const has = (b: string) => run.bones.includes(b);
  const t = tuning.body;
  const body = createBody({
    maxHand: run.maxHand - run.scars,
    coilCap: (run.molt === "storm" ? t.stormCoilCap : t.coilCap) + (has("bone.coiled_spine") ? 1 : 0),
    bigAt: (asc(run.ascension, 13) ? 7 : asc(run.ascension, 5) ? 8 : t.bigAt) + (has("bone.beetle_wing") ? 1 : 0) - (has("bone.leviathan_rib") ? 2 : 0),
    heavyAt: (asc(run.ascension, 10) ? 11 : t.heavyAt) + (has("bone.anchor") ? 3 : 0),
    drawPerTurn: t.drawPerTurn - (has("bone.queen_carapace") ? 1 : 0),
  });
  const s: CombatState = {
    v: 1,
    kind,
    encounter,
    body,
    foes: [],
    turn: 0,
    targetUid: 0,
    husks: [],
    playedThisTurn: 0,
    totalPlayed: 0,
    lockPlays: false,
    ritual: 0,
    selfPoison: 0,
    decoyUid: null,
    huntMarks: [],
    extraDevours: 0,
    devouredThisFight: 0,
    poisonKills: 0,
    coilSpent: 0,
    flags: {
      secondSkin: false,
      venomHeart: false,
      creeping: false,
      pestilence: false,
      leviathan: false,
      swell: false,
      taint: false,
      thorns: 0,
      mirror: false,
      noEat: false,
      spared: false,
      devourRite: false,
      firstStrikeDone: false,
      eggshellUsed: false,
      mirrorBoneUsed: false,
      bileWall: false,
      bigImmuneTurns: 0,
      selfPoisonFights: 0,
    },
    nextUid: 0,
    over: null,
    lostReason: "",
    endTurnRequested: false,
    lastWounded: null,
    n: {},
  };
  const fossil = has("bone.fossil") ? 1 : 0;
  body.draw = run.deck.map((d, i) => ({
    uid: ++s.nextUid,
    id: d.id,
    coil: d.up ? Math.min(body.coilCap, 1 + fossil) : 0,
    up: d.up,
    held: 0,
    bound: false,
    guarded: false,
    deckIndex: i,
  }));
  shuffle(body.draw, rng);
  s.foes = encounter.map((id) => newFoe(s, id, rng));
  for (const f of s.foes) {
    const def = FOES[f.id]!;
    if (def.tier === "boss" && asc(run.ascension, 18)) f.hp = f.max = Math.ceil(f.max * 1.1);
    if (f.id === "boss.tail") {
      f.hp = f.max = Math.max(60, Math.min(run.maxHand - run.scars, 15) * 12);
      const ids = run.deck.map((d) => d.id);
      shuffle(ids, rng);
      s.tail = { draw: ids, discard: [], ringGiven: false };
    }
  }
  s.targetUid = s.foes[0]?.uid ?? 0;
  return s;
}

/** The rules of a fight. All state lives in `s` (plain JSON); this class only applies rules to it. */
export class Combat {
  /** The card currently resolving (strike bonuses and Taint read it). */
  private cur: { def: CardDef; firstHit: boolean } | null = null;
  busy = false;

  s: CombatState;
  run: RunState;
  rng: Rng;
  agent: Agent;
  p: Presenter;

  constructor(s: CombatState, run: RunState, rng: Rng, agent: Agent, p: Presenter) {
    this.s = s;
    this.run = run;
    this.rng = rng;
    this.agent = agent;
    this.p = p;
  }

  get body() {
    return this.s.body;
  }
  has(bone: string): boolean {
    return this.run.bones.includes(bone);
  }
  alive(): FoeState[] {
    return this.s.foes.filter((f) => f.alive);
  }
  foe(uid: number): FoeState | undefined {
    return this.s.foes.find((f) => f.uid === uid && f.alive);
  }
  target(): FoeState | undefined {
    return this.foe(this.s.targetUid) ?? this.alive()[0];
  }
  setTarget(uid: number): void {
    if (this.foe(uid)) this.s.targetUid = uid;
  }
  cycleTarget(dir: number): void {
    const a = this.alive();
    if (!a.length) return;
    const i = Math.max(0, a.findIndex((f) => f.uid === this.s.targetUid));
    this.s.targetUid = a[(i + dir + a.length) % a.length]!.uid;
  }
  /** Per-fight counter (missing reads as 0). */
  n(key: string): number {
    return this.s.n?.[key] ?? 0;
  }
  setN(key: string, v: number): void {
    (this.s.n ??= {})[key] = v;
  }
  addN(key: string, v = 1): void {
    this.setN(key, this.n(key) + v);
  }

  private emit(type: string, data: Record<string, unknown> = {}): void | Promise<void> {
    return this.p.emit({ type, ...data });
  }

  // ---------- fight start ----------

  async begin(): Promise<void> {
    this.busy = true;
    try {
      await this.setup();
    } finally {
      this.busy = false;
    }
    await this.emit("turn.start", { turn: this.s.turn });
  }

  private async setup(): Promise<void> {
    const s = this.s;
    const b = this.body;
    const run = this.run;
    if (this.has("bone.heart_stone")) b.mightBonus += 2;
    for (const f of s.foes) this.nextIntent(f);
    s.turn = 1;
    const opening =
      openingHand(b.maxHand) +
      (this.has("bone.molar") ? 1 : 0) +
      (this.has("bone.crown_bone") ? 2 : 0) +
      run.nextFight.draw -
      (asc(run.ascension, 19) ? 1 : 0);
    drawCards(b, opening, this.rng);
    if (this.has("bone.sunstone")) for (const c of b.hand) addCoil(b, c, 1);
    if (this.has("bone.vertebra") && b.hand[0]) b.hand[0].coil = Math.max(b.hand[0].coil, Math.min(2, b.coilCap));
    if (run.molt === "storm") {
      const pool = [...b.hand];
      shuffle(pool, this.rng);
      for (const c of pool.slice(0, 2)) addCoil(b, c, 1);
    }
    b.block += (this.has("bone.scale_flake") ? 2 : 0) + run.startBlock + run.nextFight.block;
    if (this.has("bone.hollow_reed")) for (const f of this.alive()) f.weak += 1;
    if (this.has("bone.lantern_fish") && s.foes[0]) s.foes[0].poison += 2;
    if (this.has("bone.midnight")) for (const f of this.alive()) f.skip = 1;
    if (this.has("bone.cracked_egg")) s.flags.bigImmuneTurns = 2;
    if (run.nextFight.poisonOnYou) s.selfPoison += run.nextFight.poisonOnYou;
    run.nextFight = { block: 0, draw: 0, selfPoisonFights: run.nextFight.selfPoisonFights, poisonOnYou: 0 };
    if (run.nextFight.selfPoisonFights > 0) {
      s.selfPoison += 2;
      run.nextFight.selfPoisonFights--;
    }
    await this.emit("fight.start");
  }

  // ---------- intents ----------

  nextIntent(f: FoeState): void {
    const def = FOES[f.id]!;
    const at = (def.phase2?.at ?? 0) + (asc(this.run.ascension, 7) ? 0.1 : 0);
    if (def.phase2 && f.phase === 1 && f.hp <= f.max * at) {
      f.phase = 2;
      f.step = 0;
      if (def.phase2.onEnter === "pressure") {
        this.body.maxHand = Math.max(1, this.body.maxHand - 2);
        void this.emit("pressure", { uid: f.uid });
      }
      void this.emit("foe.phase", { uid: f.uid });
    }
    if (f.id === "boss.tail") {
      f.intent = this.tailIntent(f);
      f.step++;
      return;
    }
    const pattern = f.phase === 2 && def.phase2 ? def.phase2.pattern : def.pattern;
    f.intent = pattern[f.step % pattern.length]!;
    f.step++;
  }

  /** The intent after the current one (Lens, Glare). */
  peekIntent(f: FoeState): Act[] {
    const def = FOES[f.id]!;
    const pattern = f.phase === 2 && def.phase2 ? def.phase2.pattern : def.pattern;
    return pattern[f.step % pattern.length]!;
  }

  /** The Tail's hand: one card per 12 health, like a body. */
  tailHand(f: FoeState): number {
    return Math.max(1, Math.ceil(f.hp / 12));
  }

  /** The Tail draws from a copy of your deck and turns those cards on you. */
  private tailIntent(f: FoeState): Intent {
    const t = this.s.tail;
    if (!t) return [{ k: "rest" }];
    const plays = f.hp > f.max / 2 ? 2 : 3;
    const acts: Act[] = [];
    const m = Math.max(0, this.tailHand(f) - 1);
    for (let i = 0; i < plays; i++) {
      if (!t.draw.length) {
        t.draw = t.discard.splice(0);
        shuffle(t.draw, this.rng);
      }
      const id = t.draw.pop();
      if (!id) break;
      t.discard.push(id);
      const def = CARDS[id];
      if (!def) continue;
      let v = 2;
      try {
        const k = { m, c: 0, u: 0, e: this, t: undefined, card: { uid: -9, id, coil: 0, up: false, held: 0, bound: false, guarded: false, deckIndex: -1 } };
        v = def.n?.(k)[0] ?? 2;
      } catch {
        v = 2;
      }
      if (def.type === "strike") acts.push({ k: "atk", n: Math.max(1, Math.round(v / 4)) + (asc(this.run.ascension, 20) ? 1 : 0) });
      else if (def.type === "guard") acts.push({ k: "block", n: Math.max(2, v * 2) });
      else if (/oison/.test(def.f)) acts.push({ k: "poison", n: 2 });
      else acts.push({ k: "buff", n: 1 });
    }
    if (f.phase === 2 && f.step % 2 === 0) acts.push({ k: "eat" });
    // merge attacks into one readable intent
    const atk = acts.filter((a): a is Extract<Act, { k: "atk" }> => a.k === "atk");
    const rest = acts.filter((a) => a.k !== "atk");
    const merged: Act[] = atk.length ? [{ k: "atk", n: atk.reduce((x, a) => x + a.n, 0) }] : [];
    for (const a of rest) {
      const same = merged.find((x) => x.k === a.k);
      if (same && "n" in same && "n" in a) same.n += a.n;
      else merged.push(a);
    }
    return merged.length ? merged : [{ k: "rest" }];
  }

  /** Close the Ring: give your whole body to release the Tail. */
  closeRing(): void {
    const b = this.body;
    for (const c of [...b.hand]) {
      b.hand.splice(b.hand.indexOf(c), 1);
      b.discard.push(c);
    }
    for (const f of this.alive()) f.alive = false;
    this.s.ending = "give";
    this.s.over = "won";
    void this.emit("ring.close", {});
  }

  private offerRing(): void {
    const t = this.s.tail;
    const tail = this.s.foes.find((f) => f.id === "boss.tail" && f.alive);
    if (!t || t.ringGiven || !tail || tail.hp > 12) return;
    t.ringGiven = true;
    this.body.hand.push({ uid: ++this.s.nextUid, id: "card.close_the_ring", coil: 0, up: false, held: 0, bound: false, guarded: false, temp: true, anchored: true, deckIndex: -1 });
    void this.emit("ring.offer", {});
  }

  bigActive(): boolean {
    return isBig(this.body) && !this.s.flags.swell && this.s.flags.bigImmuneTurns <= 0;
  }

  /** Wounds per hit as the intent will land (str, weaken, Big). */
  attackValue(f: FoeState, n: number): number {
    let v = Math.max(0, n + f.str - f.weak);
    if (this.n("moonPull")) v = Math.floor(v / 2);
    return v + (this.bigActive() ? tuning.body.bigExtraWounds + (this.has("bone.drowned_pearl") ? 1 : 0) : 0);
  }
  attackHits(f: FoeState, x: number): number {
    return this.has("bone.choir_bone") && x > 1 ? Math.max(1, x - f.weak) : x;
  }

  // ---------- card math ----------

  def(card: BodyCard): CardDef {
    const d = CARDS[card.id];
    if (!d) throw new Error(`Unknown card ${card.id}`);
    return d;
  }

  /** Might as this card would see it. `inHand`: the card hasn't left yet. */
  mightFor(def: CardDef, inHand: boolean): number {
    let m = might(this.body) - (inHand ? 1 : 0) - (inHand ? def.sac ?? 0 : 0);
    if (def.type === "strike" && this.has("bone.antler")) m += 1;
    return Math.max(0, m);
  }

  ctx(card: BodyCard, inHand: boolean, t?: FoeState): CardCtx {
    const def = this.def(card);
    return { m: this.mightFor(def, inHand), c: card.coil, u: card.up ? 1 : 0, e: this, t: t ?? this.target(), card };
  }

  values(def: CardDef, k: CardCtx): number[] {
    const v = def.n ? def.n(k) : [];
    if (v.length) {
      if (k.u && !def.ownUpgrade) v[0]! += 1;
      if (def.type === "guard" && this.has("bone.iron_scale")) v[0]! += 1;
      if (def.id === "card.lash" && this.has("bone.ember")) v[0]! += 1;
    }
    return v;
  }

  /** Live text for a card in hand (or a reward preview when `inHand` is false). */
  text(card: BodyCard, inHand = true): string {
    const def = this.def(card);
    const k = this.ctx(card, inHand);
    return def.t(this.values(def, k), k);
  }

  canPlay(card: BodyCard): boolean {
    if (this.s.over || this.busy) return false;
    if (card.bound || this.s.lockPlays) return false;
    const def = this.def(card);
    if ((def.sac ?? 0) + (this.n("slime") ? 1 : 0) > this.body.hand.length - 1) return false;
    if (this.n("calm") > 0) return false;
    if (def.tgt && !this.alive().length) return false;
    if (def.can && !def.can(this.ctx(card, true))) return false;
    return true;
  }

  // ---------- player actions ----------

  async play(uid: number, targetUid?: number): Promise<boolean> {
    const s = this.s;
    const b = this.body;
    const card = b.hand.find((c) => c.uid === uid);
    if (!card || !this.canPlay(card)) return false;
    const def = this.def(card);
    if (targetUid !== undefined) this.setTarget(targetUid);
    const t = def.tgt ? this.target() : undefined;
    this.busy = true;
    try {
      const coil = card.coil;
      takeFromHand(b, uid);
      card.coil = coil; // the card still knows its coil while it resolves
      await this.emit("card.play", { uid, id: def.id, coil });
      const sac = (def.sac ?? 0) + (this.n("slime") ? 1 : 0);
      this.setN("slime", 0);
      if (sac) {
        const picked = await this.pickCards({ kind: "sacrifice", prompt: "sacrifice", cards: [...b.hand], count: sac });
        for (const id of picked) this.wound(id);
      }
      if (def.id === "card.close_the_ring") {
        this.closeRing();
        return true;
      }
      if (def.type === "strike" && this.n("siren") > 0) {
        // The song turns the strike on yourself: a wound at the enemy turn.
        this.addN("siren", -1);
        this.addN("pending", 1);
        b.discard.push(card);
        card.coil = 0;
        s.playedThisTurn++;
        await this.emit("siren.turn", { uid });
        return true;
      }
      let times = 1;
      if (s.ritual > 0) {
        times++;
        s.ritual--;
      }
      if (this.has("bone.spiral_shell") && s.playedThisTurn === 0) times++;
      for (let i = 0; i < times && !s.over; i++) {
        this.cur = { def, firstHit: true };
        const k: CardCtx = { m: this.mightFor(def, false), c: coil, u: card.up ? 1 : 0, e: this, t: t?.alive ? t : def.tgt ? this.target() : undefined, card };
        await def.run(k, this.values(def, k));
        this.cur = null;
        if (def.type === "strike" && s.flags.taint && k.t?.alive) {
          k.t.poison += 3;
          s.flags.taint = false;
        }
      }
      if (this.n("steady")) this.setN("steady", 0);
      else card.coil = 0;
      s.coilSpent += coil;
      if (this.n("ozone") && def.id !== "storm.ozone") this.hitRandom(2);
      if (this.n("flow") > 0) {
        this.addN("flow", -1);
        this.draw(1);
      }
      s.playedThisTurn++;
      s.totalPlayed++;
      this.run.stats.cardsPlayed++;
      const shedIt = def.shed && !(this.has("bone.god_tooth") && def.type === "strike");
      if (card.temp || shedIt) {
        b.shed.push(card);
        if (shedIt && this.has("bone.ring_bone")) b.block += 1;
      } else {
        b.discard.push(card);
      }
      if (this.has("bone.whisker") && s.playedThisTurn === 1) this.draw(1);
      if (this.has("bone.drum") && s.totalPlayed % 3 === 0) this.hitAll(3, false);
      this.checkWin();
      if (s.endTurnRequested && !s.over) {
        s.endTurnRequested = false;
        this.busy = false;
        await this.endTurn();
      }
      return true;
    } finally {
      this.busy = false;
      this.cur = null;
    }
  }

  async endTurn(): Promise<void> {
    const s = this.s;
    const b = this.body;
    if (s.over || this.busy) return;
    this.busy = true;
    try {
      if (!b.hand.length && !s.flags.spared) {
        if (!this.cheatDeath(true)) return this.lose("spent");
      }
      const amount = 1 + this.n("coilBonus") + this.n("patientGod") + this.n("brood");
      this.setN("brood", 0);
      const maxed = coilHeld(b, amount);
      if (maxed.length) {
        await this.emit("card.coil.max", { uids: maxed.map((c) => c.uid) });
        if (this.has("bone.worm_coil")) b.nextDraw += maxed.length;
      }
      if (b.hand.length) await this.emit("card.coil", {});
      s.lockPlays = false;
      if (this.run.molt === "tide" && b.hand.length <= 3) b.nextDraw += 1;
      await this.enemyTurn();
    } finally {
      this.busy = false;
    }
  }

  // ---------- enemy turn ----------

  private async enemyTurn(): Promise<void> {
    const s = this.s;
    const b = this.body;
    const undertow = this.run.molt === "tide" && b.hand.length <= 3;
    let wounds = this.n("pending");
    this.setN("pending", 0);
    if (this.n("stillWater") && b.hand.length <= 2) b.block += 2;
    if (this.n("calmBlock")) b.block += 4;
    if (s.selfPoison > 0) {
      wounds++;
      s.selfPoison--;
      await this.emit("poison.self", {});
    }
    await this.emit("enemy.turn", {});
    for (const f of [...s.foes]) {
      if (!f.alive) continue;
      f.block = 0;
      f.thorns = 0;
      f.attackedLast = false;
      if (f.poison > 0) {
        const dmg = f.poison * (s.flags.venomHeart ? 2 : 1);
        f.hp -= dmg;
        await this.emit("enemy.poison", { uid: f.uid, n: dmg });
        if (!f.slowRot) f.poison--;
        if (f.hp <= 0) {
          this.kill(f, true);
          continue;
        }
      }
      if (f.skip > 0) {
        f.skip--;
        this.nextIntent(f);
        f.weak = Math.max(0, f.weak - 1);
        continue;
      }
      await this.emit("foe.act", { uid: f.uid });
      for (const a of f.intent) {
        if (!f.alive) break;
        wounds += await this.act(f, a);
      }
      f.weak = Math.max(0, f.weak - 1);
      f.mark = 0;
      f.coaxed = false;
      f.cancelEat = false;
      if (f.revealed > 0) f.revealed--;
      if (f.alive) this.nextIntent(f);
    }
    if (this.checkWin()) return;
    if (this.has("bone.tidepool") && b.hand.length <= 2 && wounds > 0) wounds--;
    if (wounds > 0 && !s.flags.eggshellUsed && this.has("bone.eggshell")) {
      s.flags.eggshellUsed = true;
      wounds--;
    }
    if (wounds > 0 && s.flags.secondSkin) wounds--;
    if (wounds > 0) {
      this.run.stats.woundsTaken += wounds;
      await this.emit("wound.incoming", { n: wounds });
      let woundable = b.hand.filter((c) => c.id !== "card.close_the_ring");
      if (this.n("lodestone") && woundable.length > 1) {
        const top = [...woundable].sort((x, y) => y.coil - x.coil)[0];
        woundable = woundable.filter((c) => c !== top);
      }
      if (wounds >= woundable.length) {
        if (s.flags.spared) wounds = woundable.length;
        else if (undertow) wounds = Math.max(0, woundable.length - 1);
        else if (this.cheatDeath(false)) wounds = Math.max(0, woundable.length - 1);
        else {
          for (const c of [...woundable]) this.wound(c.uid);
          return this.lose("torn");
        }
      }
      if (wounds > 0) {
        const picked = await this.pickCards({ kind: "wound", prompt: "wound", cards: woundable, count: wounds });
        for (const id of picked) {
          this.wound(id);
          await this.emit("wound.take", { uid: id });
        }
      }
    }
    await this.startTurn();
  }

  /** Bones that refuse a death. Returns true if one fired. */
  private cheatDeath(emptyHand: boolean): boolean {
    const run = this.run;
    if (this.has("bone.ring_of_ash") && !run.ringOfAshUsed) {
      run.ringOfAshUsed = true;
      if (emptyHand) this.draw(1, true);
      void this.emit("bone.trigger", { id: "bone.ring_of_ash" });
      return this.body.hand.length > 0 || !emptyHand;
    }
    if (this.has("bone.wishbone") && run.wishboneAct !== run.act) {
      run.wishboneAct = run.act;
      if (emptyHand) this.draw(1, true);
      void this.emit("bone.trigger", { id: "bone.wishbone" });
      return this.body.hand.length > 0 || !emptyHand;
    }
    return false;
  }

  private async act(f: FoeState, a: Act): Promise<number> {
    const s = this.s;
    const b = this.body;
    const def = FOES[f.id]!;
    switch (a.k) {
      case "atk": {
        const hits = this.attackHits(f, a.x ?? 1);
        let wounds = 0;
        if (f.coaxed || f.blind) {
          const others = this.alive().filter((o) => o.uid !== f.uid);
          let victim: FoeState | null = null;
          if (f.coaxed) victim = others[0] ?? null;
          else {
            const roll = Math.floor(this.rng.next() * (others.length + 1));
            victim = roll < others.length ? others[roll]! : null;
          }
          f.blind = false;
          if (f.coaxed || victim) {
            if (victim) for (let h = 0; h < hits; h++) this.damageFoe(victim, Math.max(0, a.n + f.str - f.weak) * 2, false);
            await this.emit("foe.misdirect", { uid: f.uid });
            return 0;
          }
        }
        for (let h = 0; h < hits; h++) {
          const w = this.attackValue(f, a.n);
          const { landed, blocked } = absorb(b, w);
          if (blocked) {
            await this.emit("block.absorb", { n: blocked });
            if (s.flags.mirror) this.damageFoe(f, blocked * 3, false);
            if (this.has("bone.sponge")) this.run.glint += blocked;
          }
          if (landed > 0) {
            const thorns = s.flags.thorns + (this.has("bone.thorn") ? 1 : 0);
            if (thorns) this.damageFoe(f, thorns, false);
            if (s.flags.bileWall && f.alive) f.poison += 2;
          }
          wounds += landed;
          f.attackedLast = true;
          await this.emit("enemy.attack", { uid: f.uid, n: w, landed });
          if (!f.alive) break;
        }
        return wounds;
      }
      case "eat": {
        const eats = (a.x ?? 1) + tuning.pressure.eatBonus + (asc(this.run.ascension, 6) && this.run.act >= 2 ? 1 : 0);
        for (let i = 0; i < eats; i++) await this.eat(f);
        return 0;
      }
      case "bind": {
        const binds = (a.x ?? 1) + tuning.pressure.bindBonus + (asc(this.run.ascension, 12) ? 1 : 0);
        for (let i = 0; i < binds; i++) {
          if (f.cancelEat) break;
          if (this.useDecoy()) continue;
          let pool = b.hand.filter((c) => !c.bound && !c.guarded);
          if (this.has("bone.root_knot") && pool.length > 1) {
            const top = eatTarget(b);
            pool = pool.filter((c) => c !== top);
          }
          if (!pool.length) break;
          const c = pool[Math.floor(this.rng.next() * pool.length)]!;
          c.bound = true;
          await this.emit("card.bind", { uid: c.uid, foe: f.uid });
        }
        return 0;
      }
      case "poison":
        s.selfPoison += a.n;
        await this.emit("poison.on", { n: a.n });
        return 0;
      case "block":
        if (!(f.phase === 2 && def.phase2?.noBlock)) f.block += a.n;
        await this.emit("foe.block", { uid: f.uid, n: a.n });
        return 0;
      case "buff":
        for (const o of a.all ? this.alive() : [f]) o.str += a.n;
        await this.emit("foe.buff", { uid: f.uid });
        return 0;
      case "summon": {
        for (let i = 0; i < a.x && this.alive().length < MAX_FOES; i++) {
          const nf = newFoe(s, a.id, this.rng);
          this.nextIntent(nf);
          s.foes.push(nf);
          await this.emit("foe.summon", { uid: nf.uid });
        }
        return 0;
      }
      case "heal": {
        const allies = this.alive().filter((o) => o.hp < o.max);
        const tgt = allies.sort((x, y) => x.hp / x.max - y.hp / y.max)[0];
        if (tgt) tgt.hp = Math.min(tgt.max, tgt.hp + a.n);
        await this.emit("foe.heal", { uid: tgt?.uid ?? f.uid });
        return 0;
      }
      case "daze":
        b.nextDraw -= 1;
        await this.emit("daze", {});
        return 0;
      case "rest":
        return 0;
      case "thorns":
        f.thorns = 1;
        await this.emit("foe.buff", { uid: f.uid });
        return 0;
      case "siren":
        this.setN("siren", 1);
        await this.emit("siren", { uid: f.uid });
        return 0;
      case "slime":
        this.setN("slime", 1);
        await this.emit("slime", { uid: f.uid });
        return 0;
      case "swallow": {
        const pile = b.draw.length ? b.draw : b.discard;
        if (pile.length) {
          const [c] = pile.splice(Math.floor(this.rng.next() * pile.length), 1);
          b.shed.push(c!);
          await this.emit("swallow.card", { id: c!.id, foe: f.uid });
        }
        return 0;
      }
    }
  }

  private useDecoy(): boolean {
    const s = this.s;
    if (s.decoyUid === null) return false;
    const i = this.body.discard.findIndex((c) => c.uid === s.decoyUid);
    s.decoyUid = null;
    if (i < 0) return false;
    const [c] = this.body.discard.splice(i, 1);
    this.body.hand.push(c!);
    void this.emit("decoy", { uid: c!.uid });
    return true;
  }

  private async eat(f: FoeState): Promise<void> {
    const s = this.s;
    if (f.cancelEat || s.flags.noEat) return;
    if (this.has("bone.mirror_bone") && !s.flags.mirrorBoneUsed) {
      s.flags.mirrorBoneUsed = true;
      await this.emit("bone.trigger", { id: "bone.mirror_bone" });
      return;
    }
    if (this.useDecoy()) return;
    const c = eatTarget(this.body);
    if (!c) return;
    takeFromHand(this.body, c.uid);
    this.body.discard.push(c);
    await this.emit("intent.eat", { uid: c.uid, id: c.id, foe: f.uid });
  }

  private async startTurn(): Promise<void> {
    const s = this.s;
    const b = this.body;
    s.turn++;
    this.run.stats.turns++;
    startTurnReset(b);
    s.flags.swell = false;
    s.flags.thorns = 0;
    s.flags.mirror = false;
    s.flags.noEat = false;
    s.flags.spared = false;
    s.flags.bileWall = false;
    if (s.flags.bigImmuneTurns > 0) s.flags.bigImmuneTurns--;
    s.playedThisTurn = 0;
    s.lockPlays = false;
    s.lastWounded = null;
    for (const k of ["discarded", "drawn", "flow", "foam", "ozone", "moonPull", "lodestone", "calmWater"]) this.setN(k, 0);
    if (this.n("calm") > 0) {
      this.addN("calm", -1);
      if (!this.n("calm")) this.setN("calmBlock", 0);
    }
    if (this.has("bone.queen_carapace")) b.block += 3;
    if (s.flags.creeping) for (const f of this.alive()) f.poison += 1;
    const n = turnDrawCount(b) + this.n("bottomless");
    b.nextDraw = 0;
    const drawn = drawCards(b, n, this.rng);
    await this.emit("turn.start", { turn: s.turn, drawn: drawn.length });
  }

  // ---------- shared effects (cards call these) ----------

  /** Damage from a card or bone. Strike bonuses apply while a strike resolves. */
  hit(t: FoeState | undefined, n: number): { dealt: number; killed: boolean } {
    if (!t || !t.alive) return { dealt: 0, killed: false };
    let dmg = n;
    const cur = this.cur;
    const strike = cur?.def.type === "strike";
    if (strike) {
      if (cur!.firstHit && !this.s.flags.firstStrikeDone && this.has("bone.knuckle")) {
        dmg += 3;
        this.s.flags.firstStrikeDone = true;
      }
      if (this.has("bone.fang_tip") && t.hp === t.max) dmg += 2;
      if (this.n("thinQuick") && this.body.hand.length <= 3) dmg += 3;
      if (t.thorns && cur!.firstHit) this.addN("pending", 1);
      cur!.firstHit = false;
    }
    dmg += t.mark;
    return this.damageFoe(t, dmg, strike && this.has("bone.serpent_eye"));
  }

  damageFoe(t: FoeState, n: number, pierce: boolean): { dealt: number; killed: boolean } {
    if (!t.alive || n <= 0) return { dealt: 0, killed: false };
    let dmg = n;
    if (!pierce && t.block > 0) {
      const soaked = Math.min(t.block, dmg);
      t.block -= soaked;
      dmg -= soaked;
    }
    t.hp -= dmg;
    void this.emit("enemy.hit", { uid: t.uid, n: dmg });
    if (t.id === "boss.tail" && t.hp > 0) this.offerRing();
    if (t.hp <= 0) {
      this.kill(t, false);
      return { dealt: dmg, killed: true };
    }
    return { dealt: dmg, killed: false };
  }

  hitAll(n: number, asCard = true): void {
    for (const f of this.alive()) {
      if (asCard) this.hit(f, n);
      else this.damageFoe(f, n, false);
    }
  }

  hitRandom(n: number): void {
    const a = this.alive();
    if (a.length) this.hit(a[Math.floor(this.rng.next() * a.length)], n);
  }

  /** Multi-hit count for player cards (Tooth Chain adds a hit). */
  hits(n: number): number {
    return n + (this.has("bone.tooth_chain") ? 1 : 0);
  }

  gainBlock(n: number): void {
    if (n <= 0) return;
    this.body.block += n;
    void this.emit("block.gain", { n });
  }

  draw(n: number, ignoreMax = false): BodyCard[] {
    const b = this.body;
    if (ignoreMax) {
      const saved = b.maxHand;
      b.maxHand = Math.max(b.maxHand, b.hand.length + n);
      const drawn = drawCards(b, n, this.rng);
      b.maxHand = saved;
      return drawn;
    }
    const drawn = drawCards(b, n, this.rng);
    this.addN("drawn", drawn.length);
    if (drawn.length && this.n("foam")) {
      this.setN("foam", 0);
      addCoil(b, drawn[0]!, 1);
    }
    if (drawn.length) void this.emit("card.draw", { n: drawn.length });
    return drawn;
  }

  poison(t: FoeState | undefined, n: number): void {
    if (!t || !t.alive || n <= 0) return;
    t.poison += n;
    void this.emit("enemy.poisoned", { uid: t.uid, n });
  }

  weaken(t: FoeState | undefined, n: number): void {
    if (!t || !t.alive || n <= 0) return;
    t.weak += n;
    void this.emit("enemy.weaken", { uid: t.uid, n });
  }

  coil(card: BodyCard, n: number): void {
    if (addCoil(this.body, card, n)) void this.emit("card.coil.max", { uids: [card.uid] });
    else void this.emit("card.coil", { uids: [card.uid] });
  }

  /** A wound or sacrifice takes this card from the hand. */
  wound(uid: number): void {
    const c = woundCard(this.body, uid, this.has("bone.amber") || this.n("calmWater") > 0);
    if (c) {
      this.s.lastWounded = c.uid;
      this.addN("discarded");
    }
  }

  /** A card the player chooses to discard (not a wound). */
  discard(uid: number): void {
    const i = this.body.hand.findIndex((c) => c.uid === uid);
    if (i < 0) return;
    const [c] = this.body.hand.splice(i, 1);
    c!.coil = 0;
    c!.bound = false;
    this.body.discard.push(c!);
    this.addN("discarded");
  }

  async pickCards(req: PickRequest): Promise<number[]> {
    if (!req.cards.length || req.count <= 0) return [];
    const count = Math.min(req.count, req.cards.length);
    if (!req.optional && count >= req.cards.length && req.kind !== "choose") return req.cards.map((c) => c.uid);
    const picked = await this.agent.pick({ ...req, count });
    const valid = new Set(req.cards.map((c) => c.uid));
    const out = [...new Set(picked)].filter((u) => valid.has(u)).slice(0, count);
    if (!req.optional) {
      for (const c of req.cards) {
        if (out.length >= count) break;
        if (!out.includes(c.uid)) out.push(c.uid);
      }
    }
    return out;
  }

  /** Choose one card from a list (hand, discard or a look). */
  async chooseOne(cards: BodyCard[], prompt = "choose"): Promise<BodyCard | undefined> {
    const [uid] = await this.pickCards({ kind: "choose", prompt, cards, count: 1 });
    return cards.find((c) => c.uid === uid);
  }

  requestEndTurn(): void {
    this.s.endTurnRequested = true;
  }

  devourNow(huskId: string): void {
    const run = this.run;
    const per = tuning.devour.maxHandPerDevour + (this.s.flags.leviathan ? 1 : 0);
    run.deck.push({ id: huskId, up: false });
    run.maxHand += per;
    this.body.maxHand += per;
    run.lastDevoured = huskId;
    run.stats.devoured.push(huskId);
    this.s.devouredThisFight++;
    if (this.has("bone.lamprey") && run.scars > 0) run.scars--;
    void this.emit("husk.devour", { id: huskId });
  }

  kill(f: FoeState, byPoison: boolean): void {
    if (!f.alive) return;
    const s = this.s;
    const def = FOES[f.id]!;
    f.alive = false;
    f.hp = 0;
    this.run.stats.kills++;
    const poisoned = byPoison || f.poison > 0;
    if (byPoison) s.poisonKills++;
    const twin = poisoned && this.run.molt === "venom" && tuning.devour.venomTwin;
    s.husks.push({ id: def.husk, from: f.id, twin });
    if (!byPoison && this.has("bone.claw")) this.run.glint += 5;
    if (s.huntMarks.includes(f.uid)) this.devourNow(def.husk);
    if (def.onDeath === "wasp") for (const o of this.alive()) o.str += 2;
    if (def.onDeath === "choir") for (const o of this.alive()) o.str += 3;
    if (def.onDeath === "split") {
      for (let i = 0; i < 2 && this.alive().length < MAX_FOES; i++) {
        const nf = newFoe(s, "foe.mold_mite", this.rng);
        this.nextIntent(nf);
        s.foes.push(nf);
      }
    }
    if (f.id === "boss.tail") s.ending = "devour";
    if ((s.flags.pestilence || this.has("bone.spore_heart")) && f.poison > 0) for (const o of this.alive()) o.poison += f.poison;
    void this.emit("enemy.die", { uid: f.uid, poison: byPoison });
    if (s.targetUid === f.uid) s.targetUid = this.alive()[0]?.uid ?? 0;
  }

  checkWin(): boolean {
    if (this.s.over) return this.s.over === "won";
    if (this.alive().length === 0) {
      this.s.over = "won";
      void this.emit("fight.win", {});
      return true;
    }
    return false;
  }

  lose(reason: string): void {
    this.s.over = "lost";
    this.s.lostReason = reason;
    void this.emit("run.death", { reason });
  }
}

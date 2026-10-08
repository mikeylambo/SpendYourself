/**
 * BodyDeck: pure, renderer-free rules for a deck whose hand is a body.
 *
 * Piles (draw, hand, discard, shed), might, wounds, block, coil, Big and Heavy.
 * State is plain JSON so a fight can be saved and resumed; every function here is
 * deterministic given the RNG. Written to be lifted into the SLU Shell as a module
 * and to port line-for-line to C# or GDScript.
 */

export interface Rng {
  next(): number;
}

export interface BodyCard {
  uid: number;
  id: string;
  coil: number;
  /** Upgraded ("coiled") at a rest: starts each fight at coil 1. */
  up: boolean;
  /** Turns spent in hand (for Long Wait and similar). */
  held: number;
  /** Locked by an enemy Bind: unplayable this turn, still counts for might and coils. */
  bound: boolean;
  /** Protected from eat (and bind) this turn. */
  guarded: boolean;
  /** Created this fight only (Reflection copies); never returns to the run deck. */
  temp?: boolean;
  /** Index into the run deck this instance came from. */
  deckIndex: number;
}

export interface BodyState {
  draw: BodyCard[];
  hand: BodyCard[];
  discard: BodyCard[];
  shed: BodyCard[];
  /** Max hand for this fight (run max hand − scars + fight bonuses). */
  maxHand: number;
  block: number;
  keepBlock: boolean;
  coilCap: number;
  bigAt: number;
  heavyAt: number;
  drawPerTurn: number;
  /** Extra cards drawn at the start of the next turn only. */
  nextDraw: number;
  /** Bonus to might (bones). */
  mightBonus: number;
  /** True Size: might reads max hand instead of hand size. */
  trueSize: boolean;
  /** Cards that left the hand to wounds or sacrifice this turn (for Recall). */
  woundedThisTurn: number[];
}

export function createBody(opts: {
  maxHand: number;
  coilCap: number;
  bigAt: number;
  heavyAt: number;
  drawPerTurn: number;
}): BodyState {
  return {
    draw: [],
    hand: [],
    discard: [],
    shed: [],
    maxHand: opts.maxHand,
    block: 0,
    keepBlock: false,
    coilCap: opts.coilCap,
    bigAt: opts.bigAt,
    heavyAt: opts.heavyAt,
    drawPerTurn: opts.drawPerTurn,
    nextDraw: 0,
    mightBonus: 0,
    trueSize: false,
    woundedThisTurn: [],
  };
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** Might: cards in hand (read after the played card has left). */
export function might(b: BodyState): number {
  return (b.trueSize ? b.maxHand : b.hand.length) + b.mightBonus;
}

export const isBig = (b: BodyState): boolean => b.hand.length >= b.bigAt;
export const isHeavy = (b: BodyState): boolean => b.maxHand >= b.heavyAt;

/** Draw up to n cards, never past max hand. Reshuffles the discard pile when the draw pile runs out. */
export function drawCards(b: BodyState, n: number, rng: Rng): BodyCard[] {
  const drawn: BodyCard[] = [];
  for (let i = 0; i < n; i++) {
    if (b.hand.length >= b.maxHand) break;
    if (!b.draw.length) {
      if (!b.discard.length) break;
      b.draw = shuffle(b.discard, rng);
      b.discard = [];
    }
    const card = b.draw.pop()!;
    card.held = 0;
    b.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

/** Cards drawn at the start of a turn: 3, −1 while Heavy, plus one-turn bonuses. */
export function turnDrawCount(b: BodyState): number {
  return Math.max(0, b.drawPerTurn - (isHeavy(b) ? 1 : 0) + b.nextDraw);
}

export function findInHand(b: BodyState, uid: number): BodyCard | undefined {
  return b.hand.find((c) => c.uid === uid);
}

/** Remove a card from the hand. Coil resets unless `keepCoil`. */
export function takeFromHand(b: BodyState, uid: number, keepCoil = false): BodyCard | undefined {
  const i = b.hand.findIndex((c) => c.uid === uid);
  if (i < 0) return undefined;
  const [card] = b.hand.splice(i, 1);
  if (!keepCoil) card!.coil = 0;
  card!.bound = false;
  card!.guarded = false;
  return card;
}

export function discardFromHand(b: BodyState, uid: number, keepCoil = false): BodyCard | undefined {
  const card = takeFromHand(b, uid, keepCoil);
  if (card) b.discard.push(card);
  return card;
}

/** A wound (or sacrifice) takes this card. */
export function woundCard(b: BodyState, uid: number, keepCoil = false): BodyCard | undefined {
  const card = discardFromHand(b, uid, keepCoil);
  if (card) b.woundedThisTurn.push(card.uid);
  return card;
}

export function shedFromHand(b: BodyState, uid: number): BodyCard | undefined {
  const card = takeFromHand(b, uid);
  if (card) b.shed.push(card);
  return card;
}

export function addCoil(b: BodyState, card: BodyCard, n: number): boolean {
  const before = card.coil;
  card.coil = Math.max(0, Math.min(b.coilCap, card.coil + n));
  return card.coil === b.coilCap && before < b.coilCap;
}

/** End of your turn: every held card coils by 1 (or more). Returns cards that just reached max coil. */
export function coilHeld(b: BodyState, amount = 1): BodyCard[] {
  const maxed: BodyCard[] = [];
  for (const card of b.hand) {
    card.bound = false;
    card.held++;
    if (addCoil(b, card, amount)) maxed.push(card);
  }
  return maxed;
}

/** The card an eat takes: highest coil, ties go to the leftmost. Guarded cards are skipped. */
export function eatTarget(b: BodyState): BodyCard | undefined {
  let best: BodyCard | undefined;
  for (const card of b.hand) {
    if (card.guarded) continue;
    if (!best || card.coil > best.coil) best = card;
  }
  return best;
}

/** Block soaks wounds first; returns the wounds that land. */
export function absorb(b: BodyState, wounds: number): { landed: number; blocked: number } {
  const blocked = Math.min(b.block, wounds);
  b.block -= blocked;
  return { landed: wounds - blocked, blocked };
}

export function startTurnReset(b: BodyState): void {
  if (!b.keepBlock) b.block = 0;
  b.keepBlock = false;
  b.woundedThisTurn = [];
  // Binds land during the enemy turn and last through this turn; they clear in coilHeld.
  for (const card of b.hand) card.guarded = false;
}

/** Scars left by ending a fight thin: one per card short of the floor. */
export function scarsFor(handSize: number, floor: number): number {
  return Math.max(0, floor - handSize);
}

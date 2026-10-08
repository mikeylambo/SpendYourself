import type { BodyCard, BodyState } from "../bodydeck/BodyDeck.ts";

export type CardType = "strike" | "guard" | "body" | "rite";
export type Rarity = "C" | "U" | "R" | "X";
export type MoltId = "venom" | "tide" | "storm";
export type FoeTier = "normal" | "elite" | "boss";

/** One enemy action. An intent is one or more actions taken together. */
export type Act =
  | { k: "atk"; n: number; x?: number }
  | { k: "eat"; x?: number }
  | { k: "bind"; x?: number }
  | { k: "poison"; n: number }
  | { k: "block"; n: number }
  | { k: "buff"; n: number; all?: boolean }
  | { k: "summon"; id: string; x: number }
  | { k: "heal"; n: number }
  | { k: "daze" }
  | { k: "rest" };
export type Intent = Act[];

export interface FoeDef {
  id: string;
  name: string;
  hp: number;
  act: number;
  tier: FoeTier;
  husk: string;
  pattern: Intent[];
  /** Below this fraction of health, switch to phase 2 (bosses). */
  phase2?: { at: number; pattern: Intent[]; noBlock?: boolean };
  /** First pattern step is chosen at random per instance so groups don't act in lockstep. */
  stagger?: boolean;
  onDeath?: "wasp";
}

export interface FoeState {
  uid: number;
  id: string;
  hp: number;
  max: number;
  block: number;
  str: number;
  weak: number;
  poison: number;
  slowRot: boolean;
  step: number;
  phase: 1 | 2;
  intent: Intent;
  mark: number;
  skip: number;
  revealed: number;
  attackedLast: boolean;
  coaxed: boolean;
  blind: boolean;
  cancelEat: boolean;
  alive: boolean;
}

export interface Husk {
  id: string;
  from: string;
  twin: boolean;
}

export interface CombatFlags {
  secondSkin: boolean;
  venomHeart: boolean;
  creeping: boolean;
  pestilence: boolean;
  leviathan: boolean;
  swell: boolean;
  taint: boolean;
  thorns: number;
  mirror: boolean;
  noEat: boolean;
  spared: boolean;
  devourRite: boolean;
  firstStrikeDone: boolean;
  eggshellUsed: boolean;
  mirrorBoneUsed: boolean;
  bileWall: boolean;
  bigImmuneTurns: number;
  selfPoisonFights: number;
}

export interface CombatState {
  v: 1;
  kind: FoeTier;
  encounter: string[];
  body: BodyState;
  foes: FoeState[];
  turn: number;
  targetUid: number;
  husks: Husk[];
  playedThisTurn: number;
  totalPlayed: number;
  lockPlays: boolean;
  ritual: number;
  selfPoison: number;
  decoyUid: number | null;
  huntMarks: number[];
  extraDevours: number;
  devouredThisFight: number;
  poisonKills: number;
  coilSpent: number;
  flags: CombatFlags;
  nextUid: number;
  over: null | "won" | "lost";
  lostReason: string;
  endTurnRequested: boolean;
  /** Cards that left the hand this turn to wounds; Sea Glass reads the last one. */
  lastWounded: number | null;
}

export interface DeckCard {
  id: string;
  up: boolean;
  uses?: number;
}

export interface PickRequest {
  kind: "wound" | "sacrifice" | "choose";
  /** Semantic prompt key (UI maps it to copy). */
  prompt: string;
  cards: BodyCard[];
  count: number;
  /** Fewer may be chosen (an optional pick). */
  optional?: boolean;
}

/** Decision-maker: the human player through the UI, or a bot in the sim. */
export interface Agent {
  pick(req: PickRequest): Promise<number[]>;
}

/** Semantic presentation events; the UI animates them, the sim ignores them. */
export interface GameEvent {
  type: string;
  [key: string]: unknown;
}

export interface Presenter {
  emit(ev: GameEvent): void | Promise<void>;
}

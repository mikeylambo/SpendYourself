import type { CombatState, DeckCard, Husk, MoltId } from "./types.ts";
import type { StreamName } from "./rng.ts";

export type NodeKind = "fight" | "elite" | "rest" | "event" | "shop" | "treasure" | "boss" | "finale";

export interface MapNode {
  row: number;
  col: number;
  kind: NodeKind;
  next: number[]; // columns in the following row
}

export interface ActMap {
  act: number;
  rows: MapNode[][];
}

export interface ShopStock {
  cards: Array<{ id: string; price: number; sold: boolean }>;
  bones: Array<{ id: string; price: number; sold: boolean }>;
  mendUsed: boolean;
  shedUsed: boolean;
}

export type Screen =
  | { kind: "map" }
  | { kind: "combat"; combat: CombatState; node: NodeKind }
  | { kind: "reward"; husks: Husk[]; devours: number; glint: number; bone: string | null; rare: boolean; node: NodeKind; boneOptions?: string[] }
  | { kind: "event"; id: string }
  | { kind: "shop"; stock: ShopStock }
  | { kind: "rest"; done: boolean }
  | { kind: "treasure"; bone: string; taken: boolean }
  | { kind: "actEnd" }
  | { kind: "over"; win: boolean; reason: string; ending?: "devour" | "give" };

export interface RunStats {
  fights: number;
  elites: number;
  kills: number;
  turns: number;
  cardsPlayed: number;
  woundsTaken: number;
  maxHandPeak: number;
  /** Fights won before the enemy acted at all (a snowball signal). */
  quickWins?: number;
  /** Each won fight as [act, tier, turns taken, encounter] (sim pacing reports, run summary). */
  fightTurns?: Array<[number, string, number, string?]>;
  devoured: string[];
  diedTo: string | null;
}

export interface RunState {
  v: 1;
  seed: string;
  molt: MoltId;
  ascension: number;
  act: number;
  deck: DeckCard[];
  maxHand: number;
  scars: number;
  glint: number;
  bones: string[];
  lastDevoured: string | null;
  /** Block granted at the start of every fight (Devour Rite husks). */
  startBlock: number;
  /** One-fight bonuses granted by rests, events and bones. */
  nextFight: { block: number; draw: number; selfPoisonFights: number; poisonOnYou: number };
  shedCount: number;
  map: ActMap;
  row: number;
  col: number;
  rng: Record<StreamName, number>;
  stats: RunStats;
  onboarding: boolean;
  fightIndex: number;
  wishboneAct: number;
  ringOfAshUsed: boolean;
  egg: number;
  actHuskBonus: number;
  /** Husk Box: a husk saved for a later devour, and the act it was boxed in. */
  huskBox?: { id: string; act: number } | null;
  huskBoxAct?: number;
  /** Event effects that last an act or a few fights. */
  choirAct?: number;
  shellAct?: number;
  lanternFights?: number;
  parasite?: boolean;
  screen: Screen;
  startedAt: number;
  /** Daily Descent date (YYYY-MM-DD) when this is the daily run. */
  daily?: string;
}

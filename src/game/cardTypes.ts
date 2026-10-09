import type { BodyCard } from "../bodydeck/BodyDeck.ts";
import type { CardType, FoeState, MoltId, Rarity } from "./types.ts";
import type { Combat } from "./combat.ts";

export interface CardCtx {
  /** Might when the card resolves (the card has already left the hand). */
  m: number;
  /** This card's coil. */
  c: number;
  /** 1 if upgraded. */
  u: number;
  e: Combat;
  t: FoeState | undefined;
  card: BodyCard;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  rarity: Rarity;
  molt?: MoltId;
  /** Needs a target enemy. */
  tgt?: boolean;
  /** Removed for the rest of the fight after it resolves. */
  shed?: boolean;
  /** Extra cost: discard this many cards of your choice before it resolves. */
  sac?: number;
  /** Designer notation (shown in the inspect breakdown). */
  f: string;
  /** Live numbers; the first gains +1 when upgraded unless `ownUpgrade`. */
  n?: (k: CardCtx) => number[];
  ownUpgrade?: boolean;
  /** Player-facing text with live numbers. */
  t: (v: number[], k: CardCtx) => string;
  run: (k: CardCtx, v: number[]) => void | Promise<void>;
  can?: (k: CardCtx) => boolean;
  /** Why `can` fails, shown when you tap the card. */
  why?: string;
  /** Never offered as a reward or sold. */
  special?: boolean;
}

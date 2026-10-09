import type { BodyCard } from "../bodydeck/BodyDeck.ts";
import { CARDS } from "../data/cards.ts";
import { Combat, createCombat } from "../game/combat.ts";
import type { CardCtx, CardDef } from "../game/cardTypes.ts";
import type { RunState } from "../game/state.ts";
import type { Agent, Presenter } from "../game/types.ts";
import { cardArt, icon } from "./art.ts";

const ACCENT: Record<string, string> = { venom: "#8fa63a", tide: "#2f7d86", storm: "#7a5cc4" };
const TYPE_LABEL: Record<string, string> = { strike: "Strike", guard: "Guard", body: "Body", rite: "Rite" };

const noAgent: Agent = { pick: async () => [] };
const silent: Presenter = { emit: () => {} };

/** A stand-in fight used to show live numbers outside combat: a full hand, no enemies. */
export function previewCombat(run: RunState): Combat {
  const s = createCombat(run, [], "normal", { next: () => 0.5 });
  const fill = Math.max(1, run.maxHand - run.scars - 1);
  s.body.hand = Array.from({ length: fill }, (_, i) => ({ uid: -1 - i, id: "card.scale", coil: 0, up: false, held: 0, bound: false, guarded: false, deckIndex: -1 }));
  return new Combat(s, run, { next: () => 0.5 }, noAgent, silent);
}

function numberTokens(s: string): string[] {
  return s.match(/\d+/g) ?? [];
}

/** Text with numbers set bold, and the ones raised by coil set in gold. */
function richText(def: CardDef, k: CardCtx, e: Combat): { html: string; main: number | null; up: boolean } {
  const v = e.values(def, k);
  const text = def.t(v, k);
  const k0 = { ...k, c: 0 };
  const v0 = e.values(def, k0);
  const fresh = numberTokens(def.t(v0, k0));
  let i = 0;
  const html = escapeHtml(text).replace(/\d+/g, (n) => {
    const up = k.c > 0 && fresh[i] !== undefined && Number(n) > Number(fresh[i]);
    i++;
    return `<span class="n${up ? " up" : ""}">${n}</span>`;
  });
  const main = v.length ? v[0]! : null;
  return { html, main, up: main !== null && v0.length > 0 && main > v0[0]! };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface CardViewOpts {
  compact?: boolean;
  /** The card is in hand (might excludes it). */
  inHand?: boolean;
  width?: string;
  extraClass?: string;
  attrs?: string;
}

export function cardHTML(card: BodyCard, e: Combat, opts: CardViewOpts = {}): string {
  const def = CARDS[card.id]!;
  const k = e.ctx(card, opts.inHand ?? false);
  const { html, main, up } = richText(def, k, e);
  const accent = def.molt ? ACCENT[def.molt]! : null;
  const cap = e.body.coilCap;
  const rings = Array.from({ length: Math.min(cap, 5) }, (_, i) => `<i class="${card.coil > i ? "on" : ""}"></i>`).join("");
  const max = card.coil >= cap && cap > 0;
  const cls = ["card", opts.compact ? "compact" : "", max ? "max" : "", card.temp ? "temp" : "", opts.extraClass ?? ""].filter(Boolean).join(" ");
  const style = opts.width ? ` style="--w:${opts.width}"` : "";
  const name = escapeHtml(def.name).split(" ").join("<br>");
  const longest = Math.max(...def.name.split(" ").map((w) => w.length));
  const len = longest >= 8 ? "l" : longest >= 6 ? "m" : "s";
  const bigN = main !== null ? `${main}` : icon(def.type);
  return `<button class="${cls}" data-type="${def.type}" data-molt="${def.molt ?? ""}" data-uid="${card.uid}" data-id="${def.id}"${style} ${opts.attrs ?? ""} aria-label="${escapeHtml(def.name)}: ${escapeHtml(def.t(e.values(def, k), k))}">
  <div class="art">${cardArt(def.id, def.type, accent)}</div>
  <div class="band"></div><div class="orn"></div>
  <div class="nm" data-len="${len}">${name}</div>
  ${card.up ? `<div class="up-mark">+</div>` : ""}
  <div class="ty">${icon(def.type)}${TYPE_LABEL[def.type]}</div>
  <div class="panel"><div class="tx">${html}</div><div class="rar" data-r="${def.rarity}"><i></i></div><div class="coil">${rings}</div></div>
  <div class="big-n${up ? " up" : ""}">${bigN}</div>
  ${card.bound ? `<div class="bound">${icon("knot", "", "currentColor", 2.4)}</div>` : ""}
</button>`;
}

/** A card outside any fight (reward, shop, deck): numbers at a full hand. */
export function staticCardHTML(id: string, up: boolean, e: Combat, opts: CardViewOpts = {}): string {
  const card: BodyCard = { uid: 0, id, coil: up ? 1 : 0, up, held: 0, bound: false, guarded: false, deckIndex: -1 };
  return cardHTML(card, e, opts);
}

/** Inspect breakdown: the formula and the inputs that produced the numbers. */
export function breakdownHTML(card: BodyCard, e: Combat, inHand: boolean): string {
  const def = CARDS[card.id]!;
  const k = e.ctx(card, inHand);
  const parts = [`<code>${escapeHtml(card.up && def.fu ? def.fu : def.f)}</code>`];
  parts.push(`might <b>${k.m}</b> · coil <b>${k.c}</b>${card.up ? " · upgraded" : ""}`);
  if (def.sac) parts.push(`Sacrifice: discard ${def.sac} of your choice first.`);
  if (def.shed) parts.push(`Shed: gone for the rest of the fight.`);
  return parts.map((p) => `<p>${p}</p>`).join("");
}

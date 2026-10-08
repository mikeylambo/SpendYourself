import type { CardCtx, CardDef } from "../game/cardTypes.ts";
import type { CardType, MoltId, Rarity } from "../game/types.ts";
import { shedFromHand } from "../bodydeck/BodyDeck.ts";

const h = (x: number) => Math.floor(x / 2);
const third = (x: number) => Math.floor(x / 3);
const quarter = (x: number) => Math.floor(x / 4);
const coiled = (k: CardCtx) => k.c >= 2;
const others = (k: CardCtx) => k.e.body.hand;
const poisonedFoes = (k: CardCtx) => k.e.alive().filter((f) => f.poison > 0).length;

type Spec = Omit<CardDef, "id" | "name" | "type" | "rarity" | "molt">;
const list: CardDef[] = [];
function C(id: string, name: string, type: CardType, rarity: Rarity, spec: Spec, molt?: MoltId): void {
  list.push({ id, name, type, rarity, ...(molt ? { molt } : {}), ...spec });
}
const V = (id: string, name: string, type: CardType, rarity: Rarity, spec: Spec) => C(id, name, type, rarity, spec, "venom");

// ================= Shared: strikes (22) =================
C("card.fang", "Fang", "strike", "C", {
  tgt: true, f: "Deal 2 + m/2 + 2c",
  n: (k) => [2 + h(k.m) + 2 * k.c], t: ([d]) => `Deal ${d}.`, run: (k, [d]) => void k.e.hit(k.t, d!),
});
C("card.lash", "Lash", "strike", "C", {
  f: "Deal 1 + m/3 + c to all enemies",
  n: (k) => [1 + third(k.m) + k.c], t: ([d]) => `Deal ${d} to all enemies.`, run: (k, [d]) => k.e.hitAll(d!),
});
C("card.double_bite", "Double Bite", "strike", "C", {
  tgt: true, f: "Deal 1 + m/3 twice; +1 per hit per coil",
  n: (k) => [1 + third(k.m) + k.c, k.e.hits(2)], t: ([d, x]) => `Deal ${d} ${x === 2 ? "twice" : `${x} times`}.`,
  run: (k, [d, x]) => { for (let i = 0; i < x!; i++) k.e.hit(k.t?.alive ? k.t : k.e.target(), d!); },
});
C("card.snap", "Snap", "strike", "C", {
  tgt: true, shed: true, f: "Deal 4 + c. Shed",
  n: (k) => [4 + k.c], t: ([d]) => `Deal ${d}. Shed.`, run: (k, [d]) => void k.e.hit(k.t, d!),
});
C("card.constrict", "Constrict", "strike", "C", {
  tgt: true, f: "Deal 2 + c; Weaken 1",
  n: (k) => [2 + k.c], t: ([d]) => `Deal ${d}. Weaken 1.`, run: (k, [d]) => { k.e.hit(k.t, d!); k.e.weaken(k.t, 1); },
});
C("card.tail_whip", "Tail Whip", "strike", "C", {
  f: "Deal 3 + c to a random enemy twice",
  n: (k) => [3 + k.c, k.e.hits(2)], t: ([d, x]) => `Deal ${d} to a random enemy ${x === 2 ? "twice" : `${x} times`}.`,
  run: (k, [d, x]) => { for (let i = 0; i < x!; i++) k.e.hitRandom(d!); },
});
C("card.gnash", "Gnash", "strike", "C", {
  tgt: true, f: "Deal 2 + m/2. If the target attacked last turn, deal it again",
  n: (k) => [2 + h(k.m) + k.c], t: ([d]) => `Deal ${d}. Again if it attacked last turn.`,
  run: (k, [d]) => { const again = k.t?.attackedLast; k.e.hit(k.t, d!); if (again) k.e.hit(k.t, d!); },
});
C("card.lunge", "Lunge", "strike", "C", {
  tgt: true, sac: 1, f: "Deal 5 + 2c. Sacrifice 1",
  n: (k) => [5 + 2 * k.c], t: ([d]) => `Sacrifice 1. Deal ${d}.`, run: (k, [d]) => void k.e.hit(k.t, d!),
});
C("card.rake", "Rake", "strike", "C", {
  tgt: true, f: "Deal 1 + c three times",
  n: (k) => [1 + k.c, k.e.hits(3)], t: ([d, x]) => `Deal ${d} ${x} times.`,
  run: (k, [d, x]) => { for (let i = 0; i < x!; i++) k.e.hit(k.t?.alive ? k.t : k.e.target(), d!); },
});
C("card.hiss_strike", "Hiss Strike", "strike", "C", {
  tgt: true, f: "Deal 3 + m/3; draw 1 if it kills",
  n: (k) => [3 + third(k.m) + k.c], t: ([d]) => `Deal ${d}. If it kills, draw 1.`,
  run: (k, [d]) => { if (k.e.hit(k.t, d!).killed) k.e.draw(1); },
});
C("card.gorge", "Gorge", "strike", "U", {
  tgt: true, f: "Deal m + 2c",
  n: (k) => [k.m + 2 * k.c], t: ([d]) => `Deal ${d}.`, run: (k, [d]) => void k.e.hit(k.t, d!),
});
C("card.crush", "Crush", "strike", "U", {
  tgt: true, shed: true, f: "Deal 3 + m/2 + 3c; Shed",
  n: (k) => [3 + h(k.m) + 3 * k.c], t: ([d]) => `Deal ${d}. Shed.`, run: (k, [d]) => void k.e.hit(k.t, d!),
});
C("card.thrash", "Thrash", "strike", "U", {
  f: "Deal 2 + c to all enemies twice",
  n: (k) => [2 + k.c, k.e.hits(2)], t: ([d, x]) => `Deal ${d} to all enemies ${x === 2 ? "twice" : `${x} times`}.`,
  run: (k, [d, x]) => { for (let i = 0; i < x!; i++) k.e.hitAll(d!); },
});
C("card.rend", "Rend", "strike", "U", {
  tgt: true, f: "Sacrifice 2 at random; deal 8 + 3c",
  n: (k) => [8 + 3 * k.c], t: ([d]) => `Lose 2 cards at random. Deal ${d}.`,
  can: (k) => k.e.body.hand.length >= 3,
  run: (k, [d]) => {
    for (let i = 0; i < 2 && k.e.body.hand.length; i++) {
      const c = k.e.body.hand[Math.floor(k.e.rng.next() * k.e.body.hand.length)]!;
      k.e.wound(c.uid);
    }
    k.e.hit(k.t, d!);
  },
});
C("card.spine_burst", "Spine Burst", "strike", "U", {
  shed: true, f: "Deal 1 per card in hand to all enemies (counts this card); Shed",
  n: (k) => [k.e.body.hand.length + 1 + k.c], ownUpgrade: true, t: ([d]) => `Deal ${d} to all enemies. Shed.`,
  run: (k, [d]) => k.e.hitAll(d! + k.u),
});
C("card.hunger_strike", "Hunger Strike", "strike", "U", {
  tgt: true, f: "Deal 3 + c per husk devoured this run, max 12",
  n: (k) => [Math.min(12, (3 + k.c) * Math.max(1, k.e.run.stats.devoured.length))],
  t: ([d]) => `Deal ${d}. Grows with every husk devoured.`, run: (k, [d]) => void k.e.hit(k.t, d!),
});
C("card.mouthful", "Mouthful", "strike", "U", {
  tgt: true, f: "Deal 4 + m/2; if it kills, devour that husk now (+1 max hand)",
  n: (k) => [4 + h(k.m) + k.c], t: ([d]) => `Deal ${d}. If it kills, devour it now.`,
  run: (k, [d]) => {
    const t = k.t;
    if (k.e.hit(t, d!).killed && t) {
      const husk = k.e.s.husks.pop();
      if (husk) k.e.devourNow(husk.id);
    }
  },
});
C("card.coil_strike", "Coil Strike", "strike", "U", {
  tgt: true, f: "Deal 3 + 4c",
  n: (k) => [3 + 4 * k.c], t: ([d]) => `Deal ${d}.`, run: (k, [d]) => void k.e.hit(k.t, d!),
});
C("card.swallow_whole", "Swallow Whole", "strike", "R", {
  tgt: true, shed: true, f: "If the target has health ≤ m × 2, kill it; otherwise deal m. Shed",
  n: (k) => [k.m * 2 + k.c * 2, k.m + k.c], t: ([x, d]) => `Kill a target at ${x} health or less. Otherwise deal ${d}. Shed.`,
  run: (k, [x, d]) => { if (k.t && k.t.hp <= x!) k.e.damageFoe(k.t, k.t.hp + k.t.block, true); else k.e.hit(k.t, d!); },
});
C("card.world_eater", "World Eater", "strike", "R", {
  sac: 3, f: "Deal 2 × m to all enemies. Sacrifice 3",
  n: (k) => [2 * k.m + 2 * k.c], t: ([d]) => `Sacrifice 3. Deal ${d} to all enemies.`, run: (k, [d]) => k.e.hitAll(d!),
});
C("card.last_scale", "Last Scale", "strike", "R", {
  tgt: true, f: "Playable only as your last card. Deal 20 + 5c; this card's wound can't kill you this turn",
  n: (k) => [20 + 5 * k.c], t: ([d]) => `Only as your last card. Deal ${d}. You can't die this turn.`,
  can: (k) => k.e.body.hand.length === 1,
  run: (k, [d]) => { k.e.s.flags.spared = true; k.e.hit(k.t, d!); },
});
C("card.circle_strike", "Circle Strike", "strike", "R", {
  f: "Deal 1 + c to all enemies once per card played this turn (counts this one)",
  n: (k) => [1 + k.c, k.e.s.playedThisTurn + 1], t: ([d, x]) => `Deal ${d} to all enemies ${x} time${x === 1 ? "" : "s"}.`,
  run: (k, [d, x]) => { for (let i = 0; i < x!; i++) k.e.hitAll(d!); },
});

// ================= Shared: guards (16) =================
C("card.scale", "Scale", "guard", "C", {
  f: "Block 2 + c", n: (k) => [2 + k.c], t: ([b]) => `Block ${b}.`, run: (k, [b]) => k.e.gainBlock(b!),
});
C("card.harden", "Harden", "guard", "C", {
  f: "Block 1 + m/4 + c", n: (k) => [1 + quarter(k.m) + k.c], t: ([b]) => `Block ${b}.`, run: (k, [b]) => k.e.gainBlock(b!),
});
C("card.curl", "Curl", "guard", "C", {
  f: "Block 3 + c; you can't play more cards this turn",
  n: (k) => [3 + k.c], t: ([b]) => `Block ${b}. Play nothing else this turn.`,
  run: (k, [b]) => { k.e.gainBlock(b!); k.e.s.lockPlays = true; },
});
C("card.slough", "Slough", "guard", "C", {
  f: "Block 2; draw 1", n: (k) => [2 + k.c], t: ([b]) => `Block ${b}. Draw 1.`, run: (k, [b]) => { k.e.gainBlock(b!); k.e.draw(1); },
});
C("card.bristle", "Bristle", "guard", "C", {
  f: "Block 1 + c; enemies that wound you this turn take 2",
  n: (k) => [1 + k.c], t: ([b]) => `Block ${b}. Enemies that wound you take 2.`,
  run: (k, [b]) => { k.e.gainBlock(b!); k.e.s.flags.thorns += 2; },
});
C("card.burrow", "Burrow", "guard", "C", {
  shed: true, f: "Block 4 + c. Shed", n: (k) => [4 + k.c], t: ([b]) => `Block ${b}. Shed.`, run: (k, [b]) => k.e.gainBlock(b!),
});
C("card.tuck", "Tuck", "guard", "C", {
  f: "Choose a card: it can't be eaten or bound this turn. Block 1",
  n: (k) => [1 + k.c], t: ([b]) => `Protect a card from eat and bind. Block ${b}.`,
  run: async (k, [b]) => { const c = await k.e.chooseOne(others(k), "protect"); if (c) c.guarded = true; k.e.gainBlock(b!); },
});
C("card.shell_scale", "Shell Scale", "guard", "U", {
  f: "Block equal to the number of enemies + c",
  n: (k) => [k.e.alive().length + k.c], t: ([b]) => `Block ${b} (one per enemy).`, run: (k, [b]) => k.e.gainBlock(b!),
});
C("card.ironhide", "Ironhide", "guard", "U", {
  f: "Block 2 + 2c; keep unused block into next turn",
  n: (k) => [2 + 2 * k.c], t: ([b]) => `Block ${b}. Unused block carries over.`,
  run: (k, [b]) => { k.e.gainBlock(b!); k.e.body.keepBlock = true; },
});
C("card.coiled_guard", "Coiled Guard", "guard", "U", {
  f: "Block 2 + c for each other card in hand at coil 2+",
  n: (k) => [(2 + k.c) * others(k).filter((c) => c.coil >= 2).length], t: ([b]) => `Block ${b} (2 + coil per card at coil 2+).`,
  run: (k, [b]) => k.e.gainBlock(b!),
});
C("card.skin_ward", "Skin Ward", "guard", "U", {
  f: "Block 3; Coiled: Block 6", n: (k) => [coiled(k) ? 6 : 3], t: ([b]) => `Block ${b}. Coiled: 6.`, run: (k, [b]) => k.e.gainBlock(b!),
});
C("card.mirror_scale", "Mirror Scale", "guard", "U", {
  f: "Block 2 + c; each wound blocked deals 3 to its sender",
  n: (k) => [2 + k.c], t: ([b]) => `Block ${b}. Each wound blocked deals 3 back.`,
  run: (k, [b]) => { k.e.gainBlock(b!); k.e.s.flags.mirror = true; },
});
C("card.deep_breath", "Deep Breath", "guard", "U", {
  f: "Block 2; next turn draw 2 more", n: (k) => [2 + k.c], t: ([b]) => `Block ${b}. Next turn draw 2 more.`,
  run: (k, [b]) => { k.e.gainBlock(b!); k.e.body.nextDraw += 2; },
});
C("card.stone_coil", "Stone Coil", "guard", "R", {
  f: "Block 5 + 2c; your cards can't be eaten this turn",
  n: (k) => [5 + 2 * k.c], t: ([b]) => `Block ${b}. Nothing can be eaten this turn.`,
  run: (k, [b]) => { k.e.gainBlock(b!); k.e.s.flags.noEat = true; },
});
C("card.molted_skin", "Molted Skin", "guard", "R", {
  sac: 2, shed: true, f: "Block all wounds this turn. Sacrifice 2. Shed",
  t: () => `Sacrifice 2. Block every wound this turn. Shed.`, run: (k) => k.e.gainBlock(99),
});
C("card.patient_ring", "Patient Ring", "guard", "R", {
  f: "Block 1 per card in hand (counts this card)",
  n: (k) => [k.e.body.hand.length + 1 + k.c], ownUpgrade: true, t: ([b]) => `Block ${b} (one per card in hand).`,
  run: (k, [b]) => k.e.gainBlock(b! + k.u),
});

// ================= Shared: body (19) =================
C("card.molt", "Molt", "body", "C", {
  f: "Draw 2 + c/2", n: (k) => [2 + h(k.c)], t: ([d]) => `Draw ${d}.`, run: (k, [d]) => void k.e.draw(d!),
});
C("card.taste", "Taste", "body", "C", {
  f: "Draw 1; if it's a strike, its coil +1", n: (k) => [1, 1 + k.c], ownUpgrade: true,
  t: ([, c]) => `Draw 1. If it's a strike, it coils +${c}.`,
  run: (k, [, c]) => { const [d] = k.e.draw(1); if (d && k.e.def(d).type === "strike") k.e.coil(d, c! + k.u); },
});
C("card.flex", "Flex", "body", "C", {
  shed: true, f: "Give another card in hand +1 coil. Shed", n: (k) => [1 + h(k.c)], t: ([c]) => `Another card coils +${c}. Shed.`,
  run: async (k, [c]) => { const t = await k.e.chooseOne(others(k), "coil"); if (t) k.e.coil(t, c!); },
});
C("card.regrow", "Regrow", "body", "C", {
  f: "Put a card from your discard pile into your hand", t: () => `Return a card from your discard pile to your hand.`,
  can: (k) => k.e.body.discard.length > 0,
  run: async (k) => {
    const b = k.e.body;
    const c = await k.e.chooseOne([...b.discard], "regrow");
    if (c && b.hand.length < b.maxHand) { b.discard.splice(b.discard.indexOf(c), 1); b.hand.push(c); if (k.u || k.c) k.e.coil(c, k.u + k.c); }
  },
});
C("card.shiver", "Shiver", "body", "C", {
  f: "Discard 1, draw 2", n: (k) => [2 + h(k.c)], t: ([d]) => `Discard 1, then draw ${d}.`,
  run: async (k, [d]) => { const c = await k.e.chooseOne(others(k), "discard"); if (c) k.e.wound(c.uid); k.e.draw(d!); },
});
C("card.sun_bask", "Sun Bask", "body", "C", {
  f: "All other cards in hand +1 coil; you can't play more cards this turn", n: (k) => [1 + h(k.c)],
  t: ([c]) => `Every other card coils +${c}. Play nothing else this turn.`,
  run: (k, [c]) => { for (const x of others(k)) k.e.coil(x, c!); k.e.s.lockPlays = true; },
});
C("card.digest", "Digest", "body", "C", {
  f: "Shed a card from your hand; draw 2", n: (k) => [2 + h(k.c)], t: ([d]) => `Shed a card from your hand. Draw ${d}.`,
  run: async (k, [d]) => { const c = await k.e.chooseOne(others(k), "shed"); if (c) shedFromHand(k.e.body, c.uid); k.e.draw(d!); },
});
C("card.scent", "Scent", "body", "C", {
  f: "Look at the top 3 of your draw pile; take 1, discard the rest", n: (k) => [3 + k.c], t: ([n]) => `Look at the top ${n} cards. Take 1, discard the rest.`,
  run: async (k, [n]) => {
    const b = k.e.body;
    if (!b.draw.length && b.discard.length) k.e.draw(0);
    const top = b.draw.slice(-n!).reverse();
    if (!top.length) return;
    const c = await k.e.chooseOne(top, "take");
    for (const x of top) b.draw.splice(b.draw.indexOf(x), 1);
    for (const x of top) {
      if (x === c && b.hand.length < b.maxHand) { x.held = 0; b.hand.push(x); } else b.discard.push(x);
    }
  },
});
C("card.swallow", "Swallow", "body", "U", {
  shed: true, f: "Devour: gain +1 max hand for this fight. Shed",
  n: (k) => [1 + (k.e.has("bone.grub") ? 1 : 0)], t: ([n]) => `+${n} max hand this fight. Shed.`,
  run: (k, [n]) => { k.e.body.maxHand += n!; },
});
C("card.grow", "Grow", "body", "U", {
  shed: true, f: "Draw cards until your hand equals your max hand. Shed",
  t: () => `Draw until your hand is full. Shed.`, run: (k) => void k.e.draw(Math.max(0, k.e.body.maxHand - k.e.body.hand.length)),
});
C("card.hoard", "Hoard", "body", "U", {
  f: "Next turn draw 3 more; end your turn now", n: (k) => [3 + h(k.c)], t: ([d]) => `End your turn. Next turn draw ${d} more.`,
  run: (k, [d]) => { k.e.body.nextDraw += d!; k.e.requestEndTurn(); },
});
C("card.recall", "Recall", "body", "U", {
  f: "Return all cards discarded by wounds this turn to your hand", t: () => `Return every card lost to wounds or sacrifice this turn.`,
  run: (k) => {
    const b = k.e.body;
    for (const uid of b.woundedThisTurn) {
      const i = b.discard.findIndex((c) => c.uid === uid);
      if (i >= 0 && b.hand.length < b.maxHand) b.hand.push(b.discard.splice(i, 1)[0]!);
    }
    b.woundedThisTurn = [];
  },
});
C("card.shed_skin", "Shed Skin", "body", "U", {
  shed: true, f: "Remove a scar. Shed. Exhausts from your deck after 2 uses", t: () => `Mend a scar. Shed. Gone after 2 uses.`,
  run: (k) => {
    const run = k.e.run;
    if (run.scars > 0) { run.scars--; k.e.body.maxHand++; }
    const d = run.deck[k.card.deckIndex];
    if (d && d.id === "card.shed_skin" && !k.card.temp) d.uses = (d.uses ?? 0) + 1;
  },
});
C("card.feast", "Feast", "body", "U", {
  sac: 2, shed: true, f: "Gain +1 max hand for the rest of the run. Sacrifice 2. Shed",
  t: () => `Sacrifice 2. +1 max hand for the rest of the run. Shed.`,
  run: (k) => { k.e.run.maxHand++; k.e.body.maxHand++; },
});
C("card.patience", "Patience", "body", "U", {
  f: "All cards in hand +1 coil", n: (k) => [1 + h(k.c)], t: ([c]) => `Every card in hand coils +${c}.`,
  run: (k, [c]) => { for (const x of others(k)) k.e.coil(x, c!); },
});
C("card.reflection", "Reflection", "body", "R", {
  shed: true, f: "Copy another card in hand, including its coil. Shed", t: () => `Copy another card in hand, coil and all. Shed.`,
  run: async (k) => {
    const b = k.e.body;
    const c = await k.e.chooseOne(others(k), "copy");
    if (c && b.hand.length < b.maxHand) b.hand.push({ ...c, uid: ++k.e.s.nextUid, temp: true, bound: false, guarded: false });
  },
});
C("card.endless_ring", "Endless Ring", "body", "R", {
  f: "Shuffle your discard pile into your draw pile; draw 3", n: (k) => [3 + h(k.c)], t: ([d]) => `Shuffle your discard pile back. Draw ${d}.`,
  run: (k, [d]) => {
    const b = k.e.body;
    b.draw.push(...b.discard.splice(0));
    for (let i = b.draw.length - 1; i > 0; i--) { const j = Math.floor(k.e.rng.next() * (i + 1)); [b.draw[i], b.draw[j]] = [b.draw[j]!, b.draw[i]!]; }
    k.e.draw(d!);
  },
});
C("card.second_skin", "Second Skin", "body", "R", {
  shed: true, f: "This fight, the first wound each turn is ignored", t: () => `This fight, ignore the first wound each turn. Shed.`,
  run: (k) => { k.e.s.flags.secondSkin = true; },
});
C("card.true_size", "True Size", "body", "R", {
  sac: 4, shed: true, f: "This fight, might counts your max hand instead of your hand. Sacrifice 4. Shed",
  t: () => `Sacrifice 4. This fight, might counts your max hand. Shed.`, run: (k) => { k.e.body.trueSize = true; },
});

// ================= Shared: rites (18) =================
C("card.venom_bite", "Venom Bite", "rite", "C", {
  tgt: true, f: "Deal 1 + c; Poison 2 + c", n: (k) => [2 + k.c, 1 + k.c], t: ([p, d]) => `Deal ${d}. Poison ${p}.`,
  run: (k, [p, d]) => { k.e.hit(k.t, d!); k.e.poison(k.t, p!); },
});
C("card.rattle", "Rattle", "rite", "C", {
  tgt: true, f: "Weaken 1 + c", n: (k) => [1 + k.c], t: ([w]) => `Weaken ${w}.`, run: (k, [w]) => k.e.weaken(k.t, w!),
});
C("card.glare", "Glare", "rite", "C", {
  tgt: true, f: "The target's next intent is revealed for 2 turns; Weaken 1", n: (k) => [1 + k.c], t: ([w]) => `Reveal its next move. Weaken ${w}.`,
  run: (k, [w]) => { if (k.t) k.t.revealed = 2; k.e.weaken(k.t, w!); },
});
C("card.spit", "Spit", "rite", "C", {
  f: "Deal 2 + 2c to the enemy with the most health", n: (k) => [2 + 2 * k.c], t: ([d]) => `Deal ${d} to the healthiest enemy.`,
  run: (k, [d]) => { const t = [...k.e.alive()].sort((a, b) => b.hp - a.hp)[0]; k.e.hit(t, d!); },
});
C("card.coax", "Coax", "rite", "C", {
  tgt: true, shed: true, f: "The target attacks another enemy instead of you this turn. Shed",
  t: () => `Its attack this turn hits another enemy instead of you. Shed.`, run: (k) => { if (k.t) k.t.coaxed = true; },
});
C("card.hollow_hiss", "Hollow Hiss", "rite", "C", {
  tgt: true, f: "Cancel the target's eat or bind this turn", n: (k) => [k.c], ownUpgrade: true,
  t: ([w]) => (w || 0) > 0 ? `Cancel its eat or bind. Weaken ${w}.` : `Cancel its eat or bind this turn.`,
  run: (k, [w]) => { if (k.t) k.t.cancelEat = true; k.e.weaken(k.t, w! + k.u); },
});
C("card.mark", "Mark", "rite", "U", {
  tgt: true, f: "The target takes +2 from every hit this turn", n: (k) => [2 + k.c], t: ([n]) => `It takes +${n} from every hit this turn.`,
  run: (k, [n]) => { if (k.t) k.t.mark += n!; },
});
C("card.molt_cloud", "Molt Cloud", "rite", "U", {
  sac: 1, f: "Weaken 2 to all enemies. Sacrifice 1", n: (k) => [2 + k.c], t: ([w]) => `Sacrifice 1. Weaken ${w} on all enemies.`,
  run: (k, [w]) => { for (const f of k.e.alive()) k.e.weaken(f, w!); },
});
C("card.lure", "Lure", "rite", "U", {
  f: "All enemies target your Block first this turn: Block 2 + c", n: (k) => [2 + k.c], t: ([b]) => `Block ${b}.`, run: (k, [b]) => k.e.gainBlock(b!),
});
C("card.bone_charm", "Bone Charm", "rite", "U", {
  tgt: true, f: "Gain 10 glint if this kills an enemy; deal 3", n: (k) => [3 + k.c], t: ([d]) => `Deal ${d}. If it kills, gain 10 glint.`,
  run: (k, [d]) => { if (k.e.hit(k.t, d!).killed) k.e.run.glint += 10; },
});
C("card.devour_rite", "Devour Rite", "rite", "U", {
  shed: true, f: "Next husk you devour this fight also gives Block 3 at the start of every fight",
  t: () => `The next husk you devour also grants Block 3 at the start of every fight. Shed.`, run: (k) => { k.e.s.flags.devourRite = true; },
});
C("card.blind", "Blind", "rite", "U", {
  tgt: true, f: "The target's next attack hits a random target (it may hit its allies)", t: () => `Its next attack hits a random target.`,
  run: (k) => { if (k.t) k.t.blind = true; },
});
C("card.ritual_bite", "Ritual Bite", "rite", "U", {
  tgt: true, f: "Deal 3; your next card this turn resolves twice", n: (k) => [3 + k.c], t: ([d]) => `Deal ${d}. Your next card resolves twice.`,
  run: (k, [d]) => { k.e.hit(k.t, d!); k.e.s.ritual++; },
});
C("card.decoy_scale", "Decoy Scale", "rite", "U", {
  f: "Block 2 + c; the next eat or bind this fight takes this card instead (it returns to hand)",
  n: (k) => [2 + k.c], t: ([b]) => `Block ${b}. The next eat or bind takes this instead.`,
  run: (k, [b]) => { k.e.gainBlock(b!); k.e.s.decoyUid = k.card.uid; },
});
C("card.unravel", "Unravel", "rite", "R", {
  tgt: true, f: "Remove all of the target's buffs", t: () => `Strip its strength and block.`,
  run: (k) => { if (k.t) { k.t.str = Math.min(0, k.t.str); k.t.block = 0; } },
});
C("card.hunger_mark", "Hunger Mark", "rite", "R", {
  tgt: true, f: "If the target dies this fight, devour it in addition to your normal husk", t: () => `If it dies this fight, devour it too.`,
  run: (k) => { if (k.t) k.e.s.huntMarks.push(k.t.uid); },
});
C("card.great_rattle", "Great Rattle", "rite", "R", {
  sac: 3, shed: true, f: "All enemies skip their next intent. Sacrifice 3. Shed", t: () => `Sacrifice 3. Every enemy skips its next move. Shed.`,
  run: (k) => { for (const f of k.e.alive()) f.skip = Math.max(f.skip, 1); },
});
C("card.circle_rite", "Circle Rite", "rite", "R", {
  f: "Your coil cap is +2 this fight", n: (k) => [2 + h(k.c)], t: ([n]) => `Your coil cap is +${n} this fight.`,
  run: (k, [n]) => { k.e.body.coilCap += n!; },
});
C("card.close_the_ring", "Close the Ring", "rite", "X", {
  special: true, f: "Discard your whole hand; the Tail is released", t: () => `Give your whole body. Release the Tail.`, run: () => {},
});

// ================= Venom (30) =================
V("venom.drip", "Drip", "rite", "C", { tgt: true, f: "Poison 3 + c", n: (k) => [3 + k.c], t: ([p]) => `Poison ${p}.`, run: (k, [p]) => k.e.poison(k.t, p!) });
V("venom.fester", "Fester", "rite", "C", {
  tgt: true, f: "Double the target's poison", n: (k) => [k.t?.poison ?? 0, k.c], ownUpgrade: true,
  t: ([p, c]) => `Double its poison${p ? ` (+${p + c!})` : ""}.`, run: (k, [p, c]) => k.e.poison(k.t, p! + c! + k.u),
});
V("venom.sickle_fang", "Sickle Fang", "strike", "C", {
  tgt: true, f: "Deal 2 + m/2; Poison 1 + c", n: (k) => [2 + h(k.m), 1 + k.c], t: ([d, p]) => `Deal ${d}. Poison ${p}.`,
  run: (k, [d, p]) => { k.e.hit(k.t, d!); k.e.poison(k.t, p!); },
});
V("venom.miasma", "Miasma", "rite", "C", {
  f: "Poison 1 + c to all enemies", n: (k) => [1 + k.c], t: ([p]) => `Poison ${p} on all enemies.`, run: (k, [p]) => { for (const f of k.e.alive()) k.e.poison(f, p!); },
});
V("venom.feed", "Feed", "body", "C", {
  tgt: true, f: "If the target is poisoned, draw 2", n: (k) => [2 + h(k.c)], t: ([d]) => `If it's poisoned, draw ${d}.`,
  run: (k, [d]) => { if (k.t && k.t.poison > 0) k.e.draw(d!); },
});
V("venom.bloat", "Bloat", "body", "C", {
  f: "Draw 1 per poisoned enemy", n: (k) => [poisonedFoes(k) + h(k.c)], t: ([d]) => `Draw ${d} (one per poisoned enemy).`, run: (k, [d]) => void k.e.draw(d!),
});
V("venom.acid_spit", "Acid Spit", "strike", "C", {
  tgt: true, f: "Deal 3 + c; Poison 2", n: (k) => [3 + k.c, 2], t: ([d, p]) => `Deal ${d}. Poison ${p}.`,
  run: (k, [d, p]) => { k.e.hit(k.t, d!); k.e.poison(k.t, p!); },
});
V("venom.slow_rot", "Slow Rot", "rite", "C", {
  tgt: true, f: "Poison 2; poison on the target no longer decays", n: (k) => [2 + k.c], t: ([p]) => `Poison ${p}. Its poison stops fading.`,
  run: (k, [p]) => { k.e.poison(k.t, p!); if (k.t) k.t.slowRot = true; },
});
V("venom.sated", "Sated", "guard", "C", {
  f: "Block 1 per poisoned enemy + c", n: (k) => [poisonedFoes(k) + k.c], t: ([b]) => `Block ${b} (one per poisoned enemy).`, run: (k, [b]) => k.e.gainBlock(b!),
});
V("venom.engorge", "Engorge", "body", "C", {
  shed: true, f: "+1 max hand this fight per poisoned enemy. Shed", n: (k) => [poisonedFoes(k)], t: ([n]) => `+${n} max hand this fight (one per poisoned enemy). Shed.`,
  run: (k, [n]) => { k.e.body.maxHand += n!; },
});
V("venom.gut_punch", "Gut Punch", "strike", "C", {
  tgt: true, f: "Deal damage equal to the target's poison + m/2", n: (k) => [(k.t?.poison ?? 0) + h(k.m) + k.c], t: ([d]) => `Deal ${d} (its poison + half your might).`,
  run: (k, [d]) => void k.e.hit(k.t, d!),
});
V("venom.taint", "Taint", "rite", "C", {
  f: "Your next strike this turn applies Poison 3", n: (k) => [3 + k.c], t: ([p]) => `Your next strike this turn also poisons ${p}.`,
  run: (k) => { k.e.s.flags.taint = true; },
});
V("venom.heavy_belly", "Heavy Belly", "guard", "U", {
  f: "Block 2 + 1 per husk devoured this run (max 8)", n: (k) => [Math.min(8, 2 + k.e.run.stats.devoured.length) + k.c], t: ([b]) => `Block ${b}. Grows with every husk devoured.`,
  run: (k, [b]) => k.e.gainBlock(b!),
});
V("venom.ripen", "Ripen", "rite", "U", {
  f: "Poison on all enemies +2 + c", n: (k) => [2 + k.c], t: ([p]) => `Every poisoned enemy gains ${p} poison.`,
  run: (k, [p]) => { for (const f of k.e.alive()) if (f.poison > 0) k.e.poison(f, p!); },
});
V("venom.pestilence", "Pestilence", "rite", "U", {
  shed: true, f: "Whenever a poisoned enemy dies this fight, spread its poison to all enemies", t: () => `This fight, poisoned enemies spread their poison when they die. Shed.`,
  run: (k) => { k.e.s.flags.pestilence = true; },
});
V("venom.gorge_rot", "Gorge Rot", "strike", "U", {
  tgt: true, f: "Deal m; Poison equal to damage dealt / 2", n: (k) => [k.m + k.c], t: ([d]) => `Deal ${d}. Poison half the damage dealt.`,
  run: (k, [d]) => { const t = k.t; const r = k.e.hit(t, d!); if (!r.killed) k.e.poison(t, h(r.dealt)); },
});
V("venom.hungry_coil", "Hungry Coil", "body", "U", {
  f: "All cards in hand +1 coil per poisoned enemy (max 3)", n: (k) => [Math.min(3, poisonedFoes(k) + h(k.c))], t: ([c]) => `Every card in hand coils +${c} (one per poisoned enemy).`,
  run: (k, [c]) => { if (c! > 0) for (const x of others(k)) k.e.coil(x, c!); },
});
V("venom.bile_wall", "Bile Wall", "guard", "U", {
  f: "Block 3 + c; enemies that wound you get Poison 2", n: (k) => [3 + k.c], t: ([b]) => `Block ${b}. Enemies that wound you are poisoned 2.`,
  run: (k, [b]) => { k.e.gainBlock(b!); k.e.s.flags.bileWall = true; },
});
V("venom.digest_whole", "Digest Whole", "rite", "U", {
  f: "Shed a card from your hand; Poison 5 to all", n: (k) => [5 + k.c], t: ([p]) => `Shed a card from your hand. Poison ${p} on all enemies.`,
  can: (k) => k.e.body.hand.length >= 2,
  run: async (k, [p]) => { const c = await k.e.chooseOne(others(k), "shed"); if (c) shedFromHand(k.e.body, c.uid); for (const f of k.e.alive()) k.e.poison(f, p!); },
});
V("venom.husk_eater", "Husk Eater", "strike", "U", {
  tgt: true, f: "Deal 4 + 2 per husk devoured this fight", n: (k) => [4 + 2 * (k.e.s.devouredThisFight + k.e.s.husks.length) + k.c],
  t: ([d]) => `Deal ${d}. +2 for every husk this fight.`, run: (k, [d]) => void k.e.hit(k.t, d!),
});
V("venom.creeping", "Creeping", "rite", "U", {
  shed: true, f: "At the start of each turn this fight, Poison 1 to all enemies. Shed", t: () => `Each turn this fight, poison 1 on all enemies. Shed.`,
  run: (k) => { k.e.s.flags.creeping = true; },
});
V("venom.swell", "Swell", "body", "U", {
  f: "You can be Big without the extra wound this turn", n: (k) => [1 + k.c], ownUpgrade: true, t: ([d]) => `Big costs no extra wound this turn. Draw ${d}.`,
  run: (k, [d]) => { k.e.s.flags.swell = true; k.e.draw(d! - 1 + k.u); },
});
V("venom.carrion", "Carrion", "body", "U", {
  f: "Return the last husk card you devoured to your hand from your deck", t: () => `Pull your last devoured husk into your hand.`,
  can: (k) => !!k.e.run.lastDevoured,
  run: (k) => {
    const b = k.e.body;
    const id = k.e.run.lastDevoured;
    for (const pile of [b.draw, b.discard]) {
      const i = pile.findIndex((c) => c.id === id);
      if (i >= 0 && b.hand.length < b.maxHand) { const [c] = pile.splice(i, 1); c!.held = 0; b.hand.push(c!); return; }
    }
  },
});
V("venom.black_milk", "Black Milk", "body", "U", {
  shed: true, f: "Remove 1 scar per enemy killed by poison this fight. Shed", n: (k) => [k.e.s.poisonKills], t: ([n]) => `Mend ${n} scar${n === 1 ? "" : "s"} (one per poison kill this fight). Shed.`,
  run: (k, [n]) => { const run = k.e.run; const m = Math.min(run.scars, n!); run.scars -= m; k.e.body.maxHand += m; },
});
V("venom.plague_bloom", "Plague Bloom", "rite", "R", {
  tgt: true, sac: 2, f: "Poison 10 + 3c. Sacrifice 2", n: (k) => [10 + 3 * k.c], t: ([p]) => `Sacrifice 2. Poison ${p}.`, run: (k, [p]) => k.e.poison(k.t, p!),
});
V("venom.leviathan_gut", "Leviathan Gut", "body", "R", {
  shed: true, f: "This fight, devoured husks give +2 max hand instead of +1", t: () => `This fight, each devour grows you by 2. Shed.`,
  run: (k) => { k.e.s.flags.leviathan = true; },
});
V("venom.venom_heart", "Venom Heart", "rite", "R", {
  shed: true, f: "Poison deals damage twice per turn this fight. Shed", t: () => `This fight, poison hits twice as hard. Shed.`,
  run: (k) => { k.e.s.flags.venomHeart = true; },
});
V("venom.eater_of_all", "Eater of All", "rite", "R", {
  f: "Kill every enemy with health ≤ its poison", n: (k) => [k.c], ownUpgrade: true, t: () => `Kill every enemy whose poison is at least its health.`,
  run: (k, [c]) => { for (const f of k.e.alive()) if (f.hp <= f.poison + c! + k.u) k.e.damageFoe(f, f.hp + f.block, true); },
});
V("venom.slow_god", "Slow God", "guard", "R", {
  f: "Gain Block equal to total enemy poison", n: (k) => [k.e.alive().reduce((s, f) => s + f.poison, 0) + k.c], t: ([b]) => `Block ${b} (all enemy poison).`,
  run: (k, [b]) => k.e.gainBlock(b!),
});
V("venom.final_meal", "Final Meal", "strike", "R", {
  tgt: true, shed: true, f: "Deal 1 per card in your deck to one enemy. Shed", n: (k) => [k.e.run.deck.length + 2 * k.c], t: ([d]) => `Deal ${d} (one per card in your deck). Shed.`,
  run: (k, [d]) => void k.e.hit(k.t, d!),
});

export const CARDS: Record<string, CardDef> = Object.fromEntries(list.map((c) => [c.id, c]));
export const CARD_LIST = list;

export const STARTERS: Partial<Record<MoltId, string[]>> = {
  venom: ["card.fang", "card.fang", "card.fang", "card.fang", "card.scale", "card.scale", "card.scale", "card.venom_bite", "card.venom_bite", "card.swallow"],
};

/** Cards that can appear as rewards and in the Burrower for a molt. */
export function rewardPool(molt: MoltId): CardDef[] {
  return list.filter((c) => !c.special && (!c.molt || c.molt === molt));
}

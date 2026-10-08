import type { Act, FoeDef, Intent } from "../game/types.ts";

// Pattern shorthand.
const W = (n: number, x?: number): Act => (x ? { k: "atk", n, x } : { k: "atk", n });
const EAT = (x?: number): Act => (x ? { k: "eat", x } : { k: "eat" });
const BIND = (x?: number): Act => (x ? { k: "bind", x } : { k: "bind" });
const POISON = (n: number): Act => ({ k: "poison", n });
const BLOCK = (n: number): Act => ({ k: "block", n });
const BUFF = (n: number, all = false): Act => ({ k: "buff", n, all });
const SUMMON = (id: string, x: number): Act => ({ k: "summon", id, x });
const HEAL = (n: number): Act => ({ k: "heal", n });
const DAZE: Act = { k: "daze" };
const REST: Act = { k: "rest" };
const I = (...acts: Act[]): Intent => acts;

const list: FoeDef[] = [
  // Act 1: Topsoil
  { id: "foe.gnawer", name: "Gnawer", hp: 9, act: 1, tier: "normal", husk: "card.gnash", pattern: [I(W(1)), I(W(1)), I(W(2))] },
  { id: "foe.grub", name: "Grub", hp: 6, act: 1, tier: "normal", husk: "card.gnash", pattern: [I(W(1)), I(W(1)), I(W(2))], stagger: true },
  { id: "foe.spitter", name: "Spitter", hp: 8, act: 1, tier: "normal", husk: "card.spit", pattern: [I(W(1)), I(POISON(2)), I(W(2))] },
  { id: "foe.tunneler", name: "Tunneler", hp: 12, act: 1, tier: "normal", husk: "card.burrow", pattern: [I(BLOCK(5)), I(W(3))] },
  { id: "foe.mite", name: "Mite", hp: 4, act: 1, tier: "normal", husk: "card.rake", pattern: [I(W(1))] },
  { id: "foe.carrion_crow", name: "Carrion Crow", hp: 10, act: 1, tier: "normal", husk: "card.hollow_hiss", pattern: [I(EAT()), I(W(2)), I(W(2))] },
  { id: "foe.root_worm", name: "Root Worm", hp: 14, act: 1, tier: "normal", husk: "card.constrict", pattern: [I(BIND()), I(W(2))] },
  { id: "foe.dung_brute", name: "Dung Brute", hp: 18, act: 1, tier: "normal", husk: "card.crush", pattern: [I(BUFF(2)), I(W(4)), I(W(1))] },
  { id: "foe.centipede", name: "Centipede", hp: 11, act: 1, tier: "normal", husk: "card.double_bite", pattern: [I(W(1, 3)), I(W(1, 2))] },
  // Act 1 elites
  { id: "elite.badger", name: "Badger", hp: 40, act: 1, tier: "elite", husk: "card.mouthful", pattern: [I(W(3)), I(EAT()), I(W(5))] },
  { id: "elite.mole_king", name: "Mole King", hp: 46, act: 1, tier: "elite", husk: "card.stone_coil", pattern: [I(BLOCK(10)), I(W(2, 3))] },
  { id: "elite.wasp", name: "Court Wasp", hp: 12, act: 1, tier: "elite", husk: "card.thrash", pattern: [I(W(2))], onDeath: "wasp" },
  // Act 1 boss
  {
    id: "boss.beetle_queen",
    name: "The Beetle Queen",
    hp: 110,
    act: 1,
    tier: "boss",
    husk: "card.swallow_whole",
    pattern: [I(BLOCK(8), W(4)), I(EAT(), W(2)), I(SUMMON("foe.grub", 2))],
    phase2: { at: 0.5, noBlock: true, pattern: [I(W(6)), I(EAT(), W(3)), I(SUMMON("foe.grub", 2), W(2))] },
  },

  // Act 2: The Roots
  { id: "foe.sap_leech", name: "Sap Leech", hp: 16, act: 2, tier: "normal", husk: "card.molt", pattern: [I(EAT()), I(W(2)), I(W(1))] },
  { id: "foe.spore_puff", name: "Spore Puff", hp: 12, act: 2, tier: "normal", husk: "card.molt_cloud", pattern: [I(DAZE), I(W(2))] },
  { id: "foe.thorn_knot", name: "Thorn Knot", hp: 22, act: 2, tier: "normal", husk: "card.bristle", pattern: [I(BLOCK(4)), I(W(3))] },
  { id: "foe.fungus_priest", name: "Fungus Priest", hp: 14, act: 2, tier: "normal", husk: "card.ritual_bite", pattern: [I(BUFF(1, true)), I(HEAL(6)), I(W(2))] },
  { id: "foe.root_hound", name: "Root Hound", hp: 18, act: 2, tier: "normal", husk: "card.lunge", pattern: [I(W(2, 2)), I(BIND())] },
  { id: "foe.mold_twin", name: "Mold Twin", hp: 10, act: 2, tier: "normal", husk: "card.tail_whip", pattern: [I(W(2)), I(W(1)), I(REST)], stagger: true },
  { id: "foe.bark_beetle", name: "Bark Beetle", hp: 20, act: 2, tier: "normal", husk: "card.ironhide", pattern: [I(BLOCK(6)), I(W(4))] },
  { id: "foe.strangler_vine", name: "Strangler Vine", hp: 24, act: 2, tier: "normal", husk: "card.coax", pattern: [I(BIND(2)), I(W(3))] },
];

export const FOES: Record<string, FoeDef> = Object.fromEntries(list.map((f) => [f.id, f]));

/** Act 1 encounters. The first run's first three fights are the onboarding fights (slifer-onboarding.md). */
export const ENCOUNTERS = {
  1: {
    onboarding: [["foe.gnawer"], ["foe.gnawer", "foe.tunneler"], ["foe.spitter", "foe.carrion_crow"]],
    easy: [["foe.gnawer"], ["foe.spitter"], ["foe.centipede"], ["foe.mite", "foe.mite", "foe.mite"], ["foe.gnawer", "foe.spitter"]],
    hard: [
      ["foe.gnawer", "foe.tunneler"],
      ["foe.spitter", "foe.carrion_crow"],
      ["foe.root_worm", "foe.gnawer"],
      ["foe.dung_brute"],
      ["foe.centipede", "foe.spitter"],
      ["foe.carrion_crow", "foe.gnawer"],
      ["foe.tunneler", "foe.spitter"],
      ["foe.root_worm", "foe.centipede"],
      ["foe.dung_brute", "foe.gnawer"],
    ],
    elite: [["elite.badger"], ["elite.mole_king"], ["elite.wasp", "elite.wasp", "elite.wasp"]],
    boss: [["boss.beetle_queen"]],
  },
} as Record<number, { onboarding: string[][]; easy: string[][]; hard: string[][]; elite: string[][]; boss: string[][] }>;

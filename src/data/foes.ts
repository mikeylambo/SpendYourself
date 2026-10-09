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
const THORNS: Act = { k: "thorns" };
const SIREN: Act = { k: "siren" };
const SLIME: Act = { k: "slime" };
const SWALLOW: Act = { k: "swallow" };
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
  { id: "elite.wasp", name: "Court Wasp", hp: 12, act: 1, tier: "elite", husk: "card.thrash", pattern: [I(W(1)), I(W(2))], stagger: true, onDeath: "wasp" },
  // Act 1 boss
  {
    id: "boss.beetle_queen",
    name: "The Beetle Queen",
    hp: 85,
    act: 1,
    tier: "boss",
    husk: "card.swallow_whole",
    pattern: [I(BLOCK(8), W(4)), I(EAT(), W(2)), I(SUMMON("foe.grub", 2))],
    phase2: { at: 0.5, noBlock: true, pattern: [I(W(5)), I(EAT(), W(2)), I(SUMMON("foe.grub", 1), W(2))] },
  },

  // Act 2: The Roots
  { id: "foe.sap_leech", name: "Sap Leech", hp: 16, act: 2, tier: "normal", husk: "card.molt", pattern: [I(EAT()), I(W(2)), I(W(1))] },
  { id: "foe.spore_puff", name: "Spore Puff", hp: 12, act: 2, tier: "normal", husk: "card.molt_cloud", pattern: [I(DAZE), I(W(2))], stagger: true },
  { id: "foe.thorn_knot", name: "Thorn Knot", hp: 22, act: 2, tier: "normal", husk: "card.bristle", pattern: [I(THORNS, W(1)), I(W(3))] },
  { id: "foe.fungus_priest", name: "Fungus Priest", hp: 14, act: 2, tier: "normal", husk: "card.ritual_bite", pattern: [I(BUFF(1, true)), I(HEAL(6)), I(W(2))] },
  { id: "foe.root_hound", name: "Root Hound", hp: 18, act: 2, tier: "normal", husk: "card.lunge", pattern: [I(W(2, 2)), I(BIND())] },
  { id: "foe.mold_twin", name: "Mold Twin", hp: 10, act: 2, tier: "normal", husk: "card.tail_whip", pattern: [I(W(2)), I(W(1))], stagger: true, onDeath: "split" },
  { id: "foe.mold_mite", name: "Mold Mite", hp: 5, act: 2, tier: "normal", husk: "card.tail_whip", pattern: [I(W(1))] },
  { id: "foe.bark_beetle", name: "Bark Beetle", hp: 20, act: 2, tier: "normal", husk: "card.ironhide", pattern: [I(BLOCK(6)), I(W(4))] },
  { id: "foe.strangler_vine", name: "Strangler Vine", hp: 24, act: 2, tier: "normal", husk: "card.coax", pattern: [I(BIND(2)), I(W(3))] },
  // Act 2 elites
  { id: "elite.rot_stag", name: "Rot Stag", hp: 70, act: 2, tier: "elite", husk: "card.hunger_strike", pattern: [I(W(6)), I(BIND(2)), I(W(3))] },
  { id: "elite.honey_fungus", name: "Honey Fungus", hp: 60, act: 2, tier: "elite", husk: "card.spine_burst", pattern: [I(SUMMON("foe.spore_puff", 1)), I(W(3)), I(W(2), POISON(2))] },
  { id: "elite.owl_bones", name: "Owl of Bones", hp: 55, act: 2, tier: "elite", husk: "card.reflection", pattern: [I(EAT(2)), I(W(4)), I(W(2, 2))] },
  // Act 2 boss: three heads
  { id: "boss.choir_bind", name: "Choir Head", hp: 45, act: 2, tier: "boss", husk: "card.circle_strike", pattern: [I(BIND()), I(W(3)), I(W(2))], onDeath: "choir" },
  { id: "boss.choir_rot", name: "Choir Head", hp: 45, act: 2, tier: "boss", husk: "card.circle_strike", pattern: [I(POISON(3)), I(W(2)), I(W(3))], onDeath: "choir" },
  { id: "boss.choir_bloom", name: "Choir Head", hp: 45, act: 2, tier: "boss", husk: "card.circle_strike", pattern: [I(HEAL(6)), I(W(2)), I(BUFF(1, true))], onDeath: "choir" },

  // Act 3: The Deep Water
  { id: "foe.blind_eel", name: "Blind Eel", hp: 22, act: 3, tier: "normal", husk: "card.lash", pattern: [I(W(3)), I(DAZE, W(1, 3))] },
  { id: "foe.lantern_angler", name: "Lantern Angler", hp: 20, act: 3, tier: "normal", husk: "card.lure", pattern: [I(SIREN, W(1)), I(EAT()), I(W(4))] },
  { id: "foe.pressure_crab", name: "Pressure Crab", hp: 30, act: 3, tier: "normal", husk: "card.shell_scale", pattern: [I(BLOCK(8), BIND()), I(W(5))] },
  { id: "foe.drowned_choir", name: "Drowned Choir", hp: 18, act: 3, tier: "normal", husk: "card.great_rattle", pattern: [I(BUFF(2, true)), I(HEAL(5)), I(W(2, 2))] },
  { id: "foe.hagfish", name: "Hagfish", hp: 16, act: 3, tier: "normal", husk: "card.digest", pattern: [I(SLIME, W(1)), I(SLIME, W(2)), I(W(3))] },
  { id: "foe.siphon", name: "Siphon", hp: 24, act: 3, tier: "normal", husk: "card.regrow", pattern: [I(SWALLOW, W(1)), I(EAT(2)), I(W(2))] },
  { id: "foe.abyss_jelly", name: "Abyss Jelly", hp: 28, act: 3, tier: "normal", husk: "venom.drip", pattern: [I(POISON(3), THORNS), I(W(2, 2))] },
  { id: "foe.trench_shark", name: "Trench Shark", hp: 34, act: 3, tier: "normal", husk: "card.gorge", pattern: [I(W(2)), I(BUFF(3)), I(W(7))] },
  // Act 3 elites
  { id: "elite.giant_isopod", name: "Giant Isopod", hp: 90, act: 3, tier: "elite", husk: "card.patient_ring", pattern: [I(BLOCK(15)), I(W(5)), I(W(5))] },
  { id: "elite.siren", name: "Siren", hp: 30, act: 3, tier: "elite", husk: "card.blind", pattern: [I(SIREN, W(1)), I(W(4))], stagger: true },
  { id: "elite.kraken_arm", name: "Kraken Arm", hp: 85, act: 3, tier: "elite", husk: "card.world_eater", pattern: [I(BIND(3)), I(W(8)), I(W(3))] },
  // Act 3 boss
  {
    id: "boss.drowned_mouth",
    name: "The Drowned Mouth",
    hp: 200,
    act: 3,
    tier: "boss",
    husk: "card.last_scale",
    pattern: [I(SWALLOW, W(4)), I(W(8)), I(EAT(), W(3))],
    phase2: { at: 0.5, onEnter: "pressure", pattern: [I(SWALLOW, W(5)), I(W(9)), I(EAT(), W(4))] },
  },
  // Finale
  { id: "boss.tail", name: "The Tail", hp: 100, act: 3, tier: "boss", husk: "card.close_the_ring", pattern: [I(REST)], phase2: { at: 0.5, pattern: [I(REST)] } },
];

export const FOES: Record<string, FoeDef> = Object.fromEntries(list.map((f) => [f.id, f]));

/** Encounters per act. The first run's first three fights are the onboarding fights (slifer-onboarding.md). */
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
  2: {
    onboarding: [],
    easy: [["foe.sap_leech", "foe.spore_puff"], ["foe.mold_twin", "foe.mold_twin"], ["foe.bark_beetle"], ["foe.root_hound"]],
    hard: [
      ["foe.thorn_knot", "foe.spore_puff"],
      ["foe.fungus_priest", "foe.root_hound"],
      ["foe.strangler_vine", "foe.sap_leech"],
      ["foe.bark_beetle", "foe.spore_puff"],
      ["foe.mold_twin", "foe.fungus_priest"],
      ["foe.thorn_knot", "foe.root_hound"],
      ["foe.strangler_vine", "foe.mold_twin"],
    ],
    elite: [["elite.rot_stag"], ["elite.honey_fungus"], ["elite.owl_bones"]],
    boss: [["boss.choir_bind", "boss.choir_rot", "boss.choir_bloom"]],
  },
  3: {
    onboarding: [],
    easy: [["foe.blind_eel"], ["foe.lantern_angler", "foe.hagfish"], ["foe.pressure_crab"], ["foe.siphon"]],
    hard: [
      ["foe.abyss_jelly", "foe.hagfish"],
      ["foe.trench_shark"],
      ["foe.drowned_choir", "foe.blind_eel"],
      ["foe.pressure_crab", "foe.lantern_angler"],
      ["foe.siphon", "foe.drowned_choir"],
      ["foe.blind_eel", "foe.abyss_jelly"],
      ["foe.trench_shark", "foe.hagfish"],
    ],
    elite: [["elite.giant_isopod"], ["elite.siren", "elite.siren"], ["elite.kraken_arm"]],
    boss: [["boss.drowned_mouth"]],
  },
} as Record<number, { onboarding: string[][]; easy: string[][]; hard: string[][]; elite: string[][]; boss: string[][] }>;

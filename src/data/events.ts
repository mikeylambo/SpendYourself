import type { RunState } from "../game/state.ts";

/** What an event choice may do to the run. Implemented by the run controller. */
export interface EventOps {
  run: RunState;
  gainBone(rarity?: "C" | "U" | "R"): string | null;
  loseBone(): string | null;
  addCard(id: string, up?: boolean): void;
  randomCard(rarity?: "C" | "U" | "R", moltOnly?: boolean): string;
  /** Ask the player to choose a card from the deck; resolves to a deck index or null. */
  chooseDeck(prompt: string, filter?: (id: string, up: boolean) => boolean): Promise<number | null>;
  removeCard(index: number): void;
  upgrade(index: number): void;
  scar(n: number): void;
  mend(n: number): void;
  maxHand(n: number): void;
  glint(n: number): void;
  fight(encounter: string[], kind: "normal" | "elite", bonus: { rare?: boolean; hp?: number }): void;
  rng(): number;
}

export interface EventChoice {
  label: string;
  /** Short consequence line under the label. */
  hint?: string;
  can?: (run: RunState) => boolean;
  apply: (o: EventOps) => void | Promise<void>;
}

export interface EventDef {
  id: string;
  title: string;
  lines: string;
  act: number[];
  choices: EventChoice[];
}

const leave: EventChoice = { label: "Leave", apply: () => {} };

const list: EventDef[] = [
  {
    id: "event.bone_pile", title: "Bone Pile", act: [1, 2, 3],
    lines: "Something died here long ago, and something else picked it clean.",
    choices: [
      { label: "Take one", hint: "Gain a bone", apply: (o) => void o.gainBone() },
      { label: "Take two", hint: "Gain 2 bones · 1 scar", apply: (o) => { o.gainBone(); o.gainBone(); o.scar(1); } },
    ],
  },
  {
    id: "event.shed_skin", title: "Shed Skin", act: [1, 2, 3],
    lines: "Your old skin hangs on a root, whole and empty.",
    choices: [
      { label: "Leave something in it", hint: "Remove a card", can: (r) => r.deck.length > 5, apply: async (o) => { const i = await o.chooseDeck("remove"); if (i !== null) o.removeCard(i); } },
      { label: "Wear it a while", hint: "Mend 2 scars", can: (r) => r.scars > 0, apply: (o) => o.mend(2) },
    ],
  },
  {
    id: "event.glint_seam", title: "Glint Seam", act: [1, 2],
    lines: "A seam of glint runs through the wall. The rock around it is soft.",
    choices: [
      { label: "Pry a little", hint: "+40 glint", apply: (o) => o.glint(40) },
      { label: "Dig it out", hint: "+80 glint · 1 scar", apply: (o) => { o.glint(80); o.scar(1); } },
    ],
  },
  {
    id: "event.mirror_pool", title: "Mirror Pool", act: [1, 2, 3],
    lines: "Still water. The serpent in it moves a moment after you do.",
    choices: [
      { label: "Look longer", hint: "Upgrade a card", apply: async (o) => { const i = await o.chooseDeck("upgrade", (_, up) => !up); if (i !== null) o.upgrade(i); } },
      { label: "Strike the reflection", hint: "Duplicate a card", apply: async (o) => { const i = await o.chooseDeck("duplicate"); if (i !== null) { const d = o.run.deck[i]!; o.addCard(d.id, d.up); } } },
    ],
  },
  {
    id: "event.hungry_kit", title: "Hungry Kit", act: [1, 2],
    lines: "A newborn serpent, no longer than a finger, opens its mouth at you.",
    choices: [
      { label: "Feed it", hint: "Give a card · more husks this act", can: (r) => r.deck.length > 5, apply: async (o) => { const i = await o.chooseDeck("give"); if (i !== null) { o.removeCard(i); o.run.actHuskBonus += 1; } } },
      { label: "Eat it", hint: "+1 max hand · 1 scar", apply: (o) => { o.maxHand(1); o.scar(1); } },
    ],
  },
  {
    id: "event.root_shrine", title: "Root Shrine", act: [1, 2],
    lines: "Roots have grown around a bone the size of your head.",
    choices: [{ label: "Give of yourself", hint: "−2 max hand · rare bone", can: (r) => r.maxHand - r.scars > 7, apply: (o) => { o.maxHand(-2); o.gainBone("R"); } }, leave],
  },
  {
    id: "event.old_skin", title: "First Scale", act: [1, 2, 3],
    lines: "A scale from when you hatched, buried shallow.",
    choices: [{ label: "Take it back", hint: "Gain an upgraded Swallow", apply: (o) => o.addCard("card.swallow", true) }, leave],
  },
  {
    id: "event.drowned_bell", title: "Sunken Bell", act: [1, 2, 3],
    lines: "A bell in the mud. One ring would carry a long way.",
    choices: [{ label: "Ring it", hint: "Mend every scar · −50 glint", can: (r) => r.glint >= 50 && r.scars > 0, apply: (o) => { o.mend(99); o.glint(-50); } }, leave],
  },
  {
    id: "event.fungal_feast", title: "Fungal Feast", act: [1, 2],
    lines: "Pale caps, fat and sweet-smelling.",
    choices: [{ label: "Gorge", hint: "+2 max hand · poisoned for 3 fights", apply: (o) => { o.maxHand(2); o.run.nextFight.selfPoisonFights = 3; } }, leave],
  },
  {
    id: "event.worm_pit", title: "Worm Pit", act: [1],
    lines: "Three gnawers have found something rare and won't share.",
    choices: [{ label: "Go down", hint: "Fight · rare card", apply: (o) => o.fight(["foe.gnawer", "foe.gnawer", "foe.gnawer"], "normal", { rare: true }) }, leave],
  },
  {
    id: "event.sleeping_badger", title: "Sleeping Badger", act: [1],
    lines: "A badger sleeps across the tunnel, belly rising and falling.",
    choices: [
      { label: "Sneak past", apply: () => {} },
      { label: "Bite first", hint: "Fight an elite at half health", apply: (o) => o.fight(["elite.badger"], "elite", { hp: 0.5 }) },
    ],
  },
  {
    id: "event.egg_clutch", title: "Egg Clutch", act: [1, 2],
    lines: "Warm eggs in a chamber of packed earth. One is still whole.",
    choices: [{ label: "Carry it", hint: "Hatches into a bone after 2 fights", can: (r) => r.egg === 0, apply: (o) => { o.run.egg = 2; } }, leave],
  },
  {
    id: "event.echo", title: "Echo", act: [1, 2, 3],
    lines: "Something down here sounds exactly like your last meal.",
    choices: [{ label: "Answer it", hint: "Copy your last devoured husk", can: (r) => !!r.lastDevoured, apply: (o) => o.addCard(o.run.lastDevoured!) }, leave],
  },
  {
    id: "event.blind_fish", title: "Blind Fish", act: [1, 2, 3],
    lines: "A pale fish trades in things it cannot see.",
    choices: [{ label: "Trade a card", hint: "+60 glint", can: (r) => r.deck.length > 5, apply: async (o) => { const i = await o.chooseDeck("give"); if (i !== null) { o.removeCard(i); o.glint(60); } } }, leave],
  },
  {
    id: "event.silt", title: "Silt", act: [1, 2, 3],
    lines: "The current here strips loose scales away.",
    choices: [
      { label: "Let it", hint: "Remove 2 random cards", can: (r) => r.deck.length > 7, apply: (o) => { for (let i = 0; i < 2; i++) o.removeCard(Math.floor(o.rng() * o.run.deck.length)); } },
      leave,
    ],
  },
  {
    id: "event.offering", title: "Offering", act: [1, 2, 3],
    lines: "A hollow altar with three scale-shaped hollows.",
    choices: [
      {
        label: "Fill them", hint: "Give 3 cards · +3 max hand", can: (r) => r.deck.length > 8,
        apply: async (o) => { for (let n = 0; n < 3; n++) { const i = await o.chooseDeck("give"); if (i === null) return; o.removeCard(i); o.maxHand(1); } },
      },
      leave,
    ],
  },
  {
    id: "event.ant_trade", title: "Ant Trade", act: [1, 2, 3],
    lines: "Ants carry off one thing and leave another.",
    choices: [{ label: "Trade a bone", hint: "Swap a bone for a random one", can: (r) => r.bones.length > 0, apply: (o) => { if (o.loseBone()) o.gainBone(); } }, leave],
  },
  {
    id: "event.quiet", title: "Quiet", act: [1, 2, 3],
    lines: "Nothing here. The earth is warm.",
    choices: [{ label: "Rest a moment", hint: "Block 3 next fight", apply: (o) => { o.run.nextFight.block += 3; } }],
  },
];

export const EVENTS: Record<string, EventDef> = Object.fromEntries(list.map((e) => [e.id, e]));
export const EVENT_LIST = list;

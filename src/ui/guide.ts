// Teaching: the How to Play pages, first-run coach tips and the keyword glossary.
// Copy is short on purpose (rule 8); each line explains a rule the player is about to use.
import { icon, uroRing } from "./art.ts";

export interface GuidePage {
  title: string;
  art: string;
  lines: string[];
}

const big = (name: string, color = "currentColor") => icon(name, "", color, 1.8);

export const HOW_TO_PLAY: GuidePage[] = [
  {
    title: "Your hand is your body",
    art: uroRing(120, "#8fa63a", 20),
    lines: [
      "Every card in your hand is a scale of Uro, the serpent you play.",
      "Your hand is your health. Run out of cards and you die.",
    ],
  },
  {
    title: "Spend yourself",
    art: big("strike"),
    lines: [
      "There is no energy. Play as many cards as you dare.",
      "Tap a card to pick it up, tap it again to play it. Tap an enemy to aim.",
      "Each card you play leaves your hand for good this turn.",
    ],
  },
  {
    title: "Might",
    art: `<b class="guide-num">7</b>`,
    lines: [
      "Might is how many cards you hold. Most attacks grow with it.",
      "A full hand hits hard. Every card you spend makes the next hit weaker.",
      "Card numbers update live, so what you see is what you deal.",
    ],
  },
  {
    title: "Read the enemy",
    art: `<span class="guide-icons">${icon("claw")}${icon("maw")}${icon("knot")}${icon("drop")}</span>`,
    lines: [
      "The red icon above each enemy shows what it does next.",
      "Claw: wounds (the number). Maw: eats your most-coiled card. Knot: locks a card for a turn. Drop: poisons you.",
      "Shield: it blocks. Chevron: it grows stronger. Egg: it calls for help.",
    ],
  },
  {
    title: "Wounds",
    art: big("claw", "var(--vermilion)"),
    lines: [
      "Each wound makes you discard a card. You choose which.",
      "Block from guard cards stops wounds before they land.",
      "If wounds would take your last card, the run ends.",
    ],
  },
  {
    title: "Coil",
    art: `<span class="guide-rings"><i class="on"></i><i class="on"></i><i></i></span>`,
    lines: [
      "Cards you keep through a turn coil: they gain a gold ring and grow stronger.",
      "Up to three rings. Playing or losing a card resets it.",
      "Holding makes you strong; playing makes you act. That is the whole game.",
    ],
  },
  {
    title: "Devour and grow",
    art: big("body"),
    lines: [
      "Win a fight and devour a husk: its card joins your deck and your max hand grows by one.",
      "A bigger body opens fights with more cards.",
      "At 9 cards you are Big: every hit on you lands one more wound.",
    ],
  },
  {
    title: "Scars and the descent",
    art: big("scar", "var(--vermilion)"),
    lines: [
      "End a fight with fewer than 4 cards and you scar: max hand shrinks until you mend.",
      "Pick your path down the map. Rests mend scars, upgrade or remove cards. The Burrower trades for glint.",
      "Three strata deep, something is waiting. It looks familiar.",
    ],
  },
];

/** One-time tips, keyed by the moment they explain. */
export const TIPS: Record<string, string> = {
  hand: "Your hand is your body. Each card is a scale; run out and you die.",
  play: "Tap a card to pick it up, then tap it again to play it.",
  might: "Might is the cards you hold. Spending a card makes your next hits smaller.",
  end: "When you're done, end your turn. Cards you keep coil and grow stronger.",
  wound: "Wounds make you discard. Choose what to lose; keep what you need.",
  block: "Guards like Scale block wounds before they land.",
  coil: "Gold rings are coil. A coiled card hits harder; playing it resets it.",
  eat: "The maw icon eats your most-coiled card. Strike first, or spend it.",
  devour: "Devour one: its card joins your deck and your max hand grows by one.",
  map: "Choose your path down. You can see every room before you commit.",
  scars: "You ended thin and scarred: max hand is lower until you mend at a rest.",
  big: "Big: with 9+ cards you hit harder, but every hit on you lands one more wound.",
  poison: "Poison deals damage at the start of the enemy's turn, then fades by 1.",
  bind: "A knotted card can't be played this turn. It still counts for might.",
};

/** Keywords explained on inspect. */
export const GLOSSARY: Array<[RegExp, string, string]> = [
  [/\bmight\b/i, "Might", "Cards in your hand when this resolves (this card has already left)."],
  [/\bcoil/i, "Coil", "Gold rings a card gains each turn you keep it. Resets when played or lost."],
  [/\bShed\b/, "Shed", "Gone for the rest of this fight after it resolves. It returns next fight."],
  [/\bSacrifice\b/, "Sacrifice", "An extra cost: discard that many cards of your choice first."],
  [/\bBlock\b/, "Block", "Stops that many wounds this enemy turn."],
  [/\b[Pp]oison/, "Poison", "Deals its amount at the start of the enemy's turn, then drops by 1."],
  [/\bWeaken/, "Weaken", "The enemy's attacks land that many fewer wounds; drops by 1 each turn."],
  [/\bdevour/i, "Devour", "Add a husk's card to your deck and grow max hand by 1."],
  [/\bmax hand\b/i, "Max hand", "The most cards you can hold. Draws stop there."],
  [/\bBig\b/, "Big", "At 9+ cards every enemy hit lands 1 more wound."],
  [/\bscar/i, "Scar", "Each scar lowers max hand by 1 until mended."],
  [/\bCoiled\b/, "Coiled", "Applies only if played at coil 2 or more."],
  [/\bbind|\bbound\b/i, "Bind", "A bound card can't be played this turn."],
  [/\beat/i, "Eat", "Removes your most-coiled card to the discard pile."],
];

export function glossaryFor(text: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [re, word, def] of GLOSSARY) if (re.test(text) && !out.some(([w]) => w === word)) out.push([word, def]);
  return out;
}

/** Intent actions in words (enemy inspect). */
export function intentWords(k: string, n?: number, x?: number): string {
  switch (k) {
    case "atk": return x && x > 1 ? `Wounds ${n} × ${x}` : `Wounds ${n}`;
    case "eat": return x && x > 1 ? `Eats ${x} of your most-coiled cards` : "Eats your most-coiled card";
    case "bind": return x && x > 1 ? `Binds ${x} cards` : "Binds a card";
    case "poison": return `Poisons you ${n}`;
    case "block": return `Blocks ${n}`;
    case "buff": return `Grows stronger (+${n})`;
    case "summon": return `Calls ${x} more`;
    case "heal": return `Heals an ally ${n}`;
    case "daze": return "Dazes you: draw 1 less next turn";
    case "thorns": return "Bristles: each card that hits it costs you a wound";
    case "siren": return "Sings: your next strike hits you instead";
    case "slime": return "Slimes you: your next card also costs Sacrifice 1";
    case "swallow": return "Swallows a card from your draw pile for this fight";
    default: return "Rests";
  }
}

// Turns (ascension) 1-20: each adds information or execution pressure before raw stats (rule 19).
export const TURNS: string[] = [
  "",
  "Elites have 10% more health.",
  "One fewer rest each act.",
  "Multi-hit counts stay hidden until the enemy acts.",
  "Start with a scar.",
  "You become Big at 8 cards.",
  "Eat intents take one more card from act 2 on.",
  "Bosses turn to their second phase sooner.",
  "The Burrower charges 20% more.",
  "Husk choices show one fewer option.",
  "You become Heavy at 11.",
  "Start with two scars.",
  "Binds lock one more card.",
  "You become Big at 7 cards.",
  "Fights pay 25% less glint.",
  "Elites have 20% more health.",
  "Rests mend one fewer scar.",
  "Another rest is gone each act.",
  "Bosses have 10% more health.",
  "Draw one fewer card on the first turn of each fight.",
  "The Tail's strikes land one more wound.",
];

export const asc = (level: number, n: number): boolean => level >= n;

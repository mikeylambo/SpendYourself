// Every gameplay number lives here; the game and the balance sim both read it (slifer-tuning.md).
export const tuning = {
  body: {
    startMaxHand: 7,
    openingDraw: 6,
    /** Opening hand fills the body (max hand − 1) up to the Heavy size, then grows +1 per this many max hand… */
    openingGrowth: 2,
    /** …but never past this: a huge body no longer opens with 25 cards. */
    openingCap: 20,
    drawPerTurn: 3,
    heavyAt: 12,
    bigAt: 9,
    bigExtraWounds: 1,
    /** At this many cards in hand, Big lands one more wound per hit (two in all). */
    bigTier2At: 18,
    /** Might past this grows at half speed: a 20-card hand has 15 might, not 20. */
    mightKnee: 10,
    coilCap: 3,
    stormCoilCap: 5,
    scarFloor: 4, // end a fight below this many cards: one scar per card short
    /** At most this many scars from one fight, so one bad fight doesn't snowball. */
    scarCapPerFight: 2,
    /** Heavy's upside: your mass blocks this many wounds each enemy turn. */
    heavyBlock: 1,
    wornAt: 4, // effective max hand below this ends the run
  },
  /** Wound-choice pressure (slifer-tuning.md §9): extra cards each eat and bind intent takes. */
  pressure: {
    eatBonus: 0,
    bindBonus: 0,
  },
  devour: {
    perFight: 1,
    maxHandPerDevour: 1,
    huskOptions: 2,
    venomTwin: true,
    /** Devouring stops growing the body here (the husk still joins the deck). */
    maxHandCap: 30,
    /** Skipping a devour pays this much glint and mends a scar. */
    skipGlint: 25,
  },
  foes: {
    /** HP multipliers by act, so a grown body can't clear every room before it acts. */
    normalHp: [1, 1.4, 1.6],
    eliteHp: [1, 1.2, 1.4],
    /** Prey grows with the predator: normal and elite HP +this share per max hand above `sizeFrom`. */
    hpPerSize: 0.05,
    sizeFrom: 12,
    /** From this turn on, normal and elite foes gain +1 wound per hit at the end of each of their turns. */
    frenzyFrom: 6,
  },
  economy: {
    glintFight: [12, 20] as [number, number],
    glintElite: [30, 40] as [number, number],
    glintBoss: 80,
    cardPrice: { C: 45, U: 70, R: 140 } as Record<string, number>,
    bonePrice: [150, 300] as [number, number],
    mendPrice: 60,
    shedPrice: 50,
    shedStep: 25,
    restMend: 2,
  },
  map: {
    rows: 15,
    width: 7,
    paths: 6,
    weights: { fight: 45, event: 22, elite: 8, rest: 12, shop: 6, treasure: 7 } as Record<string, number>,
    treasureRow: 7,
    noElitesBefore: 4,
  },
};

export type Tuning = typeof tuning;

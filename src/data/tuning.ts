// Every gameplay number lives here; the game and the balance sim both read it (slifer-tuning.md).
export const tuning = {
  body: {
    startMaxHand: 7,
    openingDraw: 6,
    /** Opening hand fills the body (max hand − 1) up to the Heavy size, then grows +1 per this many max hand. */
    openingGrowth: 2,
    drawPerTurn: 3,
    heavyAt: 12,
    bigAt: 9,
    bigExtraWounds: 1,
    coilCap: 3,
    stormCoilCap: 5,
    scarFloor: 4, // end a fight below this many cards: one scar per card short
    wornAt: 4, // effective max hand below this ends the run
  },
  devour: {
    perFight: 1,
    maxHandPerDevour: 1,
    huskOptions: 2,
    venomTwin: true,
  },
  economy: {
    glintFight: [12, 20] as [number, number],
    glintElite: [30, 40] as [number, number],
    glintBoss: 80,
    cardPrice: { C: 45, U: 70, R: 140 } as Record<string, number>,
    bonePrice: [150, 300] as [number, number],
    mendPrice: 60,
    shedPrice: 75,
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

# Slifer / Spend Yourself: Tuning Model and Balance Sim

First-pass numbers for the builder, plus a bot-driven balance sim that keeps a no-energy deckbuilder winnable and tense. All gameplay values live in one data file (`tuning.json`) that the game and the sim both read. Numbers marked **(proto)** were what the playable prototype used.

## 1. The body

| Value | Default |
|---|---|
| Starting max hand | 7 **(proto)** |
| Opening draw each fight | 6 **(proto)** |
| Draw per turn | 3 **(proto)**; −1 while Heavy |
| Heavy threshold | max hand ≥ 12 |
| Big threshold | 9+ cards in hand **(proto)**; each enemy attack deals +1 wound |
| Death | a wound would take your last card, or you end a turn with 0 cards **(proto)** |
| Scars | at fight end, one per card short of 4 in hand; each scar −1 max hand |
| Worn to nothing | max hand below 4 ends the run |

## 2. Might and card math

- **Might** = cards in hand after the played card leaves (**proto**).
- Reference strike: Fang = 2 + m/2 + 2c (**proto**). At a 7-card hand with no coil, Fang deals 5; at 3 cards, 3; at 7 cards and coil 3, 11.
- **Rule of thumb:** a common strike should kill a common act 1 enemy (9 to 12 HP) in two plays from a healthy hand, or one play when coiled 3.
- **Hit-all:** about half a single-target card's value per enemy.
- **Block:** common guards block 2 + c (**proto** after tuning). A guard should cancel roughly one enemy's average attack.

## 3. Coil

| Value | Default |
|---|---|
| Coil per turn held | +1 at end of your turn **(proto)** |
| Cap | 3 (Storm 5) **(proto)** |
| Reset | on play, discard or eat |
| Upgraded card | starts each fight at coil 1 |

**Design check:** a card held two turns should be worth about double its fresh value. If holding is always right, raise wound pressure; if never right, raise coil multipliers before touching draw.

## 4. Devour and size

| Value | Default |
|---|---|
| Husks per kill | 1 (Venom: 2 if poisoned) |
| Devours per fight | 1 |
| Max hand per devour | +1 |
| Expected max hand by act | act 1 end ≈ 10, act 2 end ≈ 13, act 3 end ≈ 15 (before scars and sheds) |

Expected Big moments start in act 2. Heavy should be reachable but optional.

## 5. Wound pressure (the main difficulty dial)

Average wounds per enemy turn against a full fight, before block:

| Act | Normal fight | Elite | Boss |
|---|---|---|---|
| 1 | 1.5 to 2.5 | 3 to 4 | 4 to 5 |
| 2 | 2.5 to 3.5 | 4 to 5 | 5 to 6 |
| 3 | 3.5 to 4.5 | 5 to 7 | 6 to 8 |

**Core balance identity:** draw (3/turn) minus wounds should hover around **0 to +1** in a normal fight, so every card you play is a real cost. The prototype at first had draw 2 and two enemies, which left no room to act; draw 3 with one act 1 opener fixed it.

## 6. Economy

| Value | Default |
|---|---|
| Glint per fight | 12 to 20; elite 30 to 40; boss 80 |
| Card price | C 45, U 70, R 140 |
| Bone price | 150 to 300 |
| Mend at the Burrower | 60 (removes 1 scar) |
| Shed at the Burrower | 75, +25 each use |
| Rest: Mend | removes 2 scars |

## 7. Map

| Value | Default |
|---|---|
| Rows per act | 15, boss on 16 |
| Node mix | fights 45%, events 22%, elites 8%, rests 12%, Burrower 6%, treasure 7% |
| Guaranteed | a rest before every boss; a treasure at row 8 |
| Elites | none in the first 4 rows of act 1 |

## 8. Turns (ascension) ladder (summary)

Turn 1 elites +10% HP · 2 one less rest per act · 3 intents hide multi-hit counts until the turn starts · 4 start with 1 scar · 5 Big threshold 8 · 6 eat intents +1 per act · 7 boss phase 2 earlier · 8 shops +20% · 9 husk choice shows 1 less · 10 Heavy at 11 · 11 to 19 repeat the pattern on information and pressure · 20 the Tail plays its deck with +1 coil cap. (Difficulty by information and execution first, rule 19.)

## 9. Balance sim (CI)

A headless bot plays seeded runs against `tuning.json` using the same `BodyDeck` rules as the game.

- **Bots:** *Spender* (plays everything that kills or blocks), *Hoarder* (holds for coil, plays only at coil 2+), *Balanced* (greedy score: expected damage + block − might lost − wound risk), one per molt.
- **Runs:** 2,000 seeds per molt per build at Turn 0, 500 at Turn 10.
- **Pass bands at Turn 0:** Balanced bot wins 25% to 45%; Spender and Hoarder each win 8% to 30% (both styles must be viable, neither dominant); median death row in act 1 is row 9 or later; no single card in more than 60% of winning decks; no enemy causes more than 18% of deaths.
- **Coil check:** across all bots, cards played at coil 2+ deal at least 1.6× their fresh value on average.
- **Wound-choice check:** a bot that discards randomly on wounds wins at least 40% less often than Balanced. If it doesn't, wound choice isn't mattering and enemy eat and bind need sharpening.
- **Output:** a CI report with win rates, death heatmaps by enemy and row, card pick and win rates, and average max hand by act. A band breach fails the build.

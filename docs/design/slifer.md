# Slifer / Spend Yourself: Handoff Spec

Status: **design complete, ready for build handoff** (2026-10-05). Codename *Slifer* (internal only; the name is Konami's and never ships). Working title: ***Spend Yourself*** *(default)*.
Owner: Mike. Built on the SLU Web Shell (`mikeylambo/Web-Game-Shell-v1.02`); its `AGENTS.md` constitution applies to every decision below.

**Pitch:** You are the hand. Every card you play is a piece of your body.

**Fantasy:** A young ouroboros, a serpent whose scales are living cards, devours its way down through the earth toward the one thing it has always been chasing: its own tail. Every strike costs it a scale. Every meal makes it bigger, stronger and easier to hit.

**Genre:** single-player roguelike deckbuilder. Branching three-act descent, three molts, ink-bestiary look. Web-first on the Shell.

**Thesis (from the card concept):** your hand is your health, your attack and your options at once. Spending yourself is the only way to act; devouring others is the only way to grow. **Every turn asks what part of yourself you will give up, and what you are willing to take.**

**Playable prototypes (2026-10-04):** Hand Deckbuilder (chosen): https://claude.ai/artifact/RB5MmxQdRhgAXoeAdrW1W4 · Grid Serpent (shelved sibling): https://claude.ai/artifact/N528a5gWNptWGYXcfzahc9 · source in `prototypes/`. Tested only with scripted random-input runs in headless Chromium (no script errors); balance, gamepad and real phones untested.

---

## 1. Decisions log (Mike)

| Date | Decision | Choice | Rejected |
|---|---|---|---|
| 2026-10-04 | Format | **Single-player roguelike deckbuilder**, chosen after playing both prototypes | Grid-tactics serpent (kept as a possible sibling), PvP duel, both at launch, Balatro-style hand roguelike, real-time card brawler |
| 2026-10-05 | Hero | **An original ouroboros**: tail-eating earth and deep-water serpent whose scales are cards. No wings, not red, no sky, ring silhouette, to stay clear of the Slifer card | Spent magus (may return as a story layer), human-to-serpent blend, hungry void |
| 2026-10-05 | Run structure | **Branching descent**: 3 acts (earth, roots, deep water), Spire-style maps, final boss is your own tail | Ring laps, ante ladder |
| 2026-10-05 | Variety | **Molts**: one ouroboros, 3 molts, each with a starter deck, passive and 30 cards, plus 75 shared | Several serpents, one pool |
| 2026-10-05 | Play cost | **Body only**: no energy. Every play shrinks the hand | Breath energy, fatigue discards |
| 2026-10-05 | Art | **Ink bestiary**, then (same day) **Mike's poster-collage card board with generated illustrations**; originally: engraved ink and halftone (the Infinite Cards ink-noir lineage), creatures and emblems built in code, about 10 painted key arts | Painted cards, flat graphic |

From the original chat (2026-10-03): hand size is HP; attack scales with hand size; coil and strike; devour raises max hand; deckbuilder before any serpent action game; original names and art only.

Defaults Claude picked where Mike didn't specify are marked *(default)* and are cheap to change.

**Distinct from the other handoffs:** Last Law (Infinite Cards) removes rules from a 3D action roguelite; Busted Blader is a survivors game; Mirroring is authored arena action. This is the only turn-based card game in the set, and the only one where health and offense are the same resource.

## 2. World, hero and frame

**The Deep** *(default)*: three strata under a nameless surface.
1. **Topsoil:** worm warrens, buried bones, beetle courts. Things that burrow and nibble.
2. **The Roots:** a drowned forest's root system, fungus lords, sap-drinkers. Things that bind and drain.
3. **The Deep Water:** an underground sea, blind fish, pressure, old drowned things. Things that crush and devour.

**Uro** *(default name)* is the ouroboros: young, small, always hungry, and drawn downward by a pull it can't name. At the bottom of the Deep it finds the end of itself: **the Tail**, which has grown wild and hungry on its own.

**Story delivery:** wordless. A painted plate opens each act, enemies are named only on hover or long-press, events use one or two lines plus their choices, and the two endings are painted sequences with no narration (rule 8).

**Subtle frame (structural, never stated):** giving and hunger. "Spend yourselves on behalf of the hungry" (Isaiah 58:10) maps onto the loop: you act only by spending yourself, and you grow only by taking. The final choice (section 8) asks which one you are. No scripture, religious names or iconography appear in the game.

## 3. Core rules

### Your hand is your body
- **Hand size is your health.** Each **wound** makes you discard one card of your choice. If a wound would take your last card, or you end your turn with no cards, Uro dies and the run ends.
- **Might = cards in hand.** Card effects read might at the moment they resolve, *after* the played card leaves your hand. A full hand hits like a god; every play makes the next one weaker.
- **No energy.** You may play as many cards as you dare. The body is the only cost.
- **Draw 3** at the start of each turn, up to your max hand. Start each fight by drawing 6 *(defaults; molts modify)*.
- **Block** stops wounds before they land and clears at the start of your turn.

### Coil and strike
- Each card **coils** by 1 for every turn it stays in your hand (max 3), shown as gold rings on the card.
- Coil multiplies a card's effect (each card states its coil bonus). Playing or discarding a card resets its coil.
- **Hoarding is power:** holding cards makes them stronger and keeps your might high, but you act less.

### Devour and size
- Every enemy killed leaves a **husk**: the card it would become. At fight end, choose **one husk to devour** (or skip). It joins your deck and raises **max hand by 1**.
- **Big:** at 9 or more cards in hand, every enemy attack on you deals **+1 wound**. Bigger is mightier but easier to hit.
- **Heavy:** at max hand 12 or more, draw 1 fewer per turn *(default)*. Bigger is slower.

### Scars (run attrition)
- Ending a fight with fewer than 4 cards in hand leaves **scars**: one per card short of 4. Each scar lowers max hand by 1 until mended.
- Scars are the run-level cost of fighting thin. Rests and some events mend them (section 7).
- Max hand starts at **7** *(default)*. If scars ever bring max hand below 4, the run ends ("worn to nothing") *(default)*.

## 4. Molts (run variety)

Pick one molt per run. Each has a starter deck of 10, a passive, and 30 molt cards that appear in its rewards alongside the 75 shared cards.

| Molt | Playstyle | Passive *(default)* |
|---|---|---|
| **Venom** | Poison, devour, growing huge | **Hunger:** enemies that die poisoned leave two husks; devour both |
| **Tide** | Block, draw, cycling, thriving small | **Undertow:** whenever you have 3 or fewer cards in hand, draw 1 extra next turn, and wounds can't take your last card that turn |
| **Storm** | Coil, hoarding, one huge strike | **Charge:** coil caps at 5 instead of 3; at the start of each fight, 2 random cards begin coiled |

Unlocks: Venom is available at first launch; Tide unlocks after reaching act 2; Storm after the first act 3 boss *(default)*. Full starter decks and card lists: `slifer-content.md`.

## 5. Combat

- **Enemies** show **intents** before your turn: wounds (claw + number, ×N for multi-hits), eat (removes your highest-coil card), bind (locks a card in hand for a turn), poison, buff, summon. Intents use shape and icon first, color second (rule 9).
- **Targeting:** tap an enemy to target; single-target cards default to the last target.
- **Turn flow:** draw → play any cards → end turn (held cards coil) → enemies act → choose wounds → next turn.
- **Choosing wounds is the core moment.** The game never auto-picks; a clear "choose N to lose" state takes over the hand, on every device.

### Controls (semantic actions)
`card.select`, `card.play`, `card.inspect`, `target.next`, `target.prev`, `target.pick`, `turn.end`, `wound.choose`, `map.move`, `ui.confirm`, `ui.back`, `pause`. Mouse, keyboard, gamepad and touch all map to them; the whole boot, menu, map, fight, reward, shop, rest, results, retry and return loop works on every device (rule 10).
- **Touch:** portrait-first. The hand is a coiled arc in the bottom thumb zone; tap selects, tap again (or tap an enemy) plays, long-press inspects. No hover dependence (rule 11).
- **Gamepad:** shoulder buttons move along the hand, face buttons play, inspect and end turn; the d-pad cycles targets.
- **Keyboard:** 1–9 select and play, arrows target, Enter ends the turn (as in the prototype).

## 6. Run structure: the branching descent

- **Three acts**, each a branching map of about 15 rows: fights, elites, rests, events, the Burrower (shop), treasure, and the act boss.
- **Act bosses:** Topsoil: **the Beetle Queen**; Roots: **the Mycelial Choir**; Deep Water: **the Drowned Mouth** *(default names)*.
- **Final fight: the Tail.** It fights with a mirror of your own deck (section 8).
- **Run length:** about 45 to 60 minutes for a full descent *(default target)*.

## 7. Nodes, rewards and economy

| Node | What happens |
|---|---|
| Fight | 1 to 4 enemies; devour one husk at the end, plus glint |
| Elite | Harder fight; devour, glint and a **bone** (relic) |
| Rest | Choose one: **Mend** (remove 2 scars), **Coil** (upgrade a card permanently), **Shed** (remove a card from your deck) |
| Event | A one- or two-line situation with 2 to 3 choices (30 events) |
| The Burrower | Shop: buy cards, bones and mends with glint; pay to shed a card |
| Treasure | A bone |
| Boss | Devour a rare husk, take a boss bone, and descend |

- **Bones** are relics: things Uro has swallowed that change rules (60 at launch).
- **Glint** *(default name)* is the currency.
- Upgraded ("coiled") cards start each fight with 1 coil and gain the bonus listed per card.

## 8. Finale and endings

At the bottom of the Deep Water, Uro meets **the Tail**: the other end of itself, grown wild.
- **Phase 1:** the Tail plays cards drawn from a copy of your current deck, using the same might and coil rules. Everything you've devoured comes back at you.
- **Phase 2:** it starts devouring your hand directly (eat intents every other turn).
- **The choice.** When the Tail is down to its last card, a final card enters your hand: **Close the Ring**. Keep fighting to destroy the Tail, or play Close the Ring.

| Ending | How | What it is |
|---|---|---|
| **Devour** | Defeat the Tail outright | Uro swallows its tail; the ring closes and grows. Painted coda: a vast ouroboros circling the world |
| **Give** | Play Close the Ring | Uro spends its whole body at once to release the Tail: every remaining card is discarded, and Uro dissolves into the Deep, which comes alive with new growth. Painted coda: the surface in bloom |

Both count as wins and unlock the next **Turn** (ascension). Neither is presented as right. The game records which ending you chose per molt; seeing both with all three molts unlocks a final painted plate *(default)*.

## 9. Post-game

- **Turns (ascension):** 20 levels, each adding information and execution pressure before raw stats (rule 19): sharper intents, more eat and bind, fewer rests, starting scars, a lower Big threshold.
- **Daily Descent:** one seeded run per day with a leaderboard.
- **Run history and card library:** every card and bone seen, with your stats.

## 10. Launch content

| Item | Count |
|---|---|
| Molts | 3 (Venom, Tide, Storm) |
| Cards | 165 (75 shared, 30 per molt) plus Close the Ring |
| Bones (relics) | 60 |
| Enemies | 24 normal, 9 elites, 3 act bosses, the Tail |
| Events | 30 |
| Acts | 3 plus the finale |
| Modes | Descent, Turns 1 to 20, Daily Descent |

Full data sheets: `slifer-content.md`.

## 11. Art direction (summary; full rules in the art bible)

- **Ink bestiary:** every creature drawn as an engraved plate from an old natural-history book: cross-hatching, stipple and halftone shadow on warm bone-colored paper.
- **Card style follows Mike's style board** (`reference/slifer-style-board.png`, 2026-10-05): condensed poster type, bone-paper text panels, one accent band per element.
- **Illustrations are generated** with ChatGPT image generation from `slifer-art-prompts.md` (2026-10-05, Mike): 166 card arts, 37 creature plates, 10 key arts, 4 textures. Frames, text, numbers, coil and intents are drawn in code over them.
- **Color is scarce and meaningful:** ink and paper everywhere; **gold** means coil; each molt has one accent ink; enemy intents use vermilion ink with distinct icon shapes.
- **The hand is the hero:** cards render as Uro's scales along a coiled body across the bottom of the screen; when you're thin, the body is visibly short and frayed.

## 12. Audio

- **The body sound:** every card leaving the hand is a scale tearing (soft for plays, raw for wounds). Coil is a rising wooden creak; a fully coiled card hums.
- **Devour** is a deep swallow with a low resonance that grows with max hand.
- Music: low strings, frame drums and bowed metal; stems deepen per act and thin out as your hand shrinks.
- **Semantic events:** `card.draw`, `card.play`, `card.coil`, `card.coil.max`, `wound.incoming`, `wound.choose`, `wound.take`, `block.gain`, `block.absorb`, `enemy.hit`, `enemy.die`, `husk.devour`, `size.big`, `scar.gain`, `scar.mend`, `intent.eat`, `map.move`, `ui.confirm`. Asset choice, layering and buses live in the audio layer (rule 17). Every audio cue has a visual equivalent (rule 9).

## 13. Tech plan

- **Renderer:** the Shell's `canvas2d` adapter for creatures, board and VFX, with DOM UI for cards and menus. One fullscreen WebGL2 pass adds halftone and paper grain, with a Canvas fallback. No Three.js (the Shell stays renderer-neutral).
- **Assemblies and modules:** start from the Shell's `strategy` frame with `rules` (RulesetManager for Turns modifiers), `economy` (glint), `inventory` (bones), `progression` (molt unlocks, Turns), `results`, `leaderboards` (Daily Descent), `replay` and `training`, plus `DeterministicRNG` and `SaveManager`.
- **New module, built in the Shell: `BodyDeck`.** Pure, renderer-free rules for a deck whose hand is a body: piles (draw, hand, discard, exhaust), might, wounds and wound choice, block, coil, devour and husks, Big and Heavy, scars. Every card effect reads and writes through it. Portable to C# or GDScript. Likely reuse: **Pot of Greed** (anteing pieces of yourself), **Discard to Ascend** (burying cards to rise later), **Graverobber** (building from enemies' spent abilities).
- **Game-side:** `IntentDirector` owns enemy patterns and intent display so readability is tuned in one place; `MapGen` builds the branching acts from seeds.
- **Saves:** the run auto-saves after every node and every turn (resume anywhere); meta progress (unlocks, Turns, endings, history) goes through Shell persistence with schema versioning from day one (rule 20).
- **Performance:** the worst case is a 4-enemy fight with a 14-card hand, full coil glows, a hit-all card and the halftone pass on a mid-range phone (rule 14). Engraving geometry is cached per creature; the hatching is baked once per creature, not per frame.

## 14. Platforms, price and release *(defaults, matching the other handoffs)*

1. **Web launch on itch.io**, with act 1 and the Venom molt as a free demo on web portals.
2. **Steam plus iOS/Android together**, through the shared native wrapper chosen once for every game.

Price defaults: **$14.99 on Steam, $7.99 premium on mobile, $12.99 on itch.** Roguelike deckbuilders sell from $14.99 (Balatro) to $24.99 (Slay the Spire).

## 15. Open decisions

1. Shipping title (default *Spend Yourself*; alternatives *Tailbiter*, *Uro*, *Coil*) and the names Uro, the Deep, glint, the Burrower and the act bosses.
2. Whether the human-to-serpent blend returns as a story layer (rules unchanged).
3. Whether the Grid Serpent becomes a sibling game later.

## 16. Before launch

- Trademark search on the shipping title.
- Check the ouroboros silhouette, palette and card frames stay clear of the Slifer card (no red sky-dragon, no second mouth, no card-frame mimicry).
- Tune every default number in playtests (`slifer-tuning.md`) and keep the balance sim green in CI.

## 17. Build milestones to shelf

1. **Core:** `BodyDeck` in the Shell, the Venom starter deck, 8 Topsoil enemies, the fight screen with the coiled hand, wound choice, coil, devour, Big, scars, and the full Shell loop (boot, menu, fight, results, retry). Promote the prototype's feel rather than rewriting it (rule 5). **Playtest whether choosing wounds and holding for coil feel great before writing more content.**
2. **Act 1 complete:** map, all node types, the Beetle Queen, 25 bones, 10 events, Venom's 30 cards, the ink look on every creature. This is the portal demo.
3. **Acts 2 and 3:** Roots and Deep Water, their bosses, Tide.
4. **Finale and Storm:** the Tail, both endings, Storm, all 165 cards and 60 bones.
5. **Post-game:** Turns 1 to 20, Daily Descent, history and library.
6. **Release readiness:** the Shell's release-readiness pass in full.

## 18. Companion docs

- `slifer-content.md`: molts, starter decks, cards, bones, enemies, bosses and events, with semantic IDs.
- `slifer-onboarding.md`: the first run, fight by fight.
- `slifer-tuning.md`: numbers and the balance sim.
- `slifer-art-bible.md`: ink rules, palette, the hand as body, card layout, creatures and the style-frame brief.
- `slifer-art-prompts.md`: the image-generation pack (workflow, master style prompt, every card, enemy and key-art subject).

## Market check (2026-10-05, from knowledge, not a fresh search)

- **Gloomhaven** ties hand size to stamina and lets you lose cards to cancel damage: the closest cousin to choosing your wound. It has no might-from-hand, coil or devour.
- **Inscryption** makes sacrifice a play cost. **Slay the Spire**, **Monster Train** and **Balatro** set the proven run, map and shop structure this game borrows.
- No known commercial deckbuilder makes the hand your health and your attack at once with no energy, so the core tension is still uncommon.

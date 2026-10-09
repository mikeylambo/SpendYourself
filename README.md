# Spend Yourself

*You are the hand. Every card you play is a piece of your body.*

A single-player roguelike deckbuilder. Your hand is your health and your strength at once: no energy,
every play shrinks you, every wound makes you choose what to lose, and every meal makes you bigger,
stronger and easier to hit. Design docs: [`docs/design/`](docs/design/slifer.md).

## Run it

```bash
npm install
npm run dev        # play at http://localhost:5173  (?dev=1 exposes window.app)
npm test           # rules, content integrity, determinism, save/resume
npm run sim -- --runs 200 [--ci] [--out sim-report.json]   # balance sim
npm run build      # static build in dist/ (relative paths; drop on itch.io or any host)
```

## What's built (milestones 1–5)

- **The full descent**: three acts (Topsoil, the Roots, the Deep Water), each a branching 15-row map
  with fights, elites, rests, events, the Burrower, treasure and a boss: the Beetle Queen, the
  Mycelial Choir (three heads) and the Drowned Mouth. Then **the Tail**, which plays a copy of your
  own deck, and the choice: finish it (**Devour**) or play **Close the Ring** (**Give**). Both are
  wins, recorded per molt.
- **Three molts**: Venom, Tide and Storm, each with a starter deck, a passive and 30 cards, plus
  75 shared cards. A molt picker appears once Tide unlocks (reach the Roots); Storm unlocks after
  the Drowned Mouth.
- **Rules (`src/bodydeck`, `src/game`)**: `BodyDeck` (piles, might, wounds and wound choice, block,
  coil, Big, Heavy, scars), every enemy intent (wounds, multi-hit, eat, bind, poison, block, buff,
  summon, heal, daze, thorns, siren, slime, swallow), 33 enemies, 9 elites, 60 bones, 18 events,
  deterministic seeded RNG, run save/resume at every turn and node.
- **Post-game**: Turns 1–20 (`src/data/turns.ts`, unlocked one at a time by winning), a date-seeded
  **Daily Descent** after three runs (local best per day; an online leaderboard needs a server),
  run history, a card library of everything you've seen, and the bones list.
- **Teaching**: an 8-page **How to Play** (shown before the first run, reopenable from the title),
  one-time **coach tips** the first time each rule shows up on the board, **long-press an enemy**
  for its next moves in words, and a **keyword glossary** when you inspect a card. Tips can be
  turned off or reset in Settings.
- **Presentation (`src/ui`)**: the style board's ink-on-bone poster look; paper darkens per act
  (bone, vellum, drowned grey with inverted ink); procedural engraved plates for every creature,
  card emblems, Uro's body under the hand, the ring on title, rests and results; endings get their
  own codas. Semantic synthesized audio with a drone that thins as the hand shrinks.
- **Input**: one semantic layer. Touch (tap, tap again or tap an enemy to play, long-press to
  inspect), mouse, keyboard (1–9 select/play, arrows target, Space play, Enter end turn, Q/E move,
  I inspect, Esc pause), gamepad (LB/RB move, A play, X end turn, Y inspect, d-pad target, Start pause).
- **Balance sim + CI**: Balanced, Spender, Hoarder and random-wound bots play seeded full runs per
  molt (`npm run sim -- --molt tide --turn 5`); CI runs typecheck, tests, build and the sim report.

## Built on the SLU Web Shell

`@slu/web-shell` is vendored as a built package in `vendor/slu-web-shell` (the Shell repo is private,
so a git dependency would break CI and deploys). The game uses its `SaveManager` (versioned saves
with staging, backup and integrity checks), `DeterministicRng`, `InputManager` and
`BrowserInputSource`. It does not use the Shell's generic DOM menus, since the game draws its own UI in
the art bible's style. `BodyDeck` is renderer-free and has no dependencies, so it can move into the
Shell's `modules/` as-is.

## Art

Every illustration is procedural until generated art lands. Drop files named by id into `art/`
(see [`art/README.md`](art/README.md)) and they replace the engravings at build time.

## Decisions taken during the build (all reversible; numbers in `src/data/tuning.ts`)

1. **The opening hand grows with the body**: it fills to max hand − 1 up to the Heavy size (12),
   then grows one card per two max hand. With a flat 6, devouring only raised a cap the hand never
   reached; with a full fill, late bodies of 25+ cards trivialised act 3. It never passes 20 cards.
6. **The snowball fix** (after a playtest that one-turned nearly every room past act 1 with a
   43-card body). Damage grew with the square of hand size (each card hits for about might ÷ 2,
   and you play many of them), while prey HP was flat. Now:
   - **Might knee**: past 10, every two cards add one might.
   - **Prey grows with you**: normal foes ×1 / 1.4 / 1.6 HP by act, elites ×1 / 1.2 / 1.4, and
     both +5% per max hand above 12. Bosses are tuned by hand (Beetle Queen now 85 HP).
   - **Frenzy**: from turn 6, normal and elite foes hit +1 harder every turn, so holding forever
     never pays.
   - **Big tier 2**: at 18+ cards every hit lands two extra wounds.
   - **Growth stops at 30** max hand; **skipping a devour** pays 25 glint and mends a scar.
   - Venom's poison ticks +1 per stratum below the first, so flat poison keeps pace with HP.
   Pace (balanced bot): act 2–3 normal fights now average 2.5–4 turns (from ~1), elites 5+.
   Hard caps on the opening hand were tested and rejected: an opening of 11–16 turned every boss
   into a wall for every bot.
2. **Venom's twin husk** adds both cards but one growth step.
3. **First-pass numbers trimmed by the sim**: Beetle Queen 100 HP, phase 2 wounds 5, one grub per
   summon in phase 2; Wasp Court alternates 1 and 2 wounds instead of 2 every turn; Choir heads
   45 HP each (from 60) with a 6 heal (from 8).
   Tide's Riptide draws only while you hold 3 or fewer (the spec draws always): a strike that
   replaces itself costs nothing in a game where cards are health.
4. **The Tail** has max hand × 12 health (counting at most 15 cards, the size the docs expect by act 3), draws two cards a turn from a copy of your deck (three
   below half), and turns strikes into wounds (damage ÷ 4), guards into block and the rest into
   strength or poison. Close the Ring appears when it is down to its last 12 health ("last card").
5. Interpretations where the docs were open: Thorn Knot's bristle costs you a wound per card that
   hits it; Sirens make your next strike a wound to yourself; Coax redirects double the wounds as
   damage to another enemy; the Drowned Mouth swallows from your draw pile for the fight only.

7. **Choices that matter** (refinement pass): scars cap at 2 per fight; Heavy blocks 1 wound a
   turn (its upside for drawing 1 less); elites offer a choice of two bones; every act has a
   Burrower in its back half; resting with 16+ cards sheds two; Shed at the Burrower costs 50.
   Fang, Scale, Constrict and Hiss Strike have their own upgrades, and several strikes scale
   harder with coil. New cards: wound triggers (Bitter Scale, Molting Pain), lost-body cards
   (Reclaim, Phantom Limb) and spending cards for Venom (Empty Belly, Last Gasp) and Storm
   (Spent Bolt, Eye of the Storm). Act 3 enemies each have a signature (daze, lure, pin, heal,
   swallow, sting). The Tail turns your bones on you. A Give ending sends the Tail Scale into
   your next run. All 30 events and 60 bones from the content doc are in.

## Playtest and release tools

- **Settings → Report a problem** copies the version, device, run seed and the last 20 uncaught
  errors. **Copy / Load save code** moves a whole save between devices (the foundation for cloud
  save). **What's new** reads `CHANGELOG.md`; the version shows on the title.
- **Library → History**: replay any run's seed (↻) and see where your runs end, by enemy and stratum.
  The molt picker takes a typed seed.
- **Daily leaderboard**: set `VITE_LEADERBOARD_URL` at build time and Daily results (not assisted
  runs) are POSTed there as `{date, molt, win, row, seed}`. Unset, nothing leaves the device.
- **Undo assist** (Settings): undo the last card this turn; the run is marked assisted.
- **CI** gates on the balance sim (`npm run sim -- --runs 200 --ci`), bands in `tools/sim.ts`.
- Performance: a full fight redraw at 4× CPU throttle with 4 enemies and 14 cards takes ~11 ms
  (only changed cards are rebuilt).
- Art and sound slots: `art/` (see its README) and `audio/` (recorded takes by cue id).

## Before launch

- Trademark search on "Spend Yourself" and the Uro name; keep the serpent art clear of the
  Slifer card it riffs on (the spec's pre-launch list). Not done here.
- Test on real phones and a physical gamepad (headless Chromium covered phone, landscape and
  desktop sizes, keyboard and a simulated pad).

## Known gaps / next

- Balance (80 full runs per molt, balanced bot, after the snowball fix): Venom 11%, Storm 6–13%,
  Tide 33%. The bots are deliberately below the old band now: they play far worse than people.
  Tide still leads; waiting on more human runs before touching it.
- Balance: see the latest sim report (CI artifact). Spender is still not viable and wound choice
  isn't mattering enough; the tuning doc's levers are eat and bind pressure.
- Not yet tested on real phones or a physical gamepad (headless Chromium at phone and desktop
  sizes, keyboard, and a simulated standard gamepad only). No WebGL halftone pass; paper grain is CSS.
- Online Daily leaderboard, cloud saves and the native wrappers (milestone 6 territory).

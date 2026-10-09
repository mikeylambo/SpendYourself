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
   reached; with a full fill, late bodies of 25+ cards trivialised act 3.
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

## Known gaps / next

- Balance (100 full runs per molt, balanced bot): Venom 33%, Storm 23%, Tide 57% against the
  doc's 25–45% band. Tide's edge comes from its starter and its block/draw pool, not one card.
- Balance: see the latest sim report (CI artifact). Spender is still not viable and wound choice
  isn't mattering enough; the tuning doc's levers are eat and bind pressure.
- Not yet tested on real phones or a physical gamepad (headless Chromium at phone and desktop
  sizes, keyboard, and a simulated standard gamepad only). No WebGL halftone pass; paper grain is CSS.
- Online Daily leaderboard, cloud saves and the native wrappers (milestone 6 territory).

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

## What's built (milestones 1–2: the act 1 portal demo)

- **Rules (`src/bodydeck`, `src/game`)**: `BodyDeck` (piles, might, wounds and wound choice, block,
  coil, Big, Heavy, scars), the combat engine with every enemy intent (wounds, multi-hit, eat, bind,
  poison, block, buff, summon, heal, daze), devour and husks, Venom's Hunger, deterministic seeded
  RNG streams, run save/resume at every turn and node.
- **Content**: Venom molt; all **75 shared cards** and **Venom's 30**; **58 bones**; **18 events**;
  act 1 (Topsoil) with **8 enemies + the grub**, **3 elites** and **the Beetle Queen** (two phases);
  branching 15-row map with fights, elites, rests (Mend / Coil / Shed), the Burrower, treasure and events.
- **Presentation (`src/ui`)**: the style board's ink-on-bone poster look, procedural engraved creature
  plates and card emblems, Uro's body drawn under the hand (thickens when Big, frays when thin),
  live card numbers with coil-raised numbers in gold, intents by shape first, semantic synthesized
  audio (scale tear, coil creak, swallow) with a drone that thins as the hand shrinks.
- **Input**: one semantic layer. Touch (tap, tap again or tap an enemy to play, long-press to
  inspect), mouse, keyboard (1–9 play, arrows target, Space play, Enter end turn, Q/E move, I
  inspect, Esc pause), gamepad (LB/RB move, A play, X end turn, Y inspect, d-pad target, Start pause).
- **Onboarding** per `slifer-onboarding.md` on the first run (scripted first three fights, one-time
  prompts). **Assists**: wound confirm, next-move preview, fight speed, text size, reduced motion,
  high-contrast ink.
- **Balance sim + CI**: Balanced, Spender, Hoarder and random-wound bots play seeded runs against the
  same rules (`tools/sim.ts`); CI runs typecheck, tests, build and the sim report.

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

## Decisions taken during the build (all reversible, all in `src/data/tuning.ts`)

1. **The opening hand fills the body**: `max(6, max hand − 1)` instead of a flat 6. With a flat 6,
   devouring only raised a cap the hand never reached (the sim's bots hit max hand 18 with 3–6 cards
   in hand), so devouring didn't make Uro bigger or stronger. Now a big body opens big, which also
   brings Big and Heavy into play as designed. At max hand 7 it is still 6.
2. **Venom's twin husk** adds both cards but one growth step (+1 max hand), not two. Two steps pushed
   act 1 max hand to about 20 against the tuning doc's target of about 10.

## Known gaps / next

- Acts 2 and 3, Tide and Storm, the Tail and both endings, Turns, Daily Descent, library and
  history screens (milestones 3–5).
- Balance (act 1 sim, 100 runs per bot): Balanced 67%, Hoarder 65%, Spender 0%, random-wound bot 66%.
  Spender isn't viable yet, and wound choice isn't mattering enough. The tuning doc says to sharpen
  eat and bind for the second.
- Not yet tested on real phones or with a physical gamepad (only headless Chromium at phone and
  desktop sizes, plus keyboard). No WebGL halftone pass yet; paper grain is a CSS noise layer.

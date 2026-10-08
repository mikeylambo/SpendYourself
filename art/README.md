# Generated art

Drop generated illustrations here, named by semantic id (see `docs/design/slifer-art-prompts.md`):

- `art/cards/card.fang.png`, `art/cards/venom.drip.png`, …
- `art/foes/foe.gnawer.png`, `art/foes/boss.beetle_queen.png`, … (transparent background)
- `art/key/…`

Any `.png`, `.webp` or `.jpg` under `art/` is picked up at build time and replaces the procedural
engraving for that id. No gameplay code changes; frames, text, numbers and coil stay in code.

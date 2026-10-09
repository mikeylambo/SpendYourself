# Recorded sound

Drop a recorded take here named after the cue it replaces and it plays instead of the synth:

- `wound.take.ogg`: the scale tearing (the signature sound)
- `husk.devour.ogg`: the swallow (pitched down automatically as the body grows)
- `card.play.ogg`, `card.coil.ogg`, `block.absorb.ogg`, `enemy.hit.ogg`, `fight.win.ogg`, …

Several takes of one cue (`wound.take.1.ogg`, `wound.take.2.ogg`) are picked at random with a little
pitch drift. Any cue id in `src/ui/audio.ts` works. `.ogg`, `.mp3`, `.wav` and `.m4a` are accepted;
ship `.m4a` or `.mp3` too if you need Safari before 17.

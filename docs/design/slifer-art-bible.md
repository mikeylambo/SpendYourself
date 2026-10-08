# Slifer / Spend Yourself: Art Bible and Style-Frame Brief

Companion to `slifer.md` (section 11). **Look: the ink bestiary, as an engraved poster collage.** Updated 2026-10-05 around Mike's style board (`reference/slifer-style-board.png`): condensed poster type, bone-paper text panels, one accent band per element, engraved line work layered over bold geometric shapes, worn letterpress texture. Lineage: the ink-noir halftone from the Infinite Cards prototype (https://claude.ai/artifact/9ThqKXPw5MxRKfxiDUvjo9).

**How the art is made (changed 2026-10-05, Mike):** card, enemy and key-art illustrations are generated with ChatGPT image generation from `slifer-art-prompts.md` (217 images). Everything with text or state (frames, titles, labels, numbers, coil rings, rarity, intents) is built in code over the generated art.

Everything here serves three priorities, in order: gameplay readability (intent, coil, hand size), the thesis made visible (the hand is the body), and the bestiary's quiet, mythic tone.

---

## 1. Pillars

1. **The hand is the hero.** Uro's body is drawn along the bottom of the screen, and the cards are its scales. Hand size, coil and wounds are read from the body before any number.
2. **Ink on bone paper, poster-bold.** Engraved line work, hatching and halftone on warm paper, set against bold circles, half-moons and diagonal bands. Color is rare, so wherever it appears, it means something.
3. **Down is darker.** Each act sinks deeper: paper darkens, hatching thickens, white space shrinks. By the Deep Water the page is nearly all ink, and the creatures are lit by their own lures.

## 2. Palette

| Token | Use | Value |
|---|---|---|
| Bone paper | Backgrounds, card faces (act 1) | `#ece3cf` |
| Vellum shadow | Paper in act 2 | `#d6c9ac` |
| Drowned paper | Paper in act 3 | `#4a4a4f` with light ink inverted |
| Iron ink | All line work | `#1d1b1a` |
| Coil gold | Coil rings, charged cards, devour glow. **Never in card or enemy illustrations** (Mike's board gave Patient Ring a gold band; that moves to ink and bone) | `#d9a432` |
| Intent vermilion | Enemy intents and wound marks only, always with an icon shape. **No red on any card** (the board's red Fang becomes ink and bone) | `#c4462e` |
| Venom ink | Venom molt accent | `#8fa63a` |
| Tide ink | Tide molt accent | `#2f7d86` |
| Storm ink | Storm molt accent | `#7a5cc4` |

Uro is ink with scales picked out in the active molt's accent. **Never red, never a sky-dragon, never two mouths:** keep clear of the Slifer card.

## 3. Uro and the hand

- **Silhouette:** a ring. Uro's resting pose on title and map screens is the ouroboros circle, tail nearly in its mouth. No wings, no limbs, no horns; a blunt, ancient head with a single row of fine teeth.
- **In fights:** the body enters from the left edge, arcs along the bottom thumb zone, and the head rests at the left. Each card is a scale plate on the arc.
- **Hand size reads as length.** Big hands are long, thick coils; at 3 or fewer cards the body is short, the scales lift and fray, and the tail end shows bare ink lines.
- **Coil reads as tightening.** Each coil level adds a gold ring to the card and pulls its segment of the body a little tighter. At max coil the segment glows and hums.
- **Wounds read as tearing.** A wound-discarded card tears off the body with ink spatter; a played card peels off cleanly. You can tell spending from wounding by the motion alone.
- **Devour reads as swallowing.** The husk card slides into the head and travels down the body as a bulge until it becomes a new scale at the tail.

## 4. Cards (from the style board)

- **Layout:** portrait card. Top 60%: the illustration window, with the card name set vertically-stacked in a condensed poster face top-left (board style). A thin vertical ornament runs down the right edge. Bottom 40%: the bone-paper text panel with effect text in a book serif.
- **Accent band:** a vertical band of the card's accent runs down one edge of the art window. Shared cards use bone and ink only; Venom green, Tide teal and Storm violet mark molt cards.
- **Type:** shown three ways (rule 9): the label (STRIKE, GUARD, BODY, RITE) with its icon (compass for strike, shield for guard, circle for body, figure-eight for rite), **and** the shape of the card's top edge: pointed for strikes, flat for guards, rounded for body, notched for rites.
- **Coil:** the bottom-right glyph becomes three empty rings that fill gold as the card coils (five for Storm). Gold appears nowhere else on a card.
- **Numbers, not formulas:** cards show live values ("Deal 7") that update as might and coil change. Inspecting a card shows the breakdown. The notation in `slifer-content.md` is for designers only.
- **Rarity:** the bottom ornament line: plain for common, one diamond for uncommon, a gold-free filled diamond with a double rule for rare.
- **Compact hand face:** at phone size (about 75 px wide) a hand card shows only the name, a cropped art square, the main number and the coil rings. The full card appears on inspect or when selected.
- **Art:** a generated illustration per card (`slifer-art-prompts.md`), cropped into the window by code. No text in the art.

## 5. Creatures

- **Construction:** each creature is a generated engraved plate on a transparent background (`slifer-art-prompts.md`, section 6). Bosses are split into 6 to 10 parts for animation.
- **Animation is tween-based:** idle breathing, a telegraph lean before acting, a recoil when hit, and a dissolve into scribbled lines on death. No skeletal rigs beyond 2 to 4 pivots.
- **Families by silhouette:** Topsoil creatures are low and wide, Roots creatures are tall and branching, Deep Water creatures are long and trailing with lures.
- **Bosses** are layered plates with 6 to 10 moving parts.

## 6. Intents and readability

- Intents sit above each enemy as vermilion **icons with distinct shapes**: claw (wounds) with a number, stacked claws (multi-hit) with ×N, maw (eat), knot (bind), drop (poison), up-chevron (buff), egg (summon), closed eye (resting).
- Numbers are always paired with icons; shape alone must carry the meaning in high-contrast and colorblind modes (rule 9).
- Targeted enemy: a thin engraved ring under its feet, never color alone.
- **Big state:** the body thickens and each claw number shows a small "+1" plate.

## 7. Map and screens

- **Map:** a cross-section of the earth engraved like a geological plate, with nodes as small engraved icons connected by burrow lines. Uro's ring marks your position.
- **Rest:** a hollow in the earth with Uro curled; three choices as engraved plates.
- **The Burrower:** a mole merchant drawn in the bestiary style, with wares laid out on a cloth.
- **Results:** the run as a single long plate: the body at its final length, with each devoured husk as a scale.

## 8. Key arts (10, generated; paint-over optional)

Title (Uro in the ring) · three molt plates (Venom, Tide, Storm) · three act openers (Topsoil, the Roots, the Deep Water) · the Tail · two ending codas (Devour: the world-circling ouroboros; Give: the surface in bloom). All are painted in an engraving-compatible style: limited palette, visible hatching, bone paper showing through.

## 9. VFX

- Hits: ink splashes and hatch scratches. Hit-all: a sweeping brushstroke.
- Poison: stippled bile dots in Venom ink. Block: an engraved plate that cracks as it absorbs wounds.
- Coil: gold rings drawn on with a pen-stroke animation.
- Halftone pass: a single fullscreen effect adds paper grain and halftone shading. Scale its strength by device tier; gameplay is identical at every tier.

## 10. Accessibility

- High-contrast ink mode: pure black on pure white, thicker lines.
- Reduced motion: no screen shake, simplified tearing and swallowing.
- Text scaling to 150% with card text reflowing.
- Colorblind: intents, card types and molts already differ by shape; accents are supplementary.

## 11. Style-frame brief

Produce 4 frames before production art:
1. **Act 1 fight, healthy:** two Gnawers and a Tunneler on bone paper, Uro's body long across the bottom with 8 scales, two of them gold-ringed. Venom accent.
2. **Act 2 fight, thin:** Rot Stag elite, Uro down to 3 frayed scales, choosing a wound (hand lifted, vermilion maw intent).
3. **Act 3 fight, Big:** Pressure Crab and a Lantern Angler on drowned paper, Uro's 11-scale body thick and glowing, lures lighting the scene.
4. **The Tail:** Uro facing its own tail across the page, both bodies made of the same cards.

# Slifer / Spend Yourself: Image Generation Pack

Everything needed to generate the full illustration set with ChatGPT image generation (or any similar model). Companion to `slifer-art-bible.md` and `slifer-content.md`. Style reference: `reference/slifer-style-board.png` (Mike's board, 2026-10-05).

**What the generator makes:** the art only. Card frames, titles, type labels, effect text, numbers, coil rings and rarity marks are all built in code, so they stay consistent and editable. **Never ask the model for text, frames or borders.**

---

## 1. Workflow

1. Open a fresh chat for each batch of about 10 images. Upload `reference/slifer-style-board.png` first and say: *"Use this board as the style reference for every image in this chat."*
2. Paste the **master style block** (section 2) once at the start of the chat.
3. For each image, paste the **category block** (section 3) plus the item's subject line from the tables, e.g. `Card art, VENOM. Subject: a black flower blooming from a puddle of bile, spores rising.`
4. Approve the first good image in each batch, then upload it back into the chat with *"Match this one's line weight, texture and contrast."* That keeps a batch consistent.
5. Save each file under the name in the table (`card.fang.png`) in `art/raw/`. The game's art registry maps IDs to files, so swapping an image later never touches gameplay code.
6. Reject and regenerate if any rule in section 4 is broken.

**Sizes:** card art 1024 × 1024 (code crops it into the frame's window; keep the subject inside the middle 80%). Enemies 1024 × 1024 on a transparent background. Key arts 1536 × 1024 (landscape), and 1024 × 1536 where noted for phone.

**Count:** 165 cards + 1 finale card, 37 enemies and bosses, 10 key arts, 4 molt/UI textures = **217 images**.

## 2. Master style block (paste once per chat)

> Style: dark editorial collage meets copperplate engraving. Deep ink-black ground with aged bone-paper texture showing through in places. Fine engraved line work, cross-hatching, stipple and halftone shading. Bold geometric shapes (circles, half-moons, diagonal bands) layered behind the subject like a printed poster. Limited palette: ink black, warm bone/cream, and one accent color per image as specified. Grainy print texture, slight wear and scuffs, like a letterpress card. Mythic, quiet, serious. No text, no letters, no numbers, no logos, no borders, no card frame, no watermark. Square composition, subject centered with breathing room.

## 3. Category blocks

| Category | Paste before the subject line |
|---|---|
| Shared card | `Card art, NEUTRAL. Ink black and bone cream only, no accent color, no gold.` |
| Venom card | `Card art, VENOM. Accent color: bile green (#8fa63a), used sparingly in drips, glows and splashes. No gold, no red.` |
| Tide card | `Card art, TIDE. Accent color: deep teal (#2f7d86), used in water, bands and highlights. No gold, no red.` |
| Storm card | `Card art, STORM. Accent color: static violet (#7a5cc4), with white-violet lightning. No gold, no red.` |
| Enemy | `Creature plate, engraved natural-history illustration of a single creature, three-quarter view facing the viewer, full body visible, transparent background, ink and bone only with a faint act tint as specified. No ground shadow, no scenery.` |
| Key art | `Painted key art in the same style, wider scene, the accent colors listed, gold allowed as specified.` |

Act tints for enemies: **Topsoil** warm umber `#6b5236` · **Roots** moss grey `#5d6650` · **Deep Water** cold slate `#3e4a57` (lures may glow pale cyan).

## 4. Hard rules (reject the image if broken)

- **No text of any kind**, no frames, no borders.
- **No red** anywhere in card or enemy art. Red is reserved for enemy intents in the UI.
- **No gold** in card or enemy art. Gold is reserved for coil, drawn by code. (Key arts may use gold where listed.)
- **The serpent is never a dragon:** no wings, no legs, no horns, no second mouth, no red or crimson scales, never in a sky full of clouds. When Uro appears, it is a smooth, ancient serpent whose scales look like small cards, ideally coiled in a ring.
- One clear subject per card. It must read as a silhouette at thumbnail size.
- No recognizable characters, brands or existing card art.

## 5. Card subjects

### Shared: strikes
| File | Subject |
|---|---|
| `card.fang.png` | a serpent's open jaw in profile, two long curved fangs, engraved scales |
| `card.lash.png` | a serpent's tail cracking through the air like a whip, motion lines in hatching |
| `card.double_bite.png` | two bite marks punched through a sheet of bone paper |
| `card.snap.png` | jaws snapping shut on a falling beetle, frozen mid-strike |
| `card.constrict.png` | a serpent's coils squeezing a cracked stone egg |
| `card.tail_whip.png` | a tail sweeping in an arc, scattering pebbles |
| `card.gnash.png` | rows of grinding serpent teeth, close-up |
| `card.lunge.png` | a serpent launching forward from a coil, body stretched in a straight line |
| `card.rake.png` | three parallel scratch marks gouged through layered paper |
| `card.hiss_strike.png` | a serpent head mid-hiss with its tongue forked forward |
| `card.gorge.png` | a serpent with its jaw unhinged wide, swallowing a large shadow |
| `card.crush.png` | a heavy coil pressing down on a shattered skull |
| `card.thrash.png` | a serpent body in violent S-curves, dust exploding outward |
| `card.rend.png` | a serpent tearing a single scale from its own body |
| `card.spine_burst.png` | spines bursting outward in a ring from a coiled body |
| `card.hunger_strike.png` | a gaunt serpent striking, ribs visible under its scales |
| `card.mouthful.png` | a serpent with a bulging throat, a creature's legs still visible |
| `card.coil_strike.png` | a tightly wound spiral of serpent body about to spring |
| `card.swallow_whole.png` | a huge serpent silhouette swallowing a full moon disc |
| `card.world_eater.png` | a serpent coiled around a small globe of earth, mouth open |
| `card.last_scale.png` | one single scale falling, glowing faintly, everything else dark |
| `card.circle_strike.png` | a serpent striking in a full circle, a ring of motion around it |

### Shared: guards
| File | Subject |
|---|---|
| `card.scale.png` | one large engraved serpent scale like a shield |
| `card.harden.png` | scales turning to stone, cracks of hatching across them |
| `card.curl.png` | a serpent curled into a tight ball, head tucked inside |
| `card.slough.png` | a translucent shed skin peeling away from the body |
| `card.bristle.png` | scales raised and bristling like armor plates |
| `card.burrow.png` | a serpent half-sunk into the earth, only coils visible |
| `card.tuck.png` | a serpent's coil wrapped protectively around a single scale |
| `card.shell_scale.png` | overlapping scales forming a dome |
| `card.ironhide.png` | scales with a dull metallic engraving, rivet-like edges |
| `card.coiled_guard.png` | several coils stacked like a wall |
| `card.skin_ward.png` | a shed serpent skin hung like a ward in a doorway |
| `card.mirror_scale.png` | a polished scale reflecting a striking claw back at itself |
| `card.deep_breath.png` | a serpent's chest expanding, rings of air radiating |
| `card.stone_coil.png` | a serpent coiled on a boulder, both turning to stone |
| `card.molted_skin.png` | a whole empty serpent skin lying in a perfect ring |
| `card.patient_ring.png` | a ring made of serpent scales resting on bone paper (ink and bone, not gold) |

### Shared: body
| File | Subject |
|---|---|
| `card.molt.png` | a fresh serpent emerging from an old skin |
| `card.taste.png` | a forked tongue tasting the air, scent lines drawn as engraved curls |
| `card.flex.png` | a coil tensing, muscles shown in hatching |
| `card.regrow.png` | a new scale growing in a gap among old ones |
| `card.shiver.png` | a serpent body trembling, doubled outlines |
| `card.sun_bask.png` | a serpent stretched on a warm rock under a pale circle of light |
| `card.digest.png` | a cross-section of a serpent's belly with a round shape dissolving |
| `card.scent.png` | a serpent head raised, three faint trails leading away |
| `card.swallow.png` | a small creature disappearing into a serpent's mouth |
| `card.grow.png` | a serpent body visibly lengthening, older and newer segments |
| `card.hoard.png` | a serpent coiled around a pile of scales and bones |
| `card.recall.png` | scattered scales drifting back toward a serpent body |
| `card.shed_skin.png` | a scar on scales fading as new skin covers it |
| `card.feast.png` | a serpent surrounded by the husks of eaten creatures |
| `card.patience.png` | a perfectly still coiled serpent, eyes half closed |
| `card.reflection.png` | a serpent and its reflection in dark water, mirrored |
| `card.endless_ring.png` | an ouroboros ring, tail in mouth, seen from above |
| `card.second_skin.png` | a serpent wearing a ghostly second skin over its own |
| `card.true_size.png` | a small serpent casting an enormous shadow |

### Shared: rites
| File | Subject |
|---|---|
| `card.venom_bite.png` | a fang with a bead of venom at its tip (venom drop in ink, not green) |
| `card.rattle.png` | a segmented rattle tail shaking, sound rings in hatching |
| `card.glare.png` | a single slit-pupil serpent eye staring out |
| `card.spit.png` | a serpent spitting a thin arc of liquid |
| `card.coax.png` | a serpent swaying hypnotically, concentric circles behind |
| `card.hollow_hiss.png` | an open mouth with sound waves breaking a creature's grip |
| `card.mark.png` | a target circle scratched onto a beetle's shell |
| `card.molt_cloud.png` | a cloud of shed scales hanging in the air |
| `card.lure.png` | a serpent tail tip held up like bait in the dark |
| `card.bone_charm.png` | a small bone tied with cord, hanging |
| `card.devour_rite.png` | a ring of small bones laid around an open serpent mouth |
| `card.blind.png` | a creature's eye covered by a coil |
| `card.ritual_bite.png` | two bite marks forming a circle on stone |
| `card.decoy_scale.png` | a single scale left on the ground as bait, a claw reaching for it |
| `card.unravel.png` | a knot of rope and roots coming undone |
| `card.hunger_mark.png` | a creature with a serpent-shaped shadow already around it |
| `card.great_rattle.png` | a huge rattle tail raised against a crowd of tiny silhouettes |
| `card.circle_rite.png` | a ring of engraved circles, nested, like an old diagram |
| `card.close_the_ring.png` | (finale card) an ouroboros at the moment its mouth meets its tail, soft white light inside the ring |

### Venom
| File | Subject |
|---|---|
| `venom.drip.png` | a single fang dripping green venom into darkness |
| `venom.fester.png` | a wound on bark swelling with green rot |
| `venom.sickle_fang.png` | a curved fang like a sickle, green edge |
| `venom.miasma.png` | a low green mist curling between roots |
| `venom.feed.png` | a serpent drinking from a green pool |
| `venom.bloat.png` | a swollen beetle shell, green veins |
| `venom.acid_spit.png` | an arc of green spit hissing on stone |
| `venom.slow_rot.png` | a leaf decaying in stages, green to black |
| `venom.sated.png` | a serpent lying heavy and full, faint green glow in its belly |
| `venom.engorge.png` | a serpent's body swelling thick, green light between scales |
| `venom.gut_punch.png` | a serpent head-butting a green-veined beetle |
| `venom.taint.png` | a drop of green falling into clear water |
| `venom.heavy_belly.png` | a serpent with layered rings of eaten husks visible inside, green tint |
| `venom.ripen.png` | green fruit-like spore pods bursting |
| `venom.pestilence.png` | a skull with green spores spreading from it |
| `venom.gorge_rot.png` | an unhinged jaw dripping green |
| `venom.hungry_coil.png` | a coil tightening, green venom squeezed from it |
| `venom.bile_wall.png` | a wall of scales slick with green bile |
| `venom.digest_whole.png` | a cross-section of a serpent digesting, green acid |
| `venom.husk_eater.png` | a serpent coiled on a pile of empty green husks |
| `venom.creeping.png` | green tendrils crawling across the ground |
| `venom.swell.png` | a serpent rearing up huge, green light along its throat |
| `venom.carrion.png` | a serpent nosing a husk, green flies |
| `venom.black_milk.png` | black liquid dripping from a fang into a green bowl |
| `venom.plague_bloom.png` | a black flower blooming from a puddle of green bile, spores rising |
| `venom.leviathan_gut.png` | an enormous serpent belly filling the frame, green glow inside |
| `venom.venom_heart.png` | an anatomical heart made of coiled serpents, green veins |
| `venom.eater_of_all.png` | a serpent mouth opening over a field of green-poisoned silhouettes |
| `venom.slow_god.png` | a vast, sleepy serpent shape in green fog |
| `venom.final_meal.png` | a serpent with every card-scale glowing green, mouth open |

### Tide
| File | Subject |
|---|---|
| `tide.ebb.png` | water pulling back from a shore of scales, teal |
| `tide.riptide.png` | a teal current dragging a serpent sideways |
| `tide.swell_guard.png` | a rising wave curling over a coiled serpent |
| `tide.current.png` | parallel teal current lines bending around a rock |
| `tide.brine.png` | salt crystals forming on scales, teal shadows |
| `tide.wave.png` | a single breaking wave in engraved lines, teal |
| `tide.low_tide.png` | a thin serpent in a tide pool, teal water around it |
| `tide.slip.png` | a serpent slipping through a narrow gap between rocks |
| `tide.salt.png` | a scale washed up on a teal shore |
| `tide.spray.png` | teal sea spray breaking on stone |
| `tide.foam.png` | foam swirling around a serpent's head |
| `tide.cycle.png` | a whirlpool of scales spinning in teal water |
| `tide.undertow_pull.png` | a teal undertow pulling a crab under |
| `tide.tidal_shield.png` | a wall of teal water standing upright |
| `tide.high_water.png` | water rising to the top of the frame, a serpent floating |
| `tide.spring_tide.png` | a full moon disc over a swollen teal sea |
| `tide.backwash.png` | water rushing backward off a beach, carrying shells |
| `tide.drown.png` | a creature sinking in teal water, bubbles rising |
| `tide.calm_water.png` | perfectly flat teal water with one ripple |
| `tide.gyre.png` | a spiral current seen from above |
| `tide.thin_and_quick.png` | a thin serpent darting through teal water |
| `tide.sea_glass.png` | a scale smoothed into sea glass, teal |
| `tide.flow.png` | a serpent riding a current like a ribbon |
| `tide.brackish.png` | murky teal water where river meets sea |
| `tide.maelstrom.png` | a huge whirlpool swallowing debris |
| `tide.still_water.png` | a serpent resting under still teal water |
| `tide.moon_pull.png` | a crescent moon pulling the sea upward in a column |
| `tide.bottomless.png` | a serpent descending into a teal abyss |
| `tide.one_scale.png` | a single scale held in a teal wave like a sail |
| `tide.return.png` | a serpent swimming back toward a scattered trail of its own scales |

### Storm
| File | Subject |
|---|---|
| `storm.gather.png` | violet static gathering between two coils |
| `storm.thunderhead.png` | a serpent head made of violet storm cloud, lightning in its eye |
| `storm.static.png` | scales bristling with violet static sparks |
| `storm.spark.png` | a single violet spark jumping between scales |
| `storm.pressure.png` | a coil compressed so tight violet light leaks out |
| `storm.brood.png` | a serpent coiled under a low violet cloud, waiting |
| `storm.crackle.png` | violet lightning crackling along a spine |
| `storm.charge_guard.png` | charged scales forming a barrier, violet arcs between them |
| `storm.rumble.png` | ground cracking under a violet vibration |
| `storm.ground.png` | a serpent tail driven into the earth, lightning running into it |
| `storm.arc.png` | a violet lightning arc jumping between two creatures |
| `storm.anvil.png` | an anvil-shaped storm cloud over a coil |
| `storm.bolt.png` | a single lightning bolt shaped like a serpent |
| `storm.supercell.png` | a rotating violet storm column |
| `storm.thunderclap.png` | a shockwave ring bursting from a serpent's open mouth |
| `storm.eye.png` | a serpent coiled in the calm eye of a violet storm |
| `storm.discharge.png` | a coil releasing a burst of violet light |
| `storm.long_wait.png` | an hourglass wrapped by a coil, violet sand |
| `storm.chain.png` | lightning chaining through three beetles in a row |
| `storm.lodestone.png` | a dark stone pulling violet sparks toward it |
| `storm.squall.png` | sideways violet rain whipping around a serpent |
| `storm.steady.png` | a serpent holding perfectly still while lightning strikes around it |
| `storm.downpour.png` | heavy violet rain over coiled scales |
| `storm.ozone.png` | violet air shimmering, faint sparks |
| `storm.skybreaker.png` | a bolt splitting a dark circle in half, violet clouds (no dragon) |
| `storm.patient_god.png` | a vast serpent silhouette inside a violet storm wall |
| `storm.overcharge.png` | a serpent body glowing violet from within, scales cracking with light |
| `storm.storm_crown.png` | a ring of lightning around a serpent's head like a crown |
| `storm.calm_before.png` | a completely still landscape under a violet sky, a coil in the foreground |
| `storm.final_strike.png` | a serpent striking with every scale discharging violet light |

## 6. Enemies and bosses

Use the Enemy category block plus the act tint.

| File | Act | Subject |
|---|---|---|
| `foe.gnawer.png` | Topsoil | a fat segmented grub with oversized mandibles |
| `foe.spitter.png` | Topsoil | a bombardier-like beetle with a raised rear spout |
| `foe.tunneler.png` | Topsoil | a mole cricket with spade forelegs |
| `foe.mite_swarm.png` | Topsoil | three small round mites in a cluster |
| `foe.carrion_crow.png` | Topsoil | a ragged crow with a long beak, wings half spread |
| `foe.root_worm.png` | Topsoil | a long worm with root-like bristles |
| `foe.dung_brute.png` | Topsoil | a huge horned dung beetle pushing a ball |
| `foe.centipede.png` | Topsoil | a centipede curled in an S, many legs |
| `foe.sap_leech.png` | Roots | a translucent leech swollen with sap |
| `foe.spore_puff.png` | Roots | a round puffball mushroom with a face-like split |
| `foe.thorn_knot.png` | Roots | a knot of thorny roots with one eye |
| `foe.fungus_priest.png` | Roots | a tall mushroom figure with a cap like a hood |
| `foe.root_hound.png` | Roots | a four-legged creature made of roots and bark |
| `foe.mold_twins.png` | Roots | two joined blobs of mold |
| `foe.bark_beetle.png` | Roots | a beetle with a shell of bark plates |
| `foe.strangler_vine.png` | Roots | a vine coiled into a grasping hand shape |
| `foe.blind_eel.png` | Deep Water | an eyeless eel with a long fin |
| `foe.lantern_angler.png` | Deep Water | an anglerfish with a glowing pale-cyan lure |
| `foe.pressure_crab.png` | Deep Water | a massive deep-sea crab with thick armor |
| `foe.drowned_choir.png` | Deep Water | three pale fish with open mouths, singing |
| `foe.hagfish.png` | Deep Water | a slimy hagfish knotting itself |
| `foe.siphon.png` | Deep Water | a siphonophore chain with dangling tendrils |
| `foe.abyss_jelly.png` | Deep Water | a bell jellyfish with long trailing threads |
| `foe.trench_shark.png` | Deep Water | a goblin-like deep shark with protruding jaw |
| `elite.badger.png` | Topsoil | a broad badger with digging claws, snarling |
| `elite.mole_king.png` | Topsoil | a star-nosed mole wearing a crown of roots |
| `elite.wasp_court.png` | Topsoil | three wasps in formation |
| `elite.rot_stag.png` | Roots | a stag with rotting antlers sprouting fungus |
| `elite.honey_fungus.png` | Roots | a cluster of honey mushrooms with a central stalk |
| `elite.owl_bones.png` | Roots | an owl made of bones and feathers |
| `elite.giant_isopod.png` | Deep Water | a giant isopod, plated, curled slightly |
| `elite.sirens.png` | Deep Water | two long eel-women silhouettes, hair like weed (non-human faces) |
| `elite.kraken_arm.png` | Deep Water | a single enormous tentacle rising from below |
| `boss.beetle_queen.png` | Topsoil | a towering beetle queen with an egg-sac abdomen and crown-like horns |
| `boss.mycelial_choir.png` | Roots | three mushroom heads on one mycelium body, mouths open |
| `boss.drowned_mouth.png` | Deep Water | a vast round mouth in the dark with rings of teeth |
| `boss.tail.png` | Deep Water | the tail end of a serpent rising alone, its tip shaped like a striking head, scales made of cards |

Bosses also need **layer splits** for animation: ask for the same image again *"split into separate parts on transparent background: body, head, and each limb as separate images"*, or have the build split them by hand.

## 7. Key arts

| File | Size | Subject and colors |
|---|---|---|
| `key.title.png` | 1536 × 1024 and 1024 × 1536 | Uro, a smooth ancient serpent with card-like scales, coiled in a perfect ouroboros ring, tail nearly in its mouth, on ink black with a large pale-gold circle behind. Gold allowed |
| `key.molt_venom.png` | 1024 × 1536 | Uro rising through green spore fog, venom glints |
| `key.molt_tide.png` | 1024 × 1536 | Uro gliding through teal water in a long arc |
| `key.molt_storm.png` | 1024 × 1536 | Uro coiled under violet lightning, scales charged |
| `key.act_topsoil.png` | 1536 × 1024 | a cross-section of earth: roots above, burrows, bones, a beetle court, umber tint |
| `key.act_roots.png` | 1536 × 1024 | a drowned forest's root system seen from below, fungus glowing faintly, moss tint |
| `key.act_deep.png` | 1536 × 1024 | an underground sea, pale lures in the dark, slate tint |
| `key.tail.png` | 1536 × 1024 | Uro facing its own wild tail across the dark, both made of the same card-scales |
| `key.end_devour.png` | 1536 × 1024 | a vast ouroboros circling the whole world, ring closed. Gold allowed |
| `key.end_give.png` | 1536 × 1024 | the surface above the Deep in bloom, a faint ring-shaped mark in the grass, bone and soft green |

## 8. Textures

`tex.paper_bone.png` (seamless bone paper, 1024²) · `tex.paper_vellum.png` · `tex.paper_drowned.png` (dark slate) · `tex.scale_pattern.png` (seamless serpent-scale halftone for the hand body). Ask for "seamless tileable texture, no subject".

## 9. Notes before shipping

- **Steam requires an AI-content disclosure** for generated art in the store submission. Fill it in honestly.
- AI-generated images have weak copyright protection on their own. The code-built frames, layout, typography and the game itself are yours; budget for a human paint-over on the 10 key arts if you want stronger ownership and polish.
- Keep a log (file, prompt, date) for every approved image in `art/raw/prompts.csv`, so any image can be regenerated or replaced later.

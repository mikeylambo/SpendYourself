# Slifer / Spend Yourself: Content Data Sheets

Companion to `slifer.md`. Every value is a first-pass default for `slifer-tuning.md` to tune. All content uses semantic IDs (rule 7); names are working names.

**Notation.** `m` = might when the card resolves (cards in hand after this one leaves). `c` = this card's coil (0 to 3; Storm 0 to 5). Damage and block round down. **Upgrade** (Coil at a rest) on any card: starts each fight with 1 coil and gains +1 to its first number unless a card lists its own upgrade.

**Keywords.**
- **Wound:** you discard one card of your choice.
- **Block N:** stops the next N wounds this enemy turn.
- **Poison N:** at the start of the enemy's turn it takes N damage, then poison drops by 1.
- **Weaken N:** the enemy's wound intents are reduced by N; drops by 1 each turn.
- **Bind:** the enemy locks one of your cards; it can't be played next turn (it still counts for might and still coils).
- **Eat:** the enemy removes your highest-coil card to the discard pile.
- **Shed:** after this card resolves it is removed for the rest of the fight.
- **Sacrifice N:** as an extra cost, discard N cards of your choice. Sacrificed cards count as wounds for effects that care.
- **Coiled X:** a bonus that applies only if the card is played at coil 2 or more.
- **Husk:** the card an enemy leaves when killed; devour one per fight (+1 max hand).

---

## 1. Molts

| ID | Molt | Passive | Starter deck (10) | Accent ink |
|---|---|---|---|---|
| `molt.venom` | Venom | **Hunger:** enemies that die poisoned leave two husks; devour both | Fang ×4, Scale ×3, Venom Bite ×2, Swallow ×1 | Bile green `#8fa63a` |
| `molt.tide` | Tide | **Undertow:** at 3 or fewer cards in hand, draw 1 extra next turn, and wounds can't take your last card that turn | Fang ×3, Scale ×4, Ebb ×2, Riptide ×1 | Deep teal `#2f7d86` |
| `molt.storm` | Storm | **Charge:** coil caps at 5; 2 random cards start each fight coiled 1 | Fang ×4, Scale ×3, Gather ×2, Thunderhead ×1 | Static violet `#7a5cc4` |

## 2. Shared cards (75)

Rarity: C common, U uncommon, R rare.

### Strikes (22)
| ID | Name | R | Effect |
|---|---|---|---|
| `card.fang` | Fang | C | Deal 2 + m/2 + 2c |
| `card.lash` | Lash | C | Deal 1 + m/3 + c to all enemies |
| `card.double_bite` | Double Bite | C | Deal 1 + m/3 twice; +1 per hit per coil |
| `card.snap` | Snap | C | Deal 4 + c. Shed |
| `card.constrict` | Constrict | C | Deal 2 + c; Weaken 1 |
| `card.tail_whip` | Tail Whip | C | Deal 3 + c to a random enemy twice |
| `card.gnash` | Gnash | C | Deal 2 + m/2. If the target attacked last turn, deal it again |
| `card.lunge` | Lunge | C | Deal 5 + 2c. Sacrifice 1 |
| `card.rake` | Rake | C | Deal 1 + c three times |
| `card.hiss_strike` | Hiss Strike | C | Deal 3 + m/3; draw 1 if it kills |
| `card.gorge` | Gorge | U | Deal m + 2c |
| `card.crush` | Crush | U | Deal 3 + m/2 + 3c; Shed |
| `card.thrash` | Thrash | U | Deal 2 + c to all enemies twice |
| `card.rend` | Rend | U | Sacrifice 2 at random; deal 8 + 3c |
| `card.spine_burst` | Spine Burst | U | Deal 1 per card in hand to all enemies (counts this card); Shed |
| `card.hunger_strike` | Hunger Strike | U | Deal 3 + c per husk devoured this run, max 12 |
| `card.mouthful` | Mouthful | U | Deal 4 + m/2; if it kills, devour that husk now (+1 max hand) |
| `card.coil_strike` | Coil Strike | U | Deal 3 + 4c |
| `card.swallow_whole` | Swallow Whole | R | If the target has health ≤ m × 2, kill it; otherwise deal m. Shed |
| `card.world_eater` | World Eater | R | Deal 2 × m to all enemies. Sacrifice 3 |
| `card.last_scale` | Last Scale | R | Playable only as your last card. Deal 20 + 5c; this card's wound can't kill you this turn |
| `card.circle_strike` | Circle Strike | R | Deal 1 + c to all enemies once per card played this turn (counts this one) |

### Guards (16)
| ID | Name | R | Effect |
|---|---|---|---|
| `card.scale` | Scale | C | Block 2 + c |
| `card.harden` | Harden | C | Block 1 + m/4 + c |
| `card.curl` | Curl | C | Block 3 + c; you can't play more cards this turn |
| `card.slough` | Slough | C | Block 2; draw 1 |
| `card.bristle` | Bristle | C | Block 1 + c; enemies that wound you this turn take 2 |
| `card.burrow` | Burrow | C | Block 4 + c. Shed |
| `card.tuck` | Tuck | C | Choose a card: it can't be eaten or bound this turn. Block 1 |
| `card.shell_scale` | Shell Scale | U | Block equal to the number of enemies + c |
| `card.ironhide` | Ironhide | U | Block 2 + 2c; keep unused block into next turn |
| `card.coiled_guard` | Coiled Guard | U | Block 2 + c for each other card in hand at coil 2+ |
| `card.skin_ward` | Skin Ward | U | Block 3; Coiled: Block 6 |
| `card.mirror_scale` | Mirror Scale | U | Block 2 + c; each wound blocked deals 3 to its sender |
| `card.deep_breath` | Deep Breath | U | Block 2; next turn draw 2 more |
| `card.stone_coil` | Stone Coil | R | Block 5 + 2c; your cards can't be eaten this turn |
| `card.molted_skin` | Molted Skin | R | Block all wounds this turn. Sacrifice 2. Shed |
| `card.patient_ring` | Patient Ring | R | Block 1 per card in hand (counts this card) |

### Body (19)
| ID | Name | R | Effect |
|---|---|---|---|
| `card.molt` | Molt | C | Draw 2 + c/2 |
| `card.taste` | Taste | C | Draw 1; if it's a strike, its coil +1 |
| `card.flex` | Flex | C | Give another card in hand +1 coil. Shed |
| `card.regrow` | Regrow | C | Put a card from your discard pile into your hand |
| `card.shiver` | Shiver | C | Discard 1, draw 2 |
| `card.sun_bask` | Sun Bask | C | All other cards in hand +1 coil; you can't play more cards this turn |
| `card.digest` | Digest | C | Shed a card from your hand; draw 2 |
| `card.scent` | Scent | C | Look at the top 3 of your draw pile; take 1, discard the rest |
| `card.swallow` | Swallow | U | Devour: gain +1 max hand for this fight. Shed |
| `card.grow` | Grow | U | Draw cards until your hand equals your max hand. Shed |
| `card.hoard` | Hoard | U | Next turn draw 3 more; end your turn now |
| `card.recall` | Recall | U | Return all cards discarded by wounds this turn to your hand |
| `card.shed_skin` | Shed Skin | U | Remove a scar. Shed. Exhausts from your deck after 2 uses |
| `card.feast` | Feast | U | Gain +1 max hand for the rest of the run. Sacrifice 2. Shed |
| `card.patience` | Patience | U | All cards in hand +1 coil |
| `card.reflection` | Reflection | R | Copy another card in hand, including its coil. Shed |
| `card.endless_ring` | Endless Ring | R | Shuffle your discard pile into your draw pile; draw 3 |
| `card.second_skin` | Second Skin | R | This fight, the first wound each turn is ignored |
| `card.true_size` | True Size | R | This fight, might counts your max hand instead of your hand. Sacrifice 4. Shed |

### Rites (18, plus Close the Ring)
| ID | Name | R | Effect |
|---|---|---|---|
| `card.venom_bite` | Venom Bite | C | Deal 1 + c; Poison 2 + c |
| `card.rattle` | Rattle | C | Weaken 1 + c |
| `card.glare` | Glare | C | The target's next intent is revealed for 2 turns; Weaken 1 |
| `card.spit` | Spit | C | Deal 2 + 2c to the enemy with the most health |
| `card.coax` | Coax | C | The target attacks another enemy instead of you this turn. Shed |
| `card.hollow_hiss` | Hollow Hiss | C | Cancel the target's eat or bind this turn |
| `card.mark` | Mark | U | The target takes +2 from every hit this turn |
| `card.molt_cloud` | Molt Cloud | U | Weaken 2 to all enemies. Sacrifice 1 |
| `card.lure` | Lure | U | All enemies target your Block first this turn: Block 2 + c |
| `card.bone_charm` | Bone Charm | U | Gain 10 glint if this kills an enemy; deal 3 |
| `card.devour_rite` | Devour Rite | U | Next husk you devour this fight also gives Block 3 at the start of every fight |
| `card.blind` | Blind | U | The target's next attack hits a random target (it may hit its allies) |
| `card.ritual_bite` | Ritual Bite | U | Deal 3; your next card this turn resolves twice |
| `card.decoy_scale` | Decoy Scale | U | Block 2 + c; the next eat or bind this fight takes this card instead (it returns to hand) |
| `card.unravel` | Unravel | R | Remove all of the target's buffs |
| `card.hunger_mark` | Hunger Mark | R | If the target dies this fight, devour it in addition to your normal husk |
| `card.great_rattle` | Great Rattle | R | All enemies skip their next intent. Sacrifice 3. Shed |
| `card.circle_rite` | Circle Rite | R | Your coil cap is +2 this fight |
| `card.close_the_ring` | Close the Ring | — | Finale only (section 7) |

## 3. Molt cards (30 each)

### Venom: poison, devour, growing huge
| ID | Name | R | Effect |
|---|---|---|---|
| `venom.drip` | Drip | C | Poison 3 + c |
| `venom.fester` | Fester | C | Double the target's poison |
| `venom.sickle_fang` | Sickle Fang | C | Deal 2 + m/2; Poison 1 + c |
| `venom.miasma` | Miasma | C | Poison 1 + c to all enemies |
| `venom.feed` | Feed | C | If the target is poisoned, draw 2 |
| `venom.bloat` | Bloat | C | Draw 1 per poisoned enemy |
| `venom.acid_spit` | Acid Spit | C | Deal 3 + c; Poison 2 |
| `venom.slow_rot` | Slow Rot | C | Poison 2; poison on the target no longer decays |
| `venom.sated` | Sated | C | Block 1 per poisoned enemy + c |
| `venom.engorge` | Engorge | C | +1 max hand this fight per poisoned enemy. Shed |
| `venom.gut_punch` | Gut Punch | C | Deal damage equal to the target's poison + m/2 |
| `venom.taint` | Taint | C | Your next strike this turn applies Poison 3 |
| `venom.heavy_belly` | Heavy Belly | U | Block 2 + 1 per husk devoured this run (max 8) |
| `venom.ripen` | Ripen | U | Poison on all enemies +2 + c |
| `venom.pestilence` | Pestilence | U | Whenever a poisoned enemy dies this fight, spread its poison to all enemies |
| `venom.gorge_rot` | Gorge Rot | U | Deal m; Poison equal to damage dealt / 2 |
| `venom.hungry_coil` | Hungry Coil | U | All cards in hand +1 coil per poisoned enemy (max 3) |
| `venom.bile_wall` | Bile Wall | U | Block 3 + c; enemies that wound you get Poison 2 |
| `venom.digest_whole` | Digest Whole | U | Shed a card from your hand; Poison 5 to all |
| `venom.husk_eater` | Husk Eater | U | Deal 4 + 2 per husk devoured this fight |
| `venom.creeping` | Creeping | U | At the start of each turn this fight, Poison 1 to all enemies. Shed |
| `venom.swell` | Swell | U | You can be Big without the extra wound this turn |
| `venom.carrion` | Carrion | U | Return the last husk card you devoured to your hand from your deck |
| `venom.black_milk` | Black Milk | U | Remove 1 scar per enemy killed by poison this fight. Shed |
| `venom.plague_bloom` | Plague Bloom | R | Poison 10 + 3c. Sacrifice 2 |
| `venom.leviathan_gut` | Leviathan Gut | R | This fight, devoured husks give +2 max hand instead of +1 |
| `venom.venom_heart` | Venom Heart | R | Poison deals damage twice per turn this fight. Shed |
| `venom.eater_of_all` | Eater of All | R | Kill every enemy with health ≤ its poison |
| `venom.slow_god` | Slow God | R | Gain Block equal to total enemy poison |
| `venom.final_meal` | Final Meal | R | Deal 1 per card in your deck to one enemy. Shed |

### Tide: block, draw, cycling, thriving small
| ID | Name | R | Effect |
|---|---|---|---|
| `tide.ebb` | Ebb | C | Draw 2; discard 1 |
| `tide.riptide` | Riptide | C | Deal 3 + c; draw 1 |
| `tide.swell_guard` | Swell Guard | C | Block 2 + c; draw 1 if your hand is 3 or fewer |
| `tide.current` | Current | C | Discard any number, draw that many + 1 |
| `tide.brine` | Brine | C | Block 1; Weaken 1 to all |
| `tide.wave` | Wave | C | Deal 2 + c to all; draw 1 |
| `tide.low_tide` | Low Tide | C | Deal 8 − m (min 2) + 2c |
| `tide.slip` | Slip | C | Block 3 + c if your hand is 3 or fewer, else Block 1 |
| `tide.salt` | Salt | C | Return a card from discard to hand; it gains +1 coil |
| `tide.spray` | Spray | C | Deal 1 three times; +1 per hit if your hand is 3 or fewer |
| `tide.foam` | Foam | C | Block 2; the next card you draw this turn gains +1 coil |
| `tide.cycle` | Cycle | C | Shuffle your hand into your draw pile; draw that many |
| `tide.undertow_pull` | Undertow Pull | U | Deal 4 + c; the target's next attack is −2 |
| `tide.tidal_shield` | Tidal Shield | U | Block 1 per card drawn this turn (max 6) |
| `tide.high_water` | High Water | U | Draw until you have 5 cards. Shed |
| `tide.spring_tide` | Spring Tide | U | Next turn draw 4 more; Block 2 |
| `tide.backwash` | Backwash | U | Deal damage equal to cards discarded this turn × 2 |
| `tide.drown` | Drown | U | Deal 6 + 2c; if the target is Weakened, deal double |
| `tide.calm_water` | Calm Water | U | Block 4 + c; cards in hand don't lose coil when discarded by wounds this turn |
| `tide.gyre` | Gyre | U | Discard your hand; draw that many + 2 |
| `tide.thin_and_quick` | Thin and Quick | U | This fight, while your hand is 3 or fewer, your strikes deal +3 |
| `tide.sea_glass` | Sea Glass | U | Block 2 + c; Recall the last card a wound took |
| `tide.flow` | Flow | U | The next 2 cards you play this turn draw 1 each |
| `tide.brackish` | Brackish | U | Weaken 2 + c; Shed |
| `tide.maelstrom` | Maelstrom | R | Deal 2 to all enemies per card discarded this turn |
| `tide.still_water` | Still Water | R | This fight, at 2 or fewer cards, Block 2 at the start of each enemy turn. Shed |
| `tide.moon_pull` | Moon Pull | R | All enemies' intents this turn are halved |
| `tide.bottomless` | Bottomless | R | Your draw per turn is +1 this fight. Sacrifice 2. Shed |
| `tide.one_scale` | One Scale | R | If this is your only card, Block all wounds and draw 4 |
| `tide.return` | Return | R | Put your discard pile into your hand up to max hand. Shed |

### Storm: coil, hoarding, one huge strike
| ID | Name | R | Effect |
|---|---|---|---|
| `storm.gather` | Gather | C | Give 2 other cards +1 coil |
| `storm.thunderhead` | Thunderhead | C | Deal 2 + 3c |
| `storm.static` | Static | C | Block 1 + c; another card +1 coil |
| `storm.spark` | Spark | C | Deal 1 + c to all; Shed |
| `storm.pressure` | Pressure | C | Deal 1 per total coil in your hand |
| `storm.brood` | Brood | C | End your turn; all cards in hand +1 extra coil |
| `storm.crackle` | Crackle | C | Deal 3 + c; if your hand has a card at max coil, draw 1 |
| `storm.charge_guard` | Charge Guard | C | Block 1 per card in hand at coil 2+ |
| `storm.rumble` | Rumble | C | Weaken 1 + c/2 to all |
| `storm.ground` | Ground | C | Choose a card: it can't be eaten this fight |
| `storm.arc` | Arc | C | Deal 2 + c, then 2 + c to a different enemy |
| `storm.anvil` | Anvil | C | Block 2 + c; Coiled: Block 5 + c |
| `storm.bolt` | Bolt | U | Deal 4 + 4c |
| `storm.supercell` | Supercell | U | All cards in hand +1 coil; Sacrifice 1 |
| `storm.thunderclap` | Thunderclap | U | Deal 2c + m to all enemies; Shed |
| `storm.eye` | Eye of the Storm | U | Block 3; cards in hand coil +1 more at end of turn this fight. Shed |
| `storm.discharge` | Discharge | U | Reset another card's coil to 0; deal 6 per coil removed |
| `storm.long_wait` | Long Wait | U | Deal 1 + 3 per turn this card has been in your hand (no cap) |
| `storm.chain` | Chain Lightning | U | Deal 3 + c, bouncing to every enemy once |
| `storm.lodestone` | Lodestone | U | Your highest-coil card can't be discarded by wounds this turn |
| `storm.squall` | Squall | U | Deal 3 + c twice; Coiled: three times |
| `storm.steady` | Steady | U | Block 2 + c; your coil doesn't reset on the next card you play |
| `storm.downpour` | Downpour | U | Draw 2; they enter at coil 1 |
| `storm.ozone` | Ozone | U | Each card played after this one this turn deals 2 to a random enemy |
| `storm.skybreaker` | Skybreaker | R | Deal 10 × c. Shed |
| `storm.patient_god` | Patient God | R | This fight, cards you don't play coil +2 per turn |
| `storm.overcharge` | Overcharge | R | Set every card in hand to max coil. Sacrifice 2. Shed |
| `storm.storm_crown` | Storm Crown | R | This fight, your coil cap is unlimited |
| `storm.calm_before` | Calm Before | R | Skip your next two turns' plays; all cards in hand +3 coil; Block 4 each enemy turn |
| `storm.final_strike` | Final Strike | R | Play only as your last card: deal 5 × total coil spent this fight |

## 4. Bones (60 relics)

Common (25): `bone.molar` +1 starting draw · `bone.knuckle` first strike each fight +3 · `bone.scale_flake` Block 2 at the start of each fight · `bone.rib` +1 max hand · `bone.fang_tip` strikes against full-health enemies +2 · `bone.vertebra` first card each fight starts at coil 2 · `bone.claw` killing blow gives 5 glint · `bone.eggshell` the first wound each fight is ignored · `bone.pebble` rests also give Block 3 next fight · `bone.root_knot` Bind can't target your highest-coil card · `bone.beetle_wing` Big threshold +1 · `bone.ember` Lash deals +1 · `bone.salt_lick` mend removes 3 scars · `bone.shard` shops 15% cheaper · `bone.worm_coil` draw 1 when a card reaches max coil · `bone.lens` see enemy intents 2 turns ahead · `bone.ring_bone` Shed cards give Block 1 · `bone.tooth_chain` multi-hits +1 hit · `bone.hollow_reed` start each fight with 1 Weaken on all · `bone.copper` +25 glint · `bone.thorn` enemies that wound you take 1 · `bone.pearl` husk choice shows 3 options · `bone.mushroom` heal 1 scar on elite kill · `bone.lantern_fish` the first enemy each fight starts poisoned 2 · `bone.seed` events always offer a mend.

Uncommon (20): `bone.gizzard` devour also draws 2 next fight · `bone.coiled_spine` coil cap +1 · `bone.wishbone` once per act, refuse a death and keep 1 card · `bone.amber` coil doesn't reset when a wound discards a card · `bone.antler` might +1 for strikes · `bone.whisker` the first card each turn draws 1 · `bone.choir_bone` Weaken also reduces multi-hit counts · `bone.sap` scars don't form if you end with 3 cards · `bone.cracked_egg` start each fight Big-immune for 2 turns · `bone.fossil` Upgraded cards +1 more coil · `bone.drum` every 3rd card played deals 3 to all · `bone.anchor` Heavy threshold +3 · `bone.sponge` blocked wounds give 1 glint · `bone.lamprey` each devour heals 1 scar · `bone.mirror_bone` the first eat each fight fails · `bone.iron_scale` Block +1 on every guard · `bone.grub` Swallow-type effects +1 · `bone.cocoon` rests can Coil 2 cards · `bone.tidepool` Tide-style: at 2 cards, wounds −1 · `bone.husk_box` keep one extra husk per act to devour later.

Rare (10): `bone.heart_stone` might counts +2 · `bone.serpent_eye` your strikes ignore Block · `bone.black_pearl` devour twice per fight · `bone.god_tooth` Gorge-type cards Shed-free · `bone.crown_bone` start each fight with 2 extra cards · `bone.ring_of_ash` the first time you'd die each run, end the turn at 1 card instead · `bone.leviathan_rib` +3 max hand, Big threshold −2 · `bone.sunstone` all cards coil +1 on turn 1 · `bone.spiral_shell` play your first card each turn twice · `bone.midnight` enemies' first intent each fight is skipped.

Boss (5): `bone.queen_carapace` (Beetle Queen) Block 3 every turn, draw −1 · `bone.spore_heart` (Mycelial Choir) poison spreads on death · `bone.drowned_pearl` (Drowned Mouth) +2 max hand, all wounds +1 when Big · `bone.tail_scale` (finale reward for Turns) start runs with Close the Ring removed and +1 coil cap · `bone.old_skin` scars cap at 2.

## 5. Enemies

HP is at Turn 0. Pattern loops unless noted. `W` = wounds.

### Act 1: Topsoil (8)
| ID | Name | HP | Pattern | Husk |
|---|---|---|---|---|
| `foe.gnawer` | Gnawer (grub) | 9 | W1, W1, W2 | `card.gnash` |
| `foe.spitter` | Spitter (beetle) | 8 | W1, Poison you 2, W2 | `card.spit` |
| `foe.tunneler` | Tunneler (mole cricket) | 12 | Burrow (Block 5), W3 | `card.burrow` |
| `foe.mite_swarm` | Mite Swarm | 4 ×3 bodies | each W1 every turn | `card.rake` |
| `foe.carrion_crow` | Carrion Crow | 10 | Eat, W2, W2 | `card.hollow_hiss` |
| `foe.root_worm` | Root Worm | 14 | Bind, W2 | `card.constrict` |
| `foe.dung_brute` | Dung Brute | 18 | Charge (str +2), W4, W1 | `card.crush` |
| `foe.centipede` | Centipede | 11 | W1 ×3, W1 ×2 | `card.double_bite` |

### Act 2: The Roots (8)
| ID | Name | HP | Pattern | Husk |
|---|---|---|---|---|
| `foe.sap_leech` | Sap Leech | 16 | Eat, W2, W1 | `card.molt` |
| `foe.spore_puff` | Spore Puff | 12 | Daze you (draw −1 next turn), W2 | `card.molt_cloud` |
| `foe.thorn_knot` | Thorn Knot | 22 | Bristle (wounding it deals 2 back), W3 | `card.bristle` |
| `foe.fungus_priest` | Fungus Priest | 14 | Buff all (str +1), Heal ally 6 | `card.ritual_bite` |
| `foe.root_hound` | Root Hound | 18 | W2 ×2, Bind | `card.lunge` |
| `foe.mold_twins` | Mold Twins | 10 ×2 | splits into two 5-HP mites on death | `card.tail_whip` |
| `foe.bark_beetle` | Bark Beetle | 20 | Block 6, W4 | `card.ironhide` |
| `foe.strangler_vine` | Strangler Vine | 24 | Bind ×2, W3 | `card.coax` |

### Act 3: The Deep Water (8)
| ID | Name | HP | Pattern | Husk |
|---|---|---|---|---|
| `foe.blind_eel` | Blind Eel | 22 | W3, W1 ×3 | `card.lash` |
| `foe.lantern_angler` | Lantern Angler | 20 | Lure (reveals and Eats your highest coil), W4 | `card.lure` |
| `foe.pressure_crab` | Pressure Crab | 30 | Block 8, W5 | `card.shell_scale` |
| `foe.drowned_choir` | Drowned Choir | 18 | Sing (all enemies str +2), W2 | `card.great_rattle` |
| `foe.hagfish` | Hagfish | 16 | Slime (your next card costs Sacrifice 1), W3 | `card.digest` |
| `foe.siphon` | Siphon | 24 | Eat ×2, W2 | `card.regrow` |
| `foe.abyss_jelly` | Abyss Jelly | 28 | Poison you 3, W2 ×2 | `venom.drip` |
| `foe.trench_shark` | Trench Shark | 34 | Circle (str +3), W7 | `card.gorge` |

### Elites (9)
| ID | Act | Name | HP | Pattern | Husk |
|---|---|---|---|---|---|
| `elite.badger` | 1 | Badger | 40 | W3, Eat, W5 | `card.mouthful` |
| `elite.mole_king` | 1 | Mole King | 46 | Burrow (Block 10), W2 ×3 | `card.stone_coil` |
| `elite.wasp_court` | 1 | Wasp Court | 12 ×3 | W2 each; survivors str +2 when one dies | `card.thrash` |
| `elite.rot_stag` | 2 | Rot Stag | 70 | W6, Bind ×2, W3 | `card.hunger_strike` |
| `elite.honey_fungus` | 2 | Honey Fungus | 60 | Spreads: summons a Spore Puff every 2 turns | `card.spine_burst` |
| `elite.owl_bones` | 2 | Owl of Bones | 55 | Eat ×2, W4 | `card.reflection` |
| `elite.giant_isopod` | 3 | Giant Isopod | 90 | Block 15, W5, W5 | `card.patient_ring` |
| `elite.sirens` | 3 | The Sirens | 30 ×2 | Coax you (your next strike hits yourself as a wound), W4 | `card.blind` |
| `elite.kraken_arm` | 3 | Kraken Arm | 85 | Bind ×3, W8 | `card.world_eater` |

### Act bosses (3) and the Tail
| ID | Name | HP | Phases | Husk |
|---|---|---|---|---|
| `boss.beetle_queen` | The Beetle Queen | 110 | Lays 2 grubs every 3 turns; W4; Eat. At half health her carapace cracks: no more Block, W6 | `card.swallow_whole` |
| `boss.mycelial_choir` | The Mycelial Choir | 3 heads × 60 | Each head Binds, Poisons or Heals the others; killing a head makes the others str +3 | `card.circle_strike` |
| `boss.drowned_mouth` | The Drowned Mouth | 200 | Swallows a card from your deck each turn (returned if you win); W8; at half, Pressure: your max hand −2 this fight | `card.last_scale` |
| `boss.tail` | The Tail | Your max hand × 12 | Plays a copy of your deck with your own might and coil rules; phase 2 adds Eat every other turn; offers Close the Ring at its last card | — |

## 6. Events (30)

Each event is 1 to 2 lines plus 2 to 3 choices. IDs and outcomes:

`event.bone_pile` take a bone, or take 2 and gain a scar · `event.sleeping_badger` sneak past, or devour (fight an elite at half health) · `event.shed_skin` remove a card, or mend 2 scars · `event.glint_seam` take 40 glint, or 80 and a bind curse for 2 fights · `event.mirror_pool` upgrade a card, or duplicate one · `event.hungry_kit` give it a card (it follows: +1 husk choice for the act), or eat it (+1 max hand, scar) · `event.root_shrine` sacrifice 2 max hand for a rare bone · `event.old_skin` gain the card you started with as an upgrade · `event.drowned_bell` remove all scars, lose 50 glint · `event.fungal_feast` +2 max hand, the next 3 fights start with poison on you · `event.ant_trade` swap a bone for a random one · `event.worm_pit` fight 3 Gnawers for a rare card · `event.egg_clutch` take an egg (hatches into a bone after 2 fights) · `event.still_water` see your whole deck's coil, choose one card to coil permanently · `event.collapsed_tunnel` dig through (scar) or go around (skip next node) · `event.echo` add a copy of your last devoured husk · `event.choir_song` all strikes +1 this act, all guards −1 · `event.blind_fish` give 1 card away for 60 glint · `event.silt` remove 2 random cards · `event.lantern` reveal the act map's elites and rests · `event.parasite` it eats a card each fight; remove it at a rest · `event.sunken_altar` give a bone, gain 2 rares · `event.root_tea` mend 1 scar, draw −1 for the next fight · `event.spore_dream` transform 2 cards into molt cards · `event.cracked_shell` +1 coil cap this act, −1 max hand · `event.old_serpent` a shed skin of a bigger serpent: choose its molt card · `event.trapdoor` skip ahead a row · `event.offering` give 3 cards for 3 max hand · `event.mirror_of_tail` preview the Tail's deck (your deck) and remove a card · `event.quiet` nothing; Block 3 next fight.

## 7. Close the Ring

| ID | Name | Effect |
|---|---|---|
| `card.close_the_ring` | Close the Ring | Appears in your hand when the Tail reaches its last card. Discard your whole hand; the Tail is released and the run ends in the **Give** ending. Can't be eaten, bound or discarded by wounds |

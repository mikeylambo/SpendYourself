// Bones: things Uro has swallowed that change rules. Most hooks are read by the combat engine via `has(id)`.
export type BoneRarity = "C" | "U" | "R" | "B";

export interface BoneDef {
  id: string;
  name: string;
  rarity: BoneRarity;
  text: string;
}

const list: BoneDef[] = [
  // Common
  { id: "bone.molar", name: "Molar", rarity: "C", text: "Draw 1 more at the start of each fight." },
  { id: "bone.knuckle", name: "Knuckle", rarity: "C", text: "Your first strike each fight deals +3." },
  { id: "bone.scale_flake", name: "Scale Flake", rarity: "C", text: "Block 2 at the start of each fight." },
  { id: "bone.rib", name: "Rib", rarity: "C", text: "+1 max hand." },
  { id: "bone.fang_tip", name: "Fang Tip", rarity: "C", text: "Strikes deal +2 to enemies at full health." },
  { id: "bone.vertebra", name: "Vertebra", rarity: "C", text: "Your first card each fight starts at coil 2." },
  { id: "bone.claw", name: "Claw", rarity: "C", text: "Killing blows give 5 glint." },
  { id: "bone.eggshell", name: "Eggshell", rarity: "C", text: "Ignore the first wound each fight." },
  { id: "bone.pebble", name: "Pebble", rarity: "C", text: "Resting also gives Block 3 in your next fight." },
  { id: "bone.root_knot", name: "Root Knot", rarity: "C", text: "Binds can't take your highest-coil card." },
  { id: "bone.beetle_wing", name: "Beetle Wing", rarity: "C", text: "You become Big one card later." },
  { id: "bone.ember", name: "Ember", rarity: "C", text: "Lash deals +1." },
  { id: "bone.salt_lick", name: "Salt Lick", rarity: "C", text: "Mending at a rest removes 3 scars." },
  { id: "bone.shard", name: "Shard", rarity: "C", text: "The Burrower charges 15% less." },
  { id: "bone.worm_coil", name: "Worm Coil", rarity: "C", text: "Draw 1 more next turn whenever a card reaches max coil." },
  { id: "bone.lens", name: "Lens", rarity: "C", text: "See every enemy's next two moves." },
  { id: "bone.ring_bone", name: "Ring Bone", rarity: "C", text: "Cards that Shed give Block 1." },
  { id: "bone.tooth_chain", name: "Tooth Chain", rarity: "C", text: "Your multi-hit cards hit once more." },
  { id: "bone.hollow_reed", name: "Hollow Reed", rarity: "C", text: "Start each fight with Weaken 1 on all enemies." },
  { id: "bone.copper", name: "Copper", rarity: "C", text: "Gain 25 glint." },
  { id: "bone.thorn", name: "Thorn", rarity: "C", text: "Enemies that wound you take 1." },
  { id: "bone.pearl", name: "Pearl", rarity: "C", text: "Husk choices show one more option." },
  { id: "bone.mushroom", name: "Mushroom", rarity: "C", text: "Mend 1 scar after each elite." },
  { id: "bone.lantern_fish", name: "Lantern Fish", rarity: "C", text: "The first enemy each fight starts with Poison 2." },
  { id: "bone.seed", name: "Seed", rarity: "C", text: "Events always offer a mend." },
  // Uncommon
  { id: "bone.gizzard", name: "Gizzard", rarity: "U", text: "Devouring also draws 2 more in your next fight." },
  { id: "bone.coiled_spine", name: "Coiled Spine", rarity: "U", text: "Coil cap +1." },
  { id: "bone.wishbone", name: "Wishbone", rarity: "U", text: "Once per act, refuse a death and keep 1 card." },
  { id: "bone.amber", name: "Amber", rarity: "U", text: "Wounds don't reset coil." },
  { id: "bone.antler", name: "Antler", rarity: "U", text: "Strikes read might +1." },
  { id: "bone.whisker", name: "Whisker", rarity: "U", text: "Your first card each turn draws 1." },
  { id: "bone.choir_bone", name: "Choir Bone", rarity: "U", text: "Weaken also cuts multi-hits." },
  { id: "bone.sap", name: "Sap", rarity: "U", text: "No scar for ending a fight with 3 cards." },
  { id: "bone.cracked_egg", name: "Cracked Egg", rarity: "U", text: "Being Big costs nothing for the first 2 turns of each fight." },
  { id: "bone.fossil", name: "Fossil", rarity: "U", text: "Upgraded cards start fights 1 coil higher." },
  { id: "bone.drum", name: "Drum", rarity: "U", text: "Every third card you play deals 3 to all enemies." },
  { id: "bone.anchor", name: "Anchor", rarity: "U", text: "You become Heavy 3 later." },
  { id: "bone.sponge", name: "Sponge", rarity: "U", text: "Each wound you block gives 1 glint." },
  { id: "bone.lamprey", name: "Lamprey", rarity: "U", text: "Each devour mends 1 scar." },
  { id: "bone.mirror_bone", name: "Mirror Bone", rarity: "U", text: "The first eat each fight fails." },
  { id: "bone.iron_scale", name: "Iron Scale", rarity: "U", text: "Guards block 1 more." },
  { id: "bone.grub", name: "Grub", rarity: "U", text: "Swallow grows you 1 more." },
  { id: "bone.cocoon", name: "Cocoon", rarity: "U", text: "Coiling at a rest upgrades 2 cards." },
  { id: "bone.tidepool", name: "Tidepool", rarity: "U", text: "At 2 cards or fewer, take 1 less wound each enemy turn." },
  // Rare
  { id: "bone.heart_stone", name: "Heart Stone", rarity: "R", text: "Might +2." },
  { id: "bone.serpent_eye", name: "Serpent Eye", rarity: "R", text: "Your strikes ignore Block." },
  { id: "bone.black_pearl", name: "Black Pearl", rarity: "R", text: "Devour twice after each fight." },
  { id: "bone.god_tooth", name: "God Tooth", rarity: "R", text: "Strikes never Shed." },
  { id: "bone.crown_bone", name: "Crown Bone", rarity: "R", text: "Start each fight with 2 extra cards." },
  { id: "bone.ring_of_ash", name: "Ring of Ash", rarity: "R", text: "The first time you would die, you don't." },
  { id: "bone.leviathan_rib", name: "Leviathan Rib", rarity: "R", text: "+3 max hand. You become Big 2 cards sooner." },
  { id: "bone.sunstone", name: "Sunstone", rarity: "R", text: "Your opening hand starts coiled 1." },
  { id: "bone.spiral_shell", name: "Spiral Shell", rarity: "R", text: "Your first card each turn resolves twice." },
  { id: "bone.midnight", name: "Midnight", rarity: "R", text: "Enemies skip their first move each fight." },
  { id: "bone.husk_box", name: "Husk Box", rarity: "U", text: "Once per act, a husk you leave behind is boxed and offered again at your next devour." },
  // Boss
  { id: "bone.queen_carapace", name: "Queen's Carapace", rarity: "B", text: "Block 3 every turn. Draw 1 less each turn." },
  { id: "bone.old_skin", name: "Old Skin", rarity: "B", text: "You can never carry more than 2 scars." },
  { id: "bone.spore_heart", name: "Spore Heart", rarity: "B", text: "Poisoned enemies spread their poison when they die." },
  { id: "bone.tail_scale", name: "Tail Scale", rarity: "B", text: "+1 coil cap. Carried out of a Give ending into your next descent." },
  { id: "bone.drowned_pearl", name: "Drowned Pearl", rarity: "B", text: "+2 max hand. While Big, every hit lands 2 more wounds instead of 1." },
];

export const BONES: Record<string, BoneDef> = Object.fromEntries(list.map((b) => [b.id, b]));
export const BONE_LIST = list;

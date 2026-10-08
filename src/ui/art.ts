// Procedural engraved art: icons, creature plates, Uro and card emblems.
// Generated illustrations override these through the art registry (drop files into /art, see art/README.md).

const INK = "var(--ink)";
let clipSeq = 0;

// ---------- art registry ----------
const files = import.meta.glob("/art/**/*.{png,webp,jpg,jpeg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const registry = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const name = path.split("/").pop()!.replace(/\.(png|webp|jpe?g)$/i, "");
  registry.set(name, url);
}
/** URL of a generated illustration for a semantic id (e.g. `card.fang`, `foe.gnawer`), if one exists. */
export function artFor(id: string): string | undefined {
  return registry.get(id);
}

// ---------- shared defs (patterns used by every plate) ----------
export const SVG_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="5" stroke="#1d1b1a" stroke-width="1.3"/></pattern>
<pattern id="hatch-fine" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line x1="0" y1="0" x2="0" y2="3.4" stroke="#1d1b1a" stroke-width="0.9"/></pattern>
<pattern id="cross" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V5M0 0H5" stroke="#1d1b1a" stroke-width="1.1"/></pattern>
<pattern id="stipple" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.9" fill="#1d1b1a"/><circle cx="4.5" cy="4.2" r="0.7" fill="#1d1b1a"/></pattern>
<pattern id="hatch-bone" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="5" stroke="#ece3cf" stroke-width="1"/></pattern>
<pattern id="stipple-bone" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.9" fill="#ece3cf"/><circle cx="5.5" cy="5" r="0.6" fill="#ece3cf"/></pattern>
<pattern id="scales" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 Q6 0 12 8" fill="none" stroke="#1d1b1a" stroke-width="1"/></pattern>
</defs></svg>`;

// ---------- icons (24×24, stroke) ----------
const ICON: Record<string, string> = {
  claw: '<path d="M6 21 C5 14 7 8 12 3"/><path d="M11 21 C10 15 12 10 16 6"/><path d="M16 21 C15.5 17 16.5 14 19 11"/>',
  maw: '<path d="M3 7 Q12 2 21 7 L18 12 L15 9 L12 13 L9 9 L6 12 Z"/><path d="M4 16 L7 13 L10 17 L12 14 L14 17 L17 13 L20 16 Q12 22 4 16Z"/>',
  knot: '<path d="M7 7 C3 11 7 17 12 12 C17 7 21 13 17 17"/><path d="M17 7 C21 11 17 17 12 12 C7 7 3 13 7 17"/>',
  drop: '<path d="M12 3 C16 9 18 12 18 15 A6 6 0 0 1 6 15 C6 12 8 9 12 3Z"/><path d="M9.5 15.5 A2.6 2.6 0 0 0 12 18" />',
  buff: '<path d="M5 13 L12 6 L19 13"/><path d="M5 19 L12 12 L19 19"/>',
  egg: '<path d="M12 3 C17 3 19 11 19 14 A7 7 0 0 1 5 14 C5 11 7 3 12 3Z"/><path d="M8 12 L10 14 L12 11 L14 14 L16 12"/>',
  rest: '<path d="M3 12 Q12 19 21 12"/><path d="M6 15 L5 17 M12 16.5 V19 M18 15 L19 17"/>',
  shield: '<path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6Z"/>',
  heal: '<path d="M12 21 V9"/><path d="M12 13 C8 13 6 10 6 6 C10 6 12 9 12 13Z"/><path d="M12 11 C15 11 18 9 18 5 C15 5 12 7 12 11Z"/>',
  daze: '<path d="M12 12 m-1 0 a1 1 0 1 1 2 0 a3 3 0 1 1 -5 -1 a5 5 0 1 1 9 3 a7 7 0 1 1 -12 -5"/>',
  strike: '<path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10Z"/><circle cx="12" cy="12" r="1.5"/>',
  guard: '<path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6Z"/><path d="M12 3 V21"/>',
  body: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>',
  rite: '<path d="M12 12 C8 6 4 7 4 9.5 C4 12 8 13 12 12 C16 11 20 12 20 14.5 C20 17 16 18 12 12Z"/>',
  glint: '<path d="M12 3 L15 12 L12 21 L9 12Z"/><path d="M4 12 H20"/>',
  scale: '<path d="M4 18 Q12 4 20 18"/><path d="M8 18 Q12 11 16 18"/>',
  scar: '<path d="M4 20 L20 4"/><path d="M7 9 L9 11 M11 13 L13 15 M15 5 L17 7"/>',
  draw: '<rect x="5" y="4" width="12" height="16" rx="1"/><path d="M8 2 H19 V18"/>',
  discard: '<rect x="7" y="6" width="12" height="15" rx="1" transform="rotate(12 13 13)"/><path d="M5 17 L3 6"/>',
  menu: '<path d="M4 7 H20 M4 12 H20 M4 17 H20"/>',
  bone: '<path d="M7 7 L17 17"/><circle cx="5.5" cy="7.5" r="2.2"/><circle cx="7.5" cy="5.5" r="2.2"/><circle cx="16.5" cy="18.5" r="2.2"/><circle cx="18.5" cy="16.5" r="2.2"/>',
  eye: '<path d="M2 12 Q12 3 22 12 Q12 21 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  rest_node: '<path d="M16 4 A8 8 0 1 0 20 16 A6.5 6.5 0 1 1 16 4Z"/>',
  shop: '<circle cx="12" cy="13" r="7"/><path d="M9 13 H15 M12 10 V16"/><path d="M9 5 L12 2 L15 5"/>',
  treasure: '<path d="M7 7 L17 17"/><circle cx="5.5" cy="7.5" r="2.2"/><circle cx="7.5" cy="5.5" r="2.2"/><circle cx="16.5" cy="18.5" r="2.2"/><circle cx="18.5" cy="16.5" r="2.2"/><path d="M14 4 L20 4 M17 1 L17 7"/>',
  elite: '<path d="M5 21 C4 14 6 8 11 3"/><path d="M10 21 C9 15 11 10 15 6"/><path d="M15 21 C14.5 17 15.5 14 18 11"/><path d="M3 4 L8 9 M21 4 L16 9"/>',
  boss: '<path d="M2 9 Q12 0 22 9 L19 14 L16 10 L12 15 L8 10 L5 14 Z"/><path d="M3 17 Q12 24 21 17"/>',
  event: '<circle cx="12" cy="12" r="9"/><path d="M12 7 C15 7 15 11 12 12 V14"/><circle cx="12" cy="17" r="0.6"/>',
  sacrifice: '<path d="M12 3 V14"/><path d="M8 10 L12 14 L16 10"/><path d="M5 20 H19"/>',
  check: '<path d="M4 12 L10 18 L20 6"/>',
  back: '<path d="M15 5 L8 12 L15 19"/>',
  weak: '<path d="M5 6 L12 13 L19 6"/><path d="M5 12 L12 19 L19 12"/>',
  thorns: '<path d="M4 20 L12 4 L20 20Z"/><path d="M8 13 L4 11 M16 13 L20 11"/>',
  lock: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11 V8 A4 4 0 0 1 16 8 V11"/>',
};

export function icon(name: string, cls = "", stroke = "currentColor", width = 2): string {
  const body = ICON[name] ?? ICON.eye!;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// ---------- engraving helpers (200×200 plates) ----------
function E(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const r = (rot * Math.PI) / 180;
  const p = (a: number) => {
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return [cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)];
  };
  const [x0, y0] = p(0);
  const [x1, y1] = p(Math.PI);
  return `M${x0!.toFixed(1)},${y0!.toFixed(1)} A${rx},${ry} ${rot} 1 1 ${x1!.toFixed(1)},${y1!.toFixed(1)} A${rx},${ry} ${rot} 1 1 ${x0!.toFixed(1)},${y0!.toFixed(1)}Z`;
}

/** A filled form with an engraved shadow: paper fill, hatched offset shade clipped inside, ink outline. */
function form(d: string, shade = "hatch", dx = 7, dy = 9, fill = "var(--plate-fill, #ece3cf)"): string {
  const id = `cl${++clipSeq}`;
  return `<g><clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${fill}"/><path d="${d}" transform="translate(${dx},${dy})" fill="url(#${shade})" clip-path="url(#${id})"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></g>`;
}
const line = (pts: number[][], w = 2.2) => `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const pathS = (d: string, w = 2, extra = "") => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
const dot = (x: number, y: number, r = 3, fill = INK) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const shadow = (cx = 100, cy = 182, rx = 62) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="7" fill="url(#hatch-fine)" opacity=".7"/>`;

function legs(cx: number, cy: number, spread: number, n: number, len: number, side: 1 | -1 = 1): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = cx - spread / 2 + (spread * i) / Math.max(1, n - 1);
    s += line([[x, cy], [x + (i - (n - 1) / 2) * 6, cy + len * 0.55 * side], [x + (i - (n - 1) / 2) * 12, cy + len * side]], 2.2);
  }
  return s;
}

function grub(scale = 1): string {
  let s = shadow(100, 176, 58 * scale);
  const segs = 7;
  for (let i = segs - 1; i >= 0; i--) {
    const t = i / (segs - 1);
    const a = Math.PI * (0.95 + t * 0.95);
    const x = 100 + Math.cos(a) * 52 * scale;
    const y = 112 - Math.sin(a) * 40 * scale;
    const r = (14 + (1 - t) * 10) * scale;
    s += form(E(x, y, r, r * 1.15, t * 60), "hatch", 5, 7);
    s += pathS(`M${x - r * 0.7},${y - r * 0.3} Q${x},${y + r * 0.5} ${x + r * 0.7},${y - r * 0.3}`, 1.2);
  }
  const hx = 100 + Math.cos(Math.PI * 1.9) * 52 * scale;
  const hy = 112 - Math.sin(Math.PI * 1.9) * 40 * scale;
  s += form(E(hx + 8, hy + 2, 15 * scale, 13 * scale), "cross", 4, 6);
  s += line([[hx + 18, hy - 2], [hx + 30, hy - 8], [hx + 26, hy + 2]], 2.4);
  s += line([[hx + 18, hy + 6], [hx + 30, hy + 10], [hx + 24, hy + 13]], 2.4);
  s += dot(hx + 10, hy - 3, 2.4);
  return s;
}

function beetle(cx: number, cy: number, w: number, h: number, extra = ""): string {
  let s = legs(cx, cy + h * 0.3, w * 1.2, 3, h * 0.9) + legs(cx, cy - h * 0.1, w * 1.4, 3, -h * 0.5, 1);
  s += form(E(cx, cy, w, h), "hatch", 8, 10);
  s += pathS(`M${cx},${cy - h + 4} L${cx},${cy + h - 2}`, 1.8);
  s += pathS(`M${cx - w * 0.6},${cy - h * 0.2} Q${cx - w * 0.3},${cy + h * 0.6} ${cx - 4},${cy + h * 0.8}`, 1);
  s += pathS(`M${cx + w * 0.6},${cy - h * 0.2} Q${cx + w * 0.3},${cy + h * 0.6} ${cx + 4},${cy + h * 0.8}`, 1);
  s += form(E(cx, cy - h - 10, w * 0.6, 14), "cross", 4, 6);
  s += form(E(cx, cy - h - 28, w * 0.32, 10), "cross", 3, 4);
  s += extra;
  return s;
}

const CREATURES: Record<string, () => string> = {
  "foe.gnawer": () => grub(1),
  "foe.grub": () => grub(0.8),
  "foe.spitter": () =>
    shadow() +
    beetle(100, 118, 44, 40) +
    pathS("M100,60 Q96,46 104,38", 1.6) +
    `<path d="M104,42 C108,48 109,52 104,55 C99,52 100,48 104,42Z" fill="url(#cross)" stroke="${INK}" stroke-width="1.6"/>` +
    line([[88, 55], [70, 38]], 1.6) + line([[112, 55], [130, 38]], 1.6),
  "foe.tunneler": () => {
    let s = shadow(100, 176, 70);
    s += form(E(110, 120, 60, 26, -8), "hatch", 8, 10);
    for (let i = 0; i < 5; i++) s += pathS(`M${80 + i * 14},${100 + i * 1} q4,20 0,40`, 1.1);
    s += form(E(52, 116, 22, 20), "cross", 4, 6);
    s += form("M40,128 L22,150 L30,154 L36,146 L40,156 L48,148 L50,132Z", "hatch", 3, 4);
    s += form("M60,130 L50,160 L60,160 L64,150 L70,160 L76,150 L72,132Z", "hatch", 3, 4);
    s += line([[38, 104], [12, 80]], 1.5) + line([[42, 100], [26, 70]], 1.5);
    s += dot(44, 110, 2.6);
    s += line([[150, 130], [172, 150], [180, 176]], 2.2) + line([[136, 134], [146, 160], [150, 178]], 2.2);
    return s;
  },
  "foe.mite": () => {
    let s = shadow(100, 170, 44);
    s += legs(100, 128, 70, 4, 34) + legs(100, 118, 80, 4, -30);
    s += form(E(100, 120, 34, 28), "stipple", 0, 0) + form(E(100, 120, 34, 28), "hatch", 7, 9);
    s += form(E(100, 88, 12, 10), "cross", 3, 3);
    s += dot(95, 86, 2) + dot(105, 86, 2);
    return s;
  },
  "foe.carrion_crow": () => {
    let s = shadow(100, 180, 54);
    s += line([[92, 150], [88, 178], [80, 180]], 2.2) + line([[108, 150], [110, 178], [118, 180]], 2.2);
    s += form("M70,150 L40,180 L60,176 L56,186 L78,166Z", "hatch", 3, 4);
    s += form(E(100, 120, 40, 34, -20), "cross", 8, 10);
    s += form("M78,104 C96,90 130,96 140,124 C120,132 96,134 80,124Z", "hatch", 5, 6);
    for (let i = 0; i < 4; i++) s += pathS(`M${92 + i * 10},${108 + i * 2} L${88 + i * 12},${128}`, 1);
    s += form(E(128, 78, 20, 18), "cross", 5, 6);
    s += form("M144,72 L176,80 L146,88Z", "hatch-fine", 2, 2);
    s += `<circle cx="132" cy="74" r="4.5" fill="#ece3cf" stroke="${INK}" stroke-width="2"/>` + dot(133, 74, 2);
    return s;
  },
  "foe.root_worm": () => {
    const d = "M30,150 C40,90 90,170 110,110 C126,62 160,90 170,60";
    let s = shadow(100, 176, 70);
    s += pathS(d, 34, `stroke-linejoin="round"`);
    s += `<path d="${d}" fill="none" stroke="#ece3cf" stroke-width="28" stroke-linecap="round"/>`;
    s += `<path d="${d}" fill="none" stroke="url(#hatch)" stroke-width="28" stroke-linecap="round" opacity=".55" transform="translate(4,6)"/>`;
    s += pathS("M44,160 l-8,14 M60,128 l-14,4 M100,140 l4,16 M128,84 l12,-10 M150,82 l2,-18", 1.6);
    s += pathS("M36,128 q6,6 14,4 M70,140 q8,4 14,0 M100,112 q8,4 14,-2 M128,92 q6,6 14,4 M150,72 q6,6 14,2", 1.4);
    s += dot(168, 58, 3);
    return s;
  },
  "foe.dung_brute": () => {
    let s = shadow(100, 182, 74);
    s += form(E(70, 128, 48, 48), "stipple", 0, 0) + form(E(70, 128, 48, 48), "cross", 10, 12);
    s += beetle(146, 116, 28, 30);
    s += line([[124, 100], [104, 92]], 2.4) + line([[124, 120], [110, 132]], 2.4);
    return s;
  },
  "foe.centipede": () => {
    let s = shadow(100, 178, 76);
    const n = 10;
    for (let i = n - 1; i >= 0; i--) {
      const x = 28 + i * 15;
      const y = 130 - Math.sin(i * 0.7) * 26;
      s += line([[x, y + 6], [x - 6, y + 24], [x - 10, y + 32]], 1.8) + line([[x, y - 6], [x + 4, y - 20], [x + 2, y - 28]], 1.6);
      s += form(E(x, y, 10, 12), "hatch", 3, 5);
    }
    s += form(E(172, 118, 14, 12), "cross", 3, 4);
    s += pathS("M180,110 q10,-20 18,-30 M176,108 q2,-22 -2,-34", 1.4);
    return s;
  },
  "elite.badger": () => {
    let s = shadow(100, 184, 82);
    s += form("M30,140 C26,104 60,84 110,86 C150,88 172,108 170,140 C168,160 150,170 110,170 C70,170 34,164 30,140Z", "cross", 9, 11);
    s += form("M40,150 l-8,30 h14 l6,-24Z", "hatch", 2, 3) + form("M150,150 l6,30 h14 l-6,-28Z", "hatch", 2, 3);
    s += form("M120,92 C140,70 186,80 190,104 C192,118 176,126 160,126 C140,126 124,114 120,92Z", "hatch", 4, 6);
    s += `<path d="M128,90 C150,82 176,90 186,104" fill="none" stroke="#ece3cf" stroke-width="7"/>`;
    s += `<path d="M128,90 C150,82 176,90 186,104" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
    s += dot(166, 100, 3) + dot(190, 108, 4);
    for (let i = 0; i < 4; i++) s += line([[150 + i * 4, 178], [152 + i * 4, 186]], 1.6);
    return s;
  },
  "elite.mole_king": () => {
    let s = shadow(100, 184, 80);
    s += form(E(100, 122, 64, 52), "cross", 10, 12);
    s += form(E(100, 82, 30, 24), "hatch", 5, 6);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      s += pathS(`M100,74 l${(Math.cos(a) * 14).toFixed(1)},${(Math.sin(a) * 10 - 6).toFixed(1)}`, 2);
    }
    s += dot(86, 80, 2) + dot(114, 80, 2);
    for (const side of [-1, 1]) {
      const x = 100 + side * 58;
      s += form(`M${x},120 l${side * 26},-6 l${side * 4},14 l${side * -2},12 l${side * -26},6Z`, "hatch", 3, 4);
      for (let k = 0; k < 4; k++) s += line([[x + side * 28, 112 + k * 7], [x + side * 42, 108 + k * 8]], 2.2);
    }
    return s;
  },
  "elite.wasp": () => {
    let s = shadow(100, 182, 50);
    s += `<path d="${E(78, 74, 34, 14, -30)}" fill="#ece3cf" fill-opacity=".55" stroke="${INK}" stroke-width="1.4"/>`;
    s += `<path d="${E(122, 74, 34, 14, 30)}" fill="#ece3cf" fill-opacity=".55" stroke="${INK}" stroke-width="1.4"/>`;
    s += legs(100, 112, 30, 3, 40);
    s += form(E(100, 104, 18, 16), "cross", 3, 4);
    const ab = E(100, 142, 24, 32);
    s += form(ab, "hatch", 3, 4);
    const id = `cl${++clipSeq}`;
    s += `<clipPath id="${id}"><path d="${ab}"/></clipPath>`;
    for (let i = 0; i < 4; i++) s += `<rect x="70" y="${120 + i * 14}" width="60" height="6" fill="${INK}" clip-path="url(#${id})"/>`;
    s += line([[100, 174], [100, 188]], 2.4);
    s += form(E(100, 82, 12, 11), "cross", 2, 3);
    s += pathS("M94,74 q-8,-14 -18,-18 M106,74 q8,-14 18,-18", 1.4);
    return s;
  },
  "boss.beetle_queen": () => {
    let s = shadow(100, 186, 90);
    s += legs(100, 140, 150, 3, 44) + legs(100, 108, 160, 3, -38);
    s += form("M100,62 C150,62 178,100 176,140 C174,170 140,184 100,184 Z", "hatch", 10, 12);
    s += form("M100,62 C50,62 22,100 24,140 C26,170 60,184 100,184 Z", "hatch", 10, 12);
    for (let k = 1; k <= 4; k++) {
      s += pathS(`M${100 - k * 15},${170 - k * 4} Q${100 - k * 17},${110} ${100 - k * 8},${70 + k * 4}`, 1.1);
      s += pathS(`M${100 + k * 15},${170 - k * 4} Q${100 + k * 17},${110} ${100 + k * 8},${70 + k * 4}`, 1.1);
    }
    s += `<g class="crack">${pathS("M100,70 L92,96 L106,112 L94,140 L104,166", 3)}</g>`;
    s += `<circle cx="100" cy="128" r="16" fill="#ece3cf" stroke="${INK}" stroke-width="2"/><circle cx="100" cy="128" r="9" fill="url(#cross)" stroke="${INK}" stroke-width="1.4"/>`;
    s += form(E(100, 50, 34, 18), "cross", 5, 6);
    s += form(E(100, 30, 18, 12), "cross", 3, 4);
    s += form("M86,24 C70,10 60,14 52,4 C66,8 76,8 90,18Z", "hatch", 2, 2) + form("M114,24 C130,10 140,14 148,4 C134,8 124,8 110,18Z", "hatch", 2, 2);
    s += dot(92, 30, 2.4) + dot(108, 30, 2.4);
    return s;
  },
};

// ---------- Acts 2 and 3: tall and branching roots, long and trailing deep water ----------
function tube(d: string, w: number, rings = 0): string {
  let s = pathS(d, w + 5, `stroke-linejoin="round"`);
  s += `<path d="${d}" fill="none" stroke="#ece3cf" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="none" stroke="url(#hatch)" stroke-width="${w}" stroke-linecap="round" opacity=".5" transform="translate(3,5)"/>`;
  if (rings) s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w - 2}" stroke-dasharray="1.5 ${rings}" opacity=".7"/>`;
  return s;
}
function branch(x: number, y: number, len: number, ang: number, depth: number, w = 3): string {
  if (depth <= 0) return "";
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  let s = line([[x, y], [x2, y2]], w);
  s += branch(x2, y2, len * 0.66, ang - 0.5, depth - 1, Math.max(1.2, w - 0.8));
  s += branch(x2, y2, len * 0.6, ang + 0.45, depth - 1, Math.max(1.2, w - 0.8));
  return s;
}
const cap = (cx: number, cy: number, r: number, shade = "hatch") => form(`M${cx - r},${cy} C${cx - r},${cy - r * 1.1} ${cx + r},${cy - r * 1.1} ${cx + r},${cy} Z`, shade, 4, 6);
const mushroom = (cx: number, base: number, hgt: number, r: number) =>
  form(`M${cx - r * 0.25},${base} L${cx - r * 0.18},${base - hgt} L${cx + r * 0.18},${base - hgt} L${cx + r * 0.25},${base}Z`, "hatch-fine", 2, 3) + cap(cx, base - hgt + 2, r) +
  pathS(`M${cx - r * 0.8},${base - hgt} L${cx + r * 0.8},${base - hgt}`, 1.2);
const eye = (x: number, y: number, r = 6, lit = false) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${lit ? "#bfe8ec" : "#ece3cf"}" stroke="${INK}" stroke-width="2"/>${dot(x, y, r * 0.4)}`;
const tentacle = (x: number, y: number, len: number, curl: number) => pathS(`M${x},${y} c${curl},${len * 0.3} ${-curl},${len * 0.6} ${curl * 0.5},${len}`, 2.2);
const fish = (cx: number, cy: number, w: number, h: number) =>
  form(`M${cx - w},${cy} C${cx - w * 0.5},${cy - h} ${cx + w * 0.6},${cy - h} ${cx + w},${cy} C${cx + w * 0.6},${cy + h} ${cx - w * 0.5},${cy + h} ${cx - w},${cy}Z`, "hatch", 6, 8) +
  form(`M${cx - w},${cy} L${cx - w - 30},${cy - 22} L${cx - w - 22},${cy} L${cx - w - 30},${cy + 22}Z`, "cross", 2, 3);

Object.assign(CREATURES, {
  "foe.sap_leech": () => shadow(100, 180, 40) + tube("M100,176 C70,140 130,110 96,70 C84,54 104,40 112,34", 30, 6) + `<circle cx="112" cy="32" r="9" fill="#ece3cf" stroke="${INK}" stroke-width="2"/><circle cx="112" cy="32" r="4" fill="url(#cross)"/>`,
  "foe.spore_puff": () => {
    let s = shadow(100, 176, 50) + form(E(100, 130, 46, 42), "stipple", 0, 0) + form(E(100, 130, 46, 42), "hatch", 9, 11);
    for (let i = 0; i < 9; i++) s += `<circle cx="${60 + i * 10}" cy="${70 - (i % 3) * 14}" r="${2 + (i % 2)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
    return s + pathS("M86,96 q14,-8 28,0", 1.6);
  },
  "foe.thorn_knot": () => {
    let s = shadow(100, 182, 60) + tube("M50,150 C40,80 150,80 140,130 C130,180 60,170 80,110 C96,62 160,90 150,160", 18);
    for (const [x, y, a] of [[52, 110, -2.4], [96, 78, -1.6], [140, 100, -0.6], [130, 160, 0.6], [74, 150, 2.2], [110, 120, -1]] as const) s += `<path d="M${x},${y} l${Math.cos(a) * 16},${Math.sin(a) * 16} l${Math.cos(a + 1.4) * 6},${Math.sin(a + 1.4) * 6}Z" fill="${INK}"/>`;
    return s;
  },
  "foe.fungus_priest": () => shadow(100, 184, 46) + form("M70,182 C66,140 76,100 100,92 C124,100 134,140 130,182Z", "hatch", 6, 8) + cap(100, 92, 48, "cross") + pathS("M60,92 L140,92", 1.6) + `<path d="M84,120 L84,160 M116,120 L116,160" stroke="${INK}" stroke-width="1.4"/>` + eye(90, 106, 4) + eye(110, 106, 4),
  "foe.root_hound": () => {
    let s = shadow(100, 184, 70) + form(E(100, 118, 54, 26, -6), "hatch", 7, 9);
    for (const x of [62, 78, 122, 140]) s += branch(x, 132, 26, 1.5, 3, 3.2);
    s += form("M140,96 C160,80 188,86 192,100 L170,108 L186,112 C176,122 156,122 144,112Z", "cross", 4, 5) + dot(170, 94, 2.6);
    s += branch(60, 104, 22, -2.6, 3, 2.2) + branch(150, 90, 18, -1.9, 2, 2);
    return s;
  },
  "foe.mold_twin": () => {
    let s = shadow(100, 180, 56);
    for (const [x, y, r] of [[80, 140, 34], [120, 132, 30], [100, 106, 26], [128, 98, 14]] as const) s += form(E(x, y, r, r * 0.9), "stipple", 0, 0) + form(E(x, y, r, r * 0.9), "hatch", 5, 6);
    return s + dot(94, 104, 2.4) + dot(106, 104, 2.4);
  },
  "foe.mold_mite": () => shadow(100, 172, 36) + legs(100, 140, 50, 3, 26) + form(E(100, 130, 28, 24), "stipple", 0, 0) + form(E(100, 130, 28, 24), "hatch", 5, 6) + dot(94, 124, 2) + dot(106, 124, 2),
  "foe.bark_beetle": () => shadow() + beetle(100, 120, 46, 42, `<path d="M70,110 l14,4 M74,128 l16,2 M112,104 l14,6 M116,124 l14,4 M98,140 l-10,8" stroke="${INK}" stroke-width="2.4"/>`),
  "foe.strangler_vine": () => {
    let s = shadow(100, 184, 40) + tube("M100,184 C40,150 160,120 96,92 C50,70 140,50 104,18", 12);
    for (const [x, y, f] of [[70, 150, -1], [140, 124, 1], [64, 84, -1], [134, 56, 1]] as const) s += form(`M${x},${y} q${18 * f},-18 ${32 * f},-4 q-${16 * f},14 -${32 * f},4Z`, "hatch-fine", 2, 2);
    return s;
  },
  "elite.rot_stag": () => {
    let s = shadow(100, 186, 70) + form(E(96, 140, 50, 24), "cross", 8, 9);
    for (const x of [62, 80, 112, 128]) s += line([[x, 156], [x - 2, 186]], 3);
    s += form("M128,128 L150,82 L166,88 L150,134Z", "hatch", 3, 4) + form(E(160, 80, 16, 12, -20), "cross", 3, 4);
    s += branch(152, 70, 26, -2.0, 4, 3) + branch(166, 68, 26, -1.0, 4, 3) + dot(166, 78, 2.5);
    return s;
  },
  "elite.honey_fungus": () => shadow(100, 186, 80) + mushroom(60, 184, 60, 28) + mushroom(138, 184, 74, 32) + mushroom(98, 184, 104, 40) + mushroom(162, 184, 36, 18),
  "elite.owl_bones": () => {
    let s = shadow(100, 186, 60) + form("M56,170 C40,110 60,50 100,46 C140,50 160,110 144,170 Z", "cross", 9, 11);
    for (let i = 0; i < 5; i++) s += pathS(`M${70 + i * 2},${110 + i * 12} Q100,${120 + i * 12} ${130 - i * 2},${110 + i * 12}`, 1.8);
    s += `<circle cx="80" cy="82" r="20" fill="#ece3cf" stroke="${INK}" stroke-width="2.4"/><circle cx="120" cy="82" r="20" fill="#ece3cf" stroke="${INK}" stroke-width="2.4"/>`;
    s += dot(80, 82, 9) + dot(120, 82, 9) + form("M94,98 L106,98 L100,114Z", "hatch", 1, 1) + pathS("M60,52 L72,64 M140,52 L128,64", 3);
    return s;
  },
  "boss.choir_bind": () => shadow(100, 186, 50) + mushroom(100, 184, 90, 56) + pathS("M78,128 Q100,146 122,128", 3) + eye(84, 112, 5) + eye(116, 112, 5) + pathS("M40,170 c20,-30 40,-10 60,-40", 2),
  "boss.choir_rot": () => shadow(100, 186, 50) + mushroom(100, 184, 110, 48) + pathS("M84,120 Q100,136 116,120", 3) + eye(88, 102, 5) + eye(112, 102, 5) + `<circle cx="70" cy="60" r="4" fill="${INK}"/><circle cx="132" cy="54" r="3" fill="${INK}"/>`,
  "boss.choir_bloom": () => shadow(100, 186, 50) + mushroom(100, 184, 80, 62) + pathS("M80,138 Q100,124 120,138", 3) + eye(84, 122, 5) + eye(116, 122, 5) + form("M100,64 q-14,-24 0,-40 q14,16 0,40Z", "hatch-fine", 1, 1),
  "foe.blind_eel": () => shadow(100, 182, 74) + tube("M20,150 C60,110 80,180 120,130 C150,94 170,120 186,96", 22, 9) + form(E(186, 92, 14, 10, -30), "cross", 2, 3) + pathS("M176,100 l14,8", 2),
  "foe.lantern_angler": () => fish(108, 128, 60, 40) + pathS("M140,96 C150,50 120,40 100,52", 2.4) + `<circle cx="98" cy="56" r="11" fill="#bfe8ec" stroke="${INK}" stroke-width="2"/><circle cx="98" cy="56" r="20" fill="#bfe8ec" opacity=".18"/>` + pathS("M148,132 l14,6 l-12,4 l12,6", 2) + eye(150, 116, 5, true),
  "foe.pressure_crab": () => {
    let s = shadow(100, 184, 76) + legs(100, 140, 120, 4, 40) + form(E(100, 126, 56, 34), "cross", 8, 10);
    for (const f of [-1, 1]) s += form(`M${100 + f * 50},110 C${100 + f * 80},80 ${100 + f * 92},70 ${100 + f * 84},50 C${100 + f * 70},58 ${100 + f * 64},74 ${100 + f * 76},86Z`, "hatch", 3, 4);
    return s + eye(88, 98, 4) + eye(112, 98, 4);
  },
  "foe.drowned_choir": () => {
    let s = "";
    for (const [x, y] of [[66, 90], [134, 90], [100, 70]] as const) {
      s += form(`M${x - 24},${y} C${x - 24},${y - 32} ${x + 24},${y - 32} ${x + 24},${y} Z`, "hatch", 3, 4);
      for (let i = 0; i < 4; i++) s += tentacle(x - 15 + i * 10, y, 70 + i * 6, 6);
      s += `<ellipse cx="${x}" cy="${y - 8}" rx="6" ry="9" fill="${INK}"/>`;
    }
    return s;
  },
  "foe.hagfish": () => shadow(100, 182, 70) + tube("M20,120 C50,160 90,90 130,130 C150,150 170,140 186,120", 18, 7) + `<circle cx="70" cy="160" r="4" fill="url(#stipple)" stroke="${INK}"/><circle cx="120" cy="164" r="6" fill="none" stroke="${INK}" stroke-width="1.4"/><circle cx="150" cy="172" r="3" fill="${INK}"/>` + pathS("M182,116 l10,-6 M184,124 l10,4", 1.6),
  "foe.siphon": () => shadow(100, 186, 46) + form("M70,184 C64,130 70,80 86,50 L114,50 C130,80 136,130 130,184Z", "cross", 6, 8) + `<ellipse cx="100" cy="50" rx="16" ry="6" fill="${INK}"/>` + `<ellipse cx="120" cy="96" rx="9" ry="4" fill="${INK}"/>` + pathS("M100,40 q-10,-20 6,-30", 1.4),
  "foe.abyss_jelly": () => {
    let s = form("M40,96 C40,30 160,30 160,96 C140,104 60,104 40,96Z", "hatch-fine", 4, 6);
    for (let i = 0; i < 8; i++) s += tentacle(48 + i * 15, 100, 70 + (i % 3) * 12, i % 2 ? 8 : -8);
    return s + `<path d="M70,70 Q100,50 130,70" stroke="${INK}" stroke-width="1.4" fill="none"/>`;
  },
  "foe.trench_shark": () => fish(96, 118, 74, 34) + form("M90,86 L110,46 L120,88Z", "hatch", 2, 3) + `<path d="M150,124 l10,0 M146,130 l14,2" stroke="${INK}" stroke-width="2"/>` + pathS("M140,128 L164,132 L144,138", 1.8) + eye(146, 110, 4),
  "elite.giant_isopod": () => {
    let s = shadow(100, 186, 76) + legs(100, 150, 120, 6, 30);
    for (let i = 0; i < 7; i++) s += form(E(100, 50 + i * 18, 60 - Math.abs(i - 3) * 6, 14), "hatch", 3, 5);
    return s + pathS("M80,40 q-20,-20 -30,-30 M120,40 q20,-20 30,-30", 2);
  },
  "elite.siren": () => tube("M100,40 C60,80 140,110 96,150 C80,166 70,176 50,184", 26, 0) + form("M50,184 L26,170 L36,196Z", "cross", 2, 2) + `<circle cx="100" cy="38" r="18" fill="#ece3cf" stroke="${INK}" stroke-width="2.4"/>` + pathS("M84,30 C70,60 64,90 74,120 M116,30 C130,64 132,96 122,130 M92,24 C82,60 84,100 92,130", 1.4) + dot(94, 36, 2) + dot(106, 36, 2),
  "elite.kraken_arm": () => {
    let s = tube("M60,190 C30,120 90,80 130,90 C170,100 170,50 140,36 C120,28 110,48 126,54", 30);
    for (let i = 0; i < 7; i++) s += `<circle cx="${70 + i * 10}" cy="${160 - i * 13}" r="4" fill="#ece3cf" stroke="${INK}" stroke-width="1.6"/>`;
    return s;
  },
  "boss.drowned_mouth": () => {
    let s = form(E(100, 108, 92, 82), "cross", 10, 12) + `<ellipse cx="100" cy="112" rx="62" ry="52" fill="${INK}"/>`;
    for (let r = 0; r < 2; r++) for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rx = 60 - r * 18;
      const ry = 50 - r * 15;
      const x = 100 + Math.cos(a) * rx;
      const y = 112 + Math.sin(a) * ry;
      s += `<path d="M${x.toFixed(1)},${y.toFixed(1)} L${(100 + Math.cos(a) * (rx - 12)).toFixed(1)},${(112 + Math.sin(a) * (ry - 12)).toFixed(1)}" stroke="#ece3cf" stroke-width="${3 - r}" stroke-linecap="round"/>`;
    }
    return s + eye(40, 60, 6, true) + eye(160, 60, 6, true);
  },
  "boss.tail": () => {
    let s = tube("M30,180 C10,100 90,60 140,90 C190,120 170,180 120,170 C90,164 96,130 120,128", 30);
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const x = 34 + t * 130 + Math.sin(t * 6) * 6;
      const y = 160 - Math.sin(t * Math.PI) * 80;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="10" height="14" rx="1.5" fill="#ece3cf" stroke="${INK}" stroke-width="1.4" transform="rotate(${(t * 140 - 60).toFixed(0)} ${(x + 5).toFixed(1)} ${(y + 7).toFixed(1)})"/>`;
    }
    return s + pathS("M120,128 c10,-4 18,0 14,8", 2);
  },
});

/** An engraved creature plate (200×200). */
export function creatureSVG(id: string, phase = 1): string {
  const url = artFor(id);
  if (url) return `<img src="${url}" alt="" draggable="false">`;
  const draw = CREATURES[id] ?? CREATURES["foe.mite"]!;
  return `<svg viewBox="0 0 200 200" aria-hidden="true" data-phase="${phase}" style="overflow:visible">${draw()}</svg>`;
}

// ---------- Uro ----------

/** Uro as the ouroboros ring; scales are small cards. `n` scales are drawn, the rest is bare. */
export function uroRing(size = 400, accent = "var(--venom)", scales = 28, n = scales): string {
  const c = 200;
  const r = 140;
  let s = `<svg viewBox="0 0 400 400" width="${size}" height="${size}" aria-hidden="true">`;
  s += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#ece3cf" stroke-width="58" opacity=".08"/>`;
  s += `<path d="M ${c + r * Math.cos(-1.35)} ${c + r * Math.sin(-1.35)} A ${r} ${r} 0 1 1 ${c + r * Math.cos(-1.75)} ${c + r * Math.sin(-1.75)}" fill="none" stroke="#ece3cf" stroke-width="44" stroke-linecap="round"/>`;
  s += `<path d="M ${c + r * Math.cos(-1.35)} ${c + r * Math.sin(-1.35)} A ${r} ${r} 0 1 1 ${c + r * Math.cos(-1.75)} ${c + r * Math.sin(-1.75)}" fill="none" stroke="#1d1b1a" stroke-width="40" stroke-linecap="round"/>`;
  for (let i = 0; i < scales; i++) {
    const a = -1.3 + (i / scales) * (Math.PI * 2 - 0.55);
    const x = c + r * Math.cos(a);
    const y = c + r * Math.sin(a);
    const deg = (a * 180) / Math.PI + 90;
    const on = i < n;
    const w = 13 - (i / scales) * 5;
    s += `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - w * 0.7).toFixed(1)}" width="${w.toFixed(1)}" height="${(w * 1.4).toFixed(1)}" rx="1.5" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${on ? (i % 5 === 2 ? accent : "#ece3cf") : "none"}" stroke="#ece3cf" stroke-width="${on ? 1 : 0.6}" opacity="${on ? 0.92 : 0.35}"/>`;
  }
  // Blunt, hornless head biting toward its own tail (art bible §3).
  const ha = -1.35;
  const hx = c + r * Math.cos(ha);
  const hy = c + r * Math.sin(ha);
  const face = (Math.atan2(-Math.cos(ha), Math.sin(ha)) * 180) / Math.PI;
  s += `<g transform="translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${face.toFixed(1)})">`;
  s += `<path d="M-16,-21 C6,-24 30,-15 36,-2 C38,3 36,7 33,9 C22,19 4,23 -16,21 Z" fill="#1d1b1a" stroke="#ece3cf" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += `<path d="M35,3 C24,5 12,6 2,5" fill="none" stroke="#ece3cf" stroke-width="1.8" stroke-linecap="round"/>`;
  s += `<path d="M30,4.5 l-2,3 M24,5 l-2,3 M18,5.5 l-2,3 M12,5.5 l-2,3" stroke="#ece3cf" stroke-width="1.1" stroke-linecap="round"/>`;
  s += `<ellipse cx="12" cy="-8" rx="5" ry="4" fill="#ece3cf"/><ellipse cx="13" cy="-8" rx="1.6" ry="3" fill="#1d1b1a"/>`;
  s += `<path d="M-10,-16 C-4,-6 -4,6 -10,16" fill="none" stroke="${accent}" stroke-width="1.6" opacity=".8"/>`;
  s += `</g></svg>`;
  return s;
}

/** Inline ouroboros glyph used as the O in the wordmark. */
export function ringGlyph(): string {
  return `<svg class="ring-o" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" stroke-width="13" stroke-dasharray="200 26" transform="rotate(-62 50 50)"/><circle cx="50" cy="50" r="36" fill="none" stroke="var(--ink-deep)" stroke-width="2" stroke-dasharray="3 6" opacity=".6"/><path d="M71 16 l10 -4 -3 9" fill="currentColor"/></svg>`;
}

// ---------- card emblems ----------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const MOTIF: Record<string, (r: () => number) => string> = {
  strike: (r) => {
    const x = 70 + r() * 40;
    return `<path d="M${x},40 C${x + 40},70 ${x + 30},120 ${x - 10},160 C${x + 6},118 ${x + 4},80 ${x},40Z" fill="#ece3cf" stroke="#1d1b1a" stroke-width="2"/><path d="M${x + 6},60 C${x + 26},86 ${x + 22},116 ${x},146" fill="none" stroke="url(#hatch)" stroke-width="6"/>` +
      `<path d="M${x - 40},60 C${x - 10},86 ${x - 14},120 ${x - 40},150 C${x - 30},118 ${x - 30},90 ${x - 40},60Z" fill="#ece3cf" stroke="#1d1b1a" stroke-width="2" opacity=".85"/>`;
  },
  guard: (r) => {
    let s = "";
    const cx = 90 + r() * 20;
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 4; i++) {
        const x = cx - 54 + i * 30 + (row % 2) * 15;
        const y = 64 + row * 24;
        s += `<path d="M${x},${y} q15,22 30,0 q-15,-8 -30,0Z" fill="#ece3cf" stroke="#1d1b1a" stroke-width="1.6"/>`;
      }
    return s;
  },
  body: (r) => {
    const cx = 92 + r() * 16;
    let d = `M${cx},100`;
    for (let i = 0; i < 26; i++) {
      const a = i * 0.55;
      const rr = 4 + i * 2.4;
      d += ` L${(cx + Math.cos(a) * rr).toFixed(1)},${(100 + Math.sin(a) * rr).toFixed(1)}`;
    }
    return `<path d="${d}" fill="none" stroke="#ece3cf" stroke-width="12" stroke-linecap="round"/><path d="${d}" fill="none" stroke="url(#scales)" stroke-width="10" stroke-linecap="round"/>`;
  },
  rite: (r) => {
    const cy = 92 + r() * 16;
    return `<path d="M100,${cy} C70,${cy - 46} 40,${cy - 30} 40,${cy} C40,${cy + 30} 70,${cy + 46} 100,${cy} C130,${cy - 46} 160,${cy - 30} 160,${cy} C160,${cy + 30} 130,${cy + 46} 100,${cy}Z" fill="none" stroke="#ece3cf" stroke-width="7"/>` +
      `<circle cx="100" cy="${cy}" r="11" fill="#ece3cf" stroke="#1d1b1a" stroke-width="2"/><circle cx="100" cy="${cy}" r="4" fill="#1d1b1a"/>`;
  },
};

/** Poster-collage emblem for a card (used until generated art exists). */
export function cardArt(id: string, type: string, accent: string | null): string {
  const url = artFor(id);
  if (url) return `<img src="${url}" alt="" draggable="false">`;
  let seed = hash(id);
  const r = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909) >>> 0;
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
  const acc = accent ?? "#ece3cf";
  const big = r();
  let s = `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="200" fill="#1d1b1a"/>`;
  // diagonal band
  const by = 30 + r() * 80;
  s += `<path d="M-20,${by + 70} L220,${by - 40} L220,${by - 10} L-20,${by + 100}Z" fill="${acc}" opacity="${accent ? 0.85 : 0.18}"/>`;
  // big disc or half moon
  const cx = 60 + r() * 80;
  const cy = 70 + r() * 50;
  const rad = 46 + r() * 22;
  if (big < 0.5) s += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#ece3cf" opacity=".92"/><circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#hatch)" transform="translate(10,12)" clip-path="circle(${rad}px at ${cx}px ${cy}px)" opacity=".7"/>`;
  else s += `<path d="M${cx - rad},${cy} A${rad},${rad} 0 0 1 ${cx + rad},${cy}Z" fill="#ece3cf" opacity=".92"/><path d="M${cx - rad},${cy} A${rad},${rad} 0 0 0 ${cx + rad},${cy}Z" fill="url(#stipple-bone)" opacity=".8"/>`;
  s += `<rect width="200" height="200" fill="url(#stipple-bone)" opacity=".12"/>`;
  s += MOTIF[type]?.(r) ?? "";
  s += `<path d="M0,190 L200,170" stroke="#ece3cf" stroke-width="1" opacity=".5"/>`;
  s += `</svg>`;
  return s;
}

/** Small engraved bone glyph for relics (varies by id). */
export function boneGlyph(id: string): string {
  const h = hash(id);
  const kind = h % 4;
  const body = [
    '<path d="M12 36 L36 12"/><circle cx="9" cy="33" r="5"/><circle cx="15" cy="39" r="5"/><circle cx="33" cy="9" r="5"/><circle cx="39" cy="15" r="5"/>',
    '<path d="M24 6 C34 6 40 16 38 26 C36 36 30 42 24 42 C18 42 12 36 10 26 C8 16 14 6 24 6Z"/><path d="M18 18 h12 M16 26 h16 M18 34 h12"/>',
    '<path d="M10 40 C10 20 18 8 24 6 C30 8 38 20 38 40"/><path d="M16 40 C16 26 20 18 24 16 C28 18 32 26 32 40"/>',
    '<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="6"/><path d="M24 8 v10 M24 30 v10 M8 24 h10 M30 24 h10"/>',
  ][kind];
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">${body}</svg>`;
}

/** The Give ending's coda: the ring loosens and the surface blooms. */
export function bloomCoda(): string {
  let s = `<svg viewBox="0 0 300 300" aria-hidden="true">`;
  s += `<circle cx="150" cy="170" r="96" fill="none" stroke="#ece3cf" stroke-width="10" stroke-dasharray="18 22" opacity=".35"/>`;
  s += `<path d="M20,200 Q150,170 280,200" stroke="#ece3cf" stroke-width="1.5" fill="none" opacity=".6"/>`;
  for (let i = 0; i < 11; i++) {
    const x = 34 + i * 23;
    const hgt = 30 + ((i * 37) % 50);
    s += `<path d="M${x},${196 - (i % 3)} C${x - 6},${170} ${x + 6},${150} ${x},${196 - hgt}" stroke="#8fa63a" stroke-width="2" fill="none"/>`;
    s += `<circle cx="${x}" cy="${196 - hgt}" r="${4 + (i % 3) * 2}" fill="${i % 4 === 0 ? "#d9a432" : "#ece3cf"}" opacity=".9"/>`;
    s += `<path d="M${x},${178 - hgt / 3} q8,-6 12,-14 q-10,2 -12,14z" fill="#8fa63a" opacity=".8"/>`;
  }
  s += `</svg>`;
  return s;
}

import { isBig, might } from "../bodydeck/BodyDeck.ts";
import { BONES } from "../data/bones.ts";
import { CARDS } from "../data/cards.ts";
import { EVENTS } from "../data/events.ts";
import { FOES } from "../data/foes.ts";
import { tuning } from "../data/tuning.ts";
import type { Combat } from "../game/combat.ts";
import { LAST_ACT, newRun, RunController, type RunAgent } from "../game/run.ts";
import type { MapNode, RunState } from "../game/state.ts";
import type { Act, FoeState, GameEvent, PickRequest, Presenter } from "../game/types.ts";
import { boneGlyph, creatureSVG, icon, ringGlyph, SVG_DEFS, uroRing } from "./art.ts";
import { AudioEngine } from "./audio.ts";
import { breakdownHTML, cardHTML, escapeHtml, previewCombat, staticCardHTML } from "./cardView.ts";
import { focusFirst, navMove, SemanticInput, type Action } from "./input.ts";
import { Persistence, type Settings } from "./meta.ts";

const ACT_NAMES: Record<number, string> = { 1: "Topsoil", 2: "The Roots", 3: "The Deep Water" };
const ACCENT: Record<string, string> = { venom: "#8fa63a", tide: "#2f7d86", storm: "#7a5cc4" };
const PROMPTS: Record<string, string> = {
  protect: "Protect a card",
  coil: "Coil a card",
  regrow: "Take a card back",
  discard: "Discard a card",
  shed: "Shed a card",
  take: "Take one",
  copy: "Copy a card",
  upgrade: "Upgrade a card",
  remove: "Remove a card",
  duplicate: "Duplicate a card",
  give: "Give a card",
};
const DEATH: Record<string, string> = { torn: "Torn apart", spent: "Spent", worn: "Worn to nothing" };
const NODE_ICON: Record<string, string> = { fight: "claw", elite: "elite", rest: "rest_node", event: "event", shop: "shop", treasure: "treasure", boss: "boss" };

/** Activate the focused element (HTML buttons and SVG map nodes alike). */
const activate = (el: Element | null) => void el?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const h = (html: string): HTMLElement => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

interface PickState {
  req: PickRequest;
  selected: number[];
  resolve: (uids: number[]) => void;
}

export class App implements RunAgent, Presenter {
  root: HTMLElement;
  persist = new Persistence();
  audio = new AudioEngine();
  input = new SemanticInput();
  ctl: RunController | null = null;
  view: "title" | "run" | "settings" = "title";
  private overlayEl: HTMLElement | null = null;
  private overlayBack: (() => void) | null = null;
  private picking: PickState | null = null;
  private sel: number | null = null;
  private removal = new Map<number, string>();
  private deaths = new Map<number, number>();
  private fightEl: HTMLElement | null = null;
  private lastFightKey = "";
  private settingsBack: () => void = () => this.showTitle();

  constructor(root: HTMLElement) {
    this.root = root;
  }

  get run(): RunState | null {
    return this.ctl?.run ?? null;
  }
  get combat(): Combat | null {
    return this.ctl?.combat ?? null;
  }
  get s(): Settings {
    return this.persist.settings;
  }

  async boot(): Promise<void> {
    document.body.insertAdjacentHTML("afterbegin", SVG_DEFS);
    await this.persist.load();
    this.applySettings();
    this.input.on((a) => this.onAction(a));
    addEventListener("pointerdown", () => this.audio.unlock(), { passive: true });
    addEventListener("keydown", () => this.audio.unlock());
    addEventListener("resize", () => { if (this.view === "run" && this.run?.screen.kind === "combat") this.updateFight(); });
    document.addEventListener("visibilitychange", () => {
      this.audio.suspend(document.hidden);
      if (document.hidden && this.run) void this.save();
    });
    await this.showTitle();
  }

  applySettings(): void {
    const s = this.s;
    const r = document.documentElement;
    r.dataset.contrast = s.highContrast ? "high" : "normal";
    r.dataset.motion = s.reducedMotion ? "reduced" : "full";
    r.dataset.grain = s.grain ? "on" : "off";
    r.style.setProperty("--text-scale", String(s.textScale));
    r.style.setProperty("--speed", String(s.fightSpeed));
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
  }

  private ms(base: number): number {
    return this.s.reducedMotion ? Math.min(60, base) : base / this.s.fightSpeed;
  }

  // ================= overlays & input =================

  private setScreen(el: HTMLElement, focus = true): void {
    this.closeOverlay();
    this.root.replaceChildren(el);
    this.fightEl = null;
    if (focus) requestAnimationFrame(() => focusFirst(el));
  }

  private openOverlay(el: HTMLElement, onBack: (() => void) | null): void {
    this.closeOverlay();
    this.overlayEl = el;
    this.overlayBack = onBack;
    this.root.appendChild(el);
    requestAnimationFrame(() => focusFirst(el));
  }

  private closeOverlay(): void {
    this.overlayEl?.remove();
    this.overlayEl = null;
    this.overlayBack = null;
  }

  private onAction(a: Action): void {
    this.audio.unlock();
    const scope = this.overlayEl ?? this.root;
    const dir = a.startsWith("nav.") ? (a.slice(4) as "up" | "down" | "left" | "right") : null;
    if (this.overlayEl) {
      if (dir) return navMove(scope, dir);
      if (a === "back" || a === "pause") return this.overlayBack?.();
      if (a === "confirm" || a === "enter") return activate(document.activeElement);
      if (a === "card.inspect") return;
      return;
    }
    if (this.view === "run" && this.run?.screen.kind === "combat") return this.fightAction(a);
    if (dir) return navMove(scope, dir);
    if (a === "confirm" || a === "enter") return activate(document.activeElement);
    if (a === "back" || a === "pause") {
      if (this.view === "settings") return this.settingsBack();
      if (this.view === "run") return this.showPause();
    }
  }

  // ================= title =================

  async showTitle(): Promise<void> {
    this.view = "title";
    this.audio.stopMusic();
    const saved = await this.persist.loadRun();
    const el = h(`<section class="screen dark title">
      <div class="title-ring">${uroRing(900, ACCENT.venom, 34)}</div>
      <div class="title-wrap">
        <h1 class="wordmark title-xl">SPEND<br>Y${ringGlyph()}URSELF</h1>
        <div class="menu">
          ${saved && saved.screen.kind !== "over" ? `<button class="btn solid" data-nav data-autofocus data-act="continue">Continue<span class="sub">${ACT_NAMES[saved.act]} · ${saved.row + 1}</span></button>` : ""}
          <button class="btn ${saved ? "" : "solid"}" data-nav ${saved ? "" : "data-autofocus"} data-act="begin">Begin</button>
          <button class="btn ghost" data-nav data-act="settings">Settings</button>
        </div>
      </div>
    </section>`);
    el.querySelector('[data-act="continue"]')?.addEventListener("click", () => saved && this.startRun(saved));
    el.querySelector('[data-act="begin"]')!.addEventListener("click", async () => {
      this.ui();
      if (saved && saved.screen.kind !== "over") await this.persist.clearRun();
      const seed = Math.random().toString(36).slice(2, 10).toUpperCase();
      this.startRun(newRun({ seed, molt: "venom", onboarding: this.persist.meta.runs === 0 }));
    });
    el.querySelector('[data-act="settings"]')!.addEventListener("click", () => { this.ui(); this.showSettings(() => this.showTitle()); });
    this.setScreen(el);
  }

  private ui(): void {
    this.audio.play("ui.confirm");
  }

  startRun(run: RunState): void {
    this.ctl = new RunController(run, this, this);
    this.view = "run";
    this.audio.unlock();
    this.audio.startMusic(run.act);
    void this.render();
  }

  async save(): Promise<void> {
    if (this.ctl) await this.persist.saveRun(this.ctl.sync());
  }

  // ================= run router =================

  async render(): Promise<void> {
    const run = this.run;
    if (!run) return;
    const sc = run.screen;
    if (sc.kind !== "combat") {
      this.lastFightKey = "";
      document.documentElement.style.setProperty("--accent", ACCENT[run.molt] ?? ACCENT.venom!);
    }
    switch (sc.kind) {
      case "map": return this.renderMap();
      case "combat": return this.renderFight();
      case "reward": return this.renderReward();
      case "rest": return this.renderRest();
      case "shop": return this.renderShop();
      case "event": return this.renderEvent();
      case "treasure": return this.renderTreasure();
      case "actEnd": return this.renderMap();
      case "over": return this.renderOver();
    }
  }

  /** After any run action: settle fights, save, redraw. */
  private async after(): Promise<void> {
    const ctl = this.ctl;
    if (!ctl) return;
    if (ctl.settleCombat() && ctl.run.screen.kind !== "over") await wait(this.ms(650));
    if (ctl.run.screen.kind === "over") await this.endRun();
    else await this.save();
    await this.render();
  }

  private barHTML(dark = true): string {
    const run = this.run!;
    const eff = run.maxHand - run.scars;
    const bones = run.bones.map((b) => `<button class="bone-chip" data-bone="${b}" title="${escapeHtml(BONES[b]?.name ?? b)}" aria-label="${escapeHtml(BONES[b]?.name ?? b)}">${boneGlyph(b)}</button>`).join("");
    return `<div class="bar" style="color:${dark ? "var(--bone)" : "var(--ink)"}">
      <span class="stat">${escapeHtml(ACT_NAMES[run.act] ?? "")} · ${Math.max(1, run.row + 1)}</span>
      <span class="stat" title="Glint">${icon("glint")}${run.glint}</span>
      <span class="stat" title="Max hand">${icon("scale")}${eff}${run.scars ? `<span class="scar">−${run.scars}</span>` : ""}</span>
      <button class="stat pile" data-deck title="Deck">${icon("draw")}${run.deck.length}</button>
      <span class="bones">${bones}</span>
      <span class="sp"></span>
      <button class="icon-btn" data-pause aria-label="Menu">${icon("menu")}</button>
    </div>`;
  }

  private wireBar(el: HTMLElement): void {
    el.querySelector("[data-pause]")?.addEventListener("click", () => this.showPause());
    el.querySelector("[data-deck]")?.addEventListener("click", () => this.showDeck());
    el.querySelectorAll<HTMLElement>("[data-bone]").forEach((b) =>
      b.addEventListener("click", () => this.toast(`${BONES[b.dataset.bone!]?.name}: ${BONES[b.dataset.bone!]?.text}`)),
    );
  }

  // ================= map =================

  private renderMap(): void {
    const ctl = this.ctl!;
    const run = ctl.run;
    const avail = ctl.availableNodes();
    const rows = run.map.rows;
    const W = Math.min(innerWidth - 16, 520);
    const rowH = 66;
    const H = rows.length * rowH + 80;
    const pad = 40;
    const cols = tuning.map.width;
    const step = (W - pad * 2) / (cols - 1);
    const nodeR = Math.min(19, step * 0.36);
    const pos = (n: MapNode) => {
      const j = ((n.row * 7 + n.col * 13) % 9) - 4;
      const x = n.kind === "boss" ? W / 2 : pad + n.col * step + j * Math.max(0, step * 0.5 - nodeR - 4) * 0.25;
      return [x, 50 + n.row * rowH + (n.kind === "boss" ? 20 : j * 1.5)] as const;
    };
    let lines = "";
    let nodes = "";
    for (const row of rows) {
      for (const n of row) {
        const [x, y] = pos(n);
        const nextRow = rows[n.row + 1];
        for (const c of n.next) {
          const m = nextRow?.find((q) => q.col === c);
          if (!m) continue;
          const [x2, y2] = pos(m);
          const travelled = n.row < run.row && false;
          lines += `<path d="M${x},${y} C${x},${(y + y2) / 2} ${x2},${(y + y2) / 2} ${x2},${y2}" stroke="#ece3cf" stroke-width="1.6" stroke-dasharray="2 5" opacity="${travelled ? 0.9 : 0.35}" fill="none"/>`;
        }
        const isAvail = avail.includes(n);
        const here = n.row === run.row && n.col === run.col;
        const visited = n.row < run.row || here;
        const r = n.kind === "boss" ? 30 : nodeR;
        nodes += `<g class="mapnode${isAvail ? " avail" : ""}${visited ? " visited" : ""}${!isAvail && !visited ? " dim" : ""}" ${isAvail ? `data-nav tabindex="0" role="button" aria-label="${n.kind}"` : ""} data-row="${n.row}" data-col="${n.col}" transform="translate(${x},${y})">
          <circle class="disc" r="${r}"/>
          <g transform="translate(${-r * 0.58},${-r * 0.58}) scale(${(r * 1.16) / 24})" fill="none" stroke="${visited ? "#1d1b1a" : "#ece3cf"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon(NODE_ICON[n.kind]!).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
          ${here ? `<circle r="${r + 7}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="${(r + 7) * 5.6} 14"/>` : ""}
        </g>`;
      }
    }
    // strata
    let strata = "";
    for (let i = 0; i < 5; i++) strata += `<path d="M0,${80 + i * (H / 5)} Q${W / 2},${60 + i * (H / 5) + (i % 2 ? 26 : -18)} ${W},${90 + i * (H / 5)}" stroke="#ece3cf" stroke-width="1" fill="none" opacity=".1"/>`;
    const el = h(`<section class="screen dark">
      ${this.barHTML()}
      <div class="mapview"><svg class="map" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${strata}${lines}${nodes}</svg></div>
      <div class="map-legend">${Object.entries(NODE_ICON).filter(([k]) => k !== "boss").map(([k, i]) => `<span>${icon(i)}${k === "shop" ? "Burrower" : k[0]!.toUpperCase() + k.slice(1)}</span>`).join("")}</div>
    </section>`);
    this.wireBar(el);
    el.querySelectorAll<SVGGElement>(".mapnode.avail").forEach((g) => {
      const go = async () => {
        const node = avail.find((n) => n.row === Number(g.dataset.row) && n.col === Number(g.dataset.col));
        if (!node) return;
        this.audio.play("map.move");
        await ctl.enter(node);
        await this.after();
      };
      g.addEventListener("click", go);
      g.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation(); // one keypress, one action
        void go();
      });
    });
    this.setScreen(el);
    const view = el.querySelector<HTMLElement>(".mapview")!;
    const targetY = 50 + Math.max(0, run.row) * rowH - view.clientHeight / 2 + 120;
    requestAnimationFrame(() => {
      view.scrollTop = Math.max(0, targetY);
      const first = el.querySelector<HTMLElement>(".mapnode.avail");
      first?.focus({ preventScroll: true });
    });
  }

  // ================= fight =================

  private renderFight(): void {
    const run = this.run!;
    const c = this.combat!;
    const key = `${run.stats.fights}:${run.row}:${c.s.encounter.join()}`;
    if (!this.fightEl || this.lastFightKey !== key || !this.root.contains(this.fightEl)) {
      this.lastFightKey = key;
      this.sel = null;
      this.removal.clear();
      this.deaths.clear();
      const el = h(`<section class="screen fight" data-act="${run.act}">
        <div class="bar-slot"></div>
        <div class="board">
          <div class="foes"></div>
          <div class="core"><div class="left"></div><div class="might"><b>0</b><span class="label">Might</span></div><div class="right"></div></div>
          <div class="handzone"><svg class="body" aria-hidden="true"></svg><div class="hand" aria-label="Your hand"></div><div class="preview"></div></div>
          <div class="actions"><button class="btn end" data-end>End turn</button></div>
        </div>
      </section>`);
      el.querySelector("[data-end]")!.addEventListener("click", () => void this.endTurn());
      this.setScreen(el, false);
      this.fightEl = el;
      if (run.onboarding && run.fightIndex === 0 && c.s.turn === 1 && !this.persist.taught("play-fang")) this.prompt("Play Fang");
      if (run.onboarding && run.fightIndex === 1 && !this.persist.taught("might")) {
        this.persist.teach("might");
        this.prompt("Bigger hand, bigger hit");
      }
    }
    this.updateFight();
  }

  private updateFight(): void {
    const el = this.fightEl;
    const c = this.combat;
    const run = this.run;
    if (!el || !c || !run) return;
    const s = c.s;
    const b = c.body;
    // bar
    const barSlot = el.querySelector(".bar-slot")!;
    barSlot.innerHTML = this.barHTML(false);
    this.wireBar(barSlot as HTMLElement);
    // foes: plates scale to the space left above the hand
    const foesEl = el.querySelector<HTMLElement>(".foes")!;
    foesEl.style.setProperty("--art-h", `${Math.max(60, foesEl.clientHeight - 96)}px`);
    this.renderFoes(foesEl, c);
    // core
    const big = isBig(b);
    const mightEl = el.querySelector(".might")!;
    const m = might(b);
    const prev = Number(mightEl.querySelector("b")!.textContent);
    mightEl.querySelector("b")!.textContent = String(m);
    if (prev !== m) {
      mightEl.classList.remove("pulse");
      void (mightEl as HTMLElement).offsetWidth;
      mightEl.classList.add("pulse");
    }
    el.querySelector(".core .left")!.innerHTML =
      (b.block ? `<span class="plate">${icon("shield")}${b.block >= 99 ? "∞" : b.block}</span>` : "") +
      (big && c.bigActive() ? `<span class="plate big" title="Big: every hit lands one more wound">${icon("scale")}+1</span>` : "") +
      (s.selfPoison ? `<span class="plate pz">${icon("drop")}${s.selfPoison}</span>` : "");
    el.querySelector(".core .right")!.innerHTML = `<button class="pile" data-pile="draw" title="Draw pile">${icon("draw")}${b.draw.length}</button><button class="pile" data-pile="discard" title="Discard pile">${icon("discard")}${b.discard.length}</button><span class="pile" title="Max hand">${icon("scale")}${b.hand.length}/${b.maxHand}</span>`;
    el.querySelectorAll<HTMLElement>("[data-pile]").forEach((p) => p.addEventListener("click", () => this.showPile(p.dataset.pile as "draw" | "discard")));
    if (big && !this.persist.taught("big")) {
      this.persist.teach("big");
      this.toast("Big: easier to hit");
      this.audio.play("size.big");
    }
    // hand
    this.renderHand(el, c);
    // actions / banner
    const end = el.querySelector<HTMLButtonElement>("[data-end]")!;
    end.disabled = !!s.over || c.busy || !!this.picking;
    this.renderBanner(el, c);
    this.audio.setBody(b.hand.length, b.maxHand);
  }

  private intentHTML(c: Combat, f: FoeState, acts: Act[], next = false): string {
    const parts = acts.map((a) => {
      switch (a.k) {
        case "atk": {
          const hits = c.attackHits(f, a.x ?? 1);
          const v = c.attackValue(f, a.n);
          const bigPlus = c.bigActive() ? `<span class="plus">+1</span>` : "";
          return `<span class="act" title="Wounds">${icon(hits > 1 ? "elite" : "claw")}${v}${hits > 1 ? `×${hits}` : ""}${bigPlus}</span>`;
        }
        case "eat": return `<span class="act" title="Eats your highest-coil card">${icon("maw")}${(a.x ?? 1) > 1 ? `×${a.x}` : ""}</span>`;
        case "bind": return `<span class="act" title="Binds a card">${icon("knot")}${(a.x ?? 1) > 1 ? `×${a.x}` : ""}</span>`;
        case "poison": return `<span class="act" title="Poisons you">${icon("drop")}${a.n}</span>`;
        case "block": return `<span class="act" title="Blocks">${icon("shield")}${a.n}</span>`;
        case "buff": return `<span class="act" title="Grows stronger">${icon("buff")}${a.n}</span>`;
        case "summon": return `<span class="act" title="Summons">${icon("egg")}${a.x}</span>`;
        case "heal": return `<span class="act" title="Heals">${icon("heal")}${a.n}</span>`;
        case "daze": return `<span class="act" title="Dazes you: draw 1 less">${icon("daze")}</span>`;
        default: return `<span class="act" title="Resting">${icon("rest")}</span>`;
      }
    });
    const calm = acts.every((a) => a.k === "rest" || a.k === "block" || a.k === "buff" || a.k === "heal");
    return `<span class="${next ? "next" : ""}">${parts.join("")}</span>${calm && !next ? "" : ""}`;
  }

  private renderFoes(wrap: HTMLElement, c: Combat): void {
    const now = performance.now();
    const shown = c.s.foes.filter((f) => f.alive || (this.deaths.get(f.uid) ?? 0) > now);
    const keep = new Set(shown.map((f) => f.uid));
    wrap.querySelectorAll<HTMLElement>(".foe").forEach((n) => { if (!keep.has(Number(n.dataset.uid))) n.remove(); });
    const target = c.target();
    const lens = c.has("bone.lens") || this.s.intentDetail;
    for (const f of shown) {
      let n = wrap.querySelector<HTMLElement>(`.foe[data-uid="${f.uid}"]`);
      const def = FOES[f.id]!;
      if (!n) {
        n = h(`<button class="foe" data-uid="${f.uid}" data-tier="${def.tier}" tabindex="-1">
          <span class="name">${escapeHtml(def.name)}</span>
          <div class="intent"></div>
          <div class="art">${creatureSVG(f.id)}<div class="ring"></div></div>
          <div class="hpbar"><i></i><b></b></div>
          <div class="hpnum"></div>
          <div class="status"></div>
        </button>`);
        n.addEventListener("click", () => this.tapFoe(f.uid));
        let timer = 0;
        n.addEventListener("pointerdown", () => { timer = window.setTimeout(() => n!.classList.add("show-name"), 420); });
        const clear = () => { clearTimeout(timer); setTimeout(() => n!.classList.remove("show-name"), 900); };
        n.addEventListener("pointerup", clear);
        n.addEventListener("pointerleave", clear);
        const idx = shown.indexOf(f);
        const after = wrap.children[idx] ?? null;
        wrap.insertBefore(n, after);
      }
      n.classList.toggle("dead", !f.alive);
      n.classList.toggle("target", f.alive && f.uid === target?.uid && c.alive().length > 1);
      n.querySelector(".art svg")?.setAttribute("data-phase", String(f.phase));
      const crack = n.querySelector<SVGGElement>(".crack");
      if (crack) crack.style.display = f.phase === 2 ? "" : "none";
      const intent = n.querySelector(".intent")!;
      intent.innerHTML = f.alive ? (f.skip > 0 ? `<span class="act">${icon("rest")}</span>` : this.intentHTML(c, f, f.intent)) + (f.alive && (lens || f.revealed > 0) ? this.intentHTML(c, f, c.peekIntent(f), true) : "") : "";
      n.querySelector<HTMLElement>(".hpbar i")!.style.width = `${Math.max(0, (f.hp / f.max) * 100)}%`;
      const pz = Math.min(f.hp, f.poison);
      const bEl = n.querySelector<HTMLElement>(".hpbar b")!;
      bEl.style.left = `${Math.max(0, ((f.hp - pz) / f.max) * 100)}%`;
      bEl.style.right = `${100 - Math.max(0, (f.hp / f.max) * 100)}%`;
      n.querySelector(".hpnum")!.innerHTML = `${Math.max(0, f.hp)}/${f.max}${f.block ? ` <span>${icon("shield").replace("<svg", '<svg style="width:14px;height:14px"')}${f.block}</span>` : ""}`;
      n.querySelector(".status")!.innerHTML = [
        f.poison ? `<span class="pz" title="Poison">${icon("drop")}${f.poison}${f.slowRot ? "∞" : ""}</span>` : "",
        f.weak ? `<span title="Weakened">${icon("weak")}${f.weak}</span>` : "",
        f.str ? `<span title="Strength">${icon("buff")}${f.str}</span>` : "",
        f.mark ? `<span title="Marked">+${f.mark}</span>` : "",
        f.cancelEat ? `<span title="Eat and bind cancelled">${icon("lock")}</span>` : "",
      ].join("");
      n.setAttribute("aria-label", `${def.name}, ${f.hp} of ${f.max}`);
    }
  }

  private renderHand(el: HTMLElement, c: Combat): void {
    const hand = c.body.hand;
    const zone = el.querySelector<HTMLElement>(".handzone")!;
    const wrap = zone.querySelector<HTMLElement>(".hand")!;
    const W = zone.clientWidth || innerWidth;
    const H = zone.clientHeight || 200;
    const compact = W < 700 || H < 230;
    const cw = compact ? Math.min(84, Math.max(62, W / 5.2)) : Math.min(150, H * 0.62);
    const ch = cw * 1.48;
    const n = hand.length;
    const span = n > 1 ? Math.min(W - cw - 24, (n - 1) * cw * 0.86) : 0;
    const ids = new Set(hand.map((x) => x.uid));
    // animate removals
    wrap.querySelectorAll<HTMLElement>(".card").forEach((node) => {
      const uid = Number(node.dataset.uid);
      if (ids.has(uid) || node.dataset.gone) return;
      node.dataset.gone = "1";
      node.classList.add(this.removal.get(uid) === "play" ? "leaving" : "torn");
      setTimeout(() => node.remove(), this.ms(460));
    });
    const pts: Array<[number, number]> = [];
    const picking = this.picking && this.picking.req.cards.some((x) => ids.has(x.uid));
    hand.forEach((card, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5;
      const x = W / 2 - span / 2 + span * t;
      const lift = Math.sin(t * Math.PI) * (compact ? 18 : 26);
      const rot = n > 1 ? (t - 0.5) * (compact ? 12 : 16) : 0;
      const isSel = this.sel === card.uid;
      const picked = !!this.picking?.selected.includes(card.uid);
      const bottom = 26 + lift + (isSel ? 20 : 0);
      pts.push([x, H - 26 - lift + 2]);
      const html = cardHTML(card, c, { compact, inHand: true, width: `${cw}px`, attrs: `style="--w:${cw}px"` });
      let node = wrap.querySelector<HTMLElement>(`.card[data-uid="${card.uid}"]:not([data-gone])`);
      const fresh = !node;
      if (!node) {
        node = h(html);
        node.classList.add("entering");
        this.wireCard(node, card.uid);
        wrap.appendChild(node);
      } else {
        const tmp = h(html);
        node.innerHTML = tmp.innerHTML;
        node.className = tmp.className;
        node.setAttribute("aria-label", tmp.getAttribute("aria-label") ?? "");
      }
      node.style.setProperty("--w", `${cw}px`);
      node.style.left = `${x - cw / 2}px`;
      node.style.bottom = `${bottom}px`;
      node.style.zIndex = String(i + 1);
      node.style.transform = `rotate(${isSel ? 0 : rot}deg)`;
      node.classList.toggle("sel", isSel);
      node.classList.toggle("picking", !!picking);
      node.classList.toggle("picked", picked);
      node.classList.toggle("unplayable", !picking && !c.canPlay(card) && !c.busy && !c.s.over);
      if (fresh) requestAnimationFrame(() => requestAnimationFrame(() => node!.classList.remove("entering")));
    });
    // preview of the selected card
    const pv = zone.querySelector<HTMLElement>(".preview")!;
    const selCard = hand.find((x) => x.uid === this.sel);
    pv.innerHTML = selCard && compact && !picking ? cardHTML(selCard, c, { inHand: true }) : "";
    // Uro's body behind the scales
    this.drawBody(zone.querySelector("svg.body")!, pts, c, W, H, cw);
  }

  private drawBody(svg: SVGSVGElement, pts: Array<[number, number]>, c: Combat, W: number, H: number, cw: number): void {
    const acc = ACCENT[this.run!.molt]!;
    const big = isBig(c.body);
    const thin = pts.length <= 3;
    const w = big ? 40 : thin ? 18 : 28;
    if (!pts.length) {
      svg.innerHTML = `<path d="M30,${H - 40} q30,-30 60,0" stroke="#1d1b1a" stroke-width="3" fill="none" stroke-dasharray="3 6"/>`;
      return;
    }
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    const head: [number, number] = [Math.max(26, first[0] - cw / 2 - 20), first[1] - 4];
    const tail: [number, number] = [Math.min(W - 8, last[0] + 46), last[1] + 12];
    const all = [head, ...pts, tail];
    let d = `M${all[0]![0]},${all[0]![1]}`;
    for (let i = 1; i < all.length; i++) {
      const [x0, y0] = all[i - 1]!;
      const [x1, y1] = all[i]!;
      d += ` Q${x0 + (x1 - x0) / 2},${(y0 + y1) / 2 + 10} ${x1},${y1}`;
    }
    const fray = thin ? `<path d="M${tail[0] - 20},${tail[1] - 4} l26,10 M${tail[0] - 16},${tail[1] + 4} l22,14 M${tail[0] - 24},${tail[1] - 10} l30,2" stroke="#1d1b1a" stroke-width="1.5" fill="none"/>` : "";
    svg.innerHTML = `
      <path d="${d}" fill="none" stroke="#1d1b1a" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${acc}" stroke-width="${w - 2}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
      <path d="${d}" fill="none" stroke="#1d1b1a" stroke-width="${w - 4}" stroke-linecap="butt" stroke-dasharray="2 7" opacity=".55"/>
      ${fray}
      <g transform="translate(${head[0]},${head[1]})">
        <ellipse rx="${w * 0.95}" ry="${w * 0.72}" fill="#1d1b1a"/>
        <ellipse rx="${w * 0.95 - 3}" ry="${w * 0.72 - 3}" fill="none" stroke="${acc}" stroke-width="1.5"/>
        <circle cx="${-w * 0.35}" cy="${-w * 0.2}" r="${Math.max(3, w * 0.16)}" fill="#ece3cf"/>
        <circle cx="${-w * 0.35}" cy="${-w * 0.2}" r="${Math.max(1.4, w * 0.07)}" fill="#1d1b1a"/>
        <path d="M${-w * 0.9},${w * 0.18} l${w * 0.12},${w * 0.18} l${w * 0.12},-${w * 0.18} l${w * 0.12},${w * 0.18} l${w * 0.12},-${w * 0.18}" stroke="#ece3cf" stroke-width="1.4" fill="none"/>
      </g>`;
  }

  private wireCard(node: HTMLElement, uid: number): void {
    let timer = 0;
    let long = false;
    node.addEventListener("pointerdown", () => {
      long = false;
      timer = window.setTimeout(() => { long = true; this.inspect(uid); }, 480);
    });
    const cancel = () => clearTimeout(timer);
    node.addEventListener("pointerup", cancel);
    node.addEventListener("pointerleave", cancel);
    node.addEventListener("contextmenu", (e) => { e.preventDefault(); this.inspect(uid); });
    node.addEventListener("click", () => { if (!long) void this.tapCard(uid); });
  }

  private renderBanner(el: HTMLElement, c: Combat): void {
    const zone = el.querySelector(".handzone")!;
    zone.querySelector(".banner")?.remove();
    const p = this.picking;
    if (!p || !p.req.cards.some((x) => c.body.hand.includes(x))) return;
    const n = p.req.count;
    const text = p.req.kind === "wound" ? `Choose ${n} to lose` : p.req.kind === "sacrifice" ? `Sacrifice ${n}` : PROMPTS[p.req.prompt] ?? "Choose";
    const needConfirm = this.needConfirm() && p.req.kind !== "choose";
    const ready = p.selected.length === n;
    const banner = h(`<div class="banner ${p.req.kind === "choose" ? "" : "wound"}">${p.req.kind === "choose" ? "" : icon(p.req.kind === "wound" ? "claw" : "sacrifice")}<span>${text}${p.selected.length && n > 1 ? ` · ${p.selected.length}/${n}` : ""}</span>${needConfirm && ready ? `<button class="btn" data-confirm>${icon("check")}</button>` : ""}</div>`);
    banner.querySelector("[data-confirm]")?.addEventListener("click", () => this.resolvePick());
    zone.appendChild(banner);
  }

  private needConfirm(): boolean {
    const w = this.s.woundConfirm;
    return w === "on" || (w === "auto" && this.input.family === "touch");
  }

  private async tapCard(uid: number): Promise<void> {
    const c = this.combat;
    if (!c) return;
    const p = this.picking;
    if (p) {
      if (!p.req.cards.some((x) => x.uid === uid)) return;
      const i = p.selected.indexOf(uid);
      if (i >= 0) p.selected.splice(i, 1);
      else if (p.selected.length < p.req.count) p.selected.push(uid);
      else if (p.req.count === 1) p.selected = [uid];
      this.audio.play("wound.choose");
      if (p.selected.length === p.req.count && (p.req.kind === "choose" || !this.needConfirm())) return this.resolvePick();
      return this.updateFight();
    }
    if (c.busy || c.s.over) return;
    const card = c.body.hand.find((x) => x.uid === uid);
    if (!card) return;
    if (this.sel === uid) {
      if (!c.canPlay(card)) {
        this.audio.play("ui.back");
        return;
      }
      await this.playCard(uid);
      return;
    }
    this.sel = uid;
    this.audio.play("ui.confirm");
    this.updateFight();
  }

  private async tapFoe(uid: number): Promise<void> {
    const c = this.combat;
    if (!c || this.picking) return;
    c.setTarget(uid);
    if (this.sel !== null) {
      const card = c.body.hand.find((x) => x.uid === this.sel);
      if (card && CARDS[card.id]!.tgt && c.canPlay(card)) return this.playCard(card.uid, uid);
    }
    this.updateFight();
  }

  private async playCard(uid: number, target?: number): Promise<void> {
    const c = this.combat!;
    this.sel = null;
    this.removal.set(uid, "play");
    if (!this.persist.taught("play-fang")) this.persist.teach("play-fang");
    this.clearPrompt();
    const ok = await c.play(uid, target);
    if (!ok) this.removal.delete(uid);
    this.updateFight();
    if (c.s.over) await this.after();
  }

  private async endTurn(): Promise<void> {
    const c = this.combat;
    if (!c || c.busy || c.s.over || this.picking) return;
    this.sel = null;
    this.audio.play("ui.confirm");
    const p = c.endTurn();
    this.updateFight();
    await p;
    this.updateFight();
    if (c.s.over) await this.after();
  }

  private fightAction(a: Action): void {
    const c = this.combat;
    if (!c) return;
    const hand = c.body.hand;
    const p = this.picking;
    const list = p ? p.req.cards.filter((x) => hand.includes(x)) : hand;
    const move = (d: number) => {
      if (!list.length) return;
      const i = list.findIndex((x) => x.uid === this.sel);
      this.sel = list[(i + d + list.length) % list.length]!.uid;
      this.audio.play("wound.choose");
      this.updateFight();
    };
    if (a.startsWith("slot.")) {
      const card = list[Number(a.slice(5)) - 1];
      if (card) void this.tapCard(card.uid); // first press selects, second plays
      return;
    }
    switch (a) {
      case "card.prev": case "nav.up": return move(-1);
      case "card.next": case "nav.down": return move(1);
      case "nav.left": if (!p) { c.cycleTarget(-1); this.updateFight(); } else move(-1); return;
      case "nav.right": if (!p) { c.cycleTarget(1); this.updateFight(); } else move(1); return;
      case "confirm":
        if (this.sel !== null) void this.tapCard(this.sel);
        else if (p && p.selected.length === p.req.count) this.resolvePick();
        return;
      case "enter":
        if (p) { if (this.sel !== null && !p.selected.includes(this.sel)) void this.tapCard(this.sel); else if (p.selected.length === p.req.count) this.resolvePick(); return; }
        return void this.endTurn();
      case "turn.end": if (!p) void this.endTurn(); return;
      case "card.inspect": if (this.sel !== null) this.inspect(this.sel); return;
      case "back":
        if (this.sel !== null) { this.sel = null; this.updateFight(); return; }
        if (!p) this.showPause();
        return;
      case "pause": if (!p) this.showPause(); return;
    }
  }

  private inspect(uid: number): void {
    const c = this.combat;
    if (!c) return;
    const card = [...c.body.hand, ...c.body.discard, ...c.body.draw].find((x) => x.uid === uid);
    if (!card) return;
    const inHand = c.body.hand.includes(card);
    const el = h(`<div class="overlay"><div class="inspect">${cardHTML(card, c, { inHand })}<div class="math">${breakdownHTML(card, c, inHand)}</div></div><button class="btn" data-nav data-autofocus data-close>${icon("back")}</button></div>`);
    const close = () => this.closeOverlay();
    el.addEventListener("click", close);
    this.openOverlay(el, close);
  }

  private showPile(which: "draw" | "discard"): void {
    const c = this.combat;
    if (!c) return;
    const cards = [...(which === "draw" ? c.body.draw : c.body.discard)].sort((a, b) => a.id.localeCompare(b.id));
    const el = h(`<div class="overlay"><div class="grid-cards">${cards.map((x) => cardHTML(x, c, {})).join("") || `<p>${icon(which)}</p>`}</div><button class="btn" data-nav data-autofocus data-close>${icon("back")}</button></div>`);
    el.querySelector("[data-close]")!.addEventListener("click", () => this.closeOverlay());
    this.openOverlay(el, () => this.closeOverlay());
  }

  // ================= agent (decisions) =================

  pick(req: PickRequest): Promise<number[]> {
    const c = this.combat;
    const inHand = c && req.cards.every((x) => c.body.hand.includes(x));
    if (!inHand) return this.pickFromList(req);
    return new Promise((resolve) => {
      this.picking = { req, selected: [], resolve };
      this.sel = req.cards[0]?.uid ?? null;
      if (req.kind === "wound" && !this.persist.taught("wound")) this.persist.teach("wound");
      this.updateFight();
    });
  }

  private resolvePick(): void {
    const p = this.picking;
    if (!p) return;
    this.picking = null;
    this.sel = null;
    for (const uid of p.selected) this.removal.set(uid, "wound");
    p.resolve(p.selected);
    this.updateFight();
  }

  private pickFromList(req: PickRequest): Promise<number[]> {
    const c = this.combat!;
    return new Promise((resolve) => {
      const el = h(`<div class="overlay"><h2>${escapeHtml(PROMPTS[req.prompt] ?? "Choose")}</h2><div class="grid-cards">${req.cards.map((x) => cardHTML(x, c, { attrs: "data-nav" })).join("")}</div></div>`);
      el.querySelectorAll<HTMLElement>(".card").forEach((n) =>
        n.addEventListener("click", () => {
          this.closeOverlay();
          resolve([Number(n.dataset.uid)]);
        }),
      );
      this.openOverlay(el, null);
    });
  }

  chooseDeck(prompt: string, indices: number[]): Promise<number | null> {
    const run = this.run!;
    const e = previewCombat(run);
    return new Promise((resolve) => {
      const el = h(`<div class="overlay"><h2>${escapeHtml(PROMPTS[prompt] ?? "Choose")}</h2>
        <div class="grid-cards">${indices.map((i) => staticCardHTML(run.deck[i]!.id, run.deck[i]!.up, e, { attrs: `data-nav data-i="${i}"` })).join("")}</div>
        <button class="btn" data-nav data-back>${icon("back")}</button></div>`);
      const done = (v: number | null) => {
        this.closeOverlay();
        resolve(v);
      };
      el.querySelectorAll<HTMLElement>(".card").forEach((n) => n.addEventListener("click", () => { this.ui(); done(Number(n.dataset.i)); }));
      el.querySelector("[data-back]")!.addEventListener("click", () => done(null));
      this.openOverlay(el, () => done(null));
    });
  }

  // ================= presenter (semantic events) =================

  emit(ev: GameEvent): void | Promise<void> {
    const t = ev.type;
    this.audio.play(t, { ...ev, grow: this.run ? this.run.maxHand - 7 : 0 });
    const el = this.fightEl;
    const foeEl = (uid: unknown) => el?.querySelector<HTMLElement>(`.foe[data-uid="${uid}"]`);
    switch (t) {
      case "enemy.hit": {
        const f = foeEl(ev.uid);
        if (f) {
          f.classList.remove("hit");
          void f.offsetWidth;
          f.classList.add("hit");
          this.floatAt(f, `${ev.n}`, "");
          this.splashAt(f);
        }
        this.updateFight();
        return;
      }
      case "enemy.poison": {
        const f = foeEl(ev.uid);
        if (f) this.floatAt(f, `${ev.n}`, "poison");
        this.updateFight();
        return wait(this.ms(260));
      }
      case "enemy.die":
        this.deaths.set(ev.uid as number, performance.now() + this.ms(700));
        this.updateFight();
        setTimeout(() => this.updateFight(), this.ms(720));
        return;
      case "foe.act": {
        const f = foeEl(ev.uid);
        f?.classList.add("acting");
        return wait(this.ms(300)).then(() => { f?.classList.remove("acting"); });
      }
      case "enemy.attack": {
        const core = el?.querySelector<HTMLElement>(".might");
        if (core && ev.landed) {
          this.floatAt(core, `−${ev.landed}`, "wound");
          if (!this.s.reducedMotion) {
            el!.classList.remove("shake");
            void el!.offsetWidth;
            el!.classList.add("shake");
          }
        }
        this.updateFight();
        return wait(this.ms(240));
      }
      case "block.absorb": {
        const core = el?.querySelector<HTMLElement>(".core .left");
        if (core) this.floatAt(core, `${icon("shield")}${ev.n}`, "block");
        return;
      }
      case "intent.eat":
        this.removal.set(ev.uid as number, "eat");
        this.updateFight();
        return wait(this.ms(420));
      case "card.bind":
      case "foe.summon":
      case "foe.block":
      case "foe.buff":
      case "foe.heal":
      case "poison.on":
      case "decoy":
        this.updateFight();
        return wait(this.ms(200));
      case "wound.incoming":
        this.updateFight();
        return wait(this.ms(160));
      case "turn.start":
        this.updateFight();
        if (this.run?.screen.kind === "combat") void this.save();
        return;
      case "card.coil":
      case "card.coil.max":
      case "card.draw":
      case "block.gain":
      case "enemy.poisoned":
      case "enemy.weaken":
        this.updateFight();
        return;
      case "scar.gain":
        if (!this.persist.taught("scars")) {
          this.persist.teach("scars");
          setTimeout(() => this.toast("Scars shrink you"), 400);
        }
        return;
      case "bone.trigger":
        this.toast(BONES[ev.id as string]?.name ?? "");
        return;
    }
  }

  private floatAt(target: HTMLElement, html: string, cls: string): void {
    const r = target.getBoundingClientRect();
    const host = this.root.getBoundingClientRect();
    const f = h(`<div class="float ${cls}">${html}</div>`);
    f.style.left = `${r.left - host.left + r.width / 2 - 12 + (Math.random() * 20 - 10)}px`;
    f.style.top = `${r.top - host.top + r.height * 0.3}px`;
    this.root.appendChild(f);
    setTimeout(() => f.remove(), this.ms(820) + 40);
  }

  private splashAt(target: HTMLElement): void {
    if (this.s.reducedMotion) return;
    const r = target.querySelector(".art")?.getBoundingClientRect() ?? target.getBoundingClientRect();
    const host = this.root.getBoundingClientRect();
    const sp = h(`<svg class="splash" viewBox="0 0 100 100"><path d="M50 50 l30 -6 l-24 10 l20 18 l-26 -12 l-6 28 l-2 -28 l-24 10 l20 -18 l-28 -12 l30 4 l-4 -30 l10 28 l18 -24 l-10 26z" fill="#1d1b1a"/></svg>`);
    sp.style.left = `${r.left - host.left + r.width / 2}px`;
    sp.style.top = `${r.top - host.top + r.height / 2}px`;
    this.root.appendChild(sp);
    setTimeout(() => sp.remove(), this.ms(470) + 30);
  }

  private prompt(text: string): void {
    this.clearPrompt();
    const p = h(`<div class="prompt" data-prompt>${escapeHtml(text)}</div>`);
    const zone = this.fightEl?.querySelector(".handzone")?.getBoundingClientRect();
    const host = this.root.getBoundingClientRect();
    p.style.bottom = zone ? `${host.bottom - zone.top + 8}px` : "40%";
    this.root.appendChild(p);
  }
  private clearPrompt(): void {
    this.root.querySelector("[data-prompt]")?.remove();
  }

  toast(text: string): void {
    const t = h(`<div class="toast">${escapeHtml(text)}</div>`);
    this.root.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  // ================= reward / rest / shop / event / treasure =================

  private plate(inner: string, opts: { light?: boolean } = {}): HTMLElement {
    const el = h(`<section class="screen dark">${this.barHTML(!opts.light)}<div class="plate-screen">${inner}</div></section>`);
    this.wireBar(el);
    return el;
  }

  private renderReward(): void {
    const ctl = this.ctl!;
    const run = ctl.run;
    const sc = run.screen;
    if (sc.kind !== "reward") return;
    const e = previewCombat(run);
    const first = !this.persist.taught("devour");
    const el = this.plate(`
      <div class="loot"><span>${icon("glint")}+${sc.glint}</span>${sc.bone ? `<span>${boneGlyph(sc.bone).replace("<svg", '<svg style="width:22px;height:22px"')}${escapeHtml(BONES[sc.bone]?.name ?? "")}</span>` : ""}</div>
      <h1>${first ? "Devour one" : "Devour"}</h1>
      <div class="husk-row">${sc.husks.map((hk, i) => `<div class="husk">${staticCardHTML(hk.id, false, e, { attrs: `data-nav data-i="${i}"${i === 0 ? " data-autofocus" : ""}` })}${hk.twin ? `<span class="twin">×2</span>` : ""}</div>`).join("")}</div>
      <button class="btn ghost" data-nav data-leave>${sc.devours > 0 && sc.husks.length ? "Skip" : "Descend"}</button>`);
    el.querySelectorAll<HTMLElement>(".husk .card").forEach((n) =>
      n.addEventListener("click", async () => {
        if (sc.devours <= 0) return;
        this.persist.teach("devour");
        ctl.devour(Number(n.dataset.i));
        if (sc.devours <= 0 || !sc.husks.length) ctl.leave();
        await this.after();
      }),
    );
    el.querySelector("[data-leave]")!.addEventListener("click", async () => { this.ui(); ctl.leave(); await this.after(); });
    this.setScreen(el);
  }

  private renderRest(): void {
    const ctl = this.ctl!;
    const run = ctl.run;
    const sc = run.screen;
    if (sc.kind !== "rest") return;
    const mendN = ctl.has("bone.salt_lick") ? 3 : tuning.economy.restMend;
    const el = this.plate(`
      <div style="width:min(280px,70vw)">${uroRing(280, ACCENT[run.molt], 24, Math.min(24, run.maxHand - run.scars))}</div>
      ${sc.done ? "" : `<div class="choice-plates">
        <button class="choice-plate" data-nav data-c="mend" ${run.scars ? "data-autofocus" : "disabled"}>${icon("scar")}<b>Mend</b><span>Remove ${mendN} scars</span></button>
        <button class="choice-plate" data-nav data-c="coil" ${run.scars ? "" : "data-autofocus"}>${icon("body")}<b>Coil</b><span>Upgrade a card</span></button>
        <button class="choice-plate" data-nav data-c="shed">${icon("discard")}<b>Shed</b><span>Remove a card</span></button>
      </div>`}
      ${sc.done ? `<button class="btn solid" data-nav data-autofocus data-leave>Descend</button>` : ""}`);
    if (run.scars && !this.persist.taught("scars-rest")) {
      this.persist.teach("scars-rest");
      setTimeout(() => this.toast("Scars shrink you"), 300);
    }
    el.querySelectorAll<HTMLElement>("[data-c]").forEach((b) =>
      b.addEventListener("click", async () => {
        this.ui();
        if (await ctl.rest(b.dataset.c as "mend" | "coil" | "shed")) {
          await this.save();
          this.renderRest();
        }
      }),
    );
    el.querySelector("[data-leave]")?.addEventListener("click", async () => { this.ui(); ctl.leave(); await this.after(); });
    this.setScreen(el);
  }

  private renderShop(): void {
    const ctl = this.ctl!;
    const run = ctl.run;
    const sc = run.screen;
    if (sc.kind !== "shop") return;
    const e = previewCombat(run);
    const st = sc.stock;
    const price = (p: number) => `<span class="price">${icon("glint")}${p}</span>`;
    const el = this.plate(`
      <h1>The Burrower</h1>
      <div class="shop-grid">
        ${st.cards.map((w, i) => `<div class="ware ${w.sold ? "sold" : ""}">${staticCardHTML(w.id, false, e, { attrs: `data-nav data-card="${i}" ${w.price > run.glint ? "disabled" : ""}` })}${price(w.price)}</div>`).join("")}
        ${st.bones.map((w, i) => `<div class="ware ${w.sold ? "sold" : ""}"><button class="bone-ware" data-nav data-bonei="${i}" ${w.price > run.glint ? "disabled" : ""}>${boneGlyph(w.id)}<b>${escapeHtml(BONES[w.id]!.name)}</b><span>${escapeHtml(BONES[w.id]!.text)}</span></button>${price(w.price)}</div>`).join("")}
        <div class="ware ${st.mendUsed ? "sold" : ""}"><button class="bone-ware" data-nav data-mend ${!run.scars || ctl.mendPrice() > run.glint ? "disabled" : ""}>${icon("scar")}<b>Mend</b><span>Remove a scar</span></button>${price(ctl.mendPrice())}</div>
        <div class="ware ${st.shedUsed ? "sold" : ""}"><button class="bone-ware" data-nav data-shed ${ctl.shedPrice() > run.glint ? "disabled" : ""}>${icon("discard")}<b>Shed</b><span>Remove a card</span></button>${price(ctl.shedPrice())}</div>
      </div>
      <button class="btn solid" data-nav data-autofocus data-leave>Leave</button>`);
    const buy = async (kind: "card" | "bone" | "mend" | "shed", i = 0) => {
      if (await ctl.buy(kind, i)) {
        this.audio.play("bone.gain");
        await this.save();
        this.renderShop();
      } else this.audio.play("ui.back");
    };
    el.querySelectorAll<HTMLElement>("[data-card]").forEach((n) => n.addEventListener("click", () => buy("card", Number(n.dataset.card))));
    el.querySelectorAll<HTMLElement>("[data-bonei]").forEach((n) => n.addEventListener("click", () => buy("bone", Number(n.dataset.bonei))));
    el.querySelector("[data-mend]")?.addEventListener("click", () => buy("mend"));
    el.querySelector("[data-shed]")?.addEventListener("click", () => buy("shed"));
    el.querySelector("[data-leave]")!.addEventListener("click", async () => { this.ui(); ctl.leave(); await this.after(); });
    this.setScreen(el);
  }

  private renderEvent(): void {
    const ctl = this.ctl!;
    const run = ctl.run;
    const sc = run.screen;
    if (sc.kind !== "event") return;
    const def = EVENTS[sc.id]!;
    const choices = ctl.eventChoices(sc.id);
    const el = this.plate(`
      <h1>${escapeHtml(def.title)}</h1>
      <p class="lines">${escapeHtml(def.lines)}</p>
      <div class="choices">${choices.map((c, i) => {
        const ok = !c.can || c.can(run);
        return `<button class="btn" data-nav data-i="${i}" ${ok ? "" : "disabled"} ${i === 0 && ok ? "data-autofocus" : ""}>${escapeHtml(c.label)}${c.hint ? `<span class="sub">${escapeHtml(c.hint)}</span>` : ""}</button>`;
      }).join("")}</div>`);
    el.querySelectorAll<HTMLElement>("[data-i]").forEach((b) =>
      b.addEventListener("click", async () => {
        this.ui();
        await ctl.chooseEvent(Number(b.dataset.i));
        await this.after();
      }),
    );
    this.setScreen(el);
  }

  private renderTreasure(): void {
    const ctl = this.ctl!;
    const sc = ctl.run.screen;
    if (sc.kind !== "treasure") return;
    const b = BONES[sc.bone];
    const el = this.plate(`
      <div class="choice-plates" style="max-width:320px"><button class="choice-plate" data-nav data-autofocus data-take>${boneGlyph(sc.bone)}<b>${escapeHtml(b?.name ?? "")}</b><span>${escapeHtml(b?.text ?? "")}</span></button></div>`);
    el.querySelector("[data-take]")!.addEventListener("click", async () => {
      ctl.takeTreasure();
      ctl.leave();
      await this.after();
    });
    this.setScreen(el);
  }

  private showDeck(): void {
    const run = this.run;
    if (!run) return;
    const e = previewCombat(run);
    const cards = run.deck.map((d, i) => ({ d, i })).sort((a, b) => a.d.id.localeCompare(b.d.id));
    const el = h(`<div class="overlay"><div class="grid-cards">${cards.map(({ d }) => staticCardHTML(d.id, d.up, e, {})).join("")}</div><button class="btn" data-nav data-autofocus data-close>${icon("back")}</button></div>`);
    el.querySelector("[data-close]")!.addEventListener("click", () => this.closeOverlay());
    this.openOverlay(el, () => this.closeOverlay());
  }

  // ================= end of run =================

  private async endRun(): Promise<void> {
    const run = this.run!;
    const sc = run.screen;
    if (sc.kind !== "over") return;
    const meta = this.persist.meta;
    meta.runs++;
    if (sc.win) meta.wins++;
    meta.bestRow = Math.max(meta.bestRow, run.row + 1 + (run.act - 1) * 16);
    meta.history.unshift({ at: Date.now(), molt: run.molt, win: sc.win, reason: sc.reason, row: run.row + 1, act: run.act, maxHand: run.maxHand - run.scars, fights: run.stats.fights, devoured: run.stats.devoured.length, seed: run.seed });
    meta.history = meta.history.slice(0, 50);
    await this.persist.saveMeta();
    await this.persist.clearRun();
  }

  private renderOver(): void {
    const run = this.run!;
    const sc = run.screen;
    if (sc.kind !== "over") return;
    this.audio.stopMusic();
    const st = run.stats;
    const eff = Math.max(0, run.maxHand - run.scars);
    const title = sc.win ? (run.act >= LAST_ACT ? "Topsoil devoured" : "Descend") : DEATH[sc.reason] ?? "Spent";
    const el = h(`<section class="screen dark results"><div class="plate-screen">
      <div class="result-body" style="width:min(300px,72vw)">${uroRing(300, ACCENT[run.molt], Math.max(24, eff), eff)}</div>
      <h1>${escapeHtml(title)}</h1>
      <dl class="statlist">
        <dt>Reached</dt><dd>${escapeHtml(ACT_NAMES[run.act] ?? "")} · ${run.row + 1}</dd>
        ${!sc.win && st.diedTo ? `<dt>Taken by</dt><dd>${escapeHtml(FOES[st.diedTo]?.name ?? "")}</dd>` : ""}
        <dt>Max hand</dt><dd>${eff}${run.scars ? ` (−${run.scars})` : ""}</dd>
        <dt>Devoured</dt><dd>${st.devoured.length}</dd>
        <dt>Fights</dt><dd>${st.fights}</dd>
        <dt>Cards spent</dt><dd>${st.cardsPlayed}</dd>
        <dt>Wounds</dt><dd>${st.woundsTaken}</dd>
      </dl>
      <div class="menu"><button class="btn solid" data-nav data-autofocus data-again>Descend again</button><button class="btn ghost" data-nav data-title>Title</button></div>
    </div></section>`);
    el.querySelector("[data-again]")!.addEventListener("click", () => {
      this.ui();
      const seed = Math.random().toString(36).slice(2, 10).toUpperCase();
      this.startRun(newRun({ seed, molt: run.molt, onboarding: false }));
    });
    el.querySelector("[data-title]")!.addEventListener("click", () => { this.ctl = null; void this.showTitle(); });
    this.setScreen(el);
  }

  // ================= pause & settings =================

  showPause(): void {
    if (this.overlayEl || !this.run) return;
    this.audio.play("ui.back");
    const el = h(`<div class="overlay"><h2>Paused</h2><div class="menu">
      <button class="btn solid" data-nav data-autofocus data-resume>Resume</button>
      <button class="btn" data-nav data-settings>Settings</button>
      <button class="btn" data-nav data-title>Save &amp; quit</button>
      <button class="btn ghost" data-nav data-abandon>Abandon run</button>
    </div></div>`);
    const close = () => this.closeOverlay();
    el.querySelector("[data-resume]")!.addEventListener("click", close);
    el.querySelector("[data-settings]")!.addEventListener("click", () => {
      this.closeOverlay();
      this.openSettingsOverlay();
    });
    el.querySelector("[data-title]")!.addEventListener("click", async () => {
      await this.save();
      this.ctl = null;
      await this.showTitle();
    });
    el.querySelector("[data-abandon]")!.addEventListener("click", async (ev) => {
      const b = ev.currentTarget as HTMLButtonElement;
      if (b.dataset.sure !== "1") {
        b.dataset.sure = "1";
        b.textContent = "Abandon: are you sure?";
        return;
      }
      const run = this.run!;
      run.screen = { kind: "over", win: false, reason: "spent" };
      this.closeOverlay();
      await this.endRun();
      await this.render();
    });
    this.openOverlay(el, close);
  }

  private settingsRows(): string {
    const s = this.s;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const row = (id: string, label: string, value: string) => `<button class="btn setting" data-nav data-s="${id}"><b>${label}</b><span>${value}</span></button>`;
    return [
      row("master", "Volume", pct(s.master)),
      row("music", "Music", pct(s.music)),
      row("fightSpeed", "Fight speed", `${s.fightSpeed}×`),
      row("woundConfirm", "Confirm wounds", s.woundConfirm === "auto" ? "Touch only" : s.woundConfirm === "on" ? "On" : "Off"),
      row("intentDetail", "Show next moves", s.intentDetail ? "On" : "Off"),
      row("textScale", "Text size", pct(s.textScale)),
      row("reducedMotion", "Reduced motion", s.reducedMotion ? "On" : "Off"),
      row("highContrast", "High-contrast ink", s.highContrast ? "On" : "Off"),
      row("grain", "Paper grain", s.grain ? "On" : "Off"),
      row("fullscreen", "Fullscreen", document.fullscreenElement ? "On" : "Off"),
    ].join("");
  }

  private async changeSetting(id: string): Promise<void> {
    const s = this.s;
    const cycle = <T>(list: T[], cur: T): T => list[(list.indexOf(cur) + 1) % list.length]!;
    switch (id) {
      case "master": s.master = cycle([0, 0.2, 0.4, 0.6, 0.8, 1], s.master); break;
      case "music": s.music = cycle([0, 0.25, 0.5, 0.75, 1], s.music); break;
      case "fightSpeed": s.fightSpeed = cycle([1, 1.5, 2], s.fightSpeed); break;
      case "woundConfirm": s.woundConfirm = cycle<Settings["woundConfirm"]>(["auto", "on", "off"], s.woundConfirm); break;
      case "intentDetail": s.intentDetail = !s.intentDetail; break;
      case "textScale": s.textScale = cycle([1, 1.25, 1.5], s.textScale); break;
      case "reducedMotion": s.reducedMotion = !s.reducedMotion; break;
      case "highContrast": s.highContrast = !s.highContrast; break;
      case "grain": s.grain = !s.grain; break;
      case "fullscreen":
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
        } catch { /* not allowed */ }
        break;
    }
    this.applySettings();
    await this.persist.saveSettings();
    this.ui();
  }

  showSettings(back: () => void): void {
    this.view = "settings";
    this.settingsBack = back;
    const draw = (focusId?: string) => {
      const el = h(`<section class="screen dark"><div class="plate-screen"><h1>Settings</h1><div class="settings">${this.settingsRows()}</div><button class="btn ghost" data-nav data-back>${icon("back")}</button></div></section>`);
      el.querySelectorAll<HTMLElement>("[data-s]").forEach((b) => b.addEventListener("click", async () => { await this.changeSetting(b.dataset.s!); draw(b.dataset.s); }));
      el.querySelector("[data-back]")!.addEventListener("click", () => back());
      this.setScreen(el);
      if (focusId) requestAnimationFrame(() => el.querySelector<HTMLElement>(`[data-s="${focusId}"]`)?.focus());
    };
    draw();
  }

  private openSettingsOverlay(): void {
    const draw = (focusId?: string) => {
      const el = h(`<div class="overlay"><h2>Settings</h2><div class="settings">${this.settingsRows()}</div><button class="btn ghost" data-nav data-back>${icon("back")}</button></div>`);
      el.querySelectorAll<HTMLElement>("[data-s]").forEach((b) => b.addEventListener("click", async () => { await this.changeSetting(b.dataset.s!); draw(b.dataset.s); }));
      el.querySelector("[data-back]")!.addEventListener("click", () => this.closeOverlay());
      this.openOverlay(el, () => this.closeOverlay());
      if (focusId) requestAnimationFrame(() => el.querySelector<HTMLElement>(`[data-s="${focusId}"]`)?.focus());
      if (this.run?.screen.kind === "combat") this.updateFight();
    };
    draw();
  }
}

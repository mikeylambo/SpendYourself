import { isBig, might } from "../bodydeck/BodyDeck.ts";
import { BONE_LIST, BONES } from "../data/bones.ts";
import { CARD_LIST, CARDS } from "../data/cards.ts";
import { asc, TURNS } from "../data/turns.ts";
import { GLOSSARY, glossaryFor, HOW_TO_PLAY, intentWords, TIPS } from "./guide.ts";
import { EVENTS } from "../data/events.ts";
import { FOES } from "../data/foes.ts";
import { tuning } from "../data/tuning.ts";
import type { Combat } from "../game/combat.ts";
import { LAST_ACT, newRun, RunController, type RunAgent } from "../game/run.ts";
import type { MapNode, RunState } from "../game/state.ts";
import { previewPlay, type PlayPreview } from "../game/preview.ts";
import type { Act, FoeState, GameEvent, MoltId, PickRequest, Presenter } from "../game/types.ts";
import { bloomCoda, boneGlyph, creatureSVG, icon, ringGlyph, SVG_DEFS, uroRing } from "./art.ts";
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
  transform: "Transform a card",
};
const MOLTS: MoltId[] = ["venom", "tide", "storm"];
const MOLT_INFO: Record<MoltId, { name: string; play: string; passive: string; unlock: string }> = {
  venom: { name: "Venom", play: "Poison, devour, grow huge", passive: "Hunger: poisoned kills leave twin husks. Your poison bites +1 harder each stratum down.", unlock: "" },
  tide: { name: "Tide", play: "Block, draw, thrive small", passive: "Undertow: at 3 cards or fewer, draw 1 more and wounds can't take your last card.", unlock: "Reach the Roots" },
  storm: { name: "Storm", play: "Hoard coil, one huge strike", passive: "Charge: coil caps at 5; two cards start each fight coiled.", unlock: "Defeat the Drowned Mouth" },
};
const freshSeed = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const dailyDate = () => new Date().toISOString().slice(0, 10);
const hashDay = (d: string) => [...d].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
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
  /** What the selected card would do (damage and block previews). */
  private pv: PlayPreview | null = null;
  private pvKey = "";
  /** Wounds landed this enemy turn, by attacker, for the wound banner. */
  private woundLog = new Map<string, number>();
  /** End turn was pressed once into a lethal forecast; a second press within the window ends it. */
  private endArmed = 0;
  /** Card under the finger while sliding across the hand. */
  private peek: number | null = null;
  /** The guided first fight: which step the player is on. */
  private guided: string | null = null;
  private slid = false;
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
    // Rotation (above all in an installed PWA) fires resize before the viewport settles: size from
    // innerHeight, then lay out again once it has settled.
    let settle = 0;
    const onResize = () => {
      document.documentElement.style.setProperty("--app-h", `${innerHeight}px`);
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        document.documentElement.style.setProperty("--app-h", `${innerHeight}px`);
        this.relayout();
      }, 160);
    };
    addEventListener("resize", onResize);
    addEventListener("orientationchange", () => { onResize(); setTimeout(onResize, 450); });
    onResize();
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
    const meta = this.persist.meta;
    const saved = await this.persist.loadRun();
    const live = saved && saved.screen.kind !== "over" ? saved : null;
    const today = dailyDate();
    const dailyOpen = meta.runs >= 3;
    const allSix = MOLTS.every((m) => (meta.endings[m] ?? []).length >= 2);
    const el = h(`<section class="screen dark title">
      <div class="title-ring">${uroRing(900, allSix ? "#d9a432" : ACCENT.venom, 34)}</div>
      <div class="title-wrap">
        <h1 class="wordmark title-xl">SPEND<br>Y${ringGlyph()}URSELF</h1>
        <div class="menu">
          ${live ? `<button class="btn solid" data-nav data-autofocus data-act="continue">Continue<span class="sub">${live.daily ? "Daily · " : ""}${ACT_NAMES[live.act]} · ${live.row + 1}</span></button>` : ""}
          <button class="btn ${live ? "" : "solid"}" data-nav ${live ? "" : "data-autofocus"} data-act="begin">${meta.runs ? "Descend" : "Begin"}</button>
          ${dailyOpen ? `<button class="btn" data-nav data-act="daily">Daily Descent<span class="sub">${meta.daily[today] ? `Today: ${meta.daily[today]!.win ? "won" : `reached ${meta.daily[today]!.row}`}` : today}</span></button>` : ""}
          <button class="btn ghost" data-nav data-act="how">How to play</button>
          ${meta.runs ? `<button class="btn ghost" data-nav data-act="library">Library &amp; history</button>` : ""}
          <button class="btn ghost" data-nav data-act="settings">Settings</button>
        </div>
      </div>
    </section>`);
    const fresh = async () => { if (live) await this.persist.clearRun(); };
    el.querySelector('[data-act="continue"]')?.addEventListener("click", () => live && this.startRun(live));
    el.querySelector('[data-act="begin"]')!.addEventListener("click", async () => {
      this.ui();
      if (live && !(await this.confirmAbandon(el))) return;
      await fresh();
      if (meta.runs === 0) return this.showHowTo(() => this.startRun(newRun({ seed: freshSeed(), molt: "venom", onboarding: true })));
      if (this.unlockedMolts().length > 1 || meta.wins > 0) return this.showMoltPicker();
      this.startRun(newRun({ seed: freshSeed(), molt: "venom", onboarding: false }));
    });
    el.querySelector('[data-act="daily"]')?.addEventListener("click", async () => {
      this.ui();
      if (live && !(await this.confirmAbandon(el))) return;
      await fresh();
      const molt = MOLTS[hashDay(today) % MOLTS.length]!;
      this.startRun(newRun({ seed: `DAILY-${today}`, molt, onboarding: false, daily: today }));
    });
    el.querySelector('[data-act="how"]')!.addEventListener("click", () => { this.ui(); this.showHowTo(() => this.showTitle()); });
    el.querySelector('[data-act="library"]')?.addEventListener("click", () => { this.ui(); this.showLibrary(); });
    el.querySelector('[data-act="settings"]')!.addEventListener("click", () => { this.ui(); this.showSettings(() => this.showTitle()); });
    this.setScreen(el);
  }

  /** Starting over a saved run asks once, in place. */
  private confirmAbandon(el: HTMLElement): Promise<boolean> {
    return new Promise((resolve) => {
      const b = el.querySelector<HTMLButtonElement>('[data-act="begin"]')!;
      if (b.dataset.sure === "1") return resolve(true);
      b.dataset.sure = "1";
      b.innerHTML = `Abandon saved run?<span class="sub">Press again to start over</span>`;
      resolve(false);
    });
  }

  unlockedMolts(): MoltId[] {
    return MOLTS.filter((m) => this.persist.meta.unlocked.includes(`molt.${m}`));
  }

  showMoltPicker(): void {
    const meta = this.persist.meta;
    let turn = Math.min(meta.maxTurn, meta.lastTurn ?? 0);
    const draw = () => {
      const el = h(`<section class="screen dark"><div class="plate-screen">
        <h1>Molt</h1>
        ${meta.maxTurn > 0 ? `<div class="turns"><button class="btn" data-nav data-t="-1" ${turn <= 0 ? "disabled" : ""}>−</button><div><b>Turn ${turn}</b><span>${turn ? escapeHtml(TURNS[turn] ?? "") : "No extra pressure"}</span></div><button class="btn" data-nav data-t="1" ${turn >= meta.maxTurn ? "disabled" : ""}>+</button></div>` : ""}
        <div class="molts">${MOLTS.map((m) => {
          const open = meta.unlocked.includes(`molt.${m}`);
          const ends = meta.endings[m] ?? [];
          return `<button class="molt-plate" data-nav data-m="${m}" ${open ? "" : "disabled"} style="--acc:${ACCENT[m]}">
            <div class="molt-ring">${uroRing(150, ACCENT[m]!, 18, open ? 18 : 6)}</div>
            <b>${MOLT_INFO[m]!.name}</b>
            <span>${open ? MOLT_INFO[m]!.play : `${icon("lock")} ${MOLT_INFO[m]!.unlock}`}</span>
            ${open ? `<em>${escapeHtml(MOLT_INFO[m]!.passive)}</em>` : ""}
            ${ends.length ? `<small>${ends.map((e) => (e === "give" ? "Give" : "Devour")).join(" · ")}</small>` : ""}
          </button>`;
        }).join("")}</div>
        <button class="btn ghost" data-nav data-back>${icon("back")}</button>
      </div></section>`);
      el.querySelectorAll<HTMLElement>("[data-m]").forEach((b) =>
        b.addEventListener("click", () => {
          this.ui();
          meta.lastTurn = turn;
          void this.persist.saveMeta();
          this.startRun(newRun({ seed: freshSeed(), molt: b.dataset.m as MoltId, onboarding: false, ascension: turn }));
        }),
      );
      el.querySelectorAll<HTMLElement>("[data-t]").forEach((b) =>
        b.addEventListener("click", () => { turn = Math.max(0, Math.min(meta.maxTurn, turn + Number(b.dataset.t))); this.ui(); draw(); }),
      );
      el.querySelector("[data-back]")!.addEventListener("click", () => void this.showTitle());
      this.view = "settings";
      this.settingsBack = () => void this.showTitle();
      this.setScreen(el);
    };
    draw();
  }

  showHowTo(done: () => void): void {
    let i = 0;
    const draw = () => {
      const p = HOW_TO_PLAY[i]!;
      const last = i === HOW_TO_PLAY.length - 1;
      const el = h(`<section class="screen dark"><div class="plate-screen howto">
        <div class="howto-art">${p.art}</div>
        <h1>${escapeHtml(p.title)}</h1>
        <div class="howto-lines">${p.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}</div>
        <div class="howto-dots">${HOW_TO_PLAY.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
        <div class="row">
          ${i > 0 ? `<button class="btn ghost" data-nav data-prev>${icon("back")}</button>` : ""}
          <button class="btn solid" data-nav data-autofocus data-next>${last ? "Descend" : "Next"}</button>
          ${last ? "" : `<button class="btn ghost" data-nav data-skip>Skip</button>`}
        </div>
      </div></section>`);
      el.querySelector("[data-next]")!.addEventListener("click", () => { this.ui(); if (last) done(); else { i++; draw(); } });
      el.querySelector("[data-prev]")?.addEventListener("click", () => { i--; draw(); });
      el.querySelector("[data-skip]")?.addEventListener("click", () => done());
      this.view = "settings";
      this.settingsBack = () => (i > 0 ? (i--, draw()) : done());
      this.setScreen(el);
    };
    draw();
  }

  showLibrary(tab: "history" | "cards" | "bones" = "history"): void {
    const meta = this.persist.meta;
    const seen = new Set(meta.seenCards);
    const probe = previewCombat(newRun({ seed: "LIB", molt: "venom", onboarding: false }));
    let body = "";
    if (tab === "history") {
      const ends = MOLTS.map((m) => `<span style="color:${ACCENT[m]}">${MOLT_INFO[m]!.name}</span> ${(meta.endings[m] ?? []).map((e) => (e === "give" ? "Give" : "Devour")).join(" · ") || "—"}`).join("<br>");
      body = `<dl class="statlist"><dt>Runs</dt><dd>${meta.runs}</dd><dt>Wins</dt><dd>${meta.wins}</dd><dt>Deepest</dt><dd>${meta.bestRow}</dd><dt>Highest Turn</dt><dd>${meta.maxTurn}</dd></dl>
        <p class="lines" style="font-style:normal">${ends}</p>
        <div class="history">${meta.history.map((r) => `<div class="hist-row"><span style="color:${ACCENT[r.molt] ?? "inherit"}">${escapeHtml(MOLT_INFO[r.molt as MoltId]?.name ?? r.molt)}</span><span>${r.win ? (r.ending === "give" ? "Gave" : "Devoured") : escapeHtml(DEATH[r.reason] ?? r.reason)}</span><span>${escapeHtml(ACT_NAMES[r.act] ?? "")} · ${r.row}</span><span>${icon("scale")}${r.maxHand}</span><span>${new Date(r.at).toLocaleDateString()}</span></div>`).join("") || "<p>No runs yet.</p>"}</div>`;
    } else if (tab === "cards") {
      const groups: Array<[string, typeof CARD_LIST]> = [["Shared", CARD_LIST.filter((c) => !c.molt && !c.special)], ...MOLTS.map((m) => [MOLT_INFO[m]!.name, CARD_LIST.filter((c) => c.molt === m)] as [string, typeof CARD_LIST])];
      body = groups.map(([name, cards]) => `<h2>${name} <small>${cards.filter((c) => seen.has(c.id)).length}/${cards.length}</small></h2><div class="grid-cards">${cards.map((c) => (seen.has(c.id) ? staticCardHTML(c.id, false, probe, {}) : `<div class="card unseen" data-type="${c.type}"><span>?</span></div>`)).join("")}</div>`).join("");
    } else {
      body = `<div class="shop-grid">${BONE_LIST.map((b) => `<div class="bone-ware">${boneGlyph(b.id)}<b>${escapeHtml(b.name)}</b><span>${escapeHtml(b.text)}</span></div>`).join("")}</div>`;
    }
    const el = h(`<section class="screen dark"><div class="plate-screen">
      <div class="tabs">${(["history", "cards", "bones"] as const).map((t) => `<button class="btn ${t === tab ? "solid" : "ghost"}" data-nav data-tab="${t}" ${t === tab ? "data-autofocus" : ""}>${t === "history" ? "History" : t === "cards" ? "Cards" : "Bones"}</button>`).join("")}</div>
      ${body}
      <button class="btn ghost" data-nav data-back>${icon("back")}</button>
    </div></section>`);
    el.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.addEventListener("click", () => this.showLibrary(b.dataset.tab as "history" | "cards" | "bones")));
    el.querySelector("[data-back]")!.addEventListener("click", () => void this.showTitle());
    this.view = "settings";
    this.settingsBack = () => void this.showTitle();
    this.setScreen(el);
  }

  private ui(): void {
    this.audio.play("ui.confirm");
  }

  /** Dev only (?dev=1): start a run at the given act's end plate, with a grown body. */
  devJump(act: number, molt: MoltId = "venom"): void {
    const run = newRun({ seed: freshSeed(), molt, onboarding: false });
    run.act = act - 1;
    run.maxHand = 7 + act * 3;
    run.screen = { kind: "actEnd" };
    this.startRun(run);
  }

  startRun(run: RunState): void {
    const meta = this.persist.meta;
    if (meta.tailScale && !run.daily && run.fightIndex === 0 && run.row < 0 && run.act === 1 && !run.bones.includes("bone.tail_scale")) {
      run.bones.push("bone.tail_scale");
      meta.tailScale = false;
      void this.persist.saveMeta();
    }
    this.ctl = new RunController(run, this, this);
    this.view = "run";
    this.audio.unlock();
    this.audio.startMusic(run.act);
    void this.render();
  }

  /** Re-fit the current screen to a new viewport (rotation, split view, window resize). */
  private relayout(): void {
    if (this.view !== "run" || !this.run) return;
    const kind = this.run.screen.kind;
    if (kind === "combat") this.updateFight();
    else if (kind === "map") void this.render();
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
      case "actEnd": return this.renderActEnd();
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
      ${run.bones.length ? `<button class="stat pile bones-count" data-bones title="Bones">${icon("bone")}${run.bones.length}</button>` : ""}
      <span class="sp"></span>
      <button class="icon-btn" data-pause aria-label="Menu">${icon("menu")}</button>
    </div>`;
  }

  private wireBar(el: HTMLElement): void {
    el.querySelector("[data-pause]")?.addEventListener("click", () => this.showPause());
    el.querySelector("[data-deck]")?.addEventListener("click", () => this.showDeck());
    el.querySelectorAll<HTMLElement>("[data-bone]").forEach((b) => {
      let held = false;
      let timer = 0;
      b.addEventListener("pointerdown", () => { held = false; timer = window.setTimeout(() => { held = true; this.showBones(b.dataset.bone); }, 450); });
      b.addEventListener("pointerup", () => clearTimeout(timer));
      b.addEventListener("pointerleave", () => clearTimeout(timer));
      b.addEventListener("contextmenu", (e) => { e.preventDefault(); this.showBones(b.dataset.bone); });
      b.addEventListener("click", () => { if (!held) this.toast(`${BONES[b.dataset.bone!]?.name}: ${BONES[b.dataset.bone!]?.text}`); });
    });
    el.querySelector("[data-bones]")?.addEventListener("click", () => this.showBones());
  }

  /** Why the run ended, in a sentence or two. */
  private deathHTML(run: RunState): string {
    const sc = run.screen;
    if (sc.kind !== "over") return "";
    const d = run.stats.death;
    const names = (ids: string[]) => [...new Set(ids.map((id) => FOES[id]?.name ?? id))].join(" and ");
    let text: string;
    if (sc.reason === "worn") text = `Scars wore your max hand below ${tuning.body.wornAt}. Rest to mend, and end fights with 4 or more cards to avoid new scars.`;
    else if (sc.reason === "spent") text = "You played your last card with enemies still standing. Keep at least one card back unless the play wins.";
    else if (d) text = `Turn ${d.turn} against ${names(d.foes)}: ${d.wounds} wound${d.wounds > 1 ? "s" : ""} landed on a hand of ${d.hand}. The red claw by your might showed it coming; guards, a kill, or Weaken would have cut it.`;
    else text = "Wounds took your last card.";
    return `<div class="death-note"><h2>What happened</h2><p>${escapeHtml(text)}</p></div>`;
  }

  /** The body you ended with: deck and bones. */
  private summaryHTML(run: RunState): string {
    const counts = new Map<string, { n: number; up: number }>();
    for (const d of run.deck) {
      const c = counts.get(d.id) ?? { n: 0, up: 0 };
      c.n++;
      if (d.up) c.up++;
      counts.set(d.id, c);
    }
    const cards = [...counts].sort((a, b) => (CARDS[a[0]]?.type ?? "").localeCompare(CARDS[b[0]]?.type ?? "") || a[0].localeCompare(b[0]));
    return `<div class="run-summary"><h2>Your body · ${run.deck.length} cards</h2>
      <div class="deck-chips">${cards.map(([id, c]) => `<span class="chip t-${CARDS[id]?.type ?? ""}">${escapeHtml(CARDS[id]?.name ?? id)}${c.up ? "+" : ""}${c.n > 1 ? ` ×${c.n}` : ""}</span>`).join("")}</div>
      ${run.bones.length ? `<div class="deck-chips bones-row">${run.bones.map((b) => `<span class="chip" title="${escapeHtml(BONES[b]?.text ?? "")}">${boneGlyph(b)}${escapeHtml(BONES[b]?.name ?? b)}</span>`).join("")}</div>` : ""}
      <p class="seed-line">Seed <b>${escapeHtml(run.seed)}</b></p></div>`;
  }

  /** Every bone you carry, with what it does. */
  private showBones(focus?: string): void {
    const run = this.run;
    if (!run || this.overlayEl) return;
    const el = h(`<div class="overlay"><h2>Your bones</h2><div class="bone-list">${run.bones.map((b) => `<div class="bone-row${b === focus ? " on" : ""}">${boneGlyph(b)}<div><b>${escapeHtml(BONES[b]?.name ?? b)}</b><span>${escapeHtml(BONES[b]?.text ?? "")}</span></div></div>`).join("") || "<p>No bones yet.</p>"}</div><button class="btn" data-nav data-autofocus data-close>${icon("back")}</button></div>`);
    el.querySelector("[data-close]")!.addEventListener("click", () => this.closeOverlay());
    this.openOverlay(el, () => this.closeOverlay());
  }

  /** Every keyword and enemy move in one place. */
  private showGlossary(): void {
    const intents = ["atk", "eat", "bind", "poison", "block", "buff", "summon", "heal", "daze", "thorns", "siren", "slime", "swallow"];
    const el = h(`<div class="overlay"><h2>Glossary</h2><div class="glossary-page">
      <dl class="gloss">${GLOSSARY.map(([, w, d]) => `<dt>${escapeHtml(w)}</dt><dd>${escapeHtml(d)}</dd>`).join("")}
      <dt>Heavy</dt><dd>${escapeHtml(`Max hand ${tuning.body.heavyAt}+: draw 1 less each turn, but your bulk blocks ${tuning.body.heavyBlock} wound each enemy turn.`)}</dd>
      <dt>Frenzy</dt><dd>From turn ${tuning.foes.frenzyFrom}, ordinary enemies hit 1 harder every turn.</dd></dl>
      <h3>Enemy moves</h3>
      <dl class="gloss">${intents.map((k) => `<dt>${icon(k === "atk" ? "claw" : k === "eat" ? "maw" : k === "bind" ? "knot" : k === "poison" ? "drop" : k === "block" ? "shield" : k === "summon" ? "egg" : k === "siren" ? "eye" : k === "slime" ? "sacrifice" : k)}</dt><dd>${escapeHtml(intentWords(k, 2, 1))}</dd>`).join("")}</dl>
    </div><button class="btn" data-nav data-autofocus data-close>${icon("back")}</button></div>`);
    el.querySelector("[data-close]")!.addEventListener("click", () => this.closeOverlay());
    this.openOverlay(el, () => this.closeOverlay());
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
    this.tip("map");
    this.markSeen(run.deck.map((d) => d.id));
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
      if (run.onboarding && run.fightIndex === 0 && !this.persist.taught("guided")) {
        this.guided = "start";
        for (const k of ["hand", "play", "might", "end", "wound", "forecast"]) this.persist.teach(`tip.${k}`);
      }
      this.tip("hand");
      this.tip("play");
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
    this.refreshPreview(c);
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
    const fc = c.forecast();
    if (fc.incoming > 0) this.tip("forecast");
    el.querySelector(".core .left")!.innerHTML =
      (fc.incoming > 0 ? `<span class="plate forecast${fc.lethal ? " lethal" : ""}${fc.landed === 0 ? " safe" : ""}" title="Wounds that land when you end your turn">${icon("claw")}${fc.landed === 0 ? "0" : `−${fc.landed}`}${this.pv && this.pv.landed < fc.landed ? `<span class="pv-arrow">→</span>${this.pv.landed === 0 ? "0" : `−${this.pv.landed}`}` : ""}${fc.lethal && !(this.pv && !this.pv.lethal) ? `<em>lethal</em>` : ""}</span>` : "") +
      (b.block ? `<span class="plate">${icon("shield")}${b.block >= 99 ? "∞" : b.block}</span>` : "") +
      (big && c.bigActive() ? `<span class="plate big" title="Big: every hit lands ${c.bigExtra()} more wound${c.bigExtra() > 1 ? "s" : ""}">${icon("scale")}+${c.bigExtra()}</span>` : "") +
      (s.selfPoison ? `<span class="plate pz">${icon("drop")}${s.selfPoison}</span>` : "");
    el.querySelector(".core .right")!.innerHTML = `<button class="pile" data-pile="draw" title="Draw pile">${icon("draw")}${b.draw.length}</button><button class="pile" data-pile="discard" title="Discard pile">${icon("discard")}${b.discard.length}</button><span class="pile hand-count" title="Hand ${b.hand.length} of ${b.maxHand}. Big at ${b.bigAt} cards; Heavy at max hand ${b.heavyAt}.">${icon("scale")}${b.hand.length}/${b.maxHand}${this.meterHTML(b.hand.length, b.maxHand, b.bigAt)}</span>`;
    el.querySelectorAll<HTMLElement>("[data-pile]").forEach((p) => p.addEventListener("click", () => this.showPile(p.dataset.pile as "draw" | "discard")));
    if (big && !this.persist.taught("tip.big")) this.audio.play("size.big");
    if (big) this.tip("big");
    this.contextTips(c);
    // hand
    this.renderHand(el, c);
    // actions / banner
    const end = el.querySelector<HTMLButtonElement>("[data-end]")!;
    end.disabled = !!s.over || c.busy || !!this.picking;
    this.renderBanner(el, c);
    this.audio.setBody(b.hand.length, b.maxHand);
    if (this.guided) this.updateGuide(el, c);
  }

  /** Step-by-step first fight: a ring on the thing to touch and one line on what it does. */
  private updateGuide(el: HTMLElement, c: Combat): void {
    const s = c.s;
    let step: string;
    let target: Element | null = null;
    let text = "";
    if (s.over || (s.turn >= 2 && !this.picking)) step = "done";
    else if (this.picking?.req.kind === "wound") {
      step = "wound";
      target = el.querySelector(".banner");
      text = "Wounds landed. Each one costs a card: tap the cards you'll give up. Keep your best.";
    } else if (s.playedThisTurn === 0 && this.sel === null) {
      step = "pick";
      const strike = c.body.hand.find((x) => CARDS[x.id]!.type === "strike" && c.canPlay(x));
      target = strike ? el.querySelector(`.hand .card[data-uid="${strike.uid}"]`) : null;
      text = `Every card is a scale of your body. Tap ${strike ? CARDS[strike.id]!.name : "a card"} to pick it up.`;
    } else if (s.playedThisTurn === 0) {
      step = "play";
      target = el.querySelector(`.hand .card[data-uid="${this.sel}"]`);
      text = "The enlarged card shows what it will do. Tap it again to play it.";
    } else if (s.playedThisTurn === 1 && c.body.hand.length > 4 && c.alive().length) {
      step = "more";
      target = el.querySelector(".might");
      text = `Might fell to ${might(c.body)}: every card you spend weakens the next hit. Play another, or hold.`;
    } else {
      step = "end";
      target = el.querySelector("[data-end]");
      const fc = c.forecast();
      text = fc.landed ? `End your turn. The red claw says ${fc.landed} wound${fc.landed > 1 ? "s" : ""} will land; cards you keep coil and hit harder.` : "End your turn. Cards you keep coil and hit harder next turn.";
    }
    if (step === "done") {
      this.guided = null;
      this.persist.teach("guided");
      el.querySelector(".guide-ring")?.remove();
      return;
    }
    if (step !== this.guided) {
      this.guided = step;
      this.coach(text, true);
    }
    let ring = el.querySelector<HTMLElement>(".guide-ring");
    if (!target) { ring?.remove(); return; }
    if (!ring) { ring = h(`<div class="guide-ring" aria-hidden="true"></div>`); el.appendChild(ring); }
    const place = () => {
      if (!target!.isConnected || !ring!.isConnected) return;
      const r = target!.getBoundingClientRect();
      const o = el.getBoundingClientRect();
      Object.assign(ring!.style, { left: `${r.left - o.left - 6}px`, top: `${r.top - o.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
    };
    place();
    // Cards slide in; place the ring again once they've landed.
    setTimeout(place, 480);
  }

  /** One line under the enlarged card: what playing it would do. */
  private previewSummary(c: Combat): string {
    const pv = this.pv;
    if (!pv) return "";
    const parts: string[] = [];
    if (pv.won) parts.push(`${icon("skull")}Ends the fight`);
    else {
      for (const f of c.alive()) {
        const after = pv.hp.get(f.uid);
        if (after === undefined || after >= f.hp) continue;
        const name = escapeHtml(FOES[f.id]!.name);
        parts.push(pv.dead.has(f.uid) ? `${icon("skull")}Kills ${name}` : `${name} ${f.hp}→${after}`);
      }
    }
    const fc = c.forecast();
    if (pv.landed < fc.landed) parts.push(`${icon("claw")}−${fc.landed}→${pv.landed ? `−${pv.landed}` : "0"}`);
    if (!parts.length) return "";
    return `<div class="pv-result">${parts.join("<span>·</span>")}${pv.approx ? `<span title="Random or chosen effects: a likely outcome">≈</span>` : ""}</div>`;
  }

  /** Hand fill with a gold tick where Big starts. */
  private meterHTML(n: number, max: number, bigAt: number): string {
    const cells = Math.min(40, Math.max(max, bigAt));
    let out = "";
    for (let i = 0; i < cells; i++) out += `<i class="${i < n ? "on" : ""}${i === bigAt - 1 ? " big" : ""}${i >= max ? " over" : ""}"></i>`;
    return `<span class="meter" aria-hidden="true">${out}</span>`;
  }

  private refreshPreview(c: Combat): void {
    const sel = this.sel;
    const card = sel === null ? undefined : c.body.hand.find((x) => x.uid === sel);
    if (!card || this.picking || c.busy || c.s.over || !c.canPlay(card)) {
      this.pv = null;
      this.pvKey = "";
      return;
    }
    const target = CARDS[card.id]!.tgt ? c.target()?.uid : undefined;
    const key = `${card.uid}:${target}:${c.s.turn}:${c.s.playedThisTurn}:${c.body.hand.length}:${c.body.block}`;
    if (key === this.pvKey) return;
    this.pvKey = key;
    this.pv = null;
    void previewPlay(c, card.uid, target).then((r) => {
      if (this.pvKey === key && this.combat === c) {
        this.pv = r;
        this.updateFight();
      }
    });
  }

  private intentHTML(c: Combat, f: FoeState, acts: Act[], next = false): string {
    const parts = acts.map((a) => {
      switch (a.k) {
        case "atk": {
          const hits = c.attackHits(f, a.x ?? 1);
          const v = c.attackValue(f, a.n);
          const bigPlus = c.bigActive() ? `<span class="plus">+${c.bigExtra()}</span>` : "";
          return `<span class="act" title="Wounds">${icon(hits > 1 ? "elite" : "claw")}${v}${hits > 1 ? `×${asc(this.run?.ascension ?? 0, 3) ? "?" : hits}` : ""}${bigPlus}</span>`;
        }
        case "eat": return `<span class="act" title="Eats your highest-coil card">${icon("maw")}${(a.x ?? 1) > 1 ? `×${a.x}` : ""}</span>`;
        case "bind": return `<span class="act" title="Binds a card">${icon("knot")}${(a.x ?? 1) > 1 ? `×${a.x}` : ""}</span>`;
        case "poison": return `<span class="act" title="Poisons you">${icon("drop")}${a.n}</span>`;
        case "block": return `<span class="act" title="Blocks">${icon("shield")}${a.n}</span>`;
        case "buff": return `<span class="act" title="Grows stronger">${icon("buff")}${a.n}</span>`;
        case "summon": return `<span class="act" title="Summons">${icon("egg")}${a.x}</span>`;
        case "heal": return `<span class="act" title="Heals">${icon("heal")}${a.n}</span>`;
        case "daze": return `<span class="act" title="Dazes you: draw 1 less">${icon("daze")}</span>`;
        case "thorns": return `<span class="act" title="Bristles: hitting it costs you a wound">${icon("thorns")}</span>`;
        case "siren": return `<span class="act" title="Your next strike hits you">${icon("eye")}</span>`;
        case "slime": return `<span class="act" title="Your next card costs Sacrifice 1">${icon("sacrifice")}</span>`;
        case "swallow": return `<span class="act" title="Swallows a card from your draw pile">${icon("maw")}${icon("draw")}</span>`;
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
    const lens = c.has("bone.lens") || this.s.intentDetail || c.n("lantern") > 0;
    // Foes act left to right; number them when more than one will act.
    const actors = c.alive().filter((f) => f.skip <= 0 && !c.diesToPoison(f) && f.intent.some((a) => a.k !== "rest"));
    const order = new Map(actors.map((f, i) => [f.uid, i + 1]));
    for (const f of shown) {
      let n = wrap.querySelector<HTMLElement>(`.foe[data-uid="${f.uid}"]`);
      const def = FOES[f.id]!;
      if (!n) {
        n = h(`<button class="foe" data-uid="${f.uid}" data-tier="${def.tier}" tabindex="-1">
          <span class="name">${escapeHtml(def.name)}</span>
          <div class="intent"></div>
          <div class="art">${creatureSVG(f.id)}<div class="ring"></div><span class="kill" title="This play kills it">${icon("skull")}</span></div>
          <div class="hpbar"><i></i><b></b><u></u></div>
          <div class="hpnum"></div>
          <div class="status"></div>
        </button>`);
        n.addEventListener("click", () => this.tapFoe(f.uid));
        let timer = 0;
        let held = false;
        n.addEventListener("pointerdown", () => { held = false; timer = window.setTimeout(() => { held = true; this.inspectFoe(f.uid); }, 450); });
        const clear = () => clearTimeout(timer);
        n.addEventListener("pointerup", clear);
        n.addEventListener("pointerleave", clear);
        n.addEventListener("contextmenu", (e) => { e.preventDefault(); this.inspectFoe(f.uid); });
        n.addEventListener("click", (e) => { if (held) e.stopImmediatePropagation(); }, { capture: true });
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
      const ord = actors.length > 1 && order.has(f.uid) ? `<i class="ord" title="Acts ${order.get(f.uid)}${["st", "nd", "rd"][order.get(f.uid)! - 1] ?? "th"}">${order.get(f.uid)}</i>` : "";
      intent.innerHTML = f.alive ? ord + (f.skip > 0 ? `<span class="act">${icon("rest")}</span>` : this.intentHTML(c, f, f.intent)) + (f.alive && (lens || f.revealed > 0) ? this.intentHTML(c, f, c.peekIntent(f), true) : "") : "";
      n.querySelector<HTMLElement>(".hpbar i")!.style.width = `${Math.max(0, (f.hp / f.max) * 100)}%`;
      const pz = Math.min(f.hp, c.poisonTick(f));
      const bEl = n.querySelector<HTMLElement>(".hpbar b")!;
      bEl.style.left = `${Math.max(0, ((f.hp - pz) / f.max) * 100)}%`;
      bEl.style.right = `${100 - Math.max(0, (f.hp / f.max) * 100)}%`;
      const pvHp = f.alive ? this.pv?.hp.get(f.uid) : undefined;
      const hurt = pvHp !== undefined && pvHp < f.hp;
      const uEl = n.querySelector<HTMLElement>(".hpbar u")!;
      uEl.style.display = hurt ? "" : "none";
      if (hurt) {
        uEl.style.left = `${(pvHp! / f.max) * 100}%`;
        uEl.style.right = `${100 - (f.hp / f.max) * 100}%`;
      }
      n.classList.toggle("will-die", !!this.pv?.dead.has(f.uid));
      n.classList.toggle("doomed", c.diesToPoison(f));
      n.querySelector(".hpnum")!.innerHTML = `${Math.max(0, f.hp)}${hurt ? `<em class="pvhp">→${pvHp}${this.pv!.approx ? "?" : ""}</em>` : ""}/${f.max}${f.block ? ` <span>${icon("shield").replace("<svg", '<svg style="width:14px;height:14px"')}${f.block}</span>` : ""}`;
      n.querySelector(".status")!.innerHTML = [
        f.poison ? `<span class="pz" title="Poison: ${c.poisonTick(f)} damage at the start of its turn">${icon("drop")}${f.poison}${f.slowRot ? "∞" : ""}</span>` : "",
        c.diesToPoison(f) ? `<span class="doom" title="Poison kills it before it acts">${icon("skull")}next turn</span>` : "",
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
    this.wirePeek(wrap);
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
      node.classList.toggle("peek", this.peek === card.uid);
      node.classList.toggle("picking", !!picking);
      node.classList.toggle("picked", picked);
      node.classList.toggle("unplayable", !picking && !c.canPlay(card) && !c.busy && !c.s.over);
      if (fresh) requestAnimationFrame(() => requestAnimationFrame(() => node!.classList.remove("entering")));
    });
    // preview of the selected card
    const pv = zone.querySelector<HTMLElement>(".preview")!;
    const peekCard = this.peek !== null ? hand.find((x) => x.uid === this.peek) : undefined;
    const selCard = peekCard ?? (compact && !picking ? hand.find((x) => x.uid === this.sel) : undefined);
    pv.innerHTML = selCard ? cardHTML(selCard, c, { inHand: true }) + (selCard.uid === this.sel && !peekCard ? this.previewSummary(c) : "") : "";
    // Sit the enlarged card over its place in the fan, inside the screen.
    const selIdx = selCard ? hand.indexOf(selCard) : -1;
    if (selIdx >= 0) {
      const t = n > 1 ? selIdx / (n - 1) : 0.5;
      const half = Math.min(105, W * 0.19) + 8;
      pv.style.left = `${Math.min(W - half, Math.max(half, W / 2 - span / 2 + span * t))}px`;
    }
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

  /** Press and slide across the hand to enlarge the card under your finger; let go to pick it up. */
  private wirePeek(wrap: HTMLElement): void {
    if (wrap.dataset.peek) return;
    wrap.dataset.peek = "1";
    let x0 = 0;
    let id = -1;
    let active = false;
    const cardAt = (x: number, y: number): number | null => {
      for (const node of document.elementsFromPoint(x, y)) {
        const card = (node as HTMLElement).closest?.<HTMLElement>(".hand .card:not([data-gone])");
        if (card) return Number(card.dataset.uid);
      }
      return null;
    };
    wrap.addEventListener("pointerdown", (e) => { x0 = e.clientX; id = e.pointerId; active = false; this.slid = false; });
    wrap.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id || (e.pointerType === "mouse" && !(e.buttons & 1))) return;
      if (!active) {
        if (Math.abs(e.clientX - x0) < 12 || this.picking) return;
        active = true;
        this.slid = true;
        try { wrap.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      }
      const uid = cardAt(e.clientX, e.clientY);
      if (uid !== null && uid !== this.peek && this.fightEl && this.combat) {
        this.peek = uid;
        this.audio.play("ui.move");
        this.renderHand(this.fightEl, this.combat);
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      if (!active) return;
      active = false;
      if (this.peek !== null) this.sel = this.peek;
      this.peek = null;
      this.updateFight();
      // The click that follows a slide lands on the hand, not a card; clear the flag after it.
      setTimeout(() => { this.slid = false; }, 50);
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);
  }

  private wireCard(node: HTMLElement, uid: number): void {
    let timer = 0;
    let long = false;
    node.addEventListener("pointerdown", () => {
      long = false;
      timer = window.setTimeout(() => { if (!this.slid) { long = true; this.inspect(uid); } }, 480);
    });
    const cancel = () => clearTimeout(timer);
    node.addEventListener("pointerup", cancel);
    node.addEventListener("pointerleave", cancel);
    node.addEventListener("contextmenu", (e) => { e.preventDefault(); this.inspect(uid); });
    node.addEventListener("click", () => {
      if (this.slid) { this.slid = false; return; }
      if (!long) void this.tapCard(uid);
    });
  }

  private renderBanner(el: HTMLElement, c: Combat): void {
    const zone = el.querySelector(".handzone")!;
    zone.querySelector(".banner")?.remove();
    const p = this.picking;
    if (!p || !p.req.cards.some((x) => c.body.hand.includes(x))) return;
    const n = p.req.count;
    const text = p.req.kind === "wound" ? `Choose ${n} to lose` : p.req.kind === "sacrifice" ? `Sacrifice ${n}` : PROMPTS[p.req.prompt] ?? "Choose";
    const needConfirm = (this.needConfirm() && p.req.kind !== "choose") || !!p.req.optional;
    const ready = p.selected.length === n || !!p.req.optional;
    const from = p.req.kind === "wound" && this.woundLog.size ? `<small>${[...this.woundLog].map(([k, v]) => `${escapeHtml(k)} ${v}`).join(" · ")}</small>` : "";
    const banner = h(`<div class="banner ${p.req.kind === "choose" ? "" : "wound"}">${p.req.kind === "choose" ? "" : icon(p.req.kind === "wound" ? "claw" : "sacrifice")}<span>${text}${p.selected.length && n > 1 && !p.req.optional ? ` · ${p.selected.length}/${n}` : ""}${from}</span>${needConfirm && ready ? `<button class="btn" data-confirm>${icon("check")}</button>` : ""}</div>`);
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
    const why = c.whyNot(card);
    if (why && !c.busy) this.toast(why);
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
    const fc = c.forecast();
    if (fc.lethal && c.body.hand.some((x) => c.canPlay(x)) && this.endArmed < performance.now()) {
      this.endArmed = performance.now() + 3000;
      const btn = this.fightEl?.querySelector<HTMLElement>("[data-end]");
      if (btn) {
        btn.textContent = "Lethal · end anyway?";
        btn.classList.add("warn");
        setTimeout(() => { btn.textContent = "End turn"; btn.classList.remove("warn"); }, 3000);
      }
      this.audio.play("ui.back");
      return;
    }
    this.endArmed = 0;
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
    const why = inHand ? c.whyNot(card) : null;
    const el = h(`<div class="overlay"><div class="inspect">${cardHTML(card, c, { inHand })}<div class="math">${why ? `<p class="why">${icon(card.bound ? "knot" : "lock")}${escapeHtml(why)}</p>` : ""}${breakdownHTML(card, c, inHand)}${this.glossaryHTML(CARDS[card.id]!.t(c.values(CARDS[card.id]!, c.ctx(card, inHand)), c.ctx(card, inHand)) + " " + CARDS[card.id]!.f)}</div></div><button class="btn" data-nav data-autofocus data-close>${icon("back")}</button></div>`);
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
      case "enemy.turn":
        this.woundLog.clear();
        return;
      case "parasite":
        this.toast(`The parasite ate ${CARDS[ev.id as string]?.name ?? "a card"}`);
        this.updateFight();
        return wait(this.ms(300));
      case "card.lostPower":
        this.toast(`${CARDS[ev.id as string]?.name ?? ""} bites back`);
        this.updateFight();
        return wait(this.ms(200));
      case "poison.self":
        if (this.woundLog) this.woundLog.set("Poison", (this.woundLog.get("Poison") ?? 0) + 1);
        return;
      case "enemy.attack": {
        if (typeof ev.landed === "number" && ev.landed > 0) {
          const name = FOES[this.combat?.s.foes.find((x) => x.uid === ev.uid)?.id ?? ""]?.name ?? "Enemy";
          this.woundLog.set(name, (this.woundLog.get(name) ?? 0) + ev.landed);
          const fe = foeEl(ev.uid);
          if (fe) { fe.classList.remove("struck"); void fe.offsetWidth; fe.classList.add("struck"); }
        }
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
      case "foe.frenzy":
      case "poison.on":
      case "decoy":
        this.updateFight();
        return wait(this.ms(200));
      case "wound.incoming":
        this.updateFight();
        return wait(this.ms(160));
      case "turn.start":
        if (typeof ev.turn === "number" && ev.turn >= 2) this.turnMark(ev.turn);
        this.updateFight();
        if (this.run?.screen.kind === "combat") void this.save();
        return;
      case "card.coil":
        el?.querySelectorAll<HTMLElement>(".hand .card:not([data-gone])").forEach((n) => {
          n.classList.remove("coilpop");
          void n.offsetWidth;
          n.classList.add("coilpop");
        });
        this.updateFight();
        return;
      case "card.coil.max":
      case "card.draw":
      case "block.gain":
      case "enemy.poisoned":
      case "enemy.weaken":
        this.updateFight();
        return;
      case "scar.gain":
        setTimeout(() => this.tip("scars"), 500);
        return;
      case "ring.offer":
        this.updateFight();
        this.coach("The Tail is down to its last card. Finish it, or play Close the Ring.", true);
        return wait(this.ms(500));
      case "pressure":
        this.toast("Pressure: max hand −2");
        this.updateFight();
        return wait(this.ms(300));
      case "siren":
      case "slime":
      case "swallow.card":
      case "siren.turn":
        this.updateFight();
        return wait(this.ms(220));
      case "act.enter":
        this.audio.stopMusic();
        this.audio.startMusic(ev.act as number);
        return;
      case "bone.trigger":
        this.toast(BONES[ev.id as string]?.name ?? "");
        return;
    }
  }

  private turnMark(turn: number): void {
    const foes = this.fightEl?.querySelector(".foes");
    if (!foes) return;
    foes.querySelector(".turnmark")?.remove();
    const m = h(`<div class="turnmark">Turn ${turn}</div>`);
    foes.appendChild(m);
    setTimeout(() => m.remove(), this.ms(1300));
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

  /** A one-time tip (first run teaching). */
  tip(key: string): void {
    if (!this.s.tips || this.persist.taught(`tip.${key}`) || !TIPS[key]) return;
    if (this.root.querySelector(".coach")) {
      if (!this.tipQueue.includes(key)) this.tipQueue.push(key);
      return;
    }
    this.persist.teach(`tip.${key}`);
    this.coach(TIPS[key]!);
  }
  private tipQueue: string[] = [];

  coach(text: string, always = false): void {
    if (!always && !this.s.tips) return;
    this.root.querySelector(".coach")?.remove();
    const el = h(`<button class="coach" aria-live="polite"><span>${escapeHtml(text)}</span><b>${icon("check")}</b></button>`);
    const close = () => {
      el.remove();
      const next = this.tipQueue.shift();
      if (next) setTimeout(() => this.tip(next), 150);
    };
    el.addEventListener("click", close);
    this.root.appendChild(el);
    setTimeout(() => { if (el.isConnected) close(); }, 9000);
  }

  /** Tips that fire when the board first shows the thing they explain. */
  private contextTips(c: Combat): void {
    if (!this.s.tips) return;
    const b = c.body;
    if (c.s.playedThisTurn >= 1) this.tip("might");
    if (c.s.turn === 1 && (c.s.playedThisTurn >= 2 || b.hand.length <= 4)) this.tip("end");
    if (b.hand.some((x) => x.coil > 0)) this.tip("coil");
    if (c.s.turn >= 2 && b.hand.some((x) => CARDS[x.id]!.type === "guard")) this.tip("block");
    const acts = c.alive().flatMap((f) => f.intent.map((a) => a.k));
    if (acts.includes("eat")) this.tip("eat");
    for (const k of ["thorns", "siren", "slime", "swallow", "daze", "summon", "heal"] as const) if (acts.includes(k)) this.tip(k);
    if (b.hand.some((x) => x.bound)) this.tip("bind");
    if (c.alive().some((f) => f.poison > 0)) this.tip("poison");
    if (c.s.turn >= tuning.foes.frenzyFrom && c.alive().some((f) => FOES[f.id]!.tier !== "boss")) this.tip("frenzy");
  }

  private glossaryHTML(text: string): string {
    const g = glossaryFor(text);
    return g.length ? `<dl class="gloss">${g.map(([w, d]) => `<dt>${escapeHtml(w)}</dt><dd>${escapeHtml(d)}</dd>`).join("")}</dl>` : "";
  }

  private inspectFoe(uid: number): void {
    const c = this.combat;
    const f = c?.s.foes.find((x) => x.uid === uid);
    if (!c || !f) return;
    const def = FOES[f.id]!;
    const words = (acts: Act[]) => acts.map((a) => {
      const n = a.k === "atk" ? c.attackValue(f, a.n) : "n" in a ? a.n : undefined;
      const x = a.k === "atk" ? c.attackHits(f, a.x ?? 1) : "x" in a ? a.x : undefined;
      return intentWords(a.k, n, x);
    }).join(", ");
    const lens = c.has("bone.lens") || this.s.intentDetail || f.revealed > 0 || c.n("lantern") > 0;
    const status = [
      f.block ? `Block ${f.block}` : "",
      f.poison ? `Poison ${f.poison}${f.slowRot ? " (not fading)" : ""}` : "",
      f.weak ? `Weakened ${f.weak}` : "",
      f.str ? `Strength +${f.str}` : "",
      f.thorns ? "Bristling" : "",
    ].filter(Boolean).join(" · ");
    const pat = f.phase === 2 && def.phase2 ? def.phase2.pattern : def.pattern;
    const acted = c.n(`acted:${f.uid}`);
    const patternHTML = pat.length < 2 || f.id === "boss.tail" ? "" : acted >= pat.length || lens
      ? `<p><b>Pattern:</b> ${pat.map((i) => escapeHtml(words(i))).join(" → ")}, then repeats.</p>`
      : `<p class="dim">Watch ${pat.length - acted} more turn${pat.length - acted > 1 ? "s" : ""} to learn its pattern.</p>`;
    const el = h(`<div class="overlay"><div class="inspect foe-inspect">
      <div class="foe-plate">${creatureSVG(f.id)}</div>
      <div class="math"><h2>${escapeHtml(def.name)}</h2>
        <p>${Math.max(0, f.hp)} / ${f.max} health${status ? ` · ${escapeHtml(status)}` : ""}</p>
        <p><b>Next:</b> ${escapeHtml(f.skip ? "Skips its move" : words(f.intent))}</p>
        ${lens ? `<p><b>Then:</b> ${escapeHtml(words(c.peekIntent(f)))}</p>` : ""}
        ${patternHTML}
        ${def.onDeath === "wasp" ? "<p>When one dies, the rest grow stronger.</p>" : def.onDeath === "split" ? "<p>Splits in two when it dies.</p>" : def.onDeath === "choir" ? "<p>Killing a head makes the others stronger.</p>" : ""}
        ${f.id === "boss.tail" ? `<p>It plays a copy of your deck${c.s.tail?.bones?.length ? " and turns your bones on you" : ""}.</p>${c.s.tail?.bone ? `<p><b>This turn:</b> your ${escapeHtml(BONES[c.s.tail.bone]?.name ?? "")}</p>` : ""}` : ""}
      </div></div><button class="btn" data-nav data-autofocus data-close>${icon("back")}</button></div>`);
    el.addEventListener("click", () => this.closeOverlay());
    this.openOverlay(el, () => this.closeOverlay());
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
    this.tip("devour");
    this.markSeen(sc.husks.map((x) => x.id));
    const el = this.plate(`
      <div class="loot"><span>${icon("glint")}+${sc.glint}</span>${sc.bone ? `<span>${boneGlyph(sc.bone).replace("<svg", '<svg style="width:22px;height:22px"')}${escapeHtml(BONES[sc.bone]?.name ?? "")}</span>` : ""}</div>
      ${sc.boneOptions?.length ? `<h2 class="bone-pick-h">Keep one bone</h2><div class="bone-pick">${sc.boneOptions.map((b, i) => `<button class="bone-opt" data-nav data-bone-i="${i}">${boneGlyph(b)}<b>${escapeHtml(BONES[b]?.name ?? b)}</b><span>${escapeHtml(BONES[b]?.text ?? "")}</span></button>`).join("")}</div>` : ""}
      <h1>${first ? "Devour one" : "Devour"}</h1>
      <div class="husk-row">${sc.husks.map((hk, i) => `<div class="husk">${staticCardHTML(hk.id, false, e, { attrs: `data-nav data-i="${i}"${i === 0 ? " data-autofocus" : ""}` })}${hk.twin ? `<span class="twin">×2</span>` : ""}${hk.from === "box" ? `<span class="twin boxed">boxed</span>` : ""}</div>`).join("")}</div>
      ${run.maxHand >= tuning.devour.maxHandCap ? `<p class="note">Your body is full: a husk still joins your deck, but max hand no longer grows.</p>` : ""}
      <button class="btn ghost" data-nav data-leave>${ctl.skipPays() ? `Stay lean · ${icon("glint")}+${tuning.devour.skipGlint}${run.scars ? " · mend 1" : ""}` : sc.devours > 0 && sc.husks.length ? "Skip" : "Descend"}</button>`);
    el.querySelectorAll<HTMLElement>("[data-bone-i]").forEach((n) =>
      n.addEventListener("click", async () => {
        this.ui();
        ctl.takeBone(Number(n.dataset.boneI));
        await this.save();
        this.renderReward();
      }),
    );
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
    this.markSeen(st.cards.map((w) => w.id));
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
    meta.history.unshift({ at: Date.now(), molt: run.molt, win: sc.win, reason: sc.reason, row: run.row + 1, act: run.act, maxHand: run.maxHand - run.scars, fights: run.stats.fights, devoured: run.stats.devoured.length, seed: run.seed, ...(sc.ending ? { ending: sc.ending } : {}), turn: run.ascension, ...(run.daily ? { daily: run.daily } : {}) });
    // Giving the Tail back its body: you carry one of its scales into the next descent.
    if (sc.win && sc.ending === "give") meta.tailScale = true;
    if (sc.win && sc.ending) {
      const list = (meta.endings[run.molt] ??= []);
      if (!list.includes(sc.ending)) list.push(sc.ending);
      meta.maxTurn = Math.min(20, Math.max(meta.maxTurn, run.ascension + 1));
    }
    this.unlock(run);
    if (run.daily) {
      const prev = meta.daily[run.daily];
      const row = run.row + 1 + (run.act - 1) * 16;
      if (!prev || (sc.win && !prev.win) || (!prev.win && row > prev.row)) meta.daily[run.daily] = { row, win: sc.win };
    }
    meta.history = meta.history.slice(0, 50);
    await this.persist.saveMeta();
    await this.persist.clearRun();
  }

  private renderActEnd(): void {
    const ctl = this.ctl!;
    const run = ctl.run;
    const finale = run.act >= LAST_ACT;
    const next = finale ? "The Tail" : ACT_NAMES[run.act + 1]!;
    this.unlock(run);
    const el = h(`<section class="screen dark"><div class="plate-screen act-plate">
      <div style="width:min(320px,72vw)">${uroRing(320, ACCENT[run.molt]!, 30, Math.min(30, run.maxHand - run.scars))}</div>
      <p class="label">${finale ? "The bottom of the Deep" : `Act ${run.act + 1}`}</p>
      <h1>${escapeHtml(next)}</h1>
      <button class="btn solid" data-nav data-autofocus data-go>Descend</button>
    </div></section>`);
    el.querySelector("[data-go]")!.addEventListener("click", async () => {
      this.ui();
      await ctl.descend();
      await this.after();
    });
    this.setScreen(el);
  }

  /** Molt and mode unlocks (slifer-onboarding.md §6). */
  private unlock(run: RunState): void {
    const meta = this.persist.meta;
    const add = (id: string, msg: string) => {
      if (meta.unlocked.includes(id)) return;
      meta.unlocked.push(id);
      setTimeout(() => this.toast(msg), 600);
    };
    if (run.act >= 2) add("molt.tide", "Tide molt unlocked");
    if (run.act >= 3 && run.screen.kind === "actEnd") add("molt.storm", "Storm molt unlocked");
    void this.persist.saveMeta();
  }

  markSeen(ids: string[]): void {
    const seen = this.persist.meta.seenCards;
    let changed = false;
    for (const id of ids) if (!seen.includes(id)) { seen.push(id); changed = true; }
    if (changed) void this.persist.saveMeta();
  }

  private renderOver(): void {
    const run = this.run!;
    const sc = run.screen;
    if (sc.kind !== "over") return;
    this.audio.stopMusic();
    const st = run.stats;
    const eff = Math.max(0, run.maxHand - run.scars);
    const title = sc.win ? (sc.ending === "give" ? "Released" : "The ring closes") : DEATH[sc.reason] ?? "Spent";
    const coda = sc.win ? (sc.ending === "give" ? bloomCoda() : uroRing(300, "#d9a432", 40, 40)) : uroRing(300, ACCENT[run.molt], Math.max(24, eff), eff);
    const el = h(`<section class="screen dark results"><div class="plate-screen">
      <div class="result-body" style="width:min(300px,72vw)">${coda}</div>
      <h1>${escapeHtml(title)}</h1>
      ${sc.win && sc.ending === "give" ? `<p class="lines">You let it go, and kept one of its scales. The Tail Scale starts your next descent.</p>` : ""}
      <dl class="statlist">
        <dt>Reached</dt><dd>${sc.reason === "ring" || run.screen.kind === "over" && run.row < 0 && run.act >= 3 ? "The Tail" : `${escapeHtml(ACT_NAMES[run.act] ?? "")} · ${run.row + 1}`}</dd>
        ${!sc.win && st.diedTo ? `<dt>Taken by</dt><dd>${escapeHtml(FOES[st.diedTo]?.name ?? "")}</dd>` : ""}
        <dt>Max hand</dt><dd>${eff}${run.scars ? ` (−${run.scars})` : ""}</dd>
        <dt>Devoured</dt><dd>${st.devoured.length}</dd>
        <dt>Fights</dt><dd>${st.fights}</dd>
        <dt>Cards spent</dt><dd>${st.cardsPlayed}</dd>
        <dt>Wounds</dt><dd>${st.woundsTaken}</dd>
      </dl>
      ${!sc.win ? this.deathHTML(run) : ""}
      ${this.summaryHTML(run)}
      <div class="menu"><button class="btn solid" data-nav data-autofocus data-again>Descend again</button><button class="btn ghost" data-nav data-title>Title</button></div>
    </div></section>`);
    el.querySelector("[data-again]")!.addEventListener("click", () => {
      this.ui();
      const seed = Math.random().toString(36).slice(2, 10).toUpperCase();
      this.startRun(newRun({ seed, molt: run.molt, onboarding: false, ascension: run.daily ? 0 : run.ascension }));
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
      <button class="btn" data-nav data-howto>How to play</button>
      ${this.run.bones.length ? `<button class="btn" data-nav data-bones>Your bones</button>` : ""}
      <button class="btn" data-nav data-title>Save &amp; quit</button>
      <p class="seed-line">Seed <b>${escapeHtml(this.run.seed)}</b>${this.run.ascension ? ` · Turn ${this.run.ascension}` : ""}</p>
      <button class="btn ghost" data-nav data-abandon>Abandon run</button>
    </div></div>`);
    const close = () => this.closeOverlay();
    el.querySelector("[data-resume]")!.addEventListener("click", close);
    el.querySelector("[data-settings]")!.addEventListener("click", () => {
      this.closeOverlay();
      this.openSettingsOverlay();
    });
    el.querySelector("[data-howto]")!.addEventListener("click", () => {
      this.closeOverlay();
      this.showHowTo(() => { this.view = "run"; void this.render(); });
    });
    el.querySelector("[data-bones]")?.addEventListener("click", () => { this.closeOverlay(); this.showBones(); });
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
      row("tips", "Tips", s.tips ? "On" : "Off"),
      row("resetTips", "Show tips again", ""),
      row("glossary", "Glossary", ""),
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
      case "tips": s.tips = !s.tips; break;
      case "resetTips":
        this.persist.meta.taught = this.persist.meta.taught.filter((t) => !t.startsWith("tip."));
        s.tips = true;
        await this.persist.saveMeta();
        break;
      case "glossary":
        this.showGlossary();
        return;
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

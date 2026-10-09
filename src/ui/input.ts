import { BrowserInputSource, InputManager, type InputBinding } from "@slu/web-shell";

// One semantic input layer (rule 10): keyboard, gamepad, mouse and touch all arrive as these actions.
export type Action =
  | "nav.up" | "nav.down" | "nav.left" | "nav.right"
  | "confirm" | "enter" | "back" | "pause"
  | "card.prev" | "card.next" | "card.inspect" | "turn.end"
  | `slot.${number}`;

const PAD: InputBinding[] = [
  { action: "nav.up", gamepadButtons: [12], gamepadAxes: [{ axis: 1, direction: -1, threshold: 0.6 }] },
  { action: "nav.down", gamepadButtons: [13], gamepadAxes: [{ axis: 1, direction: 1, threshold: 0.6 }] },
  { action: "nav.left", gamepadButtons: [14], gamepadAxes: [{ axis: 0, direction: -1, threshold: 0.6 }] },
  { action: "nav.right", gamepadButtons: [15], gamepadAxes: [{ axis: 0, direction: 1, threshold: 0.6 }] },
  { action: "confirm", gamepadButtons: [0] },
  { action: "back", gamepadButtons: [1] },
  { action: "turn.end", gamepadButtons: [2] },
  { action: "card.inspect", gamepadButtons: [3] },
  { action: "card.prev", gamepadButtons: [4, 6] },
  { action: "card.next", gamepadButtons: [5, 7] },
  { action: "pause", gamepadButtons: [9, 8] },
];

const KEYS: Record<string, Action> = {
  ArrowUp: "nav.up", ArrowDown: "nav.down", ArrowLeft: "nav.left", ArrowRight: "nav.right",
  KeyW: "nav.up", KeyS: "nav.down", KeyA: "nav.left", KeyD: "nav.right",
  Space: "confirm", Enter: "enter", NumpadEnter: "enter", Escape: "back", Backspace: "back",
  KeyQ: "card.prev", KeyE: "card.next", KeyI: "card.inspect", KeyP: "pause",
};

export class SemanticInput {
  private shell = new InputManager();
  private source = new BrowserInputSource(PAD);
  private handlers: Array<(a: Action) => void> = [];
  private fam: "keyboard" | "gamepad" | "touch" = "keyboard";
  get family(): "keyboard" | "gamepad" | "touch" { return this.fam; }
  /** The page shows button glyphs for whichever device you last used. */
  set family(f: "keyboard" | "gamepad" | "touch") {
    if (f === this.fam) return;
    this.fam = f;
    document.documentElement.dataset.input = f;
  }

  constructor() {
    this.shell.setBindings(PAD);
    addEventListener("keydown", (e) => {
      if (e.repeat && !e.code.startsWith("Arrow")) return;
      const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code);
      const a: Action | undefined = digit ? (`slot.${digit[2]}` as Action) : KEYS[e.code];
      if (!a) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if ((a === "confirm" || a === "enter") && tag === "BUTTON" && !document.activeElement?.closest(".fight")) return; // native button activation
      e.preventDefault();
      this.family = "keyboard";
      this.fire(a);
    });
    addEventListener("pointerdown", (e) => { this.family = e.pointerType === "touch" ? "touch" : "keyboard"; }, { passive: true });
    const poll = () => {
      this.shell.update(this.source.poll());
      for (const b of PAD) {
        if (this.shell.wasPressed(b.action)) {
          this.family = "gamepad";
          this.fire(b.action as Action);
        }
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  }

  on(fn: (a: Action) => void): void {
    this.handlers.push(fn);
  }

  private fire(a: Action): void {
    for (const h of this.handlers) h(a);
  }
}

/** Spatial focus navigation over `[data-nav]` elements inside a root. */
export function navMove(root: HTMLElement, dir: "up" | "down" | "left" | "right"): void {
  const items = [...root.querySelectorAll<HTMLElement>("[data-nav]")].filter((el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null);
  if (!items.length) return;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !items.includes(cur)) {
    focusEl(items[0]!);
    return;
  }
  const r = cur.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let best: HTMLElement | null = null;
  let bestD = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const q = el.getBoundingClientRect();
    const x = q.left + q.width / 2 - cx;
    const y = q.top + q.height / 2 - cy;
    const along = dir === "up" ? -y : dir === "down" ? y : dir === "left" ? -x : x;
    const across = dir === "up" || dir === "down" ? Math.abs(x) : Math.abs(y);
    if (along <= 4) continue;
    const d = along + across * 2.2;
    if (d < bestD) {
      bestD = d;
      best = el;
    }
  }
  if (!best) {
    // wrap within the list order
    const i = items.indexOf(cur);
    best = dir === "up" || dir === "left" ? items[(i - 1 + items.length) % items.length]! : items[(i + 1) % items.length]!;
  }
  focusEl(best);
}

export function focusEl(el: HTMLElement): void {
  el.focus({ preventScroll: false });
  el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}

export function focusFirst(root: HTMLElement): void {
  const el = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>("[data-nav]:not(:disabled)");
  if (el) el.focus({ preventScroll: true });
}

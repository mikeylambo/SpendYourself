import { SaveManager, type StorageAdapter } from "@slu/web-shell";
import type { RunState } from "../game/state.ts";

// Persistence through the Shell's SaveManager: versioned envelopes, staging + backup, integrity checks (rule 20).

/** localStorage when available; memory otherwise (private windows, blocked storage). */
export class SafeStorage implements StorageAdapter {
  private mem = new Map<string, string>();
  private ns: string;
  private ls: Storage | null;
  constructor(ns: string) {
    this.ns = ns;
    let ls: Storage | null = null;
    try {
      ls = window.localStorage;
      ls.setItem(`${ns}:probe`, "1");
      ls.removeItem(`${ns}:probe`);
    } catch {
      ls = null;
    }
    this.ls = ls;
  }
  async get<T>(key: string): Promise<T | null> {
    let raw: string | null = null;
    try {
      raw = this.ls ? this.ls.getItem(`${this.ns}:${key}`) : this.mem.get(key) ?? null;
    } catch {
      raw = this.mem.get(key) ?? null;
    }
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  async set<T>(key: string, value: T): Promise<void> {
    const raw = JSON.stringify(value);
    try {
      if (this.ls) this.ls.setItem(`${this.ns}:${key}`, raw);
      else this.mem.set(key, raw);
    } catch {
      this.mem.set(key, raw);
    }
  }
  async remove(key: string): Promise<void> {
    try {
      this.ls?.removeItem(`${this.ns}:${key}`);
    } catch {
      /* ignore */
    }
    this.mem.delete(key);
  }
  async keys(): Promise<string[]> {
    return [...this.mem.keys()];
  }
}

export interface RunRecord {
  at: number;
  molt: string;
  win: boolean;
  reason: string;
  row: number;
  act: number;
  maxHand: number;
  fights: number;
  devoured: number;
  seed: string;
}

export interface Meta {
  runs: number;
  wins: number;
  bestRow: number;
  /** One-time teaching prompts already shown. */
  taught: string[];
  history: RunRecord[];
  unlocked: string[];
  seenCards: string[];
}

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  reducedMotion: boolean;
  highContrast: boolean;
  textScale: number;
  fightSpeed: number;
  /** "auto": confirm wound picks on touch only. */
  woundConfirm: "auto" | "on" | "off";
  intentDetail: boolean;
  grain: boolean;
}

export const defaultSettings: Settings = {
  master: 0.8,
  music: 0.5,
  sfx: 0.9,
  reducedMotion: false,
  highContrast: false,
  textScale: 1,
  fightSpeed: 1,
  woundConfirm: "auto",
  intentDetail: false,
  grain: true,
};

const defaultMeta = (): Meta => ({ runs: 0, wins: 0, bestRow: 0, taught: [], history: [], unlocked: ["molt.venom"], seenCards: [] });

export class Persistence {
  storage = new SafeStorage("spend-yourself");
  private runSave = new SaveManager<RunState>(this.storage, "run", 1);
  private metaSave = new SaveManager<Meta>(this.storage, "meta", 1);
  meta: Meta = defaultMeta();
  settings: Settings = { ...defaultSettings };

  async load(): Promise<void> {
    try {
      const m = await this.metaSave.loadWithRecovery();
      if (m.data) this.meta = { ...defaultMeta(), ...m.data };
    } catch {
      /* keep defaults */
    }
    const s = await this.storage.get<Partial<Settings>>("settings");
    if (s) this.settings = { ...defaultSettings, ...s };
  }

  async loadRun(): Promise<RunState | null> {
    try {
      const r = await this.runSave.loadWithRecovery();
      return r.data;
    } catch {
      return null;
    }
  }

  async saveRun(run: RunState): Promise<void> {
    try {
      await this.runSave.save(run);
    } catch {
      /* a failed autosave must never break play */
    }
  }

  async clearRun(): Promise<void> {
    await this.storage.remove("run");
    await this.storage.remove("run:staging");
    await this.storage.remove("run:backup");
  }

  async saveMeta(): Promise<void> {
    try {
      await this.metaSave.save(this.meta);
    } catch {
      /* ignore */
    }
  }

  async saveSettings(): Promise<void> {
    await this.storage.set("settings", this.settings);
  }

  taught(id: string): boolean {
    return this.meta.taught.includes(id);
  }
  teach(id: string): void {
    if (!this.taught(id)) {
      this.meta.taught.push(id);
      void this.saveMeta();
    }
  }
}

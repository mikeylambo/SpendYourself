import { DeterministicRng, stableHashString } from "@slu/web-shell";

export type StreamName = "combat" | "map" | "loot" | "event";
const NAMES: StreamName[] = ["combat", "map", "loot", "event"];

/** Named deterministic streams whose positions are saved with the run, so a resumed run continues identically. */
export class RunRng {
  private streams = new Map<StreamName, DeterministicRng>();

  constructor(seed: string, states?: Partial<Record<StreamName, number>>) {
    for (const name of NAMES) {
      const state = states?.[name] ?? stableHashString(`${seed}:${name}`);
      this.streams.set(name, new DeterministicRng(state));
    }
  }

  stream(name: StreamName): DeterministicRng {
    return this.streams.get(name)!;
  }

  states(): Record<StreamName, number> {
    return Object.fromEntries(NAMES.map((n) => [n, this.stream(n).state])) as Record<StreamName, number>;
  }
}

export function pick<T>(rng: { next(): number }, items: readonly T[]): T {
  return items[Math.floor(rng.next() * items.length)]!;
}

export function int(rng: { next(): number }, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

// Semantic audio: gameplay emits event names; this layer owns synthesis, layering and buses (rule 17).
// Everything is synthesized so the build ships with no audio assets; recorded takes can replace any cue by id:
// drop `audio/wound.take.ogg` (or .mp3/.wav) into the project root's audio folder and it plays instead of the synth.

/** Recorded takes, by cue id (the file name without its extension). Several takes of one cue: `wound.take.2.ogg`. */
const SAMPLE_URLS = import.meta.glob("/audio/**/*.{ogg,mp3,wav,m4a}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

type Cue = (a: AudioEngine, data: Record<string, unknown>) => void;

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfx!: GainNode;
  music!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private drone: { oscs: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private drumTimer = 0;
  private layers: { pad: GainNode; sub: GainNode } | null = null;
  private samples = new Map<string, AudioBuffer[]>();
  volumes = { master: 0.8, sfx: 0.9, music: 0.5 };

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    } catch {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.sfx = c.createGain();
    this.music = c.createGain();
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(c.destination);
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    void this.loadSamples();
  }

  /** Decode any recorded takes that shipped with the build. */
  private async loadSamples(): Promise<void> {
    const c = this.ctx;
    if (!c) return;
    for (const [path, url] of Object.entries(SAMPLE_URLS)) {
      const id = path.split("/").pop()!.replace(/\.(ogg|mp3|wav|m4a)$/, "").replace(/\.\d+$/, "");
      try {
        const buf = await c.decodeAudioData(await (await fetch(url)).arrayBuffer());
        const list = this.samples.get(id) ?? [];
        list.push(buf);
        this.samples.set(id, list);
      } catch { /* a bad file just falls back to the synth */ }
    }
  }

  private playSample(id: string, data: Record<string, unknown>): boolean {
    const takes = this.samples.get(id);
    const c = this.ctx;
    if (!takes?.length || !c) return false;
    const src = c.createBufferSource();
    src.buffer = takes[Math.floor(Math.random() * takes.length)]!;
    // Small pitch drift so repeats don't machine-gun; the swallow deepens as the body grows.
    src.playbackRate.value = (0.95 + Math.random() * 0.1) * (id === "husk.devour" ? Math.max(0.7, 1 - Number(data.grow ?? 0) * 0.015) : 1);
    src.connect(this.sfx);
    src.start();
    return true;
  }

  setVolumes(v: Partial<AudioEngine["volumes"]>): void {
    Object.assign(this.volumes, v);
    this.applyVolumes();
  }
  private applyVolumes(): void {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.sfx.gain.value = this.volumes.sfx;
    this.music.gain.value = this.volumes.music * 0.5;
  }

  suspend(paused: boolean): void {
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, slideTo = 0, delay = 0): void {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur: number, freq: number, q = 1, vol = 0.3, type: BiquadFilterType = "bandpass", delay = 0, sweepTo = 0): void {
    const c = this.ctx;
    if (!c || !this.noiseBuf) return;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  play(event: string, data: Record<string, unknown> = {}): void {
    if (!this.ctx) return;
    if (this.playSample(event, data)) return;
    const cue = CUES[event];
    if (cue) {
      try {
        cue(this, data);
      } catch {
        /* audio must never break play */
      }
    }
  }

  // ---------- music: low drone + frame drum; thins as the hand shrinks ----------
  startMusic(act = 1): void {
    const c = this.ctx;
    if (!c || this.drone) return;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const gain = c.createGain();
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 2);
    const base = act === 1 ? 55 : act === 2 ? 49 : 41.2;
    const oscs = [base, base * 1.5, base * 2.01].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 1 ? "triangle" : "sawtooth";
      o.frequency.value = f;
      o.detune.value = (i - 1) * 6;
      o.connect(filter);
      o.start();
      return o;
    });
    filter.connect(gain).connect(this.music);
    this.drone = { oscs, filter, gain };
    // Deeper strata add layers: a slow breathing pad in the roots, a sub-bass swell in the deep water.
    const pad = c.createGain();
    pad.gain.value = 0;
    const sub = c.createGain();
    sub.gain.value = 0;
    if (act >= 2) {
      const p = c.createOscillator();
      p.type = "sine";
      p.frequency.value = base * 4.02;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.08;
      const depth = c.createGain();
      depth.gain.value = 0.03;
      lfo.connect(depth).connect(pad.gain);
      p.connect(pad).connect(this.music);
      p.start();
      lfo.start();
      oscs.push(p, lfo);
      pad.gain.value = 0.035;
    }
    if (act >= 3) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = base / 2;
      o.connect(sub).connect(this.music);
      o.start();
      oscs.push(o);
      sub.gain.value = 0.12;
    }
    this.layers = { pad, sub };
    let beat = 0;
    this.drumTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== "running") return;
      const accent = beat % 4 === 0;
      this.drum(accent);
      beat++;
    }, act >= 3 ? 1300 : act === 2 ? 1050 : 900);
  }

  drum(accent: boolean): void {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(accent ? 92 : 74, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    g.gain.setValueAtTime(accent ? 0.5 : 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.4);
  }

  /** The body sets the music: fuller with a big hand, thin and high when nearly spent. */
  setBody(hand: number, max: number): void {
    if (!this.drone || !this.ctx) return;
    const f = Math.max(0, Math.min(1, hand / Math.max(1, max)));
    this.drone.filter.frequency.setTargetAtTime(160 + f * 700, this.ctx.currentTime, 0.4);
    this.drone.gain.gain.setTargetAtTime(0.06 + f * 0.14, this.ctx.currentTime, 0.5);
    // A nearly spent body loses the warm layers first.
    if (this.layers) {
      this.layers.sub.gain.setTargetAtTime(this.layers.sub.gain.value ? 0.04 + f * 0.1 : 0, this.ctx.currentTime, 0.6);
    }
  }

  stopMusic(): void {
    if (!this.drone || !this.ctx) return;
    const { oscs, gain } = this.drone;
    gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
    setTimeout(() => oscs.forEach((o) => o.stop()), 1200);
    this.drone = null;
    this.layers = null;
    clearInterval(this.drumTimer);
  }
}

const CUES: Record<string, Cue> = {
  // A scale peeling cleanly away.
  "card.play": (a) => { a.noise(0.12, 3200, 2.5, 0.22, "bandpass", 0, 1600); a.tone(520, 0.06, "triangle", 0.05, 380); },
  "card.draw": (a) => a.noise(0.05, 5000, 3, 0.08),
  // Rising wooden creak.
  "card.coil": (a) => { for (let i = 0; i < 4; i++) a.tone(180 + i * 40, 0.05, "square", 0.035, 0, i * 0.03); },
  "card.coil.max": (a) => { a.tone(220, 0.6, "sine", 0.08); a.tone(330, 0.6, "sine", 0.04); },
  // The raw tear.
  // The raw tear: a fibrous rip (several short crackles), a wet low thump under it.
  "wound.take": (a) => {
    for (let i = 0; i < 4; i++) a.noise(0.05 + Math.random() * 0.04, 2200 + Math.random() * 1800, 4, 0.18, "bandpass", i * 0.025);
    a.noise(0.32, 1400, 0.8, 0.32, "bandpass", 0.04, 420);
    a.tone(90, 0.22, "sawtooth", 0.08, 48);
    a.tone(55, 0.18, "sine", 0.25, 38, 0.02);
  },
  "wound.incoming": (a) => { a.tone(70, 0.4, "sine", 0.35, 40); a.noise(0.2, 300, 1, 0.15, "lowpass"); },
  "wound.choose": (a) => a.tone(330, 0.08, "triangle", 0.06),
  "block.gain": (a) => { a.tone(240, 0.08, "square", 0.05); a.noise(0.06, 900, 3, 0.15); },
  "block.absorb": (a) => a.noise(0.18, 2600, 1, 0.3, "highpass"),
  "enemy.hit": (a) => { a.tone(130, 0.14, "sine", 0.3, 50); a.noise(0.05, 2000, 1, 0.18); },
  "enemy.die": (a) => { a.noise(0.5, 2400, 0.7, 0.25, "bandpass", 0, 300); a.tone(200, 0.4, "triangle", 0.06, 60); },
  "enemy.attack": (a) => a.noise(0.12, 800, 1.5, 0.22, "bandpass", 0, 300),
  "enemy.poison": (a) => { a.tone(300, 0.15, "sine", 0.06, 200); a.noise(0.08, 3500, 6, 0.06); },
  "enemy.poisoned": (a) => a.noise(0.1, 4000, 8, 0.07),
  "intent.eat": (a) => { a.tone(160, 0.25, "sine", 0.3, 70); a.noise(0.3, 600, 2, 0.2, "lowpass", 0.05); },
  "card.bind": (a) => { a.tone(120, 0.2, "square", 0.05, 100); },
  // The swallow: deeper as the body grows.
  "husk.devour": (a, d) => {
    const g = Number(d.grow ?? 0);
    a.noise(0.18, 700, 2, 0.2, "lowpass", 0, 250); // the wet open
    a.tone(150 - g * 3, 0.5, "sine", 0.4, 45, 0.05); // the swallow
    a.tone(75 - g, 0.7, "sine", 0.2, 35, 0.15); // it settles in the body
    a.noise(0.25, 300, 1, 0.12, "lowpass", 0.35, 120);
  },
  devour: (a) => a.noise(0.2, 900, 2, 0.12, "lowpass", 0, 300),
  // What each enemy is about to do, heard before it lands.
  "foe.intent.atk": (a) => { a.noise(0.18, 500, 2, 0.16, "bandpass", 0, 1400); a.tone(110, 0.18, "sawtooth", 0.05, 160); },
  "foe.intent.bind": (a) => { for (let i = 0; i < 3; i++) a.tone(140 - i * 15, 0.06, "square", 0.04, 0, i * 0.05); },
  "foe.intent.poison": (a) => a.noise(0.3, 5000, 6, 0.08, "highpass", 0, 2500),
  "foe.intent.eat": (a) => a.tone(90, 0.3, "sine", 0.18, 60),
  "foe.intent.heal": (a) => { a.tone(440, 0.2, "sine", 0.05); a.tone(660, 0.25, "sine", 0.04, 0, 0.08); },
  "foe.intent.siren": (a) => { a.tone(700, 0.5, "sine", 0.05, 980); a.tone(705, 0.5, "sine", 0.04, 990); },
  "foe.intent.thorns": (a) => a.noise(0.12, 6000, 3, 0.1, "highpass"),
  "foe.intent.swallow": (a) => a.tone(80, 0.4, "sine", 0.22, 40),
  "foe.frenzy": (a) => a.tone(180, 0.2, "sawtooth", 0.04, 300),
  "size.big": (a) => a.tone(55, 0.6, "sine", 0.35, 50),
  "scar.gain": (a) => { a.noise(0.35, 700, 1, 0.3, "bandpass", 0, 200); a.tone(110, 0.4, "sawtooth", 0.05, 60); },
  "scar.mend": (a) => { a.tone(392, 0.25, "sine", 0.08); a.tone(523, 0.35, "sine", 0.06, 0, 0.12); },
  "map.move": (a) => a.drum(false),
  "ui.confirm": (a) => a.tone(640, 0.05, "triangle", 0.05),
  "ui.back": (a) => a.tone(420, 0.05, "triangle", 0.04),
  "ui.move": (a) => a.tone(900, 0.02, "sine", 0.015),
  "fight.win": (a) => { a.tone(196, 0.5, "sine", 0.12); a.tone(294, 0.7, "sine", 0.09, 0, 0.15); },
  "run.death": (a) => { a.tone(98, 1.4, "sawtooth", 0.08, 40); a.noise(1.2, 500, 0.5, 0.2, "lowpass", 0, 80); },
  "bone.gain": (a) => { a.tone(880, 0.12, "triangle", 0.05); a.tone(1320, 0.18, "triangle", 0.04, 0, 0.06); },
  "foe.summon": (a) => a.noise(0.25, 900, 2, 0.15, "bandpass", 0, 2000),
  "foe.block": (a) => a.tone(200, 0.1, "square", 0.05),
  "foe.buff": (a) => a.tone(160, 0.3, "sawtooth", 0.05, 260),
};

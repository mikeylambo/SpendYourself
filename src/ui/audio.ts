// Semantic audio: gameplay emits event names; this layer owns synthesis, layering and buses (rule 17).
// Everything is synthesized so the build ships with no audio assets; recorded takes can replace any cue by id.

type Cue = (a: AudioEngine, data: Record<string, unknown>) => void;

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfx!: GainNode;
  music!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private drone: { oscs: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private drumTimer = 0;
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
    let beat = 0;
    this.drumTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== "running") return;
      const accent = beat % 4 === 0;
      this.drum(accent);
      beat++;
    }, 900);
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
  }

  stopMusic(): void {
    if (!this.drone || !this.ctx) return;
    const { oscs, gain } = this.drone;
    gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
    setTimeout(() => oscs.forEach((o) => o.stop()), 1200);
    this.drone = null;
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
  "wound.take": (a) => { a.noise(0.28, 1400, 0.8, 0.4, "bandpass", 0, 500); a.tone(90, 0.2, "sawtooth", 0.08, 50); },
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
  "husk.devour": (a, d) => { const g = Number(d.grow ?? 0); a.tone(150 - g * 3, 0.5, "sine", 0.4, 45); a.tone(75 - g, 0.7, "sine", 0.2, 35, 0.1); },
  "size.big": (a) => a.tone(55, 0.6, "sine", 0.35, 50),
  "scar.gain": (a) => { a.noise(0.35, 700, 1, 0.3, "bandpass", 0, 200); a.tone(110, 0.4, "sawtooth", 0.05, 60); },
  "scar.mend": (a) => { a.tone(392, 0.25, "sine", 0.08); a.tone(523, 0.35, "sine", 0.06, 0, 0.12); },
  "map.move": (a) => a.drum(false),
  "ui.confirm": (a) => a.tone(640, 0.05, "triangle", 0.05),
  "ui.back": (a) => a.tone(420, 0.05, "triangle", 0.04),
  "fight.win": (a) => { a.tone(196, 0.5, "sine", 0.12); a.tone(294, 0.7, "sine", 0.09, 0, 0.15); },
  "run.death": (a) => { a.tone(98, 1.4, "sawtooth", 0.08, 40); a.noise(1.2, 500, 0.5, 0.2, "lowpass", 0, 80); },
  "bone.gain": (a) => { a.tone(880, 0.12, "triangle", 0.05); a.tone(1320, 0.18, "triangle", 0.04, 0, 0.06); },
  "foe.summon": (a) => a.noise(0.25, 900, 2, 0.15, "bandpass", 0, 2000),
  "foe.block": (a) => a.tone(200, 0.1, "square", 0.05),
  "foe.buff": (a) => a.tone(160, 0.3, "sawtooth", 0.05, 260),
};

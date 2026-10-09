// The paper and print pass (art bible: engraved poster on laid paper). A fragment shader paints
// fibre grain, laid lines and an optional halftone screen at the screen's real pixel density,
// once per resize, so it's sharp on any phone and costs nothing per frame. Falls back to the
// CSS grain when WebGL isn't there.

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 res;
uniform float dpr;
uniform float halftone;
uniform float grain;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec2 px = gl_FragCoord.xy / dpr;               // CSS pixels
  vec2 uv = gl_FragCoord.xy / res;
  // Fibres: long stretched noise plus fine tooth.
  float fibre = fbm(vec2(px.x * 0.035, px.y * 0.6)) * 0.55 + fbm(px * 0.9) * 0.45;
  // Laid lines: faint horizontal ribs every few pixels, chain lines further apart.
  float laid = 0.5 + 0.5 * sin(px.y * 2.2);
  float chain = smoothstep(0.96, 1.0, 0.5 + 0.5 * sin(px.x * 0.11));
  float ink = grain * (0.10 * fibre + 0.02 * laid + 0.015 * chain);
  // Vignette, as if the sheet curls away at the edges.
  vec2 d = uv - 0.5;
  ink += grain * 0.22 * smoothstep(0.35, 0.85, length(d * vec2(1.0, 1.15)));
  // Halftone screen at 45 degrees, dot size following the paper's own tone.
  if (halftone > 0.5) {
    float s = 0.7071;
    vec2 r = mat2(s, -s, s, s) * px / 4.0;
    vec2 cell = fract(r) - 0.5;
    float tone = 0.25 + 0.5 * fibre;
    float dotv = 1.0 - smoothstep(tone * 0.5 - 0.06, tone * 0.5 + 0.06, length(cell));
    ink += 0.10 * dotv;
  }
  // Multiply layer: white leaves the page alone, grey darkens it.
  gl_FragColor = vec4(vec3(1.0 - ink), 1.0);
}`;

export class PaperPass {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null;
  private prog: WebGLProgram | null = null;
  halftone = false;
  grain = true;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "paper-pass";
    this.canvas.setAttribute("aria-hidden", "true");
    this.gl = this.canvas.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
    if (!this.gl || !this.build()) {
      this.gl = null;
      return;
    }
    host.appendChild(this.canvas);
    let t = 0;
    addEventListener("resize", () => { clearTimeout(t); t = window.setTimeout(() => this.draw(), 200); });
  }

  get ok(): boolean {
    return !!this.gl;
  }

  set visible(on: boolean) {
    this.canvas.hidden = !on || !this.gl;
    if (on) this.draw();
  }

  private build(): boolean {
    const gl = this.gl!;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const v = sh(gl.VERTEX_SHADER, VERT);
    const f = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!v || !f) return false;
    const p = gl.createProgram()!;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return false;
    this.prog = p;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return true;
  }

  draw(): void {
    const gl = this.gl;
    if (!gl || !this.prog || this.canvas.hidden) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(innerWidth * dpr);
    const h = Math.round(innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);
    gl.uniform2f(gl.getUniformLocation(this.prog, "res"), w, h);
    gl.uniform1f(gl.getUniformLocation(this.prog, "dpr"), dpr);
    gl.uniform1f(gl.getUniformLocation(this.prog, "halftone"), this.halftone ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(this.prog, "grain"), this.grain ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

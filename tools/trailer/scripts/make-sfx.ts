// ═══════════════════════════════════════════════════════════
// مُخلِّق المؤثرات الصوتية الحقيقية — DSP رياضي خالص (بلا أي API)
// يستبدل كل مؤثرات ElevenLabs الصوتية (التي كانت أصواتاً بشرية مقلِّدة)
// بمؤثرات فعلية مُصنَّعة: رِيسَرات، صدمات، ووش، جليتش، دقات قلب،
// رنين هاتف، مورس، طنين، نقرات UI، تشويش، طرقات، خطوات، صراخ، نار...
// الخرج: assets/audio/sfx/*.mp3 + assets/audio/app/sfx-*.mp3
// (ثم تُنسخ مؤثرات UI إلى public/audio للعبة)
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const T = resolve(import.meta.dir, "..");
const SFX_DIR = join(T, "assets/audio/sfx");
const APP_DIR = join(T, "assets/audio/app");
const TMP_DIR = join(T, "out/sfx-wav");
const PUBLIC_AUDIO = resolve(T, "..", "..", "public", "audio");
const SR = 44100;

mkdirSync(SFX_DIR, { recursive: true });
mkdirSync(APP_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

// ── مولد عشوائي مزروع (حتمي وقابل للتكرار) ──
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(19980717); // تاريخ الحادثة
const rnd = (a = 0, b = 1) => a + (b - a) * rng();

// ── أدوات المزامنة ──
type Buf = Float32Array;
const buf = (sec: number): Buf => new Float32Array(Math.max(1, Math.round(sec * SR)));

function addInto(dst: Buf, src: Buf, gain = 1, atSec = 0) {
  const off = Math.round(atSec * SR);
  for (let i = 0; i < src.length; i++) {
    const j = i + off;
    if (j >= 0 && j < dst.length) dst[j] += src[i] * gain;
  }
}
const clamp = (x: number) => (x < -1 ? -1 : x > 1 ? 1 : x);

// مولدات الضجيج
function white(sec: number): Buf { const b = buf(sec); for (let i = 0; i < b.length; i++) b[i] = rng() * 2 - 1; return b; }
function pink(sec: number): Buf {
  const b = white(sec); const out = buf(sec);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < b.length; i++) {
    const w = b[i];
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}
function brown(sec: number): Buf {
  const b = buf(sec); let last = 0;
  for (let i = 0; i < b.length; i++) { const w = rng() * 2 - 1; last = (last + 0.02 * w) / 1.02; b[i] = last * 3.5; }
  return b;
}

// ── مرشحات Biquad (RBJ cookbook) ──
type BQ = { b0: number; b1: number; b2: number; a1: number; a2: number };
function bqLP(f: number, q = 0.707): BQ {
  const w0 = (2 * Math.PI * f) / SR, al = Math.sin(w0) / (2 * q), c = Math.cos(w0);
  const a0 = 1 + al;
  return { b0: ((1 - c) / 2) / a0, b1: (1 - c) / a0, b2: ((1 - c) / 2) / a0, a1: (-2 * c) / a0, a2: (1 - al) / a0 };
}
function bqHP(f: number, q = 0.707): BQ {
  const w0 = (2 * Math.PI * f) / SR, al = Math.sin(w0) / (2 * q), c = Math.cos(w0);
  const a0 = 1 + al;
  return { b0: ((1 + c) / 2) / a0, b1: (-(1 + c)) / a0, b2: ((1 + c) / 2) / a0, a1: (-2 * c) / a0, a2: (1 - al) / a0 };
}
function bqBP(f: number, q = 2): BQ { // نطاق تمرير (ذروة 0dB)
  const w0 = (2 * Math.PI * f) / SR, al = Math.sin(w0) / (2 * q), c = Math.cos(w0);
  const a0 = 1 + al;
  return { b0: al / a0, b1: 0, b2: -al / a0, a1: (-2 * c) / a0, a2: (1 - al) / a0 };
}
function filt(b: Buf, f: BQ): Buf {
  const out = new Float32Array(b.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < b.length; i++) {
    const x0 = b[i];
    const y0 = f.b0 * x0 + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0; out[i] = y0;
  }
  return out;
}
/** مرشح نطاق متحرك — المركز يتحرك أُسّياً من f0 إلى f1 عبر المدة */
function sweepBP(src: Buf, f0: number, f1: number, q = 2): Buf {
  const out = new Float32Array(src.length);
  const BLOCK = 128;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, co: BQ | null = null;
  for (let i = 0; i < src.length; i++) {
    if (i % BLOCK === 0) {
      const p = i / src.length;
      co = bqBP(f0 * Math.pow(f1 / f0, p), q);
    }
    const f = co!;
    const x0 = src[i];
    const y0 = f.b0 * x0 + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0; out[i] = y0;
  }
  return out;
}

// ── غلافات ──
function envAD(sec: number, attack: number, decay: number): Float32Array {
  const n = Math.round(sec * SR);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    e[i] = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
  }
  return e;
}
function applyEnv(b: Buf, e: Float32Array, gain = 1): Buf {
  const out = new Float32Array(b.length);
  const n = Math.min(b.length, e.length);
  for (let i = 0; i < n; i++) out[i] = b[i] * e[i] * gain;
  return out;
}
/** نغمة جيبية بانحدار درجة ترددية أُسّية */
function sweepSine(sec: number, f0: number, f1: number, ph = 0): Buf {
  const b = buf(sec); let phase = ph;
  for (let i = 0; i < b.length; i++) {
    const p = i / b.length;
    const f = f0 * Math.pow(f1 / f0, p);
    phase += (2 * Math.PI * f) / SR;
    b[i] = Math.sin(phase);
  }
  return b;
}
function sine(sec: number, f: number, vibHz = 0, vibDepth = 0, ph = 0): Buf {
  const b = buf(sec); let phase = ph;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const ff = f * (1 + (vibHz > 0 ? vibDepth * Math.sin(2 * Math.PI * vibHz * t) : 0));
    phase += (2 * Math.PI * ff) / SR;
    b[i] = Math.sin(phase);
  }
  return b;
}
function saw(sec: number, f0: number, f1: number, vibHz = 0, vibDepth = 0): Buf {
  const b = buf(sec); let phase = 0.5;
  for (let i = 0; i < b.length; i++) {
    const p = i / b.length; const t = i / SR;
    const base = f0 * Math.pow(f1 / f0, p);
    const f = base * (1 + (vibHz > 0 ? vibDepth * Math.sin(2 * Math.PI * vibHz * t) : 0));
    phase += f / SR; phase -= Math.floor(phase);
    b[i] = 2 * phase - 1;
  }
  return b;
}

// ── رِفيرب شرويدر (ذيل فضائي داكن) ──
function reverb(b: Buf, wet = 0.35, dark = true, tail = 1.6): Buf {
  const n = b.length + Math.round(tail * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < b.length; i++) out[i] = b[i];
  const combs = [1017, 1189, 1277, 1367].map((d) => ({ d, buf: new Float32Array(d), idx: 0, g: 0.78 }));
  const aps = [223, 611].map((d) => ({ d, buf: new Float32Array(d), idx: 0, g: 0.7 }));
  const wetB = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i < b.length ? b[i] : 0;
    let acc = 0;
    for (const c of combs) {
      const y = x + c.g * c.buf[c.idx];
      c.buf[c.idx] = y; c.idx = (c.idx + 1) % c.d;
      acc += y * 0.25;
    }
    let v = acc;
    for (const a of aps) {
      const delayed = a.buf[a.idx];
      const y = -a.g * v + delayed;
      a.buf[a.idx] = v + a.g * delayed; a.idx = (a.idx + 1) % a.d;
      v = y;
    }
    wetB[i] = v;
  }
  const wetF = dark ? filt(filt(wetB, bqLP(2400, 0.8)), bqLP(2400, 0.8)) : wetB;
  const outF = new Float32Array(n);
  for (let i = 0; i < n; i++) outF[i] = b[i] ?? 0 + 0; // dry
  for (let i = 0; i < n; i++) {
    const dry = i < b.length ? b[i] : 0;
    const w = wetF[i] * wet;
    // غلاف ذيل متلاشٍ للنهاية
    const endT = (n - i) / SR;
    const tailFade = Math.min(1, endT / Math.max(0.05, tail * 0.35));
    outF[i] = dry + w * tailFade;
  }
  return outF;
}

// ── بتكرَش (سحق رقمي) ──
function bitcrush(b: Buf, levels = 5, hold = 3): Buf {
  const out = new Float32Array(b.length);
  let held = 0;
  for (let i = 0; i < b.length; i++) {
    if (i % hold === 0) held = Math.round((b[i] + 1) * levels / 2) / (levels / 2) - 1;
    out[i] = held;
  }
  return out;
}

// ── تطبيع + حواف ──
function normalize(b: Buf, peak = 0.92): Buf {
  let mx = 0;
  for (let i = 0; i < b.length; i++) mx = Math.max(mx, Math.abs(b[i]));
  if (mx === 0) return b;
  const g = peak / mx;
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b[i] * g;
  return out;
}
function fades(b: Buf, inS: number, outS: number): Buf {
  const out = new Float32Array(b.length);
  const fi = Math.round(inS * SR), fo = Math.round(outS * SR);
  for (let i = 0; i < b.length; i++) {
    let g = 1;
    if (i < fi) g *= i / fi;
    if (i > b.length - fo) g *= (b.length - i) / fo;
    out[i] = b[i] * g;
  }
  return out;
}
/** تعديل سعة بمتحكم (tremolo) — dpt من 0 إلى 1 */
function tremolo(b: Buf, hz: number, dpt: number, hzEnd = 0): Buf {
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) {
    const p = i / b.length;
    const f = hzEnd > 0 ? hz * Math.pow(hzEnd / hz, p) : hz;
    out[i] = b[i] * (1 - dpt * 0.5 * (1 - Math.cos(2 * Math.PI * f * (i / SR))));
  }
  return out;
}
/** تغيير السعة بغلاف نقطي عبر الزمن: [t, gain] أزواج */
function gainPoints(b: Buf, pts: [number, number][]): Buf {
  const out = new Float32Array(b.length);
  const xs = pts.map((p) => p[0] * SR); const ys = pts.map((p) => p[1]);
  for (let i = 0; i < b.length; i++) {
    if (i <= xs[0]) { out[i] = b[i] * ys[0]; continue; }
    if (i >= xs[xs.length - 1]) { out[i] = b[i] * ys[ys.length - 1]; continue; }
    let k = 0;
    while (k < xs.length - 1 && xs[k + 1] < i) k++;
    const f = (i - xs[k]) / (xs[k + 1] - xs[k]);
    out[i] = b[i] * (ys[k] + (ys[k + 1] - ys[k]) * f);
  }
  return out;
}

// ── كاتب WAV 16bit ──
function writeWav(path: string, b: Buf): void {
  const n = b.length;
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + n * 2, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(n * 2, 40);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(clamp(b[i]) * 32767))), i * 2);
  writeFileSync(path, Buffer.concat([hdr, data]));
}

// ═══════════════════════════════════════════════════════════
// تعريف المؤثرات — كل واحد دالة ترجع Buf
// ═══════════════════════════════════════════════════════════
const FX: Record<string, () => Buf> = {

  // ── سينمائية للتريلر ──
  "riser-long": () => {
    const dur = 5.0;
    const nz = sweepBP(white(dur), 180, 6500, 1.8);
    const g = gainPoints(nz, [[0, 0.02], [0.6, 0.08], [4.6, 1.0], [4.97, 1.0], [5.0, 0]]);
    const nzA = new Float32Array(nz.length);
    for (let i = 0; i < nz.length; i++) nzA[i] = nz[i] * g[i];
    const out = buf(dur);
    addInto(out, tremolo(nzA, 4, 0.35, 11), 0.9);
    addInto(out, applyEnv(sweepSine(dur, 55, 760), envAD(dur, 4.2, 2.5), 0.28));
    addInto(out, applyEnv(sweepSine(dur, 2200, 4400), envAD(dur, 4.5, 3), 0.07));
    return normalize(fades(out, 0.01, 0.015));
  },
  "riser-short": () => {
    const dur = 1.7;
    const nz = sweepBP(white(dur), 400, 5800, 2);
    const g = gainPoints(nz, [[0, 0.05], [1.5, 1], [1.7, 0]]);
    const out = buf(dur);
    for (let i = 0; i < nz.length; i++) out[i] += nz[i] * g[i] * 0.95;
    addInto(out, applyEnv(sweepSine(dur, 90, 500), envAD(dur, 1.3, 0.6), 0.3));
    return normalize(fades(out, 0.01, 0.012));
  },
  "impact-deep": () => {
    const dur = 3.4;
    const out = buf(dur);
    // طبقة تحتية: جيب هابط 62→31Hz
    addInto(out, applyEnv(sweepSine(2.2, 62, 31), envAD(2.2, 0.004, 0.55), 1.0));
    // انفجار ضجيج مفلتر منخفض
    addInto(out, applyEnv(filt(white(0.16), bqLP(260, 0.8)), envAD(0.16, 0.002, 0.06), 0.85));
    // جزئيات معدنية
    addInto(out, applyEnv(sine(1.2, 84), envAD(1.2, 0.002, 0.18), 0.34));
    addInto(out, applyEnv(sine(1.2, 127), envAD(1.2, 0.002, 0.14), 0.22));
    addInto(out, applyEnv(sine(1.2, 173), envAD(1.2, 0.002, 0.11), 0.13));
    return normalize(fades(reverb(out, 0.38, true, 1.4), 0.001, 0.4));
  },
  "impact-hit": () => {
    const dur = 1.1;
    const out = buf(dur);
    addInto(out, applyEnv(filt(white(0.004), bqHP(2500, 0.8)), envAD(0.004, 0.0005, 0.003), 0.8));
    addInto(out, applyEnv(sweepSine(0.5, 168, 46), envAD(0.5, 0.002, 0.18), 1));
    addInto(out, applyEnv(filt(white(0.03), bqBP(1100, 1.4)), envAD(0.03, 0.001, 0.012), 0.5));
    // صدى صفعي
    const base = out.slice();
    addInto(out, base, 0.3, 0.095);
    addInto(out, base, 0.14, 0.19);
    return normalize(fades(out, 0.001, 0.06));
  },
  "whoosh-fast": () => {
    const dur = 0.75;
    const nz = white(dur);
    const up = sweepBP(nz, 500, 4200, 2.2);
    // شكل دوبلر: صعود ثم هبوط
    const out = buf(dur);
    for (let i = 0; i < Math.round(dur * 0.45 * SR); i++) out[i] = up[i];
    const dn = sweepBP(nz.slice(Math.round(dur * 0.4 * SR)), 4200, 800, 2.2);
    for (let i = 0; i < dn.length && Math.round(dur * 0.4 * SR) + i < out.length; i++) out[Math.round(dur * 0.4 * SR) + i] += dn[i];
    return normalize(fades(applyEnv(out, envAD(dur, 0.12, 0.22)), 0.02, 0.09));
  },
  "glitch-burst": () => {
    const dur = 0.9;
    const out = buf(dur);
    let t = 0.02;
    while (t < dur - 0.08) {
      const len = rnd(0.02, 0.09);
      const type = rng();
      if (type < 0.4) {
        const g = bitcrush(white(len), Math.round(rnd(3, 7)), Math.round(rnd(2, 6)));
        addInto(out, g, rnd(0.5, 0.9), t);
      } else if (type < 0.75) {
        const f = rnd(280, 2600);
        const sq = buf(len);
        for (let i = 0; i < sq.length; i++) sq[i] = Math.sign(Math.sin(2 * Math.PI * f * (i / SR) + (i > sq.length / 2 ? Math.PI / 3 : 0)));
        addInto(out, sq, rnd(0.25, 0.5), t);
      } else {
        addInto(out, applyEnv(filt(white(len), bqBP(rnd(800, 3400), 3)), envAD(len, 0.004, 0.05), 0.7), t);
      }
      t += len + rnd(0.01, 0.045);
    }
    return normalize(fades(filt(out, bqHP(140, 0.8)), 0.004, 0.03));
  },
  "heartbeat-low": () => {
    const dur = 8.4;
    const out = buf(dur);
    for (let k = 0; k < 8; k++) {
      const t0 = 0.1 + k * 1.05;
      // لُب
      const lub = applyEnv(sweepSine(0.16, 64, 49), envAD(0.16, 0.006, 0.065), 1);
      addInto(out, lub, 1, t0);
      addInto(out, applyEnv(filt(white(0.05), bqLP(500, 0.8)), envAD(0.05, 0.003, 0.02), 0.35), t0);
      // دَب
      const dub = applyEnv(sweepSine(0.13, 52, 44), envAD(0.13, 0.005, 0.055), 0.72);
      addInto(out, dub, 1, t0 + 0.19);
      addInto(out, applyEnv(filt(white(0.04), bqLP(450, 0.8)), envAD(0.04, 0.003, 0.018), 0.25), t0 + 0.19);
    }
    return normalize(fades(reverb(out, 0.12, true, 0.3), 0.01, 0.12));
  },
  "stinger-dark": () => {
    const dur = 3.0;
    const out = buf(dur);
    addInto(out, applyEnv(filt(white(0.03), bqHP(900, 0.8)), envAD(0.03, 0.001, 0.012), 0.8));
    const cluster: [number, number][] = [[110, 1], [116.54, 0.8], [155.56, 0.55], [233.08, 0.3]];
    for (const [f, g] of cluster) {
      addInto(out, applyEnv(sine(2.0, f, rnd(0.3, 0.6), 0.004), envAD(2.0, 0.003, 0.85), g * 0.8));
    }
    addInto(out, applyEnv(sine(1.6, 36), envAD(1.6, 0.05, 0.9), 0.35));
    return normalize(fades(reverb(out, 0.5, true, 1.5), 0.001, 0.5));
  },

  // ── واجهة التطبيق (وفق مواصفات المانيفست) ──
  "sfx-phone-ring": () => {
    const dur = 3.6;
    const out = buf(dur);
    const tone = buf(dur);
    for (let i = 0; i < tone.length; i++) tone[i] = Math.sin(2 * Math.PI * 440 * (i / SR)) + Math.sin(2 * Math.PI * 480 * (i / SR));
    const seg = (t0: number, t1: number) => {
      const a = Math.round(t0 * SR), b = Math.round(t1 * SR);
      for (let i = a; i < b && i < out.length; i++) {
        const t = (i - a) / SR;
        const edge = Math.min(1, t / 0.008, (b - i) / (0.008 * SR));
        out[i] += tone[i] * edge;
      }
    };
    seg(0, 1.6); seg(2.0, 3.6);
    // اهتزاز ميكانيكي خفيف
    const tr = tremolo(out, 25, 0.12);
    return normalize(fades(filt(tr, bqLP(3600, 0.8)), 0.002, 0.01));
  },
  "sfx-morse-shadow": () => {
    // SHADOW بالنقرات: S(...), H(....), A(.-), D(-..), O(---), W(.--)
    const DOT = 0.07, DASH = 0.21, GAP = 0.07, LGAP = 0.21;
    const letters: string[][] = [[".", ".", ".", "."], [".", ".", ".", "."], [".", "-"], ["-", ".", "."], ["-", "-", "-"], [".", "-", "-"]];
    let t = 0.3;
    const out = buf(5.6);
    for (const letter of letters) {
      letter.forEach((el, i) => {
        const d = el === "." ? DOT : DASH;
        const b = applyEnv(sine(d + 0.01, 600), envAD(d + 0.01, 0.005, 0.02), 0.9);
        addInto(out, b, 1, t);
        t += d + (i < letter.length - 1 ? GAP : LGAP);
      });
    }
    addInto(out, filt(pink(5.6), bqBP(900, 0.6)), 0.05);
    return normalize(fades(out, 0.01, 0.15));
  },
  "sfx-ambient-hum": () => {
    // 24 ثانية قابلة للتكرار — كل الترددات مضاعفات صحيحة لدورات 24s
    const dur = 24;
    const out = buf(dur);
    for (const [f, g] of [[55, 0.5], [57, 0.42], [110, 0.12], [165, 0.05]] as [number, number][]) {
      addInto(out, sine(dur, f), g);
    }
    addInto(out, filt(brown(dur), bqLP(280, 0.8)), 0.35);
    const tr = tremolo(out, 0.125, 0.35);
    return normalize(tr, 0.6);
  },
  "sfx-ui-click": () => {
    const dur = 0.09;
    const out = buf(dur);
    addInto(out, applyEnv(filt(white(0.05), bqBP(2000, 4)), envAD(0.05, 0.001, 0.012), 1));
    addInto(out, applyEnv(filt(white(0.01), bqHP(4000, 0.8)), envAD(0.01, 0.0005, 0.004), 0.6));
    return normalize(fades(out, 0.001, 0.02));
  },
  "sfx-ui-error": () => {
    const dur = 0.16;
    const out = buf(dur);
    addInto(out, applyEnv(sine(dur, 110), envAD(dur, 0.002, 0.05), 1));
    addInto(out, applyEnv(sine(dur, 220), envAD(dur, 0.002, 0.04), 0.55));
    addInto(out, applyEnv(sine(dur, 227), envAD(dur, 0.002, 0.035), 0.2));
    return normalize(fades(out, 0.001, 0.03));
  },
  "sfx-ui-success": () => {
    const dur = 0.38;
    const out = buf(dur);
    addInto(out, applyEnv(sine(0.16, 620), envAD(0.16, 0.008, 0.045), 0.9), 0, 0);
    addInto(out, applyEnv(sine(0.22, 930), envAD(0.22, 0.008, 0.06), 0.85), 0, 0.115);
    addInto(out, applyEnv(sine(0.1, 1860), envAD(0.1, 0.008, 0.03), 0.12), 0, 0.115);
    return normalize(fades(out, 0.002, 0.06));
  },

  // ── مؤثرات محيطية مُطبَّقة على السرد ──
  "static-soft": () => {
    const dur = 2.4;
    const out = filt(filt(white(dur), bqHP(1100, 0.8)), bqLP(6200, 0.8));
    const cr = buf(dur);
    for (let k = 0; k < 90; k++) {
      const t = rnd(0.05, dur - 0.06);
      const len = rnd(0.003, 0.008);
      addInto(cr, applyEnv(filt(white(len), bqBP(rnd(1500, 4500), 5)), envAD(len, 0.001, 0.004), rnd(0.3, 1)), t);
    }
    addInto(out, cr, 0.5);
    return normalize(fades(out, 0.25, 0.4), 0.5);
  },
  "static-strong": () => {
    const dur = 1.6;
    let out = filt(filt(white(dur), bqHP(500, 0.8)), bqLP(7500, 0.8));
    const cr = buf(dur);
    for (let k = 0; k < 70; k++) {
      const t = rnd(0.02, dur - 0.05);
      const len = rnd(0.002, 0.01);
      addInto(cr, applyEnv(filt(white(len), bqBP(rnd(900, 5200), 4)), envAD(len, 0.0008, 0.005), rnd(0.4, 1)), t);
    }
    out = gainPoints(out, [[0, 1], [0.5, 1], [0.56, 0.12], [0.63, 0.12], [0.68, 1], [1.1, 1], [1.16, 0.2], [1.22, 0.2], [1.28, 1], [1.6, 1]]);
    addInto(out, cr, 0.65);
    return normalize(fades(out, 0.02, 0.08), 0.75);
  },
  "keyboard-typing": () => {
    const dur = 4.2;
    const out = buf(dur);
    let t = 0.15;
    let k = 0;
    while (t < dur - 0.3) {
      const vel = rnd(0.55, 1);
      const space = rng() < 0.14;
      const click = applyEnv(filt(white(0.004), bqHP(3500, 0.8)), envAD(0.004, 0.0004, 0.002), 0.8 * vel);
      const body = applyEnv(filt(white(0.045), bqBP(space ? 900 : rnd(1300, 2400), 1.6)), envAD(0.045, 0.001, 0.018), 0.85 * vel);
      const thock = applyEnv(sine(0.03, space ? 120 : 175), envAD(0.03, 0.001, 0.012), (space ? 0.6 : 0.4) * vel);
      addInto(out, click, 1, t); addInto(out, body, 1, t); addInto(out, thock, 1, t);
      t += rnd(0.24, 0.38); k++;
    }
    return normalize(fades(out, 0.02, 0.1), 0.8);
  },
  "beeps-monitor": () => {
    const dur = 2.3;
    const out = buf(dur);
    for (const t0 of [0.3, 1.15, 2.0]) {
      addInto(out, applyEnv(sine(0.1, 880), envAD(0.1, 0.005, 0.03), 0.9), t0);
    }
    addInto(out, filt(pink(dur), bqLP(600, 0.8)), 0.05);
    return normalize(fades(reverb(out, 0.18, false, 0.25), 0.01, 0.1));
  },
  "tape-hiss": () => {
    const dur = 3.0;
    const mix = buf(dur);
    const w = white(dur), p = pink(dur);
    for (let i = 0; i < mix.length; i++) mix[i] = w[i] * 0.38 + p[i] * 0.62;
    let out = filt(filt(mix, bqHP(320, 0.7)), bqLP(7800, 0.7));
    out = tremolo(out, 5.5, 0.14);
    out = tremolo(out, 0.8, 0.08);
    out = gainPoints(out, [[0, 1], [1.1, 1], [1.16, 0.25], [1.24, 0.25], [1.3, 1], [2.2, 1], [2.26, 0.3], [2.33, 0.3], [2.4, 1], [3.0, 1]]);
    return normalize(fades(out, 0.15, 0.2), 0.45);
  },
  "wind-outdoor": () => {
    const dur = 4.5;
    const base = filt(brown(dur), bqLP(520, 0.8));
    const gust = buf(dur);
    for (let i = 0; i < gust.length; i++) {
      const t = i / SR;
      const g1 = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.31 * t + 1.3);
      const g2 = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.17 * t + 4.1);
      gust[i] = Math.max(0, g1 * g2 - 0.15);
    }
    const out = buf(dur);
    for (let i = 0; i < out.length; i++) out[i] = base[i] * gust[i];
    const whistle = sweepBP(white(dur), 950, 1350, 8);
    for (let i = 0; i < out.length; i++) out[i] += whistle[i] * gust[i] * gust[i] * 0.14;
    return normalize(fades(out, 0.5, 0.7), 0.7);
  },
  "crowd-murmur": () => {
    const dur = 4.5;
    const out = buf(dur);
    for (let v = 0; v < 8; v++) {
      let f1 = rnd(240, 460), f2 = rnd(750, 1350);
      let t = rnd(0, 0.4);
      const g = rnd(0.1, 0.2);
      while (t < dur - 0.4) {
        const syl = rnd(0.16, 0.32);
        const wnoise = white(syl + 0.05);
        f1 = Math.min(460, Math.max(240, f1 + rnd(-60, 60)));
        f2 = Math.min(1350, Math.max(750, f2 + rnd(-160, 160)));
        const voiced = filt(filt(wnoise, bqBP(f1, 3)), bqBP(f2, 5));
        // شكل مقطع لفظي
        const sylEnv = buf(syl + 0.05);
        for (let i = 0; i < sylEnv.length; i++) {
          const p = i / sylEnv.length;
          sylEnv[i] = Math.sin(Math.PI * Math.min(1, p)) * (0.7 + 0.3 * Math.sin(2 * Math.PI * rnd(28, 42) * p * syl));
        }
        for (let i = 0; i < voiced.length; i++) voiced[i] *= sylEnv[i];
        addInto(out, voiced, g, t);
        t += syl + rnd(0.08, 0.2);
      }
    }
    const blurred = reverb(out, 0.3, false, 0.5);
    return normalize(fades(filt(blurred, bqLP(3600, 0.8)), 0.4, 0.6), 0.5);
  },
  "whisper-breath": () => {
    const dur = 1.8;
    const out = buf(dur);
    const s1 = sweepBP(white(0.45), 2100, 1750, 1.4);
    const s2 = sweepBP(white(0.8), 1900, 1500, 1.4);
    addInto(out, applyEnv(filt(s1, bqHP(1300, 0.7)), envAD(0.45, 0.06, 0.12), 0.7), 0, 0.05);
    addInto(out, applyEnv(filt(s2, bqHP(1300, 0.7)), envAD(0.8, 0.1, 0.2), 1), 0, 0.6);
    return normalize(fades(filt(out, bqLP(6800, 0.7)), 0.02, 0.25), 0.6);
  },
  "scream-distant": () => {
    const dur = 2.8;
    // موجتان منشاريتان مزاحفتان النغمة مع فيبراتو
    const mk = (detune: number) => {
      const b = buf(dur);
      let phase = 0;
      for (let i = 0; i < b.length; i++) {
        const t = i / SR;
        let f: number;
        if (t < 0.45) f = 340 * Math.pow(830 / 340, t / 0.45);
        else if (t < 1.35) f = 830;
        else f = 830 * Math.pow(420 / 830, (t - 1.35) / 0.8);
        f *= 1 + detune + 0.045 * Math.sin(2 * Math.PI * 6.5 * t);
        phase += f / SR; phase -= Math.floor(phase);
        b[i] = 2 * phase - 1;
      }
      return b;
    };
    const src = buf(dur);
    const a1 = mk(0), a2 = mk(0.004);
    for (let i = 0; i < src.length; i++) src[i] = Math.tanh((a1[i] + a2[i] * 0.8) * 1.8);
    // مسح فورمانتي 550→1850→750
    const form1 = sweepBP(src, 550, 1850, 5);
    const form2 = sweepBP(src, 950, 2600, 7);
    let out = buf(dur);
    for (let i = 0; i < out.length; i++) out[i] = form1[i] * 0.8 + form2[i] * 0.3;
    // مركّب هوائي (صرخ)
    addInto(out, sweepBP(white(dur), 1400, 2400, 2), 0.22);
    // غلاف النفس
    out = applyEnv(out, envAD(dur, 0.03, 1.0));
    // بُعد: تمرير منخفض + رفيرب + صدى
    out = filt(out, bqLP(2900, 0.8));
    const rev = reverb(out, 0.4, true, 1.2);
    const fin = buf(dur);
    addInto(fin, out, 1);
    addInto(fin, out, 0.28, 0.21);
    addInto(fin, rev, 0.5);
    return normalize(fades(fin, 0.01, 0.3), 0.85);
  },
  "knocking-slow": () => {
    // ثلاث طرقات بطيئة متباعدة
    const dur = 3.1;
    const out = buf(dur);
    const knock = (vel: number) => {
      const k = buf(0.3);
      addInto(k, applyEnv(filt(white(0.03), bqLP(900, 0.8)), envAD(0.03, 0.001, 0.011), 0.9 * vel));
      for (const [f, g] of [[92, 1], [158, 0.6], [237, 0.35], [380, 0.18]] as [number, number][]) {
        addInto(k, applyEnv(sine(0.28, f * rnd(0.98, 1.02)), envAD(0.28, 0.001, 0.055), g * vel));
      }
      return k;
    };
    addInto(out, knock(0.9), 1, 0.12);
    addInto(out, knock(0.65), 1, 0.95);
    addInto(out, knock(1.0), 1, 1.78);
    return normalize(fades(reverb(out, 0.15, true, 0.4), 0.002, 0.5), 0.85);
  },
  "footsteps-slow": () => {
    const dur = 4.4;
    const out = buf(dur);
    let t = 0.12;
    let step = 0;
    while (t < dur - 0.5) {
      const f0 = step % 2 === 0 ? 78 : 94;
      const thud = applyEnv(sweepSine(0.11, f0, f0 * 0.93), envAD(0.11, 0.004, 0.05), 1);
      const heel = applyEnv(filt(white(0.02), bqBP(1900, 2)), envAD(0.02, 0.001, 0.008), 0.25);
      const scuff = applyEnv(filt(white(0.06), bqBP(650, 1.2)), envAD(0.06, 0.004, 0.03), 0.16);
      addInto(out, thud, 1, t);
      addInto(out, heel, 1, t + 0.015);
      addInto(out, scuff, 1, t + 0.03);
      t += rnd(0.76, 0.9);
      step++;
    }
    return normalize(fades(reverb(out, 0.14, true, 0.3), 0.01, 0.4), 0.8);
  },
  "recorder-clicks": () => {
    const dur = 1.3;
    const out = buf(dur);
    const click = (vel: number) => {
      const c = buf(0.12);
      addInto(c, applyEnv(filt(white(0.006), bqHP(2200, 0.8)), envAD(0.006, 0.0004, 0.003), vel));
      addInto(c, applyEnv(sine(0.1, 900), envAD(0.1, 0.0008, 0.02), 0.3 * vel));
      return c;
    };
    addInto(out, click(0.8), 1, 0.1);
    addInto(out, click(1.0), 1, 0.22);
    addInto(out, click(0.6), 1, 0.85);
    addInto(out, filt(pink(dur), bqLP(900, 0.8)), 0.05);
    return normalize(fades(out, 0.005, 0.1), 0.8);
  },
  "pen-scratch": () => {
    const dur = 3.2;
    const out = buf(dur);
    const strokes = [0.1, 0.68, 1.34, 1.98, 2.52];
    for (const t0 of strokes) {
      const len = rnd(0.3, 0.42);
      const n = filt(filt(white(len + 0.02), bqHP(900, 0.7)), bqLP(3400, 0.7));
      const gran = buf(len + 0.02);
      let ph = 0;
      const fgr = rnd(30, 55);
      for (let i = 0; i < gran.length; i++) {
        ph += fgr / SR;
        gran[i] = 0.55 + 0.45 * Math.sin(2 * Math.PI * (ph % 1));
      }
      const stroke = buf(n.length);
      for (let i = 0; i < n.length; i++) stroke[i] = n[i] * gran[i];
      addInto(out, applyEnv(stroke, envAD(len + 0.02, 0.06, 0.09), 0.5), t0);
    }
    return normalize(fades(out, 0.05, 0.15), 0.5);
  },
  "fire-crackle": () => {
    const dur = 3.6;
    const out = buf(dur);
    const bed = filt(brown(dur), bqLP(380, 0.8));
    addInto(out, tremolo(bed, 0.23, 0.3));
    let t = 0.05;
    while (t < dur - 0.1) {
      const len = rnd(0.004, 0.02);
      const pop = applyEnv(filt(white(len), bqBP(rnd(900, 3000), 3)), envAD(len, 0.0008, 0.006), rnd(0.2, 0.8));
      addInto(out, pop, 1, t);
      if (rng() < 0.12) addInto(out, applyEnv(sine(0.05, rnd(1400, 2600)), envAD(0.05, 0.001, 0.012), 0.25), t);
      if (rng() < 0.08) addInto(out, applyEnv(sine(0.05, 90), envAD(0.05, 0.002, 0.03), 0.5), t);
      t += rnd(0.03, 0.16);
    }
    return normalize(fades(out, 0.3, 0.5), 0.6);
  },
  "radio-tuning": () => {
    const dur = 2.6;
    const out = buf(dur);
    let t = 0.05;
    while (t < dur - 0.5) {
      const len = rnd(0.12, 0.26);
      const center = rnd(600, 3800);
      addInto(out, applyEnv(filt(white(len), bqBP(center, 1.2)), envAD(len, 0.01, 0.06), rnd(0.3, 0.7)), t);
      if (rng() < 0.3) addInto(out, applyEnv(sine(len, center * rnd(0.9, 1.1)), envAD(len, 0.02, 0.08), 0.12), t);
      t += len + rnd(0.02, 0.1);
    }
    // استقرار على "محطة" في النهاية
    addInto(out, applyEnv(filt(white(0.8), bqBP(1200, 1.5)), envAD(0.8, 0.1, 0.3), 0.45), dur - 0.85);
    addInto(out, applyEnv(sine(0.8, 987), envAD(0.8, 0.1, 0.25), 0.07), dur - 0.85);
    addInto(out, filt(white(dur), bqHP(1500, 0.7)), 0.06);
    return normalize(fades(out, 0.02, 0.2), 0.7);
  },
  "line-cut": () => {
    const dur = 0.55;
    const out = buf(dur);
    addInto(out, applyEnv(filt(white(0.004), bqHP(1800, 0.8)), envAD(0.004, 0.0004, 0.002), 0.9), 0, 0);
    addInto(out, applyEnv(sine(0.09, 480), envAD(0.09, 0.002, 0.03), 0.5), 0, 0.01);
    addInto(out, applyEnv(filt(white(0.18), bqHP(800, 0.7)), envAD(0.18, 0.02, 0.1), 0.12), 0, 0.12);
    return normalize(fades(out, 0.002, 0.1), 0.8);
  },
  "breath-low": () => {
    const dur = 2.2;
    const out = buf(dur);
    const inh = sweepBP(white(1.0), 500, 800, 1.1);
    const exh = sweepBP(white(1.0), 700, 450, 1.1);
    addInto(out, applyEnv(inh, envAD(1.0, 0.35, 0.25), 0.8), 0, 0.05);
    addInto(out, applyEnv(exh, envAD(1.0, 0.1, 0.4), 0.6), 0, 1.1);
    return normalize(fades(filt(out, bqLP(2400, 0.8)), 0.05, 0.2), 0.55);
  },
};

// ═══════════════════════════════════════════════════════════
// التوليد + التحويل MP3
// ═══════════════════════════════════════════════════════════
function dur(p: string): number {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" });
  const d = parseFloat(r.stdout?.trim() ?? "");
  return isFinite(d) ? d : 0;
}

const UI_IDS = new Set(["sfx-phone-ring", "sfx-morse-shadow", "sfx-ambient-hum", "sfx-ui-click", "sfx-ui-error", "sfx-ui-success"]);

let made = 0, failed = 0;
for (const [id, gen] of Object.entries(FX)) {
  const targetDir = UI_IDS.has(id) ? APP_DIR : SFX_DIR;
  const wav = join(TMP_DIR, `${id}.wav`);
  const mp3 = join(targetDir, `${id}.mp3`);
  try {
    const audio = gen();
    writeWav(wav, audio);
    const r = spawnSync("ffmpeg", ["-y", "-v", "quiet", "-i", wav, "-ar", "44100", "-ac", "1", "-b:a", id === "sfx-ambient-hum" ? "128k" : "192k", mp3], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(String(r.stderr || "").slice(-200));
    const d = dur(mp3);
    console.log(`  ✓ ${id}.mp3 — ${d.toFixed(2)}s`);
    made++;
  } catch (e) {
    console.error(`  ✗ ${id}: ${e}`);
    failed++;
  }
}

// نسخ مؤثرات الواجهة إلى اللعبة (public/audio)
for (const id of UI_IDS) {
  const src = join(APP_DIR, `${id}.mp3`);
  const r = spawnSync("cp", [src, join(PUBLIC_AUDIO, `${id}.mp3`)], { encoding: "utf8" });
  if (r.status !== 0) console.error(`  ✗ نسخ ${id} إلى اللعبة`);
}

// إزالة بقايا ElevenLabs (.raw.mp3)
for (const f of readdirSync(SFX_DIR)) {
  if (f.endsWith(".raw.mp3")) rmSync(join(SFX_DIR, f));
}
rmSync(TMP_DIR, { recursive: true, force: true });

console.log(`\n═══ ${made} مؤثراً حقيقياً مُصنَّعاً بالـDSP${failed ? ` • ${failed} فشل` : ""} ═══`);
if (failed) process.exit(1);

// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — مولّد الأصوات (يُشغَّل مرة واحدة في التطوير)
// التسجيلات الـ16: ElevenLabs v4 + وسم [phone quality] → ffmpeg فلتر هاتف → public/audio
// المؤثرات الستة: توليد رقمي خالص (WAV PCM16/44.1kHz) → MP3 — بلا أي API
// قابل لإعادة التشغيل بأمان: يتخطى الملف النهائي السليم دون استهلاك API.
// الاستخدام: bun tools/game/generate-audio.ts
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { AUDIO_MANIFEST, type AudioManifestItem } from "../../src/lib/game/content";

const ROOT = resolve(import.meta.dir, "..", "..");
const RAW_DIR = join(ROOT, "tools/game/audio-raw");
const OUT_DIR = join(ROOT, "public/audio");
const SR = 44100;
const TAG = "[phone quality] ";

const PRIMARY_VOICE = "nPczCjzI2devNBz1zQrb"; // صوت ذكوري عميق
const PRIMARY_MODEL = "eleven_v4";
const FALLBACK_MODEL = "eleven_multilingual_v2";

// عتبات الحجم (بايت)
const OK_FINAL_VOICE = 20 * 1024; // تسجيل نهائي سليم
const OK_RAW_VOICE = 20 * 1024; // خام سليم (يُعاد استخدامه بلا API)
const OK_FINAL_SFX = 1024;
const TEST_GATE_RAW = 30 * 1024; // بوابة اختبار boot: الخام > 30KB

// ── حالة المحرك ──
let engine = {
  voiceId: PRIMARY_VOICE,
  voiceName: "unknown",
  model: PRIMARY_MODEL,
  tagged: true, // وسم [phone quality] يفهمه v4 ولا يُنطق (مُتحقق منه سابقاً بالـASR)
};

let consumedChars = 0; // الأحرف الفعلية المستهلكة لدى ElevenLabs
let apiCalls = 0;
const failures: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ═══ أدوات عامة ════════════════════════════════════════════
function readEnvKey(): string | null {
  try {
    const txt = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/);
      if (m && m[1]) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* .env غير موجود */
  }
  return null;
}
const KEY = readEnvKey();

function size(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

function run(cmd: string, args: string[]): boolean {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`    ✗ ${cmd} فشل: ${String(r.stderr || r.error || "").slice(-300)}`);
    return false;
  }
  return true;
}

function probe(p: string): { dur: number; size: number } | null {
  const r = spawnSync(
    "ffprobe",
    ["-v", "quiet", "-show_entries", "format=duration,size", "-of", "csv=p=0", p],
    { encoding: "utf8" },
  );
  if (r.status !== 0 || !r.stdout) return null;
  const [d, s] = r.stdout.trim().split(",");
  const dur = parseFloat(d ?? "");
  const sz = parseInt(s ?? "", 10);
  if (!isFinite(dur) || !isFinite(sz)) return null;
  return { dur, size: sz };
}

// ═══ ElevenLabs ════════════════════════════════════════════
async function tts(text: string, voiceId: string, model: string): Promise<Buffer | null> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": KEY ?? "", "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.42, similarity_boost: 0.75 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  consumedChars += text.length;
  apiCalls++;
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 180);
    } catch {
      /* ignore */
    }
    console.error(`    ✗ ElevenLabs HTTP ${res.status} ${detail}`);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

interface VoiceInfo {
  voice_id: string;
  name: string;
  category?: string;
  labels?: { gender?: string; description?: string; use_case?: string };
  description?: string;
}

async function listVoices(): Promise<VoiceInfo[] | null> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": KEY ?? "" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.error(`    ✗ GET /v1/voices HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { voices?: VoiceInfo[] };
    return data.voices ?? [];
  } catch (e) {
    console.error(`    ✗ GET /v1/voices فشل: ${String(e).slice(0, 120)}`);
    return null;
  }
}

async function pickFallbackVoice(voices: VoiceInfo[]): Promise<VoiceInfo | null> {
  let best: VoiceInfo | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const l = v.labels ?? {};
    if (l.gender !== "male") continue;
    const hay = `${v.name} ${l.description ?? ""} ${l.use_case ?? ""} ${v.description ?? ""}`.toLowerCase();
    let s = 0;
    if (/deep|low|bass|gravel|baritone/.test(hay)) s += 4;
    if (/narrat|documentar/.test(hay)) s += 2;
    if (v.category === "premade") s += 1;
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}

// ═══ ffmpeg ════════════════════════════════════════════════
function phoneFilter(input: string, output: string): boolean {
  return run("ffmpeg", [
    "-y", "-i", input,
    "-af", "highpass=f=300,lowpass=f=3400",
    "-ar", "8000", "-ac", "1", "-b:a", "48k",
    output,
  ]);
}
function encodeMp3(input: string, output: string, af?: string, bitrate = "128k"): boolean {
  const args = ["-y", "-i", input];
  if (af) args.push("-af", af);
  args.push("-b:a", bitrate, output);
  return run("ffmpeg", args);
}

// ═══ توليد WAV رقمي (PCM16 mono / 44100Hz) ═══════════════
function writeWav(path: string, samples: Float32Array, sampleRate = SR): void {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
}

function addTone(buf: Float32Array, start: number, count: number, freq: number, gain: number, rampMs = 5): void {
  const ramp = Math.max(1, Math.round((rampMs / 1000) * SR));
  for (let i = 0; i < count; i++) {
    let a = 1;
    if (i < ramp) a = i / ramp;
    if (i > count - ramp) a = Math.min(a, Math.max(0, (count - i) / ramp));
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] = (buf[idx] ?? 0) + gain * Math.sin((2 * Math.PI * freq * i) / SR) * a;
  }
}

// 1) مورس SHADOW — إشارة لاسلكية عبر الهاتف
const MORSE_CODE: Record<string, string> = { S: "...", H: "....", A: ".-", D: "-..", O: "---", W: ".--" };
function synthMorse(): Float32Array {
  const DOT = 0.07, DASH = 0.21, EGAP = 0.07, LGAP = 0.21, FREQ = 600;
  const word = "SHADOW";
  const marks: { t: number; d: number }[] = [];
  let t = 0.15;
  word.split("").forEach((ch, li) => {
    const seq = MORSE_CODE[ch] ?? "";
    seq.split("").forEach((el, ei) => {
      const d = el === "." ? DOT : DASH;
      marks.push({ t, d });
      t += d;
      if (ei < seq.length - 1) t += EGAP;
    });
    if (li < word.length - 1) t += LGAP;
  });
  const total = t + 0.15;
  const buf = new Float32Array(Math.round(total * SR));
  for (const m of marks) addTone(buf, Math.round(m.t * SR), Math.round(m.d * SR), FREQ, 0.85, 5);
  return buf;
}

// 2) طنين الأجواء — 24 ثانية قابل للتكرار
function synthHum(): Float32Array {
  const DUR = 24;
  const n = Math.round(DUR * SR);
  const brown = new Float32Array(n);
  let last = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    brown[i] = last;
    const a = Math.abs(last);
    if (a > peak) peak = a;
  }
  const bg = peak > 0 ? 0.05 / peak : 0; // ضجيج بني خافت جداً (ذروة ~5%)
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const beat = 0.5 * (Math.sin(2 * Math.PI * 55 * t) + Math.sin(2 * Math.PI * 57 * t));
    buf[i] = 0.2 * beat + (brown[i] ?? 0) * bg; // الذروة الكلية ~25%
  }
  const f = Math.round(0.2 * SR); // fade 200ms
  for (let i = 0; i < f; i++) {
    const g = i / f;
    buf[i] = (buf[i] ?? 0) * g;
    buf[n - 1 - i] = (buf[n - 1 - i] ?? 0) * g;
  }
  return buf;
}

// 3) رنة الهاتف الكلاسيكية
function addRingBurst(buf: Float32Array, startSec: number, durSec: number): void {
  const start = Math.round(startSec * SR);
  const count = Math.round(durSec * SR);
  const attack = Math.round(0.015 * SR);
  const release = Math.round(0.04 * SR);
  for (let i = 0; i < count; i++) {
    let a = 1;
    if (i < attack) a = i / attack;
    if (i > count - release) a = Math.min(a, Math.max(0, (count - i) / release));
    const t = i / SR;
    const trem = 1 - 0.15 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 20 * t)); // اهتزاز جرس خفيف
    const s = 0.5 * (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t));
    buf[start + i] = (buf[start + i] ?? 0) + 0.5 * s * a * trem;
  }
}
function synthRing(): Float32Array {
  const RING = 1.6, SILENCE = 0.4;
  const buf = new Float32Array(Math.round((RING + SILENCE + RING + SILENCE) * SR));
  addRingBurst(buf, 0, RING);
  addRingBurst(buf, RING + SILENCE, RING);
  return buf;
}

// 4) نقرة الواجهة — دفعة ضجيج مفلترة باند ~2000Hz
function biquadBandpass(x: Float32Array, f0: number, Q: number): Float32Array {
  const w0 = (2 * Math.PI * f0) / SR;
  const alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const a1 = (-2 * Math.cos(w0)) / a0;
  const a2 = (1 - alpha) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i] ?? 0;
    const v = b0 * (xi - x2) - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}
function synthClick(): Float32Array {
  const BURST = 0.03, PAD = 0.22;
  const burstN = Math.round(BURST * SR);
  const noise = new Float32Array(burstN);
  for (let i = 0; i < burstN; i++) noise[i] = (Math.random() * 2 - 1) * Math.exp(-i / (0.008 * SR));
  const filtered = biquadBandpass(noise, 2000, 2);
  let peak = 0;
  for (const v of filtered) {
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  const g = peak > 0 ? 0.8 / peak : 0;
  const buf = new Float32Array(Math.round((BURST + PAD) * SR));
  const off = Math.round(0.005 * SR);
  for (let i = 0; i < filtered.length; i++) buf[off + i] = (filtered[i] ?? 0) * g;
  return buf;
}

// 5) نغمة الخطأ — 110/220Hz بغلاف هبوط سريع
function synthError(): Float32Array {
  const DUR = 0.14, PAD = 0.16;
  const n = Math.round(DUR * SR);
  const seg = new Float32Array(n);
  const attack = Math.round(0.003 * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const a = i < attack ? i / attack : 1;
    const env = Math.exp(-t / 0.05);
    const s = 0.6 * Math.sin(2 * Math.PI * 110 * t) + 0.4 * Math.sin(2 * Math.PI * 220 * t);
    seg[i] = 0.85 * s * env * a;
  }
  const buf = new Float32Array(Math.round((DUR + PAD) * SR));
  buf.set(seg, 0);
  return buf;
}

// 6) نغمة النجاح — 620Hz ثم 930Hz بتداخل ناعم
function synthSuccess(): Float32Array {
  const T1 = 0.12, T2 = 0.18, OVERLAP = 0.03, TAIL = 0.15;
  const total = T1 + T2 - OVERLAP + TAIL;
  const buf = new Float32Array(Math.round(total * SR));
  addTone(buf, 0, Math.round(T1 * SR), 620, 0.45, 8);
  addTone(buf, Math.round((T1 - OVERLAP) * SR), Math.round(T2 * SR), 930, 0.45, 8);
  return buf;
}

// ═══ تعريف المؤثرات ═══════════════════════════════════════
interface SfxDef {
  id: string;
  file: string;
  desc: string;
  synth: () => Float32Array;
  encode: (rawWav: string, outMp3: string) => boolean;
}
const SFX_DEFS: SfxDef[] = [
  {
    id: "sfx-morse",
    file: "sfx-morse-shadow.mp3",
    desc: "نقرات مورس تهجّئ SHADOW عبر خط هاتف (600Hz، نقطة 70ms/شرطة 210ms)",
    synth: synthMorse,
    encode: (i, o) => phoneFilter(i, o), // فلتر الهاتف نفسه → إشارة لاسلكية
  },
  {
    id: "sfx-hum",
    file: "sfx-ambient-hum.mp3",
    desc: "طنين أجواء خافت متواصل 24 ثانية قابل للتكرار (55Hz و57Hz + ضجيج بني خافت)",
    synth: synthHum,
    encode: (i, o) => encodeMp3(i, o, undefined, "96k"),
  },
  {
    id: "sfx-ring",
    file: "sfx-phone-ring.mp3",
    desc: "رنة هاتف كلاسيكية (440Hz+480Hz) بنمط 1.6/0.4/1.6 ثانية",
    synth: synthRing,
    encode: (i, o) => encodeMp3(i, o, "highpass=f=300,lowpass=f=3400", "96k"),
  },
  {
    id: "sfx-click",
    file: "sfx-ui-click.mp3",
    desc: "نقرة واجهة 30ms — دفعة ضجيج مفلترة باند حول 2000Hz بغلاف سريع",
    synth: synthClick,
    encode: (i, o) => encodeMp3(i, o, undefined, "128k"),
  },
  {
    id: "sfx-error",
    file: "sfx-ui-error.mp3",
    desc: "نغمة خطأ 140ms — موجتان 110Hz و220Hz حادتان بغلاف هبوط سريع",
    synth: synthError,
    encode: (i, o) => encodeMp3(i, o, undefined, "128k"),
  },
  {
    id: "sfx-success",
    file: "sfx-ui-success.mp3",
    desc: "نغمة نجاح — نغمتان جيبيتان ناعمتان 620Hz (120ms) ثم 930Hz (180ms) بتداخل بسيط",
    synth: synthSuccess,
    encode: (i, o) => encodeMp3(i, o, undefined, "128k"),
  },
];

// ═══ توليد تسجيل واحد ═════════════════════════════════════
async function generateRecording(item: AudioManifestItem): Promise<"ok" | "skipped" | "fail"> {
  const finalPath = join(OUT_DIR, item.file);
  if (size(finalPath) > OK_FINAL_VOICE) {
    console.log(`  ✓ ${item.file} — موجود وسليم (${(size(finalPath) / 1024).toFixed(1)}KB) — تخطّي`);
    return "skipped";
  }
  console.log(`  ▶ ${item.id} → ${item.file} (${item.text.length} حرفاً منطوقاً)`);
  const rawPath = join(RAW_DIR, item.file + ".raw.mp3");
  if (size(rawPath) <= OK_RAW_VOICE) {
    const text = (engine.tagged ? TAG : "") + item.text;
    let buf = await tts(text, engine.voiceId, engine.model);
    if (!buf || buf.length <= OK_RAW_VOICE) {
      console.log("    ↻ فشل مؤكد — إعادة محاولة واحدة…");
      await sleep(1500);
      buf = await tts(text, engine.voiceId, engine.model);
    }
    if (!buf || buf.length <= OK_RAW_VOICE) {
      console.error("    ✗ فشل التوليد بعد المحاولتين");
      failures.push(item.file);
      return "fail";
    }
    writeFileSync(rawPath, buf);
    console.log(`    خام ElevenLabs: ${(buf.length / 1024).toFixed(1)}KB`);
  } else {
    console.log(`    خام موجود من تشغيل سابق (${(size(rawPath) / 1024).toFixed(1)}KB) — بلا استهلاك API`);
  }
  if (!phoneFilter(rawPath, finalPath)) {
    failures.push(item.file);
    return "fail";
  }
  const fsz = size(finalPath);
  console.log(`    نهائي بعد فلتر الهاتف: ${(fsz / 1024).toFixed(1)}KB`);
  if (fsz <= OK_FINAL_VOICE) {
    failures.push(item.file);
    return "fail";
  }
  return "ok";
}

// ═══ الرئيسية ══════════════════════════════════════════════
async function main(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  if (!KEY) {
    console.error("✗ ELEVENLABS_API_KEY غير موجود في .env — لا يمكن توليد التسجيلات");
    process.exit(1);
  }

  const totalChars = AUDIO_MANIFEST.reduce((s, i) => s + i.text.length, 0);
  console.log("═══ مولّد أصوات بروتوكول التاسع ═══");
  console.log(`التسجيلات: ${AUDIO_MANIFEST.length} • أحرف النصوص: ${totalChars} • المؤثرات: ${SFX_DEFS.length} (رقمية خالصة)`);

  // معرفة اسم الصوت الأساسي (GET مجاني لا يستهلك أحرفاً)
  const voices = await listVoices();
  const primary = voices?.find((v) => v.voice_id === PRIMARY_VOICE);
  engine.voiceName = primary?.name ?? "deep male (nPczCjzI2devNBz1zQrb)";
  console.log(`المحرك الأساسي: ${engine.voiceName} + ${engine.model} (وسم [phone quality])`);

  // ── بوابة الاختبار: أقصر ملف (boot) ──
  const boot = AUDIO_MANIFEST.find((i) => i.id === "boot");
  if (boot) {
    const bootRaw = join(RAW_DIR, boot.file + ".raw.mp3");
    if (size(join(OUT_DIR, boot.file)) > OK_FINAL_VOICE || size(bootRaw) > TEST_GATE_RAW) {
      console.log("بوابة اختبار boot: سبق اجتيازها — تخطّي");
    } else {
      console.log(`── اختبار أولي بالملف الأقصر (boot — ${boot.text.length} حرفاً) ──`);
      let ok = false;
      for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
        const buf = await tts(TAG + boot.text, engine.voiceId, engine.model);
        if (buf && buf.length > TEST_GATE_RAW) {
          writeFileSync(bootRaw, buf);
          ok = true;
          console.log(`    ✓ نجح الاختبار — الخام ${(buf.length / 1024).toFixed(1)}KB (> 30KB)`);
        } else {
          console.log(`    ✗ محاولة ${attempt}: الخام ${((buf?.length ?? 0) / 1024).toFixed(1)}KB — غير مقبول`);
          await sleep(1500);
        }
      }
      if (!ok) {
        console.log("  ⚠ الصوت/النموذج الأساسي فشل — البحث عن صوت ذكوري عميق بديل…");
        const fb = voices ? await pickFallbackVoice(voices) : null;
        if (!fb) {
          console.error("✗ لا يوجد صوت بديل — إحباط التوليد");
          process.exit(1);
        }
        engine = { voiceId: fb.voice_id, voiceName: fb.name, model: FALLBACK_MODEL, tagged: false };
        console.log(`  ↻ البديل: ${fb.name} + ${FALLBACK_MODEL} (النص بلا وسم — الوسم خاص بـ v4)`);
        const buf = await tts(boot.text, engine.voiceId, engine.model);
        if (buf && buf.length > OK_RAW_VOICE) {
          writeFileSync(bootRaw, buf);
          console.log(`    ✓ خام البديل ${(buf.length / 1024).toFixed(1)}KB`);
        } else {
          console.error("✗ فشل الصوت البديل أيضاً — إحباط التوليد");
          process.exit(1);
        }
      }
    }
  }

  // ── التسجيلات تسلسلياً (boot أولاً — خامه جاهز الآن) ──
  console.log(`\n── التسجيلات الـ${AUDIO_MANIFEST.length} (ElevenLabs → فلتر هاتف) ──`);
  const order = [...AUDIO_MANIFEST].sort((a, b) => (a.id === "boot" ? -1 : b.id === "boot" ? 1 : 0));
  const stats = { ok: 0, skipped: 0, fail: 0 };
  for (const item of order) {
    const r = await generateRecording(item);
    stats[r]++;
    if (r === "ok" || r === "fail") await sleep(400);
  }

  // ── المؤثرات الرقمية ──
  console.log(`\n── المؤثرات الستة (توليد رقمي خالص — بلا API) ──`);
  const sfxStats = { ok: 0, skipped: 0, fail: 0 };
  for (const s of SFX_DEFS) {
    const out = join(OUT_DIR, s.file);
    if (size(out) > OK_FINAL_SFX) {
      console.log(`  ✓ ${s.file} — موجود وسليم (${(size(out) / 1024).toFixed(1)}KB) — تخطّي`);
      sfxStats.skipped++;
      continue;
    }
    const wav = join(RAW_DIR, s.file + ".wav");
    writeWav(wav, s.synth());
    if (s.encode(wav, out) && size(out) > OK_FINAL_SFX) {
      console.log(`  ✓ ${s.file} — ${(size(out) / 1024).toFixed(1)}KB`);
      sfxStats.ok++;
    } else {
      console.error(`  ✗ ${s.file} — فشل`);
      failures.push(s.file);
      sfxStats.fail++;
    }
  }

  // ── البيان ──
  const manifest = {
    engine: "elevenlabs",
    model: engine.model,
    voiceId: engine.voiceId,
    voiceName: engine.voiceName,
    effect: "phone DSP: highpass 300Hz / lowpass 3400Hz / 8kHz mono / 48kbps",
    generatedAt: new Date().toISOString(),
    recordings: AUDIO_MANIFEST.map((i) => ({
      id: i.id,
      file: i.file,
      feeling: i.feeling,
      effect: i.effect,
      text: i.text,
      voice: i.voice,
      chars: i.text.length,
    })),
    sfx: SFX_DEFS.map((s) => ({ id: s.id, file: s.file, description: s.desc })),
  };
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\n✓ manifest.json (${AUDIO_MANIFEST.length} تسجيلاً + ${SFX_DEFS.length} مؤثرات)`);

  // ── التحقق النهائي (ffprobe) ──
  console.log("\n── التحقق النهائي: المدة والحجم ──");
  const rows: { file: string; dur: string; kb: string }[] = [];
  const check = (file: string, min: number, max: number) => {
    const p = probe(join(OUT_DIR, file));
    if (!p) {
      rows.push({ file, dur: "✗", kb: "✗" });
      failures.push(file);
      return;
    }
    const flag = p.dur < min || p.dur > max ? " ⚠" : "";
    rows.push({ file, dur: `${p.dur.toFixed(2)}s${flag}`, kb: `${(p.size / 1024).toFixed(1)}` });
  };
  for (const i of AUDIO_MANIFEST) check(i.file, 1.5, 35);
  for (const s of SFX_DEFS) check(s.file, 0, 60);
  const w = Math.max(...rows.map((r) => r.file.length));
  for (const r of rows) console.log(`  ${r.file.padEnd(w)}  ${r.dur.padStart(10)}  ${r.kb.padStart(8)}KB`);

  const files = readdirSync(OUT_DIR).length;
  console.log("\n═══════════ الملخص ═══════════");
  console.log(`تسجيلات: ${stats.ok} مولّد جديد + ${stats.skipped} متخطى + ${stats.fail} فاشل (المتوقع 16)`);
  console.log(`مؤثرات: ${sfxStats.ok} مولّد جديد + ${sfxStats.skipped} متخطى + ${sfxStats.fail} فاشل (المتوقع 6)`);
  console.log(`ملفات public/audio: ${files} (المتوقع 23 = 16 + 6 + manifest.json)`);
  console.log(`استهلاك ElevenLabs الفعلي: ${consumedChars} حرفاً عبر ${apiCalls} نداءً (نصوص ${totalChars} + وسوم)`);
  console.log(`المحرك المستخدم: ${engine.voiceName} [${engine.voiceId}] + ${engine.model}${engine.tagged ? " مع وسم [phone quality]" : " (بلا وسم)"}`);
  if (failures.length) {
    console.log(`✗ إخفاقات: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("✓ اكتمل التوليد بنجاح");
}

main().catch((e) => {
  console.error("✗ خطأ غير متوقع:", e);
  process.exit(1);
});

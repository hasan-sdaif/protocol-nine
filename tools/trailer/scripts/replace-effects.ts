// ═══════════════════════════════════════════════════════════
// استبدال مؤثرات ElevenLabs داخل تسجيلات اللعبة بمؤثرات DSP فعلية
// - إعادة توليد نظيفة (بلا وسوم المؤثرات) لـ: intro/finale + 5 أشرطة
// - مزج مؤثرات DSP حقيقية (طرقات/خطوات/صراخ/قلم/نار...) داخل الملفات
// - تطبيق فلتر الوسيط الأصلي (هاتف 8k / شريط 16k)
// - تحديث manifest.json + نسخ إلى أصول التريلر
// بوابة ميزانية صارمة — يعمل مرة واحدة
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, statSync, copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..", "..");
const T = resolve(import.meta.dir, "..");
const GAME_AUDIO = join(ROOT, "public/audio");
const APP = join(T, "assets/audio/app");
const SFXD = join(T, "assets/audio/sfx");
const MANIFEST = join(GAME_AUDIO, "manifest.json");
const MODEL = "eleven_v4";

// ── وسوم تُحذف (مؤثرات ← DSP) مقابل وسوم تبقى (أسلوب أداء) ──
const STRIP_TAGS = /\[(phone ringing|static|soft static|old tape recorder clicks|slow footsteps|distant scream|three slow knocks|pen scratching|fire crackling|tape hiss|beeps|radio static tuning|line cuts|low breathing|keyboard typing|crowd murmur|outdoor wind)\]/g;

// ── إعدادات الأصوات (من فريق اللعبة) ──
const CAST: Record<string, { id: string; settings: Record<string, unknown> }> = {
  brian: { id: "nPczCjzI2devNBz1zQrb", settings: { stability: 0.50, similarity_boost: 0.78, style: 0.15, use_speaker_boost: true, speed: 0.88 } },
  lily: { id: "pFZP5JQG7iQjIQuC4Bku", settings: { stability: 0.30, similarity_boost: 0.80, style: 0.60, use_speaker_boost: true, speed: 0.82 } },
  adam: { id: "pNInz6obpgDQGcFmaJgB", settings: { stability: 0.65, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true, speed: 0.85 } },
  harry: { id: "SOYHLrjzK2X1ezoPC6cr", settings: { stability: 0.25, similarity_boost: 0.70, style: 0.80, use_speaker_boost: true, speed: 0.95 } },
  river: { id: "SAz9YHcvj6GT2YYXdXww", settings: { stability: 0.60, similarity_boost: 0.75, style: 0.10, use_speaker_boost: true, speed: 0.85 } },
  chris: { id: "iP95p4xoKVk53GoZ742B", settings: { stability: 0.50, similarity_boost: 0.78, style: 0.25, use_speaker_boost: true, speed: 0.95 } },
};

interface Layer {
  sfx: string;      // ملف المؤثر في sfx/
  at: number | "frac"; // ثوانٍ مطلقة أو "frac" (موقع الوسم الأصلي نسبياً)
  frac?: number;    // قيمة الكسر إذا at="frac"
  vol: number;
  tag?: string;     // الوسم الذي يحتل موضعه
}
interface Job {
  key: string;      // مفتاح manifest (recordings) أو id (r3_audio)
  file: string;
  voice: string;
  medium: "phone" | "tape";
  section: "recordings" | "r3_audio";
  delay: number;    // تأخير السرد (ثوانٍ) لإفساح مجال للمؤثر الافتتاحي
  layers: Layer[];
}

const JOBS: Job[] = [
  { key: "intro", file: "deep-phone-intro-first-transmission.mp3", voice: "brian", medium: "phone", section: "recordings", delay: 0, layers: [] },
  { key: "finale", file: "deep-phone-finale-you-are-the-ninth.mp3", voice: "brian", medium: "phone", section: "recordings", delay: 0, layers: [] },
  {
    key: "r3-scream", file: "distorted-tape-scream-1998-basement.mp3", voice: "harry", medium: "tape", section: "r3_audio", delay: 0.9,
    layers: [
      { sfx: "recorder-clicks.mp3", at: 0, vol: 0.75 },
      { sfx: "footsteps-slow.mp3", at: "frac", frac: 0.5, vol: 0.5 },
      { sfx: "scream-distant.mp3", at: "frac", frac: 0.72, vol: 0.5 },
    ],
  },
  {
    key: "r3-knocking", file: "tense-tape-knocking-archive-door.mp3", voice: "chris", medium: "tape", section: "r3_audio", delay: 2.6,
    layers: [{ sfx: "knocking-slow.mp3", at: 0, vol: 0.85 }],
  },
  {
    key: "r3-writer", file: "grieving-tape-writer-confession.mp3", voice: "lily", medium: "tape", section: "r3_audio", delay: 0,
    layers: [{ sfx: "pen-scratch.mp3", at: 0.1, vol: 0.4 }],
  },
  {
    key: "r3-heirs", file: "distorted-tape-heirs-fake-warning.mp3", voice: "adam", medium: "tape", section: "r3_audio", delay: 0,
    layers: [{ sfx: "fire-crackle.mp3", at: "frac", frac: 0.68, vol: 0.45 }],
  },
  {
    key: "r3-footsteps", file: "haunted-tape-footsteps-s17-corridor.mp3", voice: "river", medium: "tape", section: "r3_audio", delay: 1.3,
    layers: [{ sfx: "footsteps-slow.mp3", at: 0, vol: 0.7 }],
  },
];

function readEnvKey(): string {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  throw new Error("لا يوجد مفتاح");
}
const KEY = readEnvKey();

function dur(p: string): number {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" });
  const d = parseFloat(r.stdout?.trim() ?? "");
  return isFinite(d) ? d : 0;
}
const run = (cmd: string, args: string[], name: string): boolean => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) { console.error(`  ✗ ${name}: ${String(r.stderr || "").slice(-300)}`); return false; }
  return true;
};

async function tts(text: string, voiceKey: string): Promise<Buffer | null> {
  const c = CAST[voiceKey];
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${c.id}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: c.settings }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) {
    console.error(`  ✗ HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 120)}`);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    recordings: { id: string; file: string; text: string; [k: string]: unknown }[];
    r3_audio: { id: string; file: string; text: string; [k: string]: unknown }[];
    [k: string]: unknown;
  };

  // تجهيز النصوص النظيفة + الميزانية
  const texts = new Map<string, string>();
  const originals = new Map<string, string>();
  for (const j of JOBS) {
    const section = manifest[j.section] as { id: string; file: string; text: string }[];
    const entry = section.find((e) => e.id === j.key)!;
    originals.set(j.key, entry.text);
    const clean = entry.text.replace(STRIP_TAGS, "").replace(/\s{2,}/g, " ").trim();
    texts.set(j.key, clean);
  }
  const totalChars = [...texts.values()].reduce((s, t) => s + t.length, 0);

  const sub = await (await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": KEY } })).json() as { character_count: number; character_limit: number };
  const remaining = sub.character_limit - sub.character_count;
  console.log(`═══ استبدال مؤثرات التسجيلات: ${JOBS.length} ملفاً • ${totalChars} حرفاً • الرصيد ${remaining} ═══`);
  if (totalChars > remaining) { console.error("✗ الرصيد لا يكفي"); process.exit(1); }

  mkdirSync(APP, { recursive: true });
  const outDir = join(T, "out/replaced");
  mkdirSync(outDir, { recursive: true });

  let ok = 0, fail = 0;
  for (const j of JOBS) {
    console.log(`\n▶ ${j.key} [${j.voice}/${j.medium}]`);
    const text = texts.get(j.key)!;
    // 1) توليد نظيف
    let buf = await tts(text, j.voice);
    if (!buf || buf.length < 8 * 1024) {
      await new Promise((r) => setTimeout(r, 1500));
      buf = await tts(text, j.voice);
    }
    if (!buf || buf.length < 8 * 1024) { fail++; continue; }
    const raw = join(outDir, `${j.key}.raw.mp3`);
    writeFileSync(raw, buf);
    // 2) قص الصمت
    const trimmed = join(outDir, `${j.key}.trim.mp3`);
    if (!run("ffmpeg", ["-y", "-v", "quiet", "-i", raw, "-af",
      "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.10,areverse,afade=t=in:st=0:d=0.012",
      "-ar", "44100", "-ac", "1", "-b:a", "160k", trimmed], `trim ${j.key}`)) { fail++; continue; }
    const narrDur = dur(trimmed);
    console.log(`  ✓ سرد نظيف ${narrDur.toFixed(2)}s (${text.length} حرفاً)`);

    // 3) مزج المؤثرات DSP
    const inputs: string[] = [];
    const fc: string[] = [];
    const labels: string[] = [];
    let idx = 0;
    // السرد بتأخير
    inputs.push("-i", trimmed);
    const delayMs = Math.round(j.delay * 1000);
    fc.push(`[0:a]volume=1.0${delayMs > 0 ? `,adelay=${delayMs}|${delayMs}` : ""}[n0]`);
    labels.push("[n0]");
    idx = 1;
    for (const layer of j.layers) {
      const sfxPath = join(SFXD, layer.sfx);
      inputs.push("-i", sfxPath);
      let atSec: number;
      if (layer.at === "frac") {
        atSec = j.delay + (layer.frac ?? 0.5) * narrDur;
      } else {
        atSec = layer.at;
      }
      const ms = Math.max(0, Math.round(atSec * 1000));
      fc.push(`[${idx}:a]volume=${layer.vol},adelay=${ms}|${ms}[e${idx}]`);
      labels.push(`[e${idx}]`);
      idx++;
    }
    let mixedFile = trimmed;
    if (j.layers.length > 0) {
      const mixed = join(outDir, `${j.key}.mixed.wav`);
      fc.push(`${labels.join("")}amix=inputs=${idx}:normalize=0:duration=longest,alimiter=limit=0.95:level=false[m]`);
      if (!run("ffmpeg", ["-y", "-v", "quiet", ...inputs, "-filter_complex", fc.join(";"), "-map", "[m]", "-ar", "44100", "-ac", "1", mixed], `mix ${j.key}`)) { fail++; continue; }
      mixedFile = mixed;
      console.log(`  ✓ مزج ${j.layers.length} مؤثر DSP`);
    }

    // 4) فلتر الوسيط
    const finalTmp = join(outDir, `${j.key}.final.mp3`);
    const af = j.medium === "tape" ? "highpass=f=200,lowpass=f=4800" : "highpass=f=300,lowpass=f=3400";
    const ar = j.medium === "tape" ? "16000" : "8000";
    const br = j.medium === "tape" ? "56k" : "48k";
    if (!run("ffmpeg", ["-y", "-v", "quiet", "-i", mixedFile, "-af", af, "-ar", ar, "-ac", "1", "-b:a", br, finalTmp], `dsp ${j.key}`)) { fail++; continue; }

    // 5) كتابة إلى اللعبة + التريلر
    const gameFile = join(GAME_AUDIO, j.file);
    copyFileSync(finalTmp, gameFile);
    copyFileSync(finalTmp, join(APP, j.file));
    const d = dur(gameFile);
    console.log(`  ✓ ${j.file} — ${d.toFixed(2)}s (استُبدل في اللعبة والتريلر)`);

    // 6) تحديث المانيفست
    const section = manifest[j.section] as { id: string; file: string; text: string; [k: string]: unknown }[];
    const entry = section.find((e) => e.id === j.key)!;
    entry.text = text;
    entry.chars = text.length;
    entry.effectsReplaced = true;
    entry.dspEffects = j.layers.map((l) => l.sfx);
    ok++;
  }

  // حفظ المانيفست
  manifest.effect = "DSP حسب الوسيط: هاتف 300-3400Hz/8kHz mono 48k • شريط 200-4800Hz/16kHz mono 56k • المؤثرات [] مُستبدلة بمؤثرات DSP مُصنَّعة";
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");

  const sub2 = await (await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": KEY } })).json() as { character_count: number; character_limit: number };
  console.log(`\n═══════════ الملخص ═══════════`);
  console.log(`نجح: ${ok} • فشل: ${fail}`);
  console.log(`الاستهلاك: ${sub2.character_count - sub.character_count} حرفاً — المتبقي ${sub2.character_limit - sub2.character_count}`);
  if (fail > 0) process.exit(1);
  console.log("✓ اكتمل استبدال مؤثرات التسجيلات بمؤثرات DSP فعلية");
}

main().catch((e) => { console.error(e); process.exit(1); });

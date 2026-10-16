// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — إعادة توليد كل الأصوات بأصوات متنوعة (15 صوتاً)
// المشكلة: كل التسجيلات الـ38 كانت بصوت رجل واحد (Brian).
// الحل: توزيع أدوار صوتية كامل — الكاتبة ف.م. صوت أنثى (Lily)،
//        الحراس التسعة لكل حارس صوت مختلف، الورثة صوت شرير (Adam)،
//        ذاكرة الأرشيف أنثى (Sarah)، استغاثة أنثى (Laura)... إلخ.
// النصوص تبقى كما هي حرفياً (من manifest.json — مع الحركات والوسوم []).
// الأنابيب: ElevenLabs v4 (eleven_v4) → خام في tools/game/audio-raw/
//        → فلترة DSP حسب الوسيط:
//          • هاتف: highpass 300 / lowpass 3400 / 8kHz mono / 48kbps
//          • شريط: highpass 200 / lowpass 4800 / 16kHz mono / 56kbps (نطاق أغنى)
//        → النهائي في public/audio/ (نفس أسماء الملفات — لا تغيير في الواجهة).
// إعدادات لكل شخصية: stability/similarity/style/speed/use_speaker_boost.
// قابل لإعادة التشغيل: عنصر manifest بمعرّف voice_id المطابق = مُولَّد مسبقاً → تخطّي.
// الميزانية: ~5700 حرفاً من أصل 10000 — بوابة تحقق قبل أي نداء API.
// الاستخدام: bun tools/game/generate-audio-voices.ts
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..");
const RAW_DIR = join(ROOT, "tools/game/audio-raw");
const OUT_DIR = join(ROOT, "public/audio");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");
const TAG = "[phone quality] ";
const MODEL = "eleven_v4";

// ── عتبات الحجم (بايت) ──
const OK_FINAL = 20 * 1024;
const OK_RAW = 20 * 1024;

// ═══ بنك الأصوات (15 صوتاً من مكتبة الحساب الجديد) ═══
interface VoiceDef {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  desc: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  };
}
const VOICES: Record<string, VoiceDef> = {
  brian:   { id: "nPczCjzI2devNBz1zQrb", name: "Brian",   gender: "male",    desc: "Deep, Resonant and Comforting",        settings: { stability: 0.50, similarity_boost: 0.78, style: 0.15, use_speaker_boost: true, speed: 0.88 } },
  lily:    { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily",    gender: "female",  desc: "Velvety Actress",                      settings: { stability: 0.30, similarity_boost: 0.80, style: 0.60, use_speaker_boost: true, speed: 0.82 } },
  sarah:   { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah",   gender: "female",  desc: "Mature, Reassuring, Confident",        settings: { stability: 0.55, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true, speed: 0.95 } },
  adam:    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",    gender: "male",    desc: "Dominant, Firm",                       settings: { stability: 0.65, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true, speed: 0.85 } },
  callum:  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum",  gender: "male",    desc: "Husky Trickster",                      settings: { stability: 0.40, similarity_boost: 0.75, style: 0.50, use_speaker_boost: true, speed: 0.90 } },
  harry:   { id: "SOYHLrjzK2X1ezoPC6cr", name: "Harry",   gender: "male",    desc: "Fierce Warrior, rough",                settings: { stability: 0.25, similarity_boost: 0.70, style: 0.80, use_speaker_boost: true, speed: 0.95 } },
  roger:   { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger",   gender: "male",    desc: "Laid-Back, Casual, Resonant",          settings: { stability: 0.35, similarity_boost: 0.72, style: 0.60, use_speaker_boost: true, speed: 0.92 } },
  laura:   { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura",   gender: "female",  desc: "Enthusiast, Quirky Attitude",          settings: { stability: 0.40, similarity_boost: 0.75, style: 0.50, use_speaker_boost: true, speed: 1.05 } },
  eric:    { id: "cjVigY5qzO86Huf0OWal", name: "Eric",    gender: "male",    desc: "Smooth, Trustworthy",                  settings: { stability: 0.50, similarity_boost: 0.78, style: 0.25, use_speaker_boost: true, speed: 1.00 } },
  george:  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George",  gender: "male",    desc: "Warm, Captivating Storyteller",         settings: { stability: 0.50, similarity_boost: 0.78, style: 0.20, use_speaker_boost: true, speed: 0.90 } },
  alice:   { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",   gender: "female",  desc: "Clear, Engaging Educator",              settings: { stability: 0.55, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true, speed: 0.95 } },
  daniel:  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",  gender: "male",    desc: "Steady Broadcaster",                   settings: { stability: 0.60, similarity_boost: 0.82, style: 0.15, use_speaker_boost: true, speed: 0.95 } },
  matilda: { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female",  desc: "Knowledgable, Professional",           settings: { stability: 0.50, similarity_boost: 0.78, style: 0.30, use_speaker_boost: true, speed: 1.00 } },
  river:   { id: "SAz9YHcvj6GT2YYXdXww", name: "River",   gender: "neutral", desc: "Relaxed, Neutral, Informative",         settings: { stability: 0.60, similarity_boost: 0.75, style: 0.10, use_speaker_boost: true, speed: 0.85 } },
  chris:   { id: "iP95p4xoKVk53GoZ742B", name: "Chris",   gender: "male",    desc: "Charming, Down-to-Earth",               settings: { stability: 0.50, similarity_boost: 0.78, style: 0.25, use_speaker_boost: true, speed: 0.95 } },
};

// ═══ توزيع الأدوار: 38 ملفاً صوتياً ═══
interface CastItem {
  file: string;
  voice: keyof typeof VOICES;
  medium: "phone" | "tape";
  character: string;
}
const CAST: CastItem[] = [
  // ── الوسيط — Brian (النظام الهاتفي الرئيسي) ──
  { file: "deep-phone-boot-secure-line.mp3",             voice: "brian",  medium: "phone", character: "الوسيط" },
  { file: "deep-phone-intro-first-transmission.mp3",     voice: "brian",  medium: "phone", character: "الوسيط" },
  { file: "deep-phone-recruit-welcome.mp3",              voice: "brian",  medium: "phone", character: "الوسيط" },
  { file: "deep-phone-p9-threshold.mp3",                 voice: "brian",  medium: "phone", character: "الحارس التاسع — الوسيط" },
  { file: "tense-phone-breach-warning.mp3",              voice: "brian",  medium: "phone", character: "الوسيط" },
  { file: "deep-phone-guardian-fell.mp3",                voice: "brian",  medium: "phone", character: "الوسيط" },
  { file: "deep-phone-finale-you-are-the-ninth.mp3",     voice: "brian",  medium: "phone", character: "الوسيط" },
  { file: "deep-phone-paths-seven-gates.mp3",            voice: "brian",  medium: "phone", character: "الوسيط" },

  // ── الحراس التسعة — تسعة أصوات مختلفة ──
  { file: "deep-phone-p1-perception.mp3",   voice: "eric",    medium: "phone", character: "الحارس الأول" },
  { file: "deep-phone-p2-shift.mp3",        voice: "george",  medium: "phone", character: "الحارس الثاني" },
  { file: "deep-phone-p3-signal.mp3",       voice: "alice",   medium: "phone", character: "الحارس الثالث (أنثى)" },
  { file: "deep-phone-p4-geography.mp3",    voice: "daniel",  medium: "phone", character: "الحارس الرابع" },
  { file: "deep-phone-p5-weave.mp3",        voice: "matilda", medium: "phone", character: "الحارس الخامس (أنثى)" },
  { file: "deep-phone-p6-concealment.mp3",  voice: "roger",   medium: "phone", character: "الحارس السادس" },
  { file: "deep-phone-p7-numbers.mp3",      voice: "callum",  medium: "phone", character: "الحارس السابع" },
  { file: "deep-phone-p8-layers.mp3",       voice: "adam",    medium: "phone", character: "الحارس الثامن" },

  // ── الكاتبة ف.م. — Lily (أنثى) — طلب المستخدم الصريح ──
  { file: "distorted-tape-fm-lesson-plate.mp3",    voice: "lily", medium: "tape",  character: "الكاتبة ف.م." },
  { file: "grieving-tape-writer-confession.mp3",   voice: "lily", medium: "tape",  character: "الكاتبة ف.م." },
  { file: "whispering-tape-twin-versions.mp3",     voice: "lily", medium: "tape",  character: "الكاتبة ف.م." },
  { file: "deep-phone-plate-transparent.mp3",      voice: "lily", medium: "phone", character: "الكاتبة ف.م." },

  // ── ذاكرة الأرشيف — Sarah (أنثى) ──
  { file: "mysterious-phone-p0-archive-origin.mp3", voice: "sarah", medium: "phone", character: "ذاكرة الأرشيف (أنثى)" },
  { file: "mysterious-phone-manama-diagnosis.mp3",  voice: "sarah", medium: "phone", character: "ذاكرة الأرشيف (أنثى)" },
  { file: "mysterious-phone-hint-intel.mp3",        voice: "sarah", medium: "phone", character: "مصدر مجهول (أنثى)" },

  // ── الوارث — Adam (صوت شرير مهيب) ──
  { file: "distorted-tape-heirs-fake-warning.mp3", voice: "adam", medium: "tape",  character: "الوارث" },
  { file: "tense-phone-sorting-room.mp3",          voice: "adam", medium: "phone", character: "الوارث" },

  // ── الصوت السابع — Callum ──
  { file: "haunted-tape-seventh-voice-echo.mp3", voice: "callum", medium: "tape", character: "الصوت السابع" },

  // ── أشرطة قديمة خشنة/مشوهة — Harry و Roger ──
  { file: "distorted-tape-scream-1998-basement.mp3",    voice: "harry", medium: "tape", character: "شريط القبو ١٩٩٨" },
  { file: "distorted-tape-broadcast-spectrum-room.mp3", voice: "roger", medium: "tape", character: "بث غرفة الطيف" },

  // ── عملاء وعميلات الميدان ──
  { file: "urgent-phone-distress-call-guardian.mp3",   voice: "laura",   medium: "phone", character: "العميلة المجهولة (أنثى)" },
  { file: "cold-phone-quiet-secession.mp3",            voice: "laura",   medium: "phone", character: "العميلة المجهولة (أنثى)" },
  { file: "urgent-phone-field-scan-briefing.mp3",      voice: "eric",    medium: "phone", character: "وكيل الميدان" },
  { file: "tense-tape-knocking-archive-door.mp3",      voice: "chris",   medium: "tape",  character: "شاهد الأرشيف" },
  { file: "mysterious-phone-scan-beacon-confirmed.mp3",voice: "matilda", medium: "phone", character: "شبكة المنارة (أنثى)" },

  // ── متفرقات: نبض/إرساليات/أجواء ──
  { file: "deep-phone-alliance-trust.mp3",       voice: "chris",   medium: "phone", character: "الوسيط المساعد" },
  { file: "mysterious-phone-pulse-daily.mp3",    voice: "river",   medium: "phone", character: "النبض" },
  { file: "deep-phone-isa-town-structure.mp3",   voice: "daniel",  medium: "phone", character: "إرسالية مدينة عيسى" },
  { file: "mysterious-phone-missing-26.mp3",     voice: "matilda", medium: "phone", character: "الوثيقة الغائبة (أنثى)" },
  { file: "haunted-tape-footsteps-s17-corridor.mp3", voice: "river", medium: "tape", character: "ممر S17" },
];

// ═══ حالة التشغيل ═══
let consumedChars = 0;
let apiCalls = 0;
const failures: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readEnvKey(): string | null {
  try {
    const txt = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/);
      if (m && m[1]) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  } catch { /* .env غير موجود */ }
  return null;
}
const KEY = readEnvKey();

function size(p: string): number {
  try { return statSync(p).size; } catch { return 0; }
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
  const r = spawnSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration,size", "-of", "csv=p=0", p], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) return null;
  const [d, s] = r.stdout.trim().split(",");
  const dur = parseFloat(d ?? ""); const sz = parseInt(s ?? "", 10);
  if (!isFinite(dur) || !isFinite(sz)) return null;
  return { dur, size: sz };
}

function probeStream(p: string): { codec: string; rate: string; ch: string } | null {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-select_streams", "a:0", "-show_entries", "stream=codec_name,sample_rate,channels", "-of", "csv=p=0", p], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) return null;
  const [codec, rate, ch] = r.stdout.trim().split(",");
  return { codec: (codec ?? "?").trim(), rate: (rate ?? "?").trim(), ch: (ch ?? "?").trim() };
}

// ═══ ElevenLabs v4 — بصوت وإعدادات محددة ═══
async function tts(text: string, voice: VoiceDef): Promise<Buffer | null> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
    method: "POST",
    headers: { "xi-api-key": KEY ?? "", "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: voice.settings }),
    signal: AbortSignal.timeout(240_000),
  });
  consumedChars += text.length;
  apiCalls++;
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.text()).slice(0, 180); } catch { /* ignore */ }
    console.error(`    ✗ ElevenLabs HTTP ${res.status} ${detail}`);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

async function getSubscription(): Promise<{ used: number; limit: number } | null> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": KEY ?? "" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) { console.error(`✗ GET /v1/user/subscription HTTP ${res.status}`); return null; }
    const d = (await res.json()) as { character_count?: number; character_limit?: number };
    if (typeof d.character_count !== "number" || typeof d.character_limit !== "number") return null;
    return { used: d.character_count, limit: d.character_limit };
  } catch (e) {
    console.error(`✗ تعذر فحص الاشتراك: ${String(e).slice(0, 120)}`);
    return null;
  }
}

// ═══ فلترة DSP حسب الوسيط ═══
function dspFilter(input: string, output: string, medium: "phone" | "tape"): boolean {
  if (medium === "tape") {
    // شريط قديم: نطاق أغنى قليلاً (المؤثرات [] تتنفس أكثر)
    return run("ffmpeg", ["-y", "-i", input, "-af", "highpass=f=200,lowpass=f=4800", "-ar", "16000", "-ac", "1", "-b:a", "56k", output]);
  }
  // هاتف: النطاق الضيق الكلاسيكي
  return run("ffmpeg", ["-y", "-i", input, "-af", "highpass=f=300,lowpass=f=3400", "-ar", "8000", "-ac", "1", "-b:a", "48k", output]);
}

// ═══ manifest.json — قراءة/كتابة مع حقول الصوت الجديدة ═══
type ManifestEntry = {
  id?: string; file: string; feeling?: string; effect?: string; text: string;
  voice?: string; chars?: number; voice_id?: string; gender?: string; character?: string;
};
type Manifest = {
  engine?: string; model?: string; voiceId?: string; voiceName?: string; effect?: string;
  generatedAt?: string; voiceCast?: unknown;
  recordings?: ManifestEntry[]; aa_audio?: ManifestEntry[]; r3_audio?: ManifestEntry[];
  sfx?: unknown; [k: string]: unknown;
};

function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
}

function findEntry(m: Manifest, file: string): { section: string; entry: ManifestEntry } | null {
  for (const section of ["recordings", "aa_audio", "r3_audio"] as const) {
    const arr = m[section];
    if (!Array.isArray(arr)) continue;
    const entry = arr.find((r) => r.file === file);
    if (entry) return { section, entry };
  }
  return null;
}

function saveManifest(m: Manifest): boolean {
  try {
    writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2) + "\n", "utf8");
    JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    return true;
  } catch (e) {
    console.error(`✗ فشل حفظ manifest.json: ${String(e).slice(0, 200)}`);
    return false;
  }
}

// ═══ الرئيسية ═══
async function main(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  if (!KEY) {
    console.error("✗ ELEVENLABS_API_KEY غير موجود في .env — لا يمكن التوليد");
    process.exit(1);
  }

  console.log("═══ إعادة توليد الأصوات المتنوعة — بروتوكول التاسع ═══");
  console.log(`التوزيع: ${CAST.length} ملفاً على ${Object.keys(VOICES).length} صوتاً (الكاتبة ف.م. = Lily أنثى)`);

  const manifest = loadManifest();

  // ── النصوص من manifest (مصدر الحقيقة — بالحركات والوسوم) ──
  interface Job extends CastItem { text: string }
  const jobs: Job[] = [];
  let missing = 0;
  for (const c of CAST) {
    const found = findEntry(manifest, c.file);
    if (!found || !found.entry.text) {
      console.error(`✗ نص مفقود في manifest: ${c.file}`);
      failures.push(c.file);
      missing++;
      continue;
    }
    jobs.push({ ...c, text: found.entry.text });
  }
  if (missing > 0) {
    console.error(`✗ ${missing} ملفاً بلا نص — إحباط (manifest تالف؟)`);
    process.exit(1);
  }

  // ── الرصيد (GET مجاني) ──
  const sub = await getSubscription();
  if (!sub) { console.error("✗ تعذر التحقق من الرصيد — إحباط قبل أي استهلاك"); process.exit(1); }
  const remaining = sub.limit - sub.used;
  console.log(`الرصيد: ${remaining} حرفاً متاحاً (${sub.used}/${sub.limit})`);

  // ── بوابة الميزانية: ما سيُرسل فعلياً في هذا التشغيل ──
  const pending = jobs.filter((j) => {
    const found = findEntry(manifest, j.file);
    const alreadyNew = found?.entry.voice_id === VOICES[j.voice].id;
    if (alreadyNew && size(join(OUT_DIR, j.file)) > OK_FINAL) return false; // مكتمل
    if (alreadyNew && size(join(RAW_DIR, j.file + ".raw.mp3")) > OK_RAW) return false; // خام جاهز (فلترة فقط)
    return true;
  });
  const plannedApi = pending.reduce((s, j) => {
    const spoken = j.medium === "phone" && !j.text.startsWith("[") ? TAG + j.text : j.text;
    return s + spoken.length;
  }, 0);
  console.log(`عناصر ستستهلك API في هذا التشغيل: ${pending.length} — أحرف مخططة: ${plannedApi}`);
  if (plannedApi > remaining) {
    console.error(`✗ الرصيد (${remaining}) لا يكفي (${plannedApi}) — إحباط`);
    process.exit(1);
  }

  const stats = { ok: 0, skipped: 0, refiltered: 0, fail: 0 };

  for (const job of jobs) {
    const voice = VOICES[job.voice];
    const finalPath = join(OUT_DIR, job.file);
    const rawPath = join(RAW_DIR, job.file + ".raw.mp3");
    const found = findEntry(manifest, job.file);
    const entry = found!.entry;
    const alreadyNew = entry.voice_id === voice.id;

    // (أ) مكتمل بالفعل بالصوت الجديد وسليم
    if (alreadyNew && size(finalPath) > OK_FINAL) {
      console.log(`  ✓ ${job.file} — ${voice.name} (${job.character}) — موجود وسليم — تخطّي`);
      stats.skipped++;
      continue;
    }

    // (ب) خام الصوت الجديد موجود (تشغيل سابق انقطع) → فلترة فقط بلا API
    if (alreadyNew && size(rawPath) > OK_RAW) {
      console.log(`  ♻ ${job.file} — خام ${voice.name} موجود → فلترة فقط`);
      if (!dspFilter(rawPath, finalPath, job.medium)) { stats.fail++; failures.push(job.file); continue; }
      stats.refiltered++;
      continue;
    }

    // (ج) توليد جديد — حذف الخام القديم (صوت الرجل الواحد) أولاً
    if (size(rawPath) > 0) rmSync(rawPath);
    const spoken = job.medium === "phone" && !job.text.startsWith("[") ? TAG + job.text : job.text;
    console.log(`  ▶ ${job.file} — ${voice.name} (${voice.gender}) كـ «${job.character}» — ${spoken.length} حرفاً`);

    let buf = await tts(spoken, voice);
    if (!buf || buf.length <= OK_RAW) {
      console.log("    ↻ فشل — إعادة محاولة واحدة…");
      await sleep(2000);
      buf = await tts(spoken, voice);
    }
    if (!buf || buf.length <= OK_RAW) {
      console.error("    ✗ فشل التوليد بعد المحاولتين");
      stats.fail++; failures.push(job.file);
      continue;
    }
    writeFileSync(rawPath, buf);
    console.log(`    خام ElevenLabs: ${(buf.length / 1024).toFixed(1)}KB`);

    if (!dspFilter(rawPath, finalPath, job.medium)) {
      stats.fail++; failures.push(job.file);
      continue;
    }
    const fsz = size(finalPath);
    console.log(`    نهائي (${job.medium === "tape" ? "فلتر شريط 16kHz" : "فلتر هاتف 8kHz"}): ${(fsz / 1024).toFixed(1)}KB`);
    if (fsz <= OK_FINAL) { stats.fail++; failures.push(job.file); continue; }

    // تحديث فوري للـ manifest (استئناف آمن بعد أي انقطاع)
    entry.voice = `${voice.name} — ${job.character} (${voice.gender === "female" ? "أنثى" : voice.gender === "male" ? "ذكر" : "محايد"})`;
    entry.voice_id = voice.id;
    entry.gender = voice.gender;
    entry.character = job.character;
    if (!saveManifest(manifest)) failures.push("manifest.json");

    stats.ok++;
    await sleep(500);
  }

  // ── تحديث رأس الـ manifest: فريق الأصوات ──
  manifest.voiceId = "multi";
  manifest.voiceName = `فريق أصوات متنوع — ${Object.keys(VOICES).length} صوتاً (الكاتبة ف.م. أنثى)`;
  manifest.effect = "DSP حسب الوسيط: هاتف 300-3400Hz/8kHz mono 48k • شريط 200-4800Hz/16kHz mono 56k";
  manifest.generatedAt = new Date().toISOString();
  manifest.voiceCast = Object.entries(VOICES).map(([key, v]) => ({
    key,
    voice_id: v.id,
    name: v.name,
    gender: v.gender,
    description: v.desc,
    settings: v.settings,
    files: CAST.filter((c) => c.voice === key).map((c) => c.file),
  }));
  if (!saveManifest(manifest)) failures.push("manifest.json");

  // ── الرصيد بعد التوليد ──
  if (apiCalls > 0) {
    await sleep(6000); // انتظار استقرار العدّاد
    const subAfter = await getSubscription();
    if (subAfter) {
      console.log(`\nالاستهلاك الفعلي: ${subAfter.used - sub.used} حرفاً — المتبقي: ${subAfter.limit - subAfter.used}/${subAfter.limit}`);
    }
  }

  // ── التحقق النهائي ──
  console.log("\n── التحقق النهائي: الصوت / المدة / الجودة ──");
  const rows: string[] = [];
  for (const job of jobs) {
    const p = probe(join(OUT_DIR, job.file));
    const s = probeStream(join(OUT_DIR, job.file));
    const v = VOICES[job.voice];
    if (!p || !s) {
      rows.push(`  ✗ ${job.file} — تالف`);
      if (!failures.includes(job.file)) failures.push(job.file);
      continue;
    }
    const bad = s.codec !== "mp3" || p.dur < 2 || p.dur > 60;
    rows.push(`  ${job.file.padEnd(48)} ${v.name.padEnd(8)} ${p.dur.toFixed(1).padStart(5)}s ${(p.size / 1024).toFixed(0).padStart(4)}KB ${s.rate.padStart(5)}Hz ${bad ? "⚠" : "✓"}`);
    if (bad && !failures.includes(job.file)) failures.push(job.file);
  }
  for (const r of rows) console.log(r);

  const mp3Count = readdirSync(OUT_DIR).filter((f) => f.endsWith(".mp3")).length;
  console.log("\n═══════════ الملخص ═══════════");
  console.log(`جديد: ${stats.ok} • فلترة فقط: ${stats.refiltered} • متخطى: ${stats.skipped} • فاشل: ${stats.fail} (المتوقع ${CAST.length})`);
  console.log(`ملفات MP3 في public/audio: ${mp3Count} (المتوقع 44)`);
  console.log(`الأحرف المُرسلة: ${consumedChars} عبر ${apiCalls} نداء API`);
  const femaleCount = CAST.filter((c) => VOICES[c.voice].gender === "female").length;
  console.log(`توزيع النوع: ${femaleCount} أنثى / ${CAST.length - femaleCount} ذكر-محايد عبر ${Object.keys(VOICES).length} صوتاً`);
  if (failures.length) { console.log(`✗ إخفاقات: ${failures.join(", ")}`); process.exit(1); }
  console.log("✓ اكتملت إعادة التوليد بأصوات متنوعة — الكاتبة ف.م. الآن صوت أنثى");
}

main().catch((e) => { console.error("✗ خطأ غير متوقع:", e); process.exit(1); });

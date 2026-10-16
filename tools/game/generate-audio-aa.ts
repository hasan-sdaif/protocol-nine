// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — مولّد أصوات «أرشيف الغائبين» (المهمة E-a)
// 9 تسجيلات جديدة: ElevenLabs v4 + وسم [phone quality] → ffmpeg فلتر هاتف → public/audio
// نفس نمط generate-audio.ts المُثبت: صوت nPczCjzI2devNBz1zQrb (Brian)، stability 0.42 / similarity 0.75.
// قابل لإعادة التشغيل بأمان: يتخطى الملف النهائي السليم دون أي استهلاك API،
// ويعيد استخدام الخام المحفوظ في tools/game/audio-raw/ (متجاهَل بـ git).
// يحدّث manifest.json بإضافة مفتاح "aa_audio" فقط — دون المساس بأي محتوى قائم.
// الاستخدام: bun tools/game/generate-audio-aa.ts
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..");
const RAW_DIR = join(ROOT, "tools/game/audio-raw");
const OUT_DIR = join(ROOT, "public/audio");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");
const TAG = "[phone quality] ";

const VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian — Deep, Resonant and Comforting
const VOICE_NAME_FALLBACK = "Brian - Deep, Resonant and Comforting";
const MODEL = "eleven_v4";

// عتبات الحجم (بايت) — كما في السكربت المُثبت generate-audio.ts
const OK_FINAL_VOICE = 20 * 1024; // تسجيل نهائي سليم → تخطّي (idempotent)
const OK_RAW_VOICE = 20 * 1024; // خام سليم (يُعاد استخدامه بلا API)

// ── حالة التشغيل ──
let consumedChars = 0; // الأحرف الفعلية المستهلكة لدى ElevenLabs
let apiCalls = 0;
const failures: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ═══ تعريف التسجيلات التسعة (نصوص حرفية — لا تُعدَّل كلمة واحدة) ═══
interface AaItem {
  id: string;
  file: string;
  feeling: string;
  effect: string;
  text: string;
}

const AA_AUDIO: AaItem[] = [
  {
    id: "aa-p0-archive-origin",
    file: "mysterious-phone-p0-archive-origin.mp3",
    feeling: "غامض",
    effect: "هاتف",
    text: "قبل البروتوكولات التسعة... كان هناك الأرشيف. عام ألفين وأربعة وُلد مشروع الطيف في صمت... وفتاة تعرفها الوثائق بالحرفين ف.م. نسخت كل وثيقة وخبأتها حيث يعني لها كل مكان شيئاً. أربع بوابات صغيرة تفصلك عن الحقيقة الأولى. القيصر هنا يتكلم العربية... بإزاحة أربع. ابدأ من البذرة.",
  },
  {
    id: "aa-alliance-trust",
    file: "deep-phone-alliance-trust.mp3",
    feeling: "عميق",
    effect: "هاتف",
    text: "الحلف يُبنى على الثقة... والثقة تُختبر بالمعلومة. شارك ما يكفي... واحتفظ بما يزيد. حين تفكر في الانفصال... اجعله هادئاً.",
  },
  {
    id: "aa-pulse-daily",
    file: "mysterious-phone-pulse-daily.mp3",
    feeling: "غامض",
    effect: "هاتف",
    text: "الأرشيف ينبض كل يوم مرة. إشارة قصيرة لمن يراقب. فكّها اليوم... أو انتظر نبضة الغد.",
  },
  {
    id: "aa-plate-transparent",
    file: "deep-phone-plate-transparent.mp3",
    feeling: "عميق",
    effect: "هاتف",
    text: "الصفيحة الشفافة تكشف ما بين السطور. بعض الوثائق تحمل طبقة ثانية لا تُقرأ إلا بمن يملكها. اقتنها بالنقاط... إن استحققتها.",
  },
  {
    id: "aa-sorting-room",
    file: "tense-phone-sorting-room.mp3",
    feeling: "متوتر",
    effect: "هاتف",
    text: "ليست كل وثيقة وُضعت لأجلك. الورثة يزيفون بذكاء: رمز ينحرف بحرف... وتاريخ لا يستقيم. فرّز بعين الباحث... لا بعين المتعجل.",
  },
  {
    id: "aa-isa-town-structure",
    file: "deep-phone-isa-town-structure.mp3",
    feeling: "عميق",
    effect: "هاتف",
    text: "في مدينة عيسى أجرى الطيف تجربته الهندسية: نماذج تُبنى بتعليمات ناقصة عمداً... ليكشف النقص كيف يتصرف العقل أمام المعلومة الناقصة.",
  },
  {
    id: "aa-manama-diagnosis",
    file: "mysterious-phone-manama-diagnosis.mp3",
    feeling: "غامض",
    effect: "هاتف",
    text: "في المنامة سُئل أناس عن تشخيصات متضاربة لأجسادهم. حين يتعلق القرار بالجسد... ينكشف أعمق منطق وأضعفه.",
  },
  {
    id: "aa-quiet-secession",
    file: "cold-phone-quiet-secession.mp3",
    feeling: "بارد",
    effect: "هاتف",
    text: "أحد الأعضاء اختار مسار الوحيد. لا تسألوا من. استمروا.",
  },
  {
    id: "aa-missing-26",
    file: "mysterious-phone-missing-26.mp3",
    feeling: "غامض",
    effect: "هاتف",
    text: "الوثيقة الغائبة لم تُخفَ في الظلام. كانت دائماً في وضح النهار. ستة وعشرون... رقم النقص في قلب الكمال.",
  },
];

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

function probeStream(p: string): { rate: string; ch: string } | null {
  const r = spawnSync(
    "ffprobe",
    ["-v", "quiet", "-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels", "-of", "csv=p=0", p],
    { encoding: "utf8" },
  );
  if (r.status !== 0 || !r.stdout) return null;
  const [rate, ch] = r.stdout.trim().split(",");
  return { rate: (rate ?? "?").trim(), ch: (ch ?? "?").trim() };
}

// ═══ ElevenLabs ════════════════════════════════════════════
async function tts(text: string): Promise<Buffer | null> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": KEY ?? "", "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: MODEL,
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

// فحص مسبق مجاني (GET لا يستهلك أحرفاً): صلاحية المفتاح واسم الصوت
async function preflightVoice(): Promise<string> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": KEY ?? "" },
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status === 401 || res.status === 403) {
      console.error(`✗ مفتاح API مرفوض (HTTP ${res.status}) — إحباط قبل أي استهلاك`);
      process.exit(1);
    }
    if (!res.ok) {
      console.warn(`⚠ تعذر جلب قائمة الأصوات (HTTP ${res.status}) — المواصلة بالصوت المثبت`);
      return VOICE_NAME_FALLBACK;
    }
    const data = (await res.json()) as { voices?: { voice_id: string; name: string }[] };
    const v = data.voices?.find((x) => x.voice_id === VOICE_ID);
    return v?.name ?? VOICE_NAME_FALLBACK;
  } catch (e) {
    console.warn(`⚠ تعذر الوصول لقائمة الأصوات: ${String(e).slice(0, 120)} — المواصلة بالصوت المثبت`);
    return VOICE_NAME_FALLBACK;
  }
}

// ═══ ffmpeg: فلتر الهاتف ═══════════════════════════════════
function phoneFilter(input: string, output: string): boolean {
  return run("ffmpeg", [
    "-y", "-i", input,
    "-af", "highpass=f=300,lowpass=f=3400",
    "-ar", "8000", "-ac", "1", "-b:a", "48k",
    output,
  ]);
}

// ═══ توليد تسجيل واحد (بحدّ محاولتين اثنتين) ═══════════════
async function generateRecording(item: AaItem): Promise<"ok" | "skipped" | "fail"> {
  const finalPath = join(OUT_DIR, item.file);
  if (size(finalPath) > OK_FINAL_VOICE) {
    console.log(`  ✓ ${item.file} — موجود وسليم (${(size(finalPath) / 1024).toFixed(1)}KB) — تخطّي`);
    return "skipped";
  }
  console.log(`  ▶ ${item.id} → ${item.file} (${item.text.length} حرفاً منطوقاً)`);
  const rawPath = join(RAW_DIR, item.file + ".raw.mp3");
  if (size(rawPath) <= OK_RAW_VOICE) {
    const text = TAG + item.text;
    let buf = await tts(text);
    if (!buf || buf.length <= OK_RAW_VOICE) {
      console.log("    ↻ فشل مؤكد — إعادة محاولة واحدة أخيرة…");
      await sleep(1500);
      buf = await tts(text);
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

// ═══ تحديث manifest.json: مفتاح aa_audio فقط ═══════════════
function updateManifest(items: AaItem[]): boolean {
  try {
    const existing = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Record<string, unknown>;
    existing.aa_audio = items.map((i) => ({
      id: i.id,
      file: i.file,
      feeling: i.feeling,
      effect: i.effect,
      text: i.text,
      voice: "deep male",
      chars: i.text.length,
    }));
    writeFileSync(MANIFEST_PATH, JSON.stringify(existing, null, 2) + "\n", "utf8");
    return true;
  } catch (e) {
    console.error(`✗ فشل تحديث manifest.json: ${String(e).slice(0, 200)}`);
    return false;
  }
}

// ═══ الرئيسية ══════════════════════════════════════════════
async function main(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  if (!KEY) {
    console.error("✗ ELEVENLABS_API_KEY غير موجود في .env — لا يمكن توليد التسجيلات");
    process.exit(1);
  }

  const spokenChars = AA_AUDIO.reduce((s, i) => s + i.text.length, 0);
  const billedChars = spokenChars + AA_AUDIO.length * TAG.length;
  console.log("═══ مولّد أصوات أرشيف الغائبين — بروتوكول التاسع (E-a) ═══");
  console.log(`التسجيلات: ${AA_AUDIO.length} • أحرف النصوص المنطوقة: ${spokenChars} • المتوقع فوترته: ~${billedChars} (نصوص + وسوم)`);

  const voiceName = await preflightVoice();
  console.log(`الصوت: ${voiceName} [${VOICE_ID}] + ${MODEL} (وسم [phone quality])`);

  // ── التسجيلات تسلسلياً ──
  console.log(`\n── التسجيلات الـ${AA_AUDIO.length} (ElevenLabs → فلتر هاتف) ──`);
  const stats = { ok: 0, skipped: 0, fail: 0 };
  const done: AaItem[] = [];
  for (const item of AA_AUDIO) {
    const r = await generateRecording(item);
    stats[r]++;
    if (r !== "fail") done.push(item);
    if (r === "ok" || r === "fail") await sleep(400);
  }

  // ── manifest.json: إضافة aa_audio دون المساس بالقائم ──
  if (updateManifest(done)) {
    console.log(`\n✓ manifest.json — أُضيف مفتاح "aa_audio" بـ${done.length} تسجيلاً (بقية المحتوى كما هي)`);
  } else {
    failures.push("manifest.json");
  }

  // ── التحقق النهائي (ffprobe): المدة + 8000Hz + mono ──
  console.log("\n── التحقق النهائي: المدة / معدل العينة / القنوات ──");
  const rows: { file: string; dur: string; rate: string; ch: string; kb: string }[] = [];
  for (const i of AA_AUDIO) {
    const p = probe(join(OUT_DIR, i.file));
    const s = probeStream(join(OUT_DIR, i.file));
    if (!p || !s) {
      rows.push({ file: i.file, dur: "✗", rate: "✗", ch: "✗", kb: "✗" });
      if (!failures.includes(i.file)) failures.push(i.file);
      continue;
    }
    const flag = p.dur < 1.5 || p.dur > 40 || s.rate !== "8000" || s.ch !== "1" ? " ⚠" : "";
    rows.push({
      file: i.file,
      dur: `${p.dur.toFixed(2)}s${flag}`,
      rate: s.rate,
      ch: s.ch,
      kb: `${(p.size / 1024).toFixed(1)}`,
    });
  }
  const w = Math.max(...rows.map((r) => r.file.length));
  for (const r of rows) {
    console.log(`  ${r.file.padEnd(w)}  ${r.dur.padStart(9)}  ${r.rate.padStart(6)}Hz  ${r.ch.padStart(2)}ch  ${r.kb.padStart(8)}KB`);
  }

  const mp3Count = readdirSync(OUT_DIR).filter((f) => f.endsWith(".mp3")).length;
  console.log("\n═══════════ الملخص ═══════════");
  console.log(`تسجيلات AA: ${stats.ok} مولّد جديد + ${stats.skipped} متخطى + ${stats.fail} فاشل (المتوقع 9)`);
  console.log(`ملفات MP3 في public/audio: ${mp3Count} (المتوقع 31 = 22 قائمة [16 صوت + 6 مؤثرات] + 9 جديدة + manifest.json)`);
  console.log(`استهلاك ElevenLabs الفعلي: ${consumedChars} حرفاً عبر ${apiCalls} نداءً (نصوص ${spokenChars} + وسوم)`);
  if (failures.length) {
    console.log(`✗ إخفاقات: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("✓ اكتمل توليد أرشيف الغائبين بنجاح");
}

main().catch((e) => {
  console.error("✗ خطأ غير متوقع:", e);
  process.exit(1);
});

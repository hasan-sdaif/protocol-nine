// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — مولّد أصوات المهمة 3-a (أرشيف R3)
// الجزء 1: إعادة توليد 3 تسجيلات بنطق مشكَّل (intro / p0 / finale) — نفس الكلمات
//          مع تصحيح الحركات الملتبسة + وسوم مؤثرات [phone ringing]/[static]/[old tape recorder clicks].
// الجزء 2: 13 تسجيلاً جديداً (أشرطة قديمة ومؤثرات: صراخ/خطوات/همس/طرق/تنفس/نار).
// النمط: نفس generate-audio.ts حرفياً — ElevenLabs v4 (eleven_v4) بالصوت nPczCjzI2devNBz1zQrb
//        (Brian) وvoice_settings stability 0.42 / similarity_boost 0.75 → الخام في tools/game/audio-raw/
//        → فلتر هاتف ffmpeg (highpass 300 / lowpass 3400 / 8kHz mono / 48kbps) → النهائي في public/audio/.
// وسم [phone quality] (16 حرفاً): يُضاف بادئةً للعناصر الهاتفية الثلاثة المعاد توليدها،
//        وهو مضمَّن نصاً في العناصر الأربعة الهاتفية الجديدة (الأشرطة التسعة بلا وسم).
// الميزانية: سقف صارم 2600 حرفاً — بوابة تحقق قبل أي نداء API (النصوص + الوسوم + 16×هاتفي).
//        النصوص الأصلية المقترحة كانت 2915 حرفاً فقُلّمت (حذفاً فقط — بلا تغيير كلمة) بدءاً
//        بالأطول حتى استقر المجموع ضمن السقف بكل التفسيرات (انظر المخرجات).
// قابل لإعادة التشغيل بأمان: يتخطى الموجود السليم بلا أي استهلاك API.
//        ملاحظة: قبل أول تشغيل حُذف خام ونهائي intro/p0/finale القديمان يدوياً (وإلا لَتُخطّيا).
// يحدّث manifest.json: نصوص/أحرف intro+finale في «recordings»، p0 في «aa_audio»
//        (يستعيد القسم كاملاً من المصدر المُثبت generate-audio-aa.ts إن كان مفقوداً)،
//        ويضيف مفتاح «r3_audio» بـ13 عنصراً — دون المساس بأي محتوى آخر.
// الاستخدام: bun tools/game/generate-audio-r3.ts
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

const CHAR_CAP = 2600; // سقف الإنفاق الصارم (أحرف)

// عتبات الحجم (بايت) — كما في السكربت المُثبت
const OK_FINAL_VOICE = 20 * 1024;
const OK_RAW_VOICE = 20 * 1024;

// ── حالة التشغيل ──
let consumedChars = 0; // الأحرف المُرسلة فعلياً لدى ElevenLabs
let apiCalls = 0;
const failures: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ═══ الجزء 1 — الثلاثة المعاد توليدها (نفس الكلمات + تشكيل التصحيحات + وسوم) ═══
interface RegenItem {
  id: string;
  file: string;
  text: string;
}
const REGEN_ITEMS: RegenItem[] = [
  {
    id: "intro",
    file: "deep-phone-intro-first-transmission.mp3",
    // تصحيحات: لم يُسمح→لم يُسْمَحْ، ما حُذف لم يختفِ→ما حُذِفَ لم يَخْتَفِ، ما أُحرق لم يمت→ما أُحْرِقَ لم يَمُتْ
    // + [phone ringing] بالبداية و[static] بالنهاية
    text: "[phone ringing] إن كنتَ تسمع هذه الإرسالية... فقد اخترناك. لا تثق بما تعرفه عن جامعتك. تحت كل حجرٍ حرف، وفي كل صوتٍ رقم. تسعةُ حراسٍ يحيطون بسرٍّ لم يُسْمَحْ لأحدٍ بمعرفته. ما حُذِفَ لم يَخْتَفِ. ما أُحْرِقَ لم يَمُتْ. ما نُسي ينتظر من يتذكر. حاول الوصول إلى البروتوكول التاسع. [static]",
  },
  {
    id: "aa-p0-archive-origin",
    file: "mysterious-phone-p0-archive-origin.mp3",
    // تصحيحات: نسخت→نَسَخَتْ، وخبأتها→وَخَبَّأَتْهَا، تعرفها→تَعْرِفُهَا (الكلمة الملتبسة في «وفتاة تعرفها الوثائق»)
    // + [old tape recorder clicks] بالبداية
    text: "[old tape recorder clicks] قبل البروتوكولات التسعة... كان هناك الأرشيف. عام ألفين وأربعة وُلد مشروع الطيف في صمت... وفتاة تَعْرِفُهَا الوثائق بالحرفين ف.م. نَسَخَتْ كل وثيقة وَخَبَّأَتْهَا حيث يعني لها كل مكان شيئاً. أربع بوابات صغيرة تفصلك عن الحقيقة الأولى. القيصر هنا يتكلم العربية... بإزاحة أربع. ابدأ من البذرة.",
  },
  {
    id: "finale",
    file: "deep-phone-finale-you-are-the-ninth.mp3",
    // تصحيحات: لم يختفِ→لم يَخْتَفِ، لم يمت→لم يَمُتْ + [phone ringing] بالبداية و[static] بالنهاية
    text: "[phone ringing] الآن فهمت. البروتوكولات التسعة لم تختبر أحداً قبلك... بل اختبرتك أنت. منذ أول إرسالية وأنت داخل المختبر. الكاتبة كتبت: ما حُذف لم يَخْتَفِ، وما أُحرق لم يَمُتْ، وما نُسي ينتظر من يتذكر. أنت التاسع. كنتَ دائماً. اكتب اسمك على الجدار... وانقل الحقيقة. [static]",
  },
];

// ═══ الجزء 2 — التسجيلات الـ13 الجديدة ═══
interface R3Item {
  id: string;
  file: string;
  feeling: string;
  effect: string;
  text: string;
}
const R3_ITEMS: R3Item[] = [
  {
    id: "r3-scream",
    file: "distorted-tape-scream-1998-basement.mp3",
    feeling: "مشوه",
    effect: "شريط قديم + صراخ بعيد + خطوات",
    text: "[old tape recorder clicks] تسجيل واحد... تسعة وتسعين. القبو تحت مبنى سبعة عشر. [slow footsteps] لا تنزلوا بعد الغروب. [distant scream] لا أحد ينزل... بعد اليوم.",
  },
  {
    id: "r3-footsteps",
    file: "haunted-tape-footsteps-s17-corridor.mp3",
    feeling: "مسكون",
    effect: "خطوات + همهمة بعيدة",
    text: "[slow footsteps] [distant humming] خطوات في ممر القاعات... بعد منتصف الليل. [whispers] توقفت عند الباب... ولم تصل أبداً.",
  },
  {
    id: "r3-distress",
    file: "urgent-phone-distress-call-guardian.mp3",
    feeling: "عاجل",
    effect: "هاتف + قطع خط",
    text: "[phone quality] اسمعني بسرعة. الحارس... ليس منّا. انقل الوثيقة قبل أن يصحو الجدار. لا تتصل بهذا الرقم مرة أخرى. [line cuts]",
  },
  {
    id: "r3-fm-plate",
    file: "distorted-tape-fm-lesson-plate.mp3",
    feeling: "مشوه",
    effect: "شريط قديم + همس",
    text: "[old tape recorder clicks] أنا ف.م. الصفيحة ليست أداة... إنها عين. [whispers] ضعها فوق الصفحة... وشاهد ما بين السطور يَتَنَفَّس.",
  },
  {
    id: "r3-seventh-voice",
    file: "haunted-tape-seventh-voice-echo.mp3",
    feeling: "مسكون",
    effect: "تنفس منخفض + وقفة طويلة",
    text: "[low breathing] عدّوا الأصوات في الأرشيف... ستجدون ستة. [long pause] أنا السابع. [whispers] ما نُسِيَ... يَنْتَظِر.",
  },
  {
    id: "r3-writer",
    file: "grieving-tape-writer-confession.mp3",
    feeling: "حزين",
    effect: "بكاء + خربشة قلم",
    text: "[soft crying] [pen scratching] أنا الكاتبة... نَسَخْتُ كل شيء وَخَبَّأْتُهُ. الحقيقة التي تُدْفَن... تخرج من الشقّ. سامحوني.",
  },
  {
    id: "r3-spectrum",
    file: "distorted-tape-broadcast-spectrum-room.mp3",
    feeling: "مشوه",
    effect: "بث راديوي مشوه",
    text: "[radio static tuning] غرفة الطيف. [distorted voice] التجربة الثالثة بدأت دون موافقة أحد. إن سمعتم هذا... فالصدى وصل قبلكم.",
  },
  {
    id: "r3-knocking",
    file: "tense-tape-knocking-archive-door.mp3",
    feeling: "متوتر",
    effect: "طرق على باب + صمت عميق",
    text: "[three slow knocks] طرق على باب الأرشيف كل ليلة جمعة. مقفل منذ ألفين وثمانية. [deep silence] لا أحد يفتح... ولا أحد يقف خلفه. [whispers] تقريباً.",
  },
  {
    id: "r3-beacon",
    file: "mysterious-phone-scan-beacon-confirmed.mp3",
    feeling: "غامض",
    effect: "هاتف + نغمات",
    text: "[phone quality] إشارة مؤكدة. البوصلة تَرَاك الآن. [beeps] الشبكة تتذكر من يمسح وما يمسح. واصل.",
  },
  {
    id: "r3-field-scan",
    file: "urgent-phone-field-scan-briefing.mp3",
    feeling: "عاجل",
    effect: "هاتف",
    text: "[phone quality] وكيل، الأكواد منتشرة في الحرم. كل رمز يحرس معلومة... أو اختباراً. وجّه الكاميرا... ودع الشبكة تقودك.",
  },
  {
    id: "r3-gates",
    file: "deep-phone-paths-seven-gates.mp3",
    feeling: "عميق",
    effect: "هاتف",
    text: "[phone quality] سبع بوابات... سبعة مسارات. كل مسار يفتح باباً لا يعرفه حتى الوسيط. المفاتيح مبعثرة في الحكايات. ابدأ... وستُرى.",
  },
  {
    id: "r3-twin",
    file: "whispering-tape-twin-versions.mp3",
    feeling: "هامس",
    effect: "همس + أزيز شريط",
    text: "[whispers] نسختان... لعام واحد. إحداهما تكذب على الأخرى. اقرأهما معاً... وستَرَى الشقّ. [tape hiss]",
  },
  {
    id: "r3-heirs",
    file: "distorted-tape-heirs-fake-warning.mp3",
    feeling: "مشوه",
    effect: "صوت منخفض مشوه + طقطقة نار",
    text: "[distorted low voice] نحن الورثة. لا تنشروا ما لا تملكون. الوثائق التي بين أيديكم كتبناها. [fire crackling] انسحبوا... وأنتم قادرون.",
  },
];

// ═══ نصوص aa_audio الثمانية غير المتغيرة (المصدر المُثبت generate-audio-aa.ts)
//        لاستعادة قسم aa_audio في manifest.json إن كان مفقوداً (كما هو الحال — كُتب فوقه
//        بإعادة توليد p9 في R2-F) مع p0 المحدَّث ═══
const AA_OTHER: { id: string; file: string; feeling: string; effect: string; text: string }[] = [
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

function probeStream(p: string): { codec: string; rate: string; ch: string } | null {
  const r = spawnSync(
    "ffprobe",
    ["-v", "quiet", "-select_streams", "a:0", "-show_entries", "stream=codec_name,sample_rate,channels", "-of", "csv=p=0", p],
    { encoding: "utf8" },
  );
  if (r.status !== 0 || !r.stdout) return null;
  const [codec, rate, ch] = r.stdout.trim().split(",");
  return { codec: (codec ?? "?").trim(), rate: (rate ?? "?").trim(), ch: (ch ?? "?").trim() };
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

// فحص الاشتراك (GET مجاني لا يستهلك أحرفاً)
async function getSubscription(): Promise<{ used: number; limit: number } | null> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": KEY ?? "" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.error(`✗ GET /v1/user/subscription HTTP ${res.status}`);
      return null;
    }
    const d = (await res.json()) as { character_count?: number; character_limit?: number };
    if (typeof d.character_count !== "number" || typeof d.character_limit !== "number") return null;
    return { used: d.character_count, limit: d.character_limit };
  } catch (e) {
    console.error(`✗ تعذر فحص الاشتراك: ${String(e).slice(0, 120)}`);
    return null;
  }
}

// فحص الاشتراك (GET مجاني لا يستهلك أحرفاً) — مع استقرار القراءة (العدّاد يتأخر أحياناً)
async function pollSubscription(): Promise<{ used: number; limit: number } | null> {
  let prev: { used: number; limit: number } | null = null;
  for (let i = 0; i < 4; i++) {
    const s = await getSubscription();
    if (s && prev && s.used === prev.used) return s; // قراءتان متطابقتان → مستقر
    prev = s;
    if (i < 3) await sleep(8000);
  }
  return prev;
}

// فحص مسبق مجاني: صلاحية المفتاح واسم الصوت
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
    if (!res.ok) return VOICE_NAME_FALLBACK;
    const data = (await res.json()) as { voices?: { voice_id: string; name: string }[] };
    return data.voices?.find((x) => x.voice_id === VOICE_ID)?.name ?? VOICE_NAME_FALLBACK;
  } catch {
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
async function generateRecording(
  item: { id: string; file: string },
  spokenText: string,
): Promise<"ok" | "skipped" | "fail"> {
  const finalPath = join(OUT_DIR, item.file);
  if (size(finalPath) > OK_FINAL_VOICE) {
    console.log(`  ✓ ${item.file} — موجود وسليم (${(size(finalPath) / 1024).toFixed(1)}KB) — تخطّي`);
    return "skipped";
  }
  console.log(`  ▶ ${item.id} → ${item.file} (${spokenText.length} حرفاً مُرسلاً)`);
  const rawPath = join(RAW_DIR, item.file + ".raw.mp3");
  if (size(rawPath) <= OK_RAW_VOICE) {
    let buf = await tts(spokenText);
    if (!buf || buf.length <= OK_RAW_VOICE) {
      console.log("    ↻ فشل مؤكد — إعادة محاولة واحدة أخيرة…");
      await sleep(1500);
      buf = await tts(spokenText);
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

// ═══ تحديث manifest.json ═══════════════════════════════════
function updateManifest(): boolean {
  try {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
      recordings?: { id: string; file: string; text: string; chars: number }[];
      aa_audio?: { id: string; file: string; text: string; chars: number }[];
      [k: string]: unknown;
    };

    // 1) intro + finale في «recordings» (النص والأحرف فقط — في مكانيهما الأصليين)
    if (!Array.isArray(m.recordings)) throw new Error("قسم recordings مفقود");
    for (const target of ["deep-phone-intro-first-transmission.mp3", "deep-phone-finale-you-are-the-ninth.mp3"]) {
      const entry = m.recordings.find((r) => r.file === target);
      const src = REGEN_ITEMS.find((x) => x.file === target);
      if (!entry || !src) throw new Error(`تعذر تحديث ${target}`);
      entry.text = src.text;
      entry.chars = src.text.length;
    }

    // 2) p0 في «aa_audio» — إن وُجد القسم حُدِّث في مكانه، وإلا استُعيد كاملاً من المصدر المُثبت
    const p0 = REGEN_ITEMS.find((x) => x.id === "aa-p0-archive-origin")!;
    if (Array.isArray(m.aa_audio)) {
      const entry = m.aa_audio.find((r) => r.file === p0.file);
      if (!entry) throw new Error(`p0 غير موجود في aa_audio`);
      entry.text = p0.text;
      entry.chars = p0.text.length;
    } else {
      const aaAll = [
        { id: p0.id, file: p0.file, feeling: "غامض", effect: "هاتف", text: p0.text },
        ...AA_OTHER,
      ];
      m.aa_audio = aaAll.map((i) => ({
        id: i.id,
        file: i.file,
        feeling: i.feeling,
        effect: i.effect,
        text: i.text,
        voice: "deep male",
        chars: i.text.length,
      }));
      console.log("  (استُعيد قسم aa_audio كاملاً من المصدر المُثبت — كان قد فُقد بإعادة توليد p9 في R2-F)");
    }

    // 3) مفتاح «r3_audio» الجديد (13 عنصراً)
    m.r3_audio = R3_ITEMS.map((i) => ({
      id: i.id,
      file: i.file,
      feeling: i.feeling,
      effect: i.effect,
      text: i.text,
      voice: "deep male",
      chars: i.text.length,
    }));

    writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2) + "\n", "utf8");
    // تحقق صلاحية JSON فوري
    JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
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

  console.log("═══ مولّد أصوات R3 — بروتوكول التاسع (3-a) ═══");

  // ── الرصيد (GET مجاني) ──
  const sub = await getSubscription();
  if (!sub) {
    console.error("✗ تعذر التحقق من الرصيد — إحباط قبل أي استهلاك (fail-safe)");
    process.exit(1);
  }
  const remaining = sub.limit - sub.used;
  console.log(`الرصيد الحالي: ${remaining} حرفاً متاحاً (${sub.used}/${sub.limit} مستخدم)`);

  // ── بوابة الميزانية قبل أي نداء API ──
  // (أ) سقف المهمة: مجموع كل النصوص + الوسوم — يُفحص دائماً (خطة المهمة كاملة)
  const sumTexts = [...REGEN_ITEMS, ...R3_ITEMS].reduce((s, i) => s + i.text.length, 0);
  const phoneItems = 7; // 3 معاد توليدها (الوسم بادئة) + 4 جديدة (الوسم داخل النص)
  const billedB = sumTexts + 3 * TAG.length; // ما سيُرسل فعلياً عند التوليد الكامل
  const billedA = sumTexts + phoneItems * TAG.length; // صيغة الحساب القصوى (تتضاعف فيها وسوم النص الأربعة)
  console.log(`أحرف النصوص (16): ${sumTexts} + وسوم [phone quality]: 3×16 بادئةً = ${billedB} عند التوليد الكامل`);
  console.log(`صيغة الحساب القصوى: ${sumTexts} + 7×16 = ${billedA}`);
  if (billedA > CHAR_CAP || billedB > CHAR_CAP) {
    console.error(`✗ تجاوز سقف ${CHAR_CAP} حرفاً (فعلي ${billedB} / أقصى ${billedA}) — قلّم النصوص الأطول وأعد الحساب`);
    process.exit(1);
  }
  // (ب) الرصيد يُقابل ما سيُرسل فعلاً في هذا التشغيل فقط (الجاهز السليم لا يستهلك شيئاً)
  const pending = [...REGEN_ITEMS, ...R3_ITEMS].filter(
    (i) => size(join(OUT_DIR, i.file)) <= OK_FINAL_VOICE && size(join(RAW_DIR, i.file + ".raw.mp3")) <= OK_RAW_VOICE,
  );
  const plannedApi = pending.reduce(
    (s, i) => s + i.text.length + (REGEN_ITEMS.some((r) => r.file === i.file) ? TAG.length : 0),
    0,
  );
  console.log(`عناصر ستتولد فعلاً في هذا التشغيل: ${pending.length} — أحرفها المخططة: ${plannedApi}`);
  if (plannedApi > 0) {
    if (remaining < plannedApi) {
      console.error(`✗ الرصيد (${remaining}) لا يكفي للمخطط (${plannedApi}) — إحباط`);
      process.exit(1);
    }
    console.log(`✓ ضمن السقف الصارم ${CHAR_CAP} (هامش فعلي ${CHAR_CAP - billedB} حرفاً في التوليد الكامل)`);
  } else {
    console.log("✓ كل الملفات جاهزة وسليمة — لن يُستهلك أي حرف (تشغيل idempotent)");
  }

  const voiceName = await preflightVoice();
  console.log(`الصوت: ${voiceName} [${VOICE_ID}] + ${MODEL}`);
  console.log("الوسوم بالأقواس (مثل [distant scream]) تُنطق مؤثراتٍ في v4 ولا تظهر كلاماً");

  // ── الجزء 1: الثلاثة المعاد توليدها (بوسم [phone quality] بادئةً — نمط السكربت المُثبت) ──
  console.log(`\n── الجزء 1: إعادة توليد 3 تسجيلات بالنطق المشكَّل ──`);
  const stats1 = { ok: 0, skipped: 0, fail: 0 };
  for (const item of REGEN_ITEMS) {
    const r = await generateRecording(item, TAG + item.text);
    stats1[r]++;
    if (r === "ok" || r === "fail") await sleep(400);
  }

  // ── الجزء 2: التسجيلات الـ13 الجديدة (نصها يتضمن وسومه — لا بادئة) ──
  console.log(`\n── الجزء 2: التسجيلات الـ13 الجديدة ──`);
  const stats2 = { ok: 0, skipped: 0, fail: 0 };
  for (const item of R3_ITEMS) {
    const r = await generateRecording(item, item.text);
    stats2[r]++;
    if (r === "ok" || r === "fail") await sleep(400);
  }

  // ── manifest.json ──
  if (updateManifest()) {
    console.log(`\n✓ manifest.json: حُدّثت intro/finale في recordings، وp0 في aa_audio، وأُضيف r3_audio (13) — JSON صالح`);
  } else {
    failures.push("manifest.json");
  }

  // ── الرصيد بعد التوليد (إن وُلّد شيء) ──
  if (apiCalls > 0) {
    const subAfter = await pollSubscription();
    if (subAfter) {
      const realUsed = subAfter.used - sub.used;
      console.log(`\nالاستهلاك الفعلي (فرق الاشتراك): ${realUsed} حرفاً — المتبقي: ${subAfter.limit - subAfter.used}/${subAfter.limit}`);
      if (realUsed > CHAR_CAP) {
        console.error(`✗ تجاوز السقف الفعلي: ${realUsed} > ${CHAR_CAP}`);
        failures.push("budget-exceeded");
      }
    } else {
      console.log("\n⚠ تعذر فحص الرصيد بعد التوليد — تحقق يدوياً بـ GET /v1/user/subscription");
    }
  } else {
    console.log("\n0 نداء API في هذا التشغيل — لا استهلاك (فرق الاشتراك المتوقع: 0)");
  }

  // ── التحقق النهائي (ffprobe): mp3 / 8000Hz / 1ch + المدة والحجم ──
  console.log("\n── التحقق النهائي: codec / معدل العينة / القنوات / المدة ──");
  const all = [...REGEN_ITEMS, ...R3_ITEMS];
  const rows: { file: string; dur: string; codec: string; rate: string; ch: string; kb: string }[] = [];
  for (const i of all) {
    const p = probe(join(OUT_DIR, i.file));
    const s = probeStream(join(OUT_DIR, i.file));
    if (!p || !s) {
      rows.push({ file: i.file, dur: "✗", codec: "✗", rate: "✗", ch: "✗", kb: "✗" });
      if (!failures.includes(i.file)) failures.push(i.file);
      continue;
    }
    const bad = s.codec !== "mp3" || s.rate !== "8000" || s.ch !== "1" || p.dur < 2 || p.dur > 45;
    rows.push({
      file: i.file,
      dur: `${p.dur.toFixed(2)}s${bad ? " ⚠" : ""}`,
      codec: s.codec,
      rate: s.rate,
      ch: s.ch,
      kb: `${(p.size / 1024).toFixed(1)}`,
    });
    if (bad && !failures.includes(i.file)) failures.push(i.file);
  }
  const w = Math.max(...rows.map((r) => r.file.length));
  for (const r of rows) {
    console.log(`  ${r.file.padEnd(w)}  ${r.dur.padStart(9)}  ${r.codec.padStart(4)}  ${r.rate.padStart(6)}Hz  ${r.ch.padStart(2)}ch  ${r.kb.padStart(8)}KB`);
  }

  const mp3Count = readdirSync(OUT_DIR).filter((f) => f.endsWith(".mp3")).length;
  console.log("\n═══════════ الملخص ═══════════");
  console.log(`المعاد توليدها: ${stats1.ok} جديد + ${stats1.skipped} متخطى + ${stats1.fail} فاشل (المتوقع 3)`);
  console.log(`الجديدة: ${stats2.ok} جديد + ${stats2.skipped} متخطى + ${stats2.fail} فاشل (المتوقع 13)`);
  console.log(`ملفات MP3 في public/audio: ${mp3Count} (المتوقع 44 = 31 قائمة + 13 جديدة)`);
  console.log(`الأحرف المُرسلة: ${consumedChars} عبر ${apiCalls} نداء API`);
  if (failures.length) {
    console.log(`✗ إخفاقات: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("✓ اكتمل توليد R3 بنجاح");
}

main().catch((e) => {
  console.error("✗ خطأ غير متوقع:", e);
  process.exit(1);
});

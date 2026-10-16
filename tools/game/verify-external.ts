// ═══════════════════════════════════════════════════════════
// التحقق الرياضي الكامل من src/lib/game/content-external.ts
// يُشغَّل بـ: bun tools/game/verify-external.ts
// ═══════════════════════════════════════════════════════════
import {
  b64Decode,
  caesar,
  fromA1Z26,
  fromMorse,
  normalizeAnswer,
  reverseText,
  toA1Z26,
  toMorse,
  vigenere,
} from "../../src/lib/game/ciphers";
import {
  EXTERNAL_BRANCHES,
  PULSE_POOL,
  SORTING_DOCS,
  type FlawKind,
} from "../../src/lib/game/content-external";

// ── أدوات الفحص ────────────────────────────────────────────
let failures = 0;
let checks = 0;
const errs: string[] = [];
function ok(cond: boolean, label: string) {
  checks++;
  if (!cond) {
    failures++;
    errs.push(`  ✗ ${label}`);
  }
}
const len = (s: string) => [...s].length;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// ── النصوص الصوتية الحرفية (كما تُنطق في التسجيلين) ────────
const ENG_AUDIO_TEXT =
  "في مدينة عيسى أجرى الطيف تجربته الهندسية: نماذج تُبنى بتعليمات ناقصة عمداً... ليكشف النقص كيف يتصرف العقل أمام المعلومة الناقصة.";
const HSC_AUDIO_TEXT =
  "في المنامة سُئل أناس عن تشخيصات متضاربة لأجسادهم. حين يتعلق القرار بالجسد... ينكشف أعمق منطق وأضعفه.";

// ── العبارات المصدر المستقلة (تُفكّ بها المواد المشفرة) ────
const ENG_FRAME_PHRASE = "THE MISSING NINETEENTH INSTRUCTION BUILDS THE INVISIBLE FRAME";
const HSC_CHART_PHRASE = "THE CORRECT DIAGNOSIS SLEEPS IN THE NINTH CHART";
const DRUGS = ["Nifedipine", "Urea", "Ringer", "Salbutamol", "Erythromycin"];

const MATERIAL_KINDS = ["code", "morse", "numbers", "map", "stego", "invisible", "vault", "none"];

// ═══════════════════════════════════════════════════════════
console.log("═══ 1) EXTERNAL_BRANCHES — الفرعان الخارجيان ═══");

ok(EXTERNAL_BRANCHES.length === 2, "عدد الفروع = 2");
ok(
  new Set(EXTERNAL_BRANCHES.map((b) => b.key)).size === 2 &&
    EXTERNAL_BRANCHES.some((b) => b.key === "eng") &&
    EXTERNAL_BRANCHES.some((b) => b.key === "hsc"),
  "المفاتيح: eng + hsc بالضبط"
);

const allIds: string[] = [];
for (const b of EXTERNAL_BRANCHES) {
  ok(b.puzzles.length === 3, `[${b.key}] ثلاثة ألغاز بالضبط`);
  ok(b.name.length > 3 && b.campus.length > 3 && b.prize.length > 3, `[${b.key}] name/campus/prize غير فارغة`);
  ok(
    b.audio === "/audio/deep-phone-isa-town-structure.mp3" ||
      b.audio === "/audio/mysterious-phone-manama-diagnosis.mp3",
    `[${b.key}] مسار الصوت كما هو محدد (${b.audio})`
  );
  const storyLen = len(b.story);
  ok(storyLen >= 400 && storyLen <= 700, `[${b.key}] طول القصة ${storyLen} ضمن 400-700`);
  ok(b.transcript.length >= 3 && b.transcript.length <= 6, `[${b.key}] أسطر الإرسالية ${b.transcript.length} ضمن 3-6`);
  ok(
    b.transcript.every((t) => t.trim().length > 0),
    `[${b.key}] لا سطر فارغ في الإرسالية`
  );
  const joined = b.transcript.join(" ");
  const expected = b.key === "eng" ? ENG_AUDIO_TEXT : HSC_AUDIO_TEXT;
  ok(joined === expected, `[${b.key}] اتحاد الأسطر = نص الصوت الحرفي حرفاً بحرف`);
  ok(
    b.puzzles.map((p) => p.points).join(",") === "120,140,160",
    `[${b.key}] النقاط بالضبط 120/140/160`
  );

  for (const p of b.puzzles) {
    allIds.push(p.id);
    ok(p.id.startsWith(`ext-${b.key}-`), `[${p.id}] المعرف يتبع الفرع`);
    ok(p.question.trim().length > 30, `[${p.id}] السؤال غير فارغ وغني`);
    ok(p.title.trim().length > 0, `[${p.id}] العنوان غير فارغ`);
    ok(p.material.trim().length > 0, `[${p.id}] المادة غير فارغة`);
    ok(MATERIAL_KINDS.includes(p.materialKind), `[${p.id}] materialKind صالح (${p.materialKind})`);
    ok(p.answers.length >= 2, `[${p.id}] إجابتان على الأقل (عربي + إنجليزي)`);
    ok(
      p.answers.every((a) => a.trim().length > 0),
      `[${p.id}] لا إجابة فارغة`
    );
    ok(
      p.answers.some((a) => /[\u0600-\u06FF]/.test(a)) && p.answers.some((a) => /^[A-Za-z]/.test(a)),
      `[${p.id}] يوجد متغير عربي ومتغير لاتيني`
    );
    ok(p.revealAnswer.trim().length > 0, `[${p.id}] revealAnswer غير فارغ`);
    ok(p.hints.length === 3, `[${p.id}] ثلاث تلميحات بالضبط`);
    ok(
      p.hints.every((h) => h.trim().length > 10),
      `[${p.id}] كل تلميحة غير فارغة`
    );
    ok(
      p.hints.some((h) => h.includes("المختبر")),
      `[${p.id}] إحدى التلميحات تشير إلى المختبر`
    );
    // تطبيع الإجابات العربية لا يُفرغها
    ok(
      p.answers.filter((a) => /[\u0600-\u06FF]/.test(a)).every((a) => normalizeAnswer(a).length > 0),
      `[${p.id}] الإجابات العربية تقاوم التطبيع`
    );
  }
}
ok(new Set(allIds).size === allIds.length && allIds.length === 6, "معرفات الألغاز الستة فريدة");

// ── فك مواد التشفير فعلياً بالدوال الحقيقية ────────────────
const eng = EXTERNAL_BRANCHES.find((b) => b.key === "eng");
const hsc = EXTERNAL_BRANCHES.find((b) => b.key === "hsc");
if (eng && hsc) {
  const [engA, engB, engC] = eng.puzzles;
  const [hscA, hscB, hscC] = hsc.puzzles;

  // ext-eng-a: مورس خالص → COLUMN
  ok(fromMorse(engA.material) === "COLUMN", "ext-eng-a: fromMorse(المادة) = COLUMN");

  // ext-eng-b: A1Z26 داخل السماحات → BRIDGE
  ok(fromA1Z26(engB.material) === "BRIDGE", "ext-eng-b: fromA1Z26(المادة) = BRIDGE");
  ok(toA1Z26("BRIDGE") === "2 18 9 4 7 5", "ext-eng-b: أرقام BRIDGE الصحيحة (2 18 9 4 7 5)");

  // ext-eng-c: Base64 ← قيصر -7 ← عكس → عبارة الهيكل
  const step1 = b64Decode(engC.material);
  const step2 = caesar(step1, -7);
  const step3 = reverseText(step2);
  ok(step3 === ENG_FRAME_PHRASE, "ext-eng-c: الطبقات الثلاث تعود إلى عبارة الهيكل الخفي");
  ok(step1 !== "" && step1.length > 40, "ext-eng-c: Base64 يُفكّ إلى طبقة قابلة للعكس");

  // ext-hsc-a: الرقمان المتفقان (أرقام + مورس) → PULSE
  const pulseMorse = toMorse("PULSE");
  const pulseDashed = toA1Z26("PULSE").replace(/ /g, "-");
  ok(hscA.material.includes(pulseMorse), "ext-hsc-a: مادة الطبيب تتضمن مورس PULSE");
  ok(hscA.material.includes(pulseDashed), "ext-hsc-a: مادة الممرضة تتضمن أرقام PULSE");
  ok(fromMorse(pulseMorse) === "PULSE", "ext-hsc-a: fromMorse(المقطع) = PULSE");
  ok(fromA1Z26(pulseDashed) === "PULSE", "ext-hsc-a: fromA1Z26(المقطع) = PULSE");
  ok(fromA1Z26(pulseDashed) === fromMorse(pulseMorse), "ext-hsc-a: الترميزان يتفقان على الكلمة نفسها");

  // ext-hsc-b: الأحرف الأولى للأدوية → NURSE
  ok(
    DRUGS.every((d) => hscB.material.includes(d)),
    "ext-hsc-b: الأدوية الخمسة موجودة في الوصفة"
  );
  ok(
    DRUGS.map((d) => d[0]).join("") === "NURSE",
    "ext-hsc-b: أحرف الأدوية الأولى تهجّي NURSE"
  );

  // ext-hsc-c: فيجنير بمفتاح NURSE → عبارة الملف التاسع
  ok(
    vigenere(hscC.material, "NURSE", true) === HSC_CHART_PHRASE,
    "ext-hsc-c: فيجنير(المادة, NURSE, فك) = عبارة الملف التاسع"
  );
  ok(
    vigenere(hscC.material, "NURSE", true) !== HSC_CHART_PHRASE.replace("NINTH", "TENTH"),
    "ext-hsc-c: المادة ليست نصاً فارغ المعنى (فك مختلف يعطي نتيجة مختلفة)"
  );
}

// ═══════════════════════════════════════════════════════════
console.log("\n═══ 2) SORTING_DOCS — غرفة الفرز ═══");

const REAL_CODE = /^P9-V\d{2}-\d{2}-[A-Z]{4,8}$/;
const ALL_FLAWS: FlawKind[] = ["code-deviation", "fact-contradiction", "impossible", "style-mismatch"];

ok(SORTING_DOCS.length === 10, "عدد الوثائق = 10");
ok(
  new Set(SORTING_DOCS.map((d) => d.id)).size === 10,
  "المعرفات فريدة (sort-01..sort-10)"
);
ok(
  SORTING_DOCS.every((d) => /^sort-\d{2}$/.test(d.id)),
  "المعرفات بصيغة sort-NN"
);
ok(
  new Set(SORTING_DOCS.map((d) => d.code)).size === 10,
  "الأكواد فريدة"
);
const fakes = SORTING_DOCS.filter((d) => d.isFake);
const reals = SORTING_DOCS.filter((d) => !d.isFake);
ok(fakes.length === 7, "سبع وثائق مزيفة بالضبط");
ok(reals.length === 3, "ثلاث وثائق حقيقية بالضبط");
ok(
  new Set(fakes.map((d) => d.flawKind)).size === 4 &&
    ALL_FLAWS.every((k) => fakes.some((d) => d.flawKind === k)),
  "الأعطال الأربعة كلها حاضرة بين المزيفة"
);
ok(
  SORTING_DOCS.every((d) => (d.isFake ? d.flawKind !== null : d.flawKind === null)),
  "flawKind = null للحقيقية فقط"
);
ok(
  SORTING_DOCS.every((d) => d.flawNote.trim().length > 10),
  "flawNote غير فارغة للجميع"
);
ok(
  SORTING_DOCS.every((d) => d.title.trim().length > 3),
  "العناوين غير فارغة"
);
for (const d of SORTING_DOCS) {
  const bl = len(d.body);
  ok(bl >= 200 && bl <= 400, `${d.id}: طول المتن ${bl} ضمن 200-400`);
}
ok(
  reals.every((d) => REAL_CODE.test(d.code)),
  "أكواد الوثائق الحقيقية تتبع الصيغة الرسمية P9-V{خانتان}-{خانتان}-{كلمة 4-8}"
);
const codeDevs = fakes.filter((d) => d.flawKind === "code-deviation");
ok(
  codeDevs.length >= 2 && codeDevs.every((d) => !REAL_CODE.test(d.code)),
  "أكواد المزيفة المنحرفة فعلاً تخالف الصيغة الرسمية (يفشل الفحص عليها)"
);
ok(
  fakes
    .filter((d) => d.flawKind !== "code-deviation")
    .every((d) => REAL_CODE.test(d.code)),
  "بقية المزيفة أكوادها سليمة الشكل (الخلل في المحتوى لا الصيغة)"
);
ok(
  SORTING_DOCS.every((d) => REAL_CODE.test(d.code) || d.flawKind === "code-deviation"),
  "لا مزيفة تخدع بصيغة سليمة دون علة موثقة"
);

// ═══════════════════════════════════════════════════════════
console.log("\n═══ 3) PULSE_POOL — نبض الأرشيف ═══");

ok(PULSE_POOL.length === 36, "عدد كلمات النبض = 36");
const arList = PULSE_POOL.map((p) => p.ar);
const enList = PULSE_POOL.map((p) => p.en);
ok(new Set(arList).size === 36, "الكلمات العربية فريدة");
ok(new Set(enList).size === 36, "الكلمات الإنجليزية فريدة");
ok(
  new Set(arList.map((a) => normalizeAnswer(a))).size === 36,
  "الكلمات العربية فريدة حتى بعد التطبيع"
);
for (const p of PULSE_POOL) {
  const arLetters = [...p.ar].filter((c) => /[\u0621-\u0662]/.test(c)).length;
  ok(
    arLetters >= 3 && arLetters <= 8 && !/[A-Za-z]/.test(p.ar),
    `«${p.ar}»: أحرف عربية ${arLetters} ضمن 3-8 بلا لاتيني`
  );
  ok(
    /^[A-Z]{3,8}$/.test(p.en),
    `${p.en}: إنجليزية كبيرة 3-8 أحرف`
  );
  const wc = words(p.story);
  ok(wc >= 8 && wc <= 25, `«${p.ar}»/«${p.en}»: نشرة الوسيط ${wc} كلمة (8-25)`);
}

// ═══════════════════════════════════════════════════════════
console.log("\n═══ الخلاصة ═══");
console.log(`فحوصات ناجحة: ${checks - failures}/${checks}`);
if (failures === 0) {
  console.log("EXTERNAL_BRANCHES: PASS ✅");
  console.log("SORTING_DOCS:     PASS ✅");
  console.log("PULSE_POOL:       PASS ✅");
  console.log("\n─ VERIFY-EXTERNAL: PASS ─");
} else {
  console.log("إخفاقات:");
  for (const e of errs) console.log(e);
  console.log("\n─ VERIFY-EXTERNAL: FAIL ─");
  process.exit(1);
}

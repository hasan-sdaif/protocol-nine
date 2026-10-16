// ═══════════════════════════════════════════════════════════
// التحقق الرياضي الكامل من src/lib/game/content-paths.ts
// المسارات الميدانية الستة + نقاط المسح الأربع عشرة
// يُشغَّل بـ: bun tools/game/verify-paths.ts
// ═══════════════════════════════════════════════════════════
import {
  abjadValue,
  atbash,
  b64Decode,
  b64Encode,
  caesar,
  fromA1Z26,
  fromMorse,
  normalizeAnswer,
  reverseText,
  rot13,
  toA1Z26,
  toMorse,
  vigenere,
} from "../../src/lib/game/ciphers";
import { BUILDINGS } from "../../src/lib/game/campus";
import {
  allPathPuzzleById,
  PATHS,
  PATHS_TOTAL_POINTS,
  SCAN_POINTS,
  SCAN_TOTAL_POINTS,
  scanPointByCode,
  scanPointById,
  type FieldPath,
} from "../../src/lib/game/content-paths";

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

// ── الثوابت المرجعية المستقلة (تُفكّ بها المواد المشفرة) ──
const PHRASE_TOWER = "THE LAST BROADCAST NEVER ENDED";
const PHRASE_INK = "HER INK REMEMBERS WHAT THE FLAME FORGOT";
const PHRASE_REFLECTION = "THE NINTH GUARDIAN HAS NO REFLECTION";
const PHRASE_FORGERY = "THE FORGERY COPIES THE INK BUT NOT THE TREMBLE";
const PHRASE_ORIGINAL = "ONLY THE ORIGINAL KNOWS WHERE IT WAS HIDDEN";
const PHRASE_BASEMENT = "THE BASEMENT REMEMBERS NINETEEN NINETY EIGHT";
const PHRASE_STEPS = "NINE STEPS DOWN TO THE SEALED DOOR";
const PHRASE_BEGINNING = "THE TENTH LAB WAS NEVER THE BEGINNING";
const PHRASE_DIRECTION = "THE SEVENTH GATE HAS NO LOCK ONLY A DIRECTION";

const EXPECTED_KEYS = ["echo", "writer", "guardian", "heirs", "tenth", "compass"];
const EXPECTED_UNLOCK: Record<string, number> = {
  echo: 2,
  writer: 2,
  guardian: 3,
  heirs: 4,
  tenth: 4,
  compass: 5,
};
const EXPECTED_AUDIO: Record<string, string> = {
  echo: "/audio/distorted-tape-broadcast-spectrum-room.mp3",
  writer: "/audio/grieving-tape-writer-confession.mp3",
  guardian: "/audio/haunted-tape-seventh-voice-echo.mp3",
  heirs: "/audio/distorted-tape-heirs-fake-warning.mp3",
  tenth: "/audio/distorted-tape-scream-1998-basement.mp3",
  compass: "/audio/deep-phone-paths-seven-gates.mp3",
};
const SCAN_AUDIO_ALLOWED = [
  "/audio/mysterious-phone-scan-beacon-confirmed.mp3",
  "/audio/urgent-phone-field-scan-briefing.mp3",
  "/audio/tense-tape-knocking-archive-door.mp3",
  "/audio/haunted-tape-footsteps-s17-corridor.mp3",
  "/audio/urgent-phone-distress-call-guardian.mp3",
  "/audio/distorted-tape-fm-lesson-plate.mp3",
  "/audio/whispering-tape-twin-versions.mp3",
];

const BUILDING_CODES = new Set(BUILDINGS.map((b) => b.code));
const MATERIAL_KINDS = ["code", "morse", "numbers", "map", "stego", "invisible", "vault", "none"];

// أول حرف من كل سطر غير فارغ (شيفرة العمود الأول)
const firstLetters = (text: string): string =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => [...l][0] ?? "")
    .join("");

const puzzleOf = (path: FieldPath, n: number) => path.puzzles[n - 1]!;

// ═══════════════════════════════════════════════════════════
console.log("═══ 1) PATHS — المسارات الميدانية الستة ═══");

ok(PATHS.length === 6, "عدد المسارات = 6");
ok(
  PATHS.map((p) => p.key).join(",") === EXPECTED_KEYS.join(","),
  "المفاتيح بالترتيب: echo, writer, guardian, heirs, tenth, compass"
);

const allPuzzleIds: string[] = [];
for (const path of PATHS) {
  ok(path.name.trim().length > 4, `[${path.key}] الاسم غير فارغ`);
  ok([...path.sigil].length === 1, `[${path.key}] الختم محرف واحد (${path.sigil})`);
  ok(path.tagline.trim().length >= 10, `[${path.key}] الشعار غير فارغ`);
  ok(
    path.unlockMinProtocol === EXPECTED_UNLOCK[path.key],
    `[${path.key}] عتبة الفتح = ${EXPECTED_UNLOCK[path.key]}`
  );
  const storyLen = len(path.story);
  ok(storyLen >= 400 && storyLen <= 600, `[${path.key}] طول القصة ${storyLen} ضمن 400-600`);
  ok(path.fragments.length === 3, `[${path.key}] ثلاث شظايا بالضبط`);
  path.fragments.forEach((f, i) => {
    const fl = len(f);
    ok(fl >= 180 && fl <= 320, `[${path.key}] الشظية ${i + 1} طولها ${fl} ضمن 180-320`);
  });
  ok(
    path.audio === EXPECTED_AUDIO[path.key],
    `[${path.key}] مسار الصوت كما هو محدد (${path.audio})`
  );
  ok(path.seal.word.trim().length > 1 && path.seal.label.trim().length > 1, `[${path.key}] الخِتم كامل`);
  ok(path.puzzles.length === 3, `[${path.key}] ثلاثة ألغاز بالضبط`);
  ok(
    path.puzzles.map((p) => p.points).join(",") === "90,110,130",
    `[${path.key}] النقاط بالضبط 90/110/130`
  );
  ok(
    path.puzzles.reduce((s, p) => s + p.points, 0) === 330,
    `[${path.key}] مجموع المسار = 330`
  );

  path.puzzles.forEach((p, i) => {
    allPuzzleIds.push(p.id);
    ok(p.id === `path-${path.key}-${i + 1}`, `[${p.id}] المعرف يتبع المسار`);
    ok(BUILDING_CODES.has(p.building), `[${p.id}] المبنى ${p.building} موجود في BUILDINGS`);
    ok(p.question.includes(p.building), `[${p.id}] السؤال يشير إلى رمز المبنى`);
    ok(p.question.trim().length >= 40, `[${p.id}] السؤال غني (≥40 حرفاً)`);
    ok(p.title.trim().length > 0, `[${p.id}] العنوان غير فارغ`);
    ok(p.material.trim().length > 0, `[${p.id}] المادة غير فارغة`);
    ok(MATERIAL_KINDS.includes(p.materialKind), `[${p.id}] materialKind صالح (${p.materialKind})`);
    ok(p.answers.length >= 2, `[${p.id}] إجابتان على الأقل`);
    ok(p.answers.every((a) => a.trim().length > 0), `[${p.id}] لا إجابة فارغة`);
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
    ok(
      p.answers.every((a) => normalizeAnswer(a).length > 0),
      `[${p.id}] الإجابات تقاوم التطبيع`
    );
  });
}

ok(allPuzzleIds.length === 18, "إجمالي الألغاز = 18 (6 × 3)");
ok(new Set(allPuzzleIds).size === 18, "معرفات الألغاز فريدة");

const computedPathPoints = PATHS.reduce(
  (sum, p) => sum + p.puzzles.reduce((s, x) => s + x.points, 0),
  0
);
ok(PATHS_TOTAL_POINTS === 1980, `PATHS_TOTAL_POINTS = 1980 (الفعلي ${PATHS_TOTAL_POINTS})`);
ok(computedPathPoints === 1980, "مجموع نقاط المسارات المحسوب = 1980");

// ── فك المواد المشفرة فعلياً بالدوال الحقيقية ──────────────
console.log("\n═══ 2) فك مواد التشفير بالدوال الحقيقية ═══");

const echo = PATHS.find((p) => p.key === "echo")!;
const writer = PATHS.find((p) => p.key === "writer")!;
const guardian = PATHS.find((p) => p.key === "guardian")!;
const heirs = PATHS.find((p) => p.key === "heirs")!;
const tenth = PATHS.find((p) => p.key === "tenth")!;
const compass = PATHS.find((p) => p.key === "compass")!;

// مسار الصدى
ok(fromMorse(puzzleOf(echo, 1).material) === "SPECTRUM", "echo-1: fromMorse(المادة) = SPECTRUM");
ok(puzzleOf(echo, 1).material === toMorse("SPECTRUM"), "echo-1: المادة = toMorse(SPECTRUM) حرفياً");
ok(fromA1Z26(puzzleOf(echo, 2).material) === "ONAIR", "echo-2: fromA1Z26(المادة) = ONAIR");
ok(puzzleOf(echo, 2).material.includes(toA1Z26("ONAIR")), "echo-2: المادة تتضمن أرقام ONAIR");
ok(
  caesar(reverseText(puzzleOf(echo, 3).material), -7) === PHRASE_TOWER,
  "echo-3: عكس ثم قيصر 7− = عبارة البرج"
);
ok(
  puzzleOf(echo, 3).material === reverseText(caesar(PHRASE_TOWER, 7)),
  "echo-3: المادة مطبوعة بالطبقتين نفسها"
);

// مسار الكاتبة
ok(
  firstLetters(puzzleOf(writer, 1).material) === "المخبأ",
  "writer-1: الأحرف الأولى للأسطر تهجّي «المخبأ»"
);
ok(
  normalizeAnswer(firstLetters(puzzleOf(writer, 1).material)) ===
    normalizeAnswer(puzzleOf(writer, 1).answers[0] ?? ""),
  "writer-1: العمود الأول يطابق الإجابة المقبولة"
);
ok(abjadValue("الماء") === 73, "writer-2: abjadValue(الماء) = 73");
ok(abjadValue("الحبر") === 241, "writer-2: abjadValue(الحبر) = 241");
ok(abjadValue("الورق") === 337, "writer-2: abjadValue(الورق) = 337");
ok(abjadValue("القلم") === 201, "writer-2: abjadValue(القلم) = 201");
ok(puzzleOf(writer, 2).material.includes("73"), "writer-2: المادة تتضمن القيمة 73");
ok(
  puzzleOf(writer, 2).answers.some((a) => normalizeAnswer(a) === normalizeAnswer("الماء")),
  "writer-2: الإجابات تقبل «الماء»"
);
ok(
  vigenere(puzzleOf(writer, 3).material, "INK", true) === PHRASE_INK,
  "writer-3: فيجنير(المادة, INK, فك) = عبارة الحبر"
);

// مسار الحارس
ok(atbash(puzzleOf(guardian, 1).material) === "MIRROR", "guardian-1: atbash(المادة) = MIRROR");
ok(atbash("MIRROR") === puzzleOf(guardian, 1).material, "guardian-1: المادة = atbash(MIRROR)");
ok(
  rot13(puzzleOf(guardian, 2).material) === "TWO VOICES ONE SHADOW",
  "guardian-2: rot13(المادة) = صوتان وظل واحد"
);
ok(
  caesar(atbash(puzzleOf(guardian, 3).material), -5) === PHRASE_REFLECTION,
  "guardian-3: أتباش ثم قيصر 5− = عبارة الانعكاس"
);
ok(
  puzzleOf(guardian, 3).material === atbash(caesar(PHRASE_REFLECTION, 5)),
  "guardian-3: المادة مطبوعة بالطبقتين نفسها"
);

// مسار الورثة
ok(b64Decode(puzzleOf(heirs, 1).material) === PHRASE_FORGERY, "heirs-1: b64Decode(المادة) = عبارة التزوير");
ok(firstLetters(puzzleOf(heirs, 2).material) === "FALSE", "heirs-2: الأحرف الأولى للبنود تهجّي FALSE");
ok(
  puzzleOf(heirs, 2).answers.some(
    (a) => normalizeAnswer(a) === normalizeAnswer(firstLetters(puzzleOf(heirs, 2).material))
  ),
  "heirs-2: العمود الأول يطابق إجابةً مقبولة"
);
ok(
  caesar(b64Decode(puzzleOf(heirs, 3).material), -11) === PHRASE_ORIGINAL,
  "heirs-3: Base64 ثم قيصر 11− = قاعدة الأصل"
);

// مسار المختبر العاشر
ok(
  reverseText(puzzleOf(tenth, 1).material) === PHRASE_BASEMENT,
  "tenth-1: reverseText(المادة) = عبارة القبو"
);
ok(caesar(puzzleOf(tenth, 2).material, -9) === PHRASE_STEPS, "tenth-2: قيصر 9− = تعليمات النزول");
ok(
  caesar(reverseText(b64Decode(puzzleOf(tenth, 3).material)), -4) === PHRASE_BEGINNING,
  "tenth-3: Base64 ثم عكس ثم قيصر 4− = لوحة الباب"
);
ok(
  puzzleOf(tenth, 3).material === b64Encode(reverseText(caesar(PHRASE_BEGINNING, 4))),
  "tenth-3: المادة مطبوعة بالطبقات الثلاث نفسها"
);

// مسار البوصلة
ok(
  fromMorse(puzzleOf(compass, 1).material) === "SEVENGATES",
  "compass-1: fromMorse(المادة) = SEVENGATES"
);
ok(
  puzzleOf(compass, 1).material === toMorse("SEVEN GATES"),
  "compass-1: المادة = toMorse(SEVEN GATES) حرفياً"
);
ok(fromA1Z26(puzzleOf(compass, 2).material) === "SOUTHWEST", "compass-2: fromA1Z26(المادة) = SOUTHWEST");
ok(
  puzzleOf(compass, 2).material.includes(toA1Z26("SOUTHWEST")),
  "compass-2: المادة تتضمن أرقام SOUTHWEST"
);
ok(
  vigenere(puzzleOf(compass, 3).material, "COMPASS", true) === PHRASE_DIRECTION,
  "compass-3: فيجنير(المادة, COMPASS, فك) = سر البوابة السابعة"
);

// ═══════════════════════════════════════════════════════════
console.log("\n═══ 3) SCAN_POINTS — نقاط المسح الأربع عشرة ═══");

const QR_CODE_RE = /^P9-QR-[A-Z0-9]+-\d{2}$/;

ok(SCAN_POINTS.length === 14, "عدد نقاط المسح = 14");
ok(
  new Set(SCAN_POINTS.map((s) => s.id)).size === 14,
  "المعرفات فريدة (scan-01..scan-14)"
);
ok(
  SCAN_POINTS.every((s) => /^scan-\d{2}$/.test(s.id)),
  "المعرفات بصيغة scan-NN"
);
ok(new Set(SCAN_POINTS.map((s) => s.code)).size === 14, "أكواد QR فريدة");
ok(
  SCAN_POINTS.every((s) => QR_CODE_RE.test(s.code)),
  "صيغة الكود P9-QR-{مبنى}-{رقمان} صحيحة للجميع"
);
ok(
  SCAN_POINTS.every((s) => BUILDING_CODES.has(s.building)),
  "كل المباني موجودة في BUILDINGS"
);
ok(
  SCAN_POINTS.every((s) => s.code.includes(s.building)),
  "كل كود يتضمن رمز مبناه"
);

for (const sp of SCAN_POINTS) {
  ok(sp.title.trim().length > 3, `[${sp.id}] العنوان غير فارغ`);
  const sl = len(sp.story);
  ok(sl >= 250 && sl <= 420, `[${sp.id}] طول القصة ${sl} ضمن 250-420`);
  ok(sp.points >= 25 && sp.points <= 60, `[${sp.id}] النقاط ${sp.points} ضمن 25-60`);
  ok(sp.minProtocol >= 0 && sp.minProtocol <= 4, `[${sp.id}] minProtocol ضمن 0-4`);
  ok(SCAN_AUDIO_ALLOWED.includes(sp.audio), `[${sp.id}] مسار الصوت من القائمة المسموحة (${sp.audio})`);
  if (sp.test) {
    ok(sp.test.question.trim().length >= 20, `[${sp.id}] سؤال الاختبار غير فارغ`);
    ok(sp.test.answers.length >= 1, `[${sp.id}] للاختبار إجابة واحدة على الأقل`);
    ok(
      sp.test.answers.every((a) => a.trim().length > 0),
      `[${sp.id}] لا إجابة اختبار فارغة`
    );
    ok(
      sp.test.answers.every((a) => normalizeAnswer(a).length > 0),
      `[${sp.id}] إجابات الاختبار تقاوم التطبيع`
    );
    ok(sp.test.revealAnswer.trim().length > 0, `[${sp.id}] revealAnswer للاختبار موجود`);
    ok(
      sp.test.bonusPoints >= 20 && sp.test.bonusPoints <= 40,
      `[${sp.id}] مكافأة الاختبار ${sp.test.bonusPoints} ضمن 20-40`
    );
  }
}

const tested = SCAN_POINTS.filter((s) => s.test);
ok(tested.length === 8, `النقاط ذات الاختبار = 8 بالضبط (الفعلي ${tested.length})`);
ok(
  SCAN_AUDIO_ALLOWED.every((a) => SCAN_POINTS.some((s) => s.audio === a)),
  "التسجيلات السبعة كلها مستعملة مرة على الأقل"
);
const computedScanPoints = SCAN_POINTS.reduce((sum, s) => sum + s.points, 0);
ok(SCAN_TOTAL_POINTS === computedScanPoints, `SCAN_TOTAL_POINTS = ${computedScanPoints} (المحسوب ${SCAN_TOTAL_POINTS})`);
const bonusTotal = tested.reduce((sum, s) => sum + (s.test?.bonusPoints ?? 0), 0);
ok(bonusTotal >= 160 && bonusTotal <= 320, `مجموع مكافآت الاختبارات ${bonusTotal} ضمن 160-320`);

// ═══════════════════════════════════════════════════════════
console.log("\n═══ 4) الصادرات المساعدة ═══");

const found = allPathPuzzleById("path-echo-1");
ok(found !== undefined && found.puzzle.id === "path-echo-1" && found.path.key === "echo", "allPathPuzzleById يعيد المسار واللغز");
const foundDeep = allPathPuzzleById("path-tenth-3");
ok(foundDeep !== undefined && foundDeep.puzzle.building === "S17", "allPathPuzzleById يصل أعمق لغز");
ok(allPathPuzzleById("path-none-9") === undefined, "allPathPuzzleById يعيد undefined لمجهول");
ok(allPathPuzzleById("") === undefined, "allPathPuzzleById يتعامل مع الفراغ");

const byCode = scanPointByCode("P9-QR-S3-01");
ok(byCode !== undefined && byCode.id === "scan-01", "scanPointByCode يعيد نقطة S3");
ok(scanPointByCode("P9-QR-XX-99") === undefined, "scanPointByCode يعيد undefined لمجهول");
const byId = scanPointById("scan-14");
ok(byId !== undefined && byId.building === "EAST", "scanPointById يعيد نقطة EAST");
ok(scanPointById("scan-99") === undefined, "scanPointById يعيد undefined لمجهول");

// ═══════════════════════════════════════════════════════════
console.log("\n═══ الخلاصة ═══");
console.log(`فحوصات ناجحة: ${checks - failures}/${checks}`);
if (failures === 0) {
  console.log("PATHS:       PASS ✅ (6 مسارات × 3 ألغاز = 18، المجموع 1980)");
  console.log(`SCAN_POINTS: PASS ✅ (14 نقطة، المجموع ${SCAN_TOTAL_POINTS}، اختبارات 8)`);
  console.log("\n─ VERIFY-PATHS: PASS ─");
} else {
  console.log("إخفاقات:");
  for (const e of errs) console.log(e);
  console.log("\n─ VERIFY-PATHS: FAIL ─");
  process.exit(1);
}

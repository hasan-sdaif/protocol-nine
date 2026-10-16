// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — سيناريوهات التريلر (5 ريلز + يوتيوب)
// كل وحدة (unit) = جملة تعليق = مقطع صوتي مستقل = كابشن كاراوكي
// الوحدات المعاد استخدامها (reuse) من أصول التطبيق (بلا أي تكلفة API)
// الوحدات الجديدة (gen) تُولَّد عبر ElevenLabs v4 بأصوات فريق اللعبة
// الفجوات (gap) بالثواني بعد كل وحدة — تُطبَّع لاحقاً لضبط المدة الهدف
// ═══════════════════════════════════════════════════════════

export interface Unit {
  id: string;
  kind: "gen" | "reuse";
  /** نص الوحدة (للتوليد أو للكابشن) */
  text: string;
  /** صوت الوحدة (مفتاح voices.ts) أو ملف إعادة الاستخدام */
  voice?: string;
  /** ملف إعادة الاستخدام من أصول التطبيق */
  file?: string;
  /** هل تُعرض ككابشن كاراوكي؟ */
  cap?: boolean;
  /** فجوة بعدها بالثواني (تُطبَّع) */
  gap?: number;
}

export interface Sfx {
  /** معرف أو ملف */
  id: string;
  /** نقطة الزمن — إما absolute (s) أو anchor: "unitId+0.5" */
  at: string;
  vol?: number;
}

export interface Beat {
  id: string;
  /** مشهد بصري — نوع من مكتبة المشاهد */
  scene: string;
  /** يبدأ عند مرساة "unitId" أو "unitId+0.5" أو رقم مطلق */
  at: string;
  /** بيانات المشهد */
  data?: Record<string, unknown>;
}

export interface Video {
  id: string;
  title: string;
  orientation: "portrait" | "landscape";
  targetDur: number;
  accent: string;
  accentDim: string;
  units: Unit[];
  sfx: Sfx[];
  beats: Beat[];
}

// ── الأصوات المتاحة (من فريق اللعبة) ──
export const VOICE_IDS: Record<string, string> = {
  brian: "nPczCjzI2devNBz1zQrb",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  adam: "pNInz6obpgDQGcFmaJgB",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  harry: "SOYHLrjzK2X1ezoPC6cr",
  roger: "CwhRBWXzGAHq8TQ4Fs17",
  laura: "FGY2WhTYpPnrIDTdsKH5",
  eric: "cjVigY5qzO86Huf0OWal",
  george: "JBFqnCBsd6RMkjVDRZzb",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  river: "SAz9YHcvj6GT2YYXdXww",
  chris: "iP95p4xoKVk53GoZ742B",
};

export const VOICE_SETTINGS: Record<string, Record<string, unknown>> = {
  brian: { stability: 0.5, similarity_boost: 0.78, style: 0.15, use_speaker_boost: true, speed: 0.88 },
  lily: { stability: 0.3, similarity_boost: 0.8, style: 0.6, use_speaker_boost: true, speed: 0.82 },
  sarah: { stability: 0.55, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed: 0.95 },
  adam: { stability: 0.65, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true, speed: 0.85 },
  callum: { stability: 0.4, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true, speed: 0.9 },
  harry: { stability: 0.25, similarity_boost: 0.7, style: 0.8, use_speaker_boost: true, speed: 0.95 },
  roger: { stability: 0.35, similarity_boost: 0.72, style: 0.6, use_speaker_boost: true, speed: 0.92 },
  laura: { stability: 0.4, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true, speed: 1.05 },
  eric: { stability: 0.5, similarity_boost: 0.78, style: 0.25, use_speaker_boost: true, speed: 1.0 },
  george: { stability: 0.5, similarity_boost: 0.78, style: 0.2, use_speaker_boost: true, speed: 0.9 },
  alice: { stability: 0.55, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed: 0.95 },
  daniel: { stability: 0.6, similarity_boost: 0.82, style: 0.15, use_speaker_boost: true, speed: 0.95 },
  matilda: { stability: 0.5, similarity_boost: 0.78, style: 0.3, use_speaker_boost: true, speed: 1.0 },
  river: { stability: 0.6, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: 0.85 },
  chris: { stability: 0.5, similarity_boost: 0.78, style: 0.25, use_speaker_boost: true, speed: 0.95 },
};

// ── المؤثرات الجديدة عبر [] + مقطع حامل (v4 يرفض النص الفارغ — والحامل يمنح صدمة صوتية هجينة) ──
export const NEW_SFX: { id: string; text: string; voice: string }[] = [
  { id: "riser-long", text: "[long dramatic cinematic riser] اِقْتَرَبَ", voice: "roger" },
  { id: "impact-deep", text: "[deep cinematic impact boom] هُـ", voice: "adam" },
  { id: "whoosh-fast", text: "[fast whoosh transition] فْـ", voice: "river" },
  { id: "impact-hit", text: "[hard hitting impact] هْـ", voice: "adam" },
  { id: "riser-short", text: "[short tense riser] اِنْتَبِه", voice: "roger" },
  { id: "glitch-burst", text: "[digital glitch burst] كَـ", voice: "callum" },
  { id: "heartbeat-low", text: "[slow deep heartbeat pulse] دُوم... دُوم", voice: "brian" },
  { id: "stinger-dark", text: "[dark mysterious stinger] شْـ", voice: "harry" },
];

// ═══════════════════════════════════════════════════════════
// الريل 1 — «الإرسالية» (أزرق جليدي) — الدعوة والغموض
// ═══════════════════════════════════════════════════════════
const R1: Video = {
  id: "reel1",
  title: "الإرسالية الأولى",
  orientation: "portrait",
  targetDur: 90,
  accent: "#7fd4ff",
  accentDim: "rgba(127,212,255,0.45)",
  units: [
    { id: "r1-u01", kind: "gen", text: "جامعتك... تخفي شيئاً.", voice: "brian", gap: 1.2 },
    { id: "r1-u02", kind: "gen", text: "وهي الآن تبحث عنك.", voice: "brian", gap: 1.8 },
    { id: "r1-u03", kind: "reuse", file: "deep-phone-boot-secure-line.mp3", text: "الخط آمن. لا تتحدث. اسمع فقط.", cap: true, gap: 1.0 },
    { id: "r1-u04", kind: "reuse", file: "deep-phone-intro-first-transmission.mp3", text: "إن كنتَ تسمع هذه الإرسالية... فقد اخترناك. لا تثق بما تعرفه عن جامعتك. تحت كل حجرٍ حرف، وفي كل صوتٍ رقم. تسعةُ حراسٍ يحيطون بسرٍّ لم يُسْمَحْ لأحدٍ بمعرفته. ما حُذِفَ لم يَخْتَفِ. ما أُحْرِقَ لم يَمُتْ. ما نُسي ينتظر من يتذكر. حاول الوصول إلى البروتوكول التاسع.", cap: true, gap: 2.0 },
    { id: "r1-u05", kind: "gen", text: "ليست لعبة عادية.", voice: "laura", gap: 0.9 },
    { id: "r1-u06", kind: "gen", text: "إنها منظومة كاملة... تسكن جامعة البحرين.", voice: "brian", gap: 1.6 },
    { id: "r1-u07", kind: "gen", text: "تسعة بروتوكولات.", voice: "brian", gap: 0.6 },
    { id: "r1-u08", kind: "gen", text: "عشرة أنواع تشفير.", voice: "sarah", gap: 0.6 },
    { id: "r1-u09", kind: "gen", text: "وثيقة مفقودة منذ سنوات.", voice: "lily", gap: 0.6 },
    { id: "r1-u10", kind: "gen", text: "وأشرطة... كان يجب أن تُحرق.", voice: "adam", gap: 2.0 },
    { id: "r1-u11", kind: "gen", text: "الوثيقة الغائبة في انتظارك.", voice: "matilda", gap: 1.2 },
    { id: "r1-u12", kind: "reuse", file: "mysterious-phone-missing-26.mp3", text: "الوثيقة الغائبة لم تُخفَ في الظلام. كانت دائماً في وضح النهار. ستة وعشرون... رقم النقص في قلب الكمال.", cap: true, gap: 2.2 },
    { id: "r1-u13", kind: "gen", text: "كل ما تحتاجه... عقلك.", voice: "brian", gap: 0.8 },
    { id: "r1-u14", kind: "gen", text: "وهاتفك.", voice: "eric", gap: 1.8 },
    { id: "r1-u15", kind: "gen", text: "الرابط في الوصف.", voice: "brian", gap: 0.7 },
    { id: "r1-u16", kind: "gen", text: "الإشارة تبدأ الليلة.", voice: "brian", gap: 1.5 },
    { id: "r1-u17", kind: "gen", text: "[whispers] لا تخبر أحداً.", voice: "lily", gap: 3.5 },
  ],
  sfx: [
    { id: "app:sfx-ambient-hum.mp3", at: "abs:0", vol: 0.5 },
    { id: "app:sfx-phone-ring.mp3", at: "r1-u11-0.3", vol: 0.5 },
    { id: "static-soft", at: "r1-u01-0.7", vol: 0.55 },
    { id: "app:sfx-phone-ring.mp3", at: "r1-u04-2.3", vol: 0.4 },
    { id: "impact-deep", at: "r1-u04+0.0", vol: 0.85 },
    { id: "whoosh-fast", at: "r1-u05-0.3", vol: 0.55 },
    { id: "riser-long", at: "r1-u07-2.5", vol: 0.6 },
    { id: "impact-hit", at: "r1-u10+0.1", vol: 0.8 },
    { id: "impact-deep", at: "r1-u16+0.1", vol: 0.9 },
    { id: "whisper-breath", at: "r1-u17-0.55", vol: 0.5 },
    { id: "stinger-dark", at: "r1-u17-0.2", vol: 0.5 },
  ],
  beats: [
    { id: "b-boot", scene: "bootTerm", at: "r1-u03", data: { lines: ["SECURE LINE", "UOB-NET // NODE 09", "AUTH ▸ PENDING"] } },
    { id: "b-hook1", scene: "questionSlam", at: "r1-u01", data: { q: "؟" } },
    { id: "b-transmission", scene: "transmissionWave", at: "r1-u04", data: {} },
    { id: "b-nine", scene: "guardianGrid", at: "r1-u07", data: { count: 9, label: "حراس" } },
    { id: "b-ciphers", scene: "chipStack", at: "r1-u08", data: { chips: ["قيصر", "مورس", "جُمّل", "أكروستيك", "شبكة", "طبقات"] } },
    { id: "b-doc", scene: "missingDoc", at: "r1-u09", data: { code: "26" } },
    { id: "b-burn", scene: "burnTape", at: "r1-u10", data: {} },
    { id: "b-call", scene: "incomingCall", at: "r1-u11", data: { name: "مجهول" } },
    { id: "b-26", scene: "bigStat", at: "r1-u12", data: { num: "26", label: "الرقم الغائب" } },
    { id: "b-brain", scene: "iconFocus", at: "r1-u13", data: { icon: "brain" } },
    { id: "b-phone", scene: "iconFocus", at: "r1-u14", data: { icon: "phone" } },
    { id: "b-cta", scene: "ctaCard", at: "r1-u15", data: { kw: "بروتوكول التاسع", sub: "الرابط في الوصف" } },
    { id: "b-title", scene: "titleSlam", at: "r1-u16", data: {} },
    { id: "b-end", scene: "endCard", at: "r1-u17", data: { line: "ما نُسي... ينتظر." } },
  ],
};

// ═══════════════════════════════════════════════════════════
// الريل 2 — «المختبر» (كهرماني) — مختبر التشفير
// ═══════════════════════════════════════════════════════════
const R2: Video = {
  id: "reel2",
  title: "مختبر التشفير",
  orientation: "portrait",
  targetDur: 90,
  accent: "#f5b04c",
  accentDim: "rgba(245,176,76,0.45)",
  units: [
    { id: "r2-u01", kind: "gen", text: "كل لغز... له مفتاح.", voice: "sarah", gap: 1.2 },
    { id: "r2-u02", kind: "gen", text: "وكل مفتاح... مخبأ أمام عينيك.", voice: "sarah", gap: 1.8 },
    { id: "r2-u03", kind: "gen", text: "قبل البروتوكولات التسعة... كان هناك الأرشيف.", voice: "sarah", gap: 1.0 },
    { id: "r2-u04", kind: "reuse", file: "mysterious-phone-p0-archive-origin.mp3", text: "عام ألفين وأربعة وُلد مشروع الطيف في صمت... وفتاة تَعْرِفُهَا الوثائق بالحرفين ف.م. نَسَخَتْ كل وثيقة وَخَبَّأَتْهَا حيث يعني لها كل مكان شيئاً. أربع بوابات صغيرة تفصلك عن الحقيقة الأولى. القيصر هنا يتكلم العربية... بإزاحة أربع. ابدأ من البذرة.", cap: true, gap: 1.8 },
    { id: "r2-u05", kind: "gen", text: "في المختبر... عشرة أسلحة.", voice: "eric", gap: 0.8 },
    { id: "r2-u06", kind: "gen", text: "انزياح قيصر.", voice: "george", gap: 0.45 },
    { id: "r2-u07", kind: "gen", text: "مورس.", voice: "alice", gap: 0.45 },
    { id: "r2-u08", kind: "gen", text: "حساب الجُمّل.", voice: "daniel", gap: 0.45 },
    { id: "r2-u09", kind: "gen", text: "النص الخفي.", voice: "roger", gap: 0.45 },
    { id: "r2-u10", kind: "gen", text: "والصفيحة الشفافة.", voice: "lily", gap: 1.4 },
    { id: "r2-u11", kind: "gen", text: "حوّل الحروف. افحص الطيف. اكسر الشيفرة.", voice: "sarah", gap: 1.2 },
    { id: "r2-u12", kind: "gen", text: "لكن حذارِ...", voice: "laura", gap: 0.8 },
    { id: "r2-u13", kind: "reuse", file: "tense-phone-sorting-room.mp3", text: "ليست كل وثيقة وُضعت لأجلك. الورثة يزيفون بذكاء: رمز ينحرف بحرف... وتاريخ لا يستقيم. فرّز بعين الباحث... لا بعين المتعجل.", cap: true, gap: 1.6 },
    { id: "r2-u14", kind: "gen", text: "وثيقة مزيفة واحدة... تكشفك.", voice: "adam", gap: 1.6 },
    { id: "r2-u15", kind: "gen", text: "حللت اللغز؟ احصل على نقاطك.", voice: "matilda", gap: 0.7 },
    { id: "r2-u16", kind: "gen", text: "تاخرت؟ النبض اليومي لن ينتظرك.", voice: "river", gap: 1.8 },
    { id: "r2-u17", kind: "gen", text: "المختبر مفتوح.", voice: "sarah", gap: 0.6 },
    { id: "r2-u18", kind: "gen", text: "والأرشيف... ينبض.", voice: "sarah", gap: 3.5 },
  ],
  sfx: [
    { id: "app:sfx-ambient-hum.mp3", at: "abs:0", vol: 0.5 },
    { id: "app:sfx-morse-shadow.mp3", at: "r2-u07", vol: 0.6 },
    { id: "keyboard-typing", at: "r2-u01-1.4", vol: 0.5 },
    { id: "impact-deep", at: "r2-u04", vol: 0.8 },
    { id: "whoosh-fast", at: "r2-u05-0.25", vol: 0.5 },
    { id: "app:sfx-ui-click.mp3", at: "r2-u06", vol: 0.5 },
    { id: "app:sfx-ui-click.mp3", at: "r2-u07", vol: 0.5 },
    { id: "app:sfx-ui-click.mp3", at: "r2-u08", vol: 0.5 },
    { id: "app:sfx-ui-click.mp3", at: "r2-u09", vol: 0.5 },
    { id: "app:sfx-ui-success.mp3", at: "r2-u10", vol: 0.6 },
    { id: "riser-short", at: "r2-u12-1.0", vol: 0.5 },
    { id: "beeps-monitor", at: "r2-u12-0.9", vol: 0.4 },
    { id: "app:sfx-ui-error.mp3", at: "r2-u14+0.05", vol: 0.7 },
    { id: "glitch-burst", at: "r2-u14+0.1", vol: 0.5 },
    { id: "impact-deep", at: "r2-u17+0.1", vol: 0.85 },
    { id: "stinger-dark", at: "r2-u18-0.2", vol: 0.5 },
  ],
  beats: [
    { id: "b-key", scene: "keyGlow", at: "r2-u01", data: {} },
    { id: "b-origin", scene: "archiveOrigin", at: "r2-u04", data: { year: "2004", initials: "ف.م" } },
    { id: "b-armory", scene: "cipherLab", at: "r2-u05", data: {} },
    { id: "b-shift", scene: "caesarShift", at: "r2-u06", data: { from: "ض", to: "ط", shift: 4 } },
    { id: "b-morse", scene: "morseDots", at: "r2-u07", data: { sig: "-··· -- --- .-. ..." } },
    { id: "b-gematria", scene: "gematriaNums", at: "r2-u08", data: { pairs: [["الظل", "930"], ["صاخر", "891"]] } },
    { id: "b-hidden", scene: "hiddenText", at: "r2-u09", data: {} },
    { id: "b-plate", scene: "plateReveal", at: "r2-u10", data: {} },
    { id: "b-lab", scene: "labTools", at: "r2-u11", data: {} },
    { id: "b-warn", scene: "heirGlitch", at: "r2-u13", data: {} },
    { id: "b-fake", scene: "versusDocs", at: "r2-u14", data: {} },
    { id: "b-points", scene: "pointsCount", at: "r2-u15", data: { pts: 250 } },
    { id: "b-pulse", scene: "pulseRing", at: "r2-u16", data: {} },
    { id: "b-cta", scene: "ctaCard", at: "r2-u17", data: { kw: "مختبر التشفير", sub: "داخل بروتوكول التاسع" } },
    { id: "b-end", scene: "endCard", at: "r2-u18", data: { line: "الأرشيف ينبض." } },
  ],
};

// ═══════════════════════════════════════════════════════════
// الريل 3 — «الأشرطة» (أحمر) — أشرطة 1998 والرعب
// ═══════════════════════════════════════════════════════════
const R3: Video = {
  id: "reel3",
  title: "الأشرطة القديمة",
  orientation: "portrait",
  targetDur: 90,
  accent: "#ff5a5a",
  accentDim: "rgba(255,90,90,0.45)",
  units: [
    { id: "r3-u01", kind: "gen", text: "بعض التسجيلات... لا يجب أن تُسمع.", voice: "lily", gap: 1.5 },
    { id: "r3-u02", kind: "gen", text: "لكنها تُسمع.", voice: "adam", gap: 2.0 },
    { id: "r3-u03", kind: "gen", text: "تسجيل واحد... تسعة وتسعين.", voice: "harry", gap: 0.9 },
    { id: "r3-u04", kind: "reuse", file: "distorted-tape-scream-1998-basement.mp3", text: "القبو تحت مبنى سبعة عشر. لا تنزلوا بعد الغروب. لا أحد ينزل... بعد اليوم.", cap: true, gap: 2.2 },
    { id: "r3-u05", kind: "gen", text: "في الأرشيف ستة أصوات.", voice: "callum", gap: 0.9 },
    { id: "r3-u06", kind: "reuse", file: "haunted-tape-seventh-voice-echo.mp3", text: "عدّوا الأصوات في الأرشيف... ستجدون ستة. أنا السابع. ما نُسِيَ... يَنْتَظِر.", cap: true, gap: 2.0 },
    { id: "r3-u07", kind: "gen", text: "كل ليلة جمعة... يُطرق الباب.", voice: "chris", gap: 0.8 },
    { id: "r3-u08", kind: "reuse", file: "tense-tape-knocking-archive-door.mp3", text: "طرق على باب الأرشيف كل ليلة جمعة. مقفل منذ ألفين وثمانية. لا أحد يفتح... ولا أحد يقف خلفه. تقريباً.", cap: true, gap: 2.2 },
    { id: "r3-u09", kind: "reuse", file: "distorted-tape-heirs-fake-warning.mp3", text: "نحن الورثة. لا تنشروا ما لا تملكون. الوثائق التي بين أيديكم كتبناها. انسحبوا... وأنتم قادرون.", cap: true, gap: 1.8 },
    { id: "r3-u10", kind: "gen", text: "لن ننسحب.", voice: "lily", gap: 0.9 },
    { id: "r3-u11", kind: "reuse", file: "grieving-tape-writer-confession.mp3", text: "أنا الكاتبة... نَسَخْتُ كل شيء وَخَبَّأْتُهُ. الحقيقة التي تُدْفَن... تخرج من الشقّ. سامحوني.", cap: true, gap: 2.0 },
    { id: "r3-u12", kind: "gen", text: "خطوات في ممر القاعات... بعد منتصف الليل.", voice: "river", gap: 1.4 },
    { id: "r3-u13b", kind: "gen", text: "توقفت عند الباب... ولم تصل أبداً.", voice: "river", gap: 2.2 },
    { id: "r3-u14", kind: "gen", text: "الأشرطة داخل اللعبة.", voice: "lily", gap: 0.6 },
    { id: "r3-u15", kind: "gen", text: "استمع جيداً...", voice: "lily", gap: 0.6 },
    { id: "r3-u16", kind: "gen", text: "وبعد الغروب... لا تنزل القبو وحيداً.", voice: "harry", gap: 3.5 },
  ],
  sfx: [
    { id: "app:sfx-ambient-hum.mp3", at: "abs:0", vol: 0.45 },
    { id: "tape-hiss", at: "r3-u01-0.9", vol: 0.55 },
    { id: "stinger-dark", at: "r3-u02+0.05", vol: 0.7 },
    { id: "impact-hit", at: "r3-u04+0.05", vol: 0.75 },
    { id: "heartbeat-low", at: "r3-u05-0.5", vol: 0.4 },
    { id: "riser-long", at: "r3-u07-1.5", vol: 0.55 },
    { id: "impact-deep", at: "r3-u08+0.05", vol: 0.7 },
    { id: "glitch-burst", at: "r3-u09+0.1", vol: 0.6 },
    { id: "impact-hit", at: "r3-u10+0.0", vol: 0.8 },
    { id: "stinger-dark", at: "r3-u16-0.3", vol: 0.6 },
  ],
  beats: [
    { id: "b-open", scene: "tapeDeck", at: "r3-u01", data: { label: "TAPE 099 — 1998" } },
    { id: "b-hear", scene: "questionSlam", at: "r3-u02", data: { q: "!" } },
    { id: "b-basement", scene: "basementDoor", at: "r3-u04", data: { bldg: "S17", year: "1998" } },
    { id: "b-seven", scene: "sixVoices", at: "r3-u05", data: { total: 6 } },
    { id: "b-seventh", scene: "seventhVoice", at: "r3-u06", data: {} },
    { id: "b-knock", scene: "knockDoor", at: "r3-u08", data: {} },
    { id: "b-heirs", scene: "heirGlitch", at: "r3-u09", data: {} },
    { id: "b-refuse", scene: "stampSlam", at: "r3-u10", data: { stamp: "لن ننسحب" } },
    { id: "b-writer", scene: "writerCard", at: "r3-u11", data: { initials: "ف.م" } },
    { id: "b-steps", scene: "footstepsHall", at: "r3-u12", data: {} },
    { id: "b-cta", scene: "ctaCard", at: "r3-u14", data: { kw: "الأشرطة الكاملة", sub: "داخل الأرشيف الصوتي" } },
    { id: "b-warn", scene: "afterSunset", at: "r3-u16", data: {} },
    { id: "b-end", scene: "endCard", at: "r3-u16+2.0", data: { line: "لا تنزل وحيداً." } },
  ],
};

// ═══════════════════════════════════════════════════════════
// الريل 4 — «الميدان» (أخضر) — المسارات ومنارات QR
// ═══════════════════════════════════════════════════════════
const R4: Video = {
  id: "reel4",
  title: "المسارات الميدانية",
  orientation: "portrait",
  targetDur: 90,
  accent: "#2fe081",
  accentDim: "rgba(47,224,129,0.45)",
  units: [
    { id: "r4-u01", kind: "gen", text: "التحدي لا يعيش داخل الشاشة.", voice: "eric", gap: 1.2 },
    { id: "r4-u02", kind: "gen", text: "إنه يسكن... ممرات جامعتك.", voice: "eric", gap: 1.8 },
    { id: "r4-u03", kind: "reuse", file: "deep-phone-paths-seven-gates.mp3", text: "سبع بوابات... سبعة مسارات. كل مسار يفتح باباً لا يعرفه حتى الوسيط. المفاتيح مبعثرة في الحكايات. ابدأ... وستُرى.", cap: true, gap: 1.6 },
    { id: "r4-u04", kind: "reuse", file: "urgent-phone-field-scan-briefing.mp3", text: "وكيل، الأكواد منتشرة في الحرم. كل رمز يحرس معلومة... أو اختباراً. وجّه الكاميرا... ودع الشبكة تقودك.", cap: true, gap: 1.6 },
    { id: "r4-u05", kind: "gen", text: "أربعة عشر منارة... مخبأة في الجامعة.", voice: "matilda", gap: 1.0 },
    { id: "r4-u06", kind: "gen", text: "امسح الرمز بکاميرا هاتفك.", voice: "eric", gap: 0.7 },
    { id: "r4-u07", kind: "gen", text: "فلتُختبر.", voice: "adam", gap: 1.6 },
    { id: "r4-u08", kind: "reuse", file: "mysterious-phone-scan-beacon-confirmed.mp3", text: "إشارة مؤكدة. البوصلة تَرَاك الآن. الشبكة تتذكر من يمسح وما يمسح. واصل.", cap: true, gap: 1.6 },
    { id: "r4-u09", kind: "gen", text: "في كل منارة... اختبار.", voice: "matilda", gap: 0.7 },
    { id: "r4-u10", kind: "gen", text: "أجب صحيحاً... وامضِ قدماً.", voice: "george", gap: 0.7 },
    { id: "r4-u11", kind: "gen", text: "أخطئ... والشبكة تتذكر.", voice: "laura", gap: 1.8 },
    { id: "r4-u12", kind: "reuse", file: "urgent-phone-distress-call-guardian.mp3", text: "اسمعني بسرعة. الحارس... ليس منّا. انقل الوثيقة قبل أن يصحو الجدار. لا تتصل بهذا الرقم مرة أخرى.", cap: true, gap: 1.8 },
    { id: "r4-u13", kind: "gen", text: "الميدان مفتوح لكل الطلبة.", voice: "eric", gap: 0.7 },
    { id: "r4-u14", kind: "gen", text: "خريطة الحرم تنتظرك.", voice: "matilda", gap: 1.2 },
    { id: "r4-u15", kind: "gen", text: "ابدأ من أقرب منارة.", voice: "eric", gap: 0.8 },
    { id: "r4-u16", kind: "gen", text: "الشبكة تراقب... من الآن.", voice: "river", gap: 3.5 },
  ],
  sfx: [
    { id: "app:sfx-ambient-hum.mp3", at: "abs:0", vol: 0.45 },
    { id: "wind-outdoor", at: "r4-u01-1.6", vol: 0.6 },
    { id: "whoosh-fast", at: "r4-u02-0.3", vol: 0.55 },
    { id: "impact-deep", at: "r4-u03+0.0", vol: 0.75 },
    { id: "app:sfx-ui-click.mp3", at: "r4-u06", vol: 0.6 },
    { id: "impact-hit", at: "r4-u07+0.05", vol: 0.8 },
    { id: "app:sfx-phone-ring.mp3", at: "r4-u12-1.2", vol: 0.45 },
    { id: "glitch-burst", at: "r4-u11+0.05", vol: 0.5 },
    { id: "app:sfx-ui-success.mp3", at: "r4-u10", vol: 0.6 },
    { id: "riser-long", at: "r4-u13-2.0", vol: 0.55 },
    { id: "impact-deep", at: "r4-u15+0.1", vol: 0.85 },
    { id: "beeps-monitor", at: "r4-u16-1.1", vol: 0.4 },
    { id: "stinger-dark", at: "r4-u16-0.2", vol: 0.5 },
  ],
  beats: [
    { id: "b-open", scene: "windyCampus", at: "r4-u01", data: {} },
    { id: "b-map", scene: "campusMap", at: "r4-u02", data: {} },
    { id: "b-gates", scene: "sevenGates", at: "r4-u03", data: { count: 7 } },
    { id: "b-brief", scene: "fieldBrief", at: "r4-u04", data: {} },
    { id: "b-beacons", scene: "beaconCount", at: "r4-u05", data: { num: 14 } },
    { id: "b-scan", scene: "qrScan", at: "r4-u06", data: {} },
    { id: "b-test", scene: "beaconTest", at: "r4-u07", data: {} },
    { id: "b-confirm", scene: "beaconPulse", at: "r4-u08", data: {} },
    { id: "b-rightwrong", scene: "rightWrong", at: "r4-u09", data: {} },
    { id: "b-memory", scene: "netRemembers", at: "r4-u11", data: {} },
    { id: "b-distress", scene: "distressCall", at: "r4-u12", data: {} },
    { id: "b-openall", scene: "ctaCard", at: "r4-u13", data: { kw: "المسارات الميدانية", sub: "لكل طالب في الجامعة" } },
    { id: "b-walk", scene: "startWalk", at: "r4-u15", data: {} },
    { id: "b-end", scene: "endCard", at: "r4-u16", data: { line: "الشبكة تراقب." } },
  ],
};

// ═══════════════════════════════════════════════════════════
// الريل 5 — «التاسع» (ذهبي) — الخاتمة والتنافس
// ═══════════════════════════════════════════════════════════
const R5: Video = {
  id: "reel5",
  title: "أنت التاسع",
  orientation: "portrait",
  targetDur: 90,
  accent: "#ffd166",
  accentDim: "rgba(255,209,102,0.45)",
  units: [
    { id: "r5-u01", kind: "gen", text: "في كل جيل... يُختار واحد.", voice: "brian", gap: 1.2 },
    { id: "r5-u02", kind: "gen", text: "في هذا الجيل... الجامعة كلها تُختبر.", voice: "sarah", gap: 1.8 },
    { id: "r5-u03", kind: "gen", text: "المتصدرون يُعلنون أسماءهم.", voice: "daniel", gap: 0.8 },
    { id: "r5-u04", kind: "gen", text: "والنقاط لا ترحم أحداً.", voice: "matilda", gap: 1.4 },
    { id: "r5-u05", kind: "gen", text: "سقط الحارس الأول.", voice: "eric", gap: 0.5 },
    { id: "r5-u06", kind: "gen", text: "الثاني.", voice: "george", gap: 0.4 },
    { id: "r5-u07", kind: "gen", text: "الثالث.", voice: "alice", gap: 0.4 },
    { id: "r5-u08", kind: "gen", text: "الرابع.", voice: "daniel", gap: 0.4 },
    { id: "r5-u09", kind: "gen", text: "الخامس.", voice: "matilda", gap: 0.4 },
    { id: "r5-u10", kind: "gen", text: "السادس.", voice: "roger", gap: 0.4 },
    { id: "r5-u11", kind: "gen", text: "السابع.", voice: "callum", gap: 0.4 },
    { id: "r5-u12", kind: "gen", text: "الثامن.", voice: "adam", gap: 1.2 },
    { id: "r5-u13", kind: "reuse", file: "deep-phone-guardian-fell.mp3", text: "سقط الحارس. انكشفت طبقة. التقدم مستمر.", cap: true, gap: 1.6 },
    { id: "r5-u14", kind: "gen", text: "بقي واحد.", voice: "brian", gap: 1.4 },
    { id: "r5-u15", kind: "reuse", file: "deep-phone-finale-you-are-the-ninth.mp3", text: "الآن فهمت. البروتوكولات التسعة لم تختبر أحداً قبلك... بل اختبرتك أنت. منذ أول إرسالية وأنت داخل المختبر. الكاتبة كتبت: ما حُذف لم يَخْتَفِ، وما أُحرق لم يَمُتْ، وما نُسي ينتظر من يتذكر. أنت التاسع. كنتَ دائماً. اكتب اسمك على الجدار... وانقل الحقيقة.", cap: true, gap: 2.4 },
    { id: "r5-u16", kind: "gen", text: "اكتب اسمك... على الجدار.", voice: "lily", gap: 1.6 },
    { id: "r5-u17", kind: "gen", text: "التاسع قد تكون أنت.", voice: "brian", gap: 3.5 },
  ],
  sfx: [
    { id: "app:sfx-ambient-hum.mp3", at: "abs:0", vol: 0.45 },
    { id: "crowd-murmur", at: "r5-u01-1.6", vol: 0.55 },
    { id: "riser-long", at: "r5-u03-2.0", vol: 0.6 },
    { id: "app:sfx-ui-click.mp3", at: "r5-u05", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "r5-u06", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "r5-u07", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "r5-u08", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "r5-u09", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "r5-u10", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "r5-u11", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "r5-u12", vol: 0.65 },
    { id: "impact-hit", at: "r5-u13+0.05", vol: 0.8 },
    { id: "heartbeat-low", at: "r5-u14-0.3", vol: 0.45 },
    { id: "impact-deep", at: "r5-u15+0.05", vol: 0.85 },
    { id: "app:sfx-phone-ring.mp3", at: "r5-u15-2.4", vol: 0.4 },
    { id: "app:sfx-ui-success.mp3", at: "r5-u16", vol: 0.6 },
    { id: "stinger-dark", at: "r5-u17-0.2", vol: 0.5 },
  ],
  beats: [
    { id: "b-chosen", scene: "chosenOne", at: "r5-u01", data: {} },
    { id: "b-board", scene: "leaderboard", at: "r5-u03", data: { rows: [["وكيل النبض", "1,240"], ["عين الطيف", "980"], ["ابن S17", "875"], ["؟؟؟", "26"]] } },
    { id: "b-fall", scene: "guardiansFall", at: "r5-u05", data: { count: 8 } },
    { id: "b-one", scene: "countdownOne", at: "r5-u14", data: {} },
    { id: "b-finale", scene: "ninthReveal", at: "r5-u15", data: {} },
    { id: "b-wall", scene: "nameWall", at: "r5-u16", data: {} },
    { id: "b-title", scene: "titleSlam", at: "r5-u17", data: {} },
    { id: "b-end", scene: "endCard", at: "r5-u17+1.6", data: { line: "التاسع... قد تكون أنت." } },
  ],
};

// ═══════════════════════════════════════════════════════════
// فيديو اليوتيوب — «الفيلم الكامل» (أزرق جليدي) — دقيقتان
// ═══════════════════════════════════════════════════════════
const YT: Video = {
  id: "youtube",
  title: "بروتوكول التاسع — الفيلم الكامل",
  orientation: "landscape",
  targetDur: 120,
  accent: "#7fd4ff",
  accentDim: "rgba(127,212,255,0.45)",
  units: [
    { id: "yt-u01", kind: "gen", text: "ما لو أخبرتك... أن جامعتك ليست ما تبدو عليه؟", voice: "brian", gap: 1.6 },
    { id: "yt-u02", kind: "gen", text: "أن تحت قاعات المحاضرات... أرشيفاً حياً.", voice: "sarah", gap: 1.2 },
    { id: "yt-u03", kind: "gen", text: "وأن تسعة حراس... يحيطون بسرٍّ واحد.", voice: "brian", gap: 1.8 },
    { id: "yt-u04", kind: "reuse", file: "deep-phone-boot-secure-line.mp3", text: "الخط آمن. لا تتحدث. اسمع فقط.", cap: true, gap: 1.0 },
    { id: "yt-u05", kind: "gen", text: "ما حُذِفَ لم يَخْتَفِ. وما أُحْرِقَ لم يَمُتْ.", voice: "brian", gap: 1.2 },
    { id: "yt-u05b", kind: "gen", text: "حاول الوصول إلى البروتوكول التاسع.", voice: "brian", gap: 1.6 },
    { id: "yt-u07", kind: "gen", text: "إنه دعوة... إلى تحدٍّ حقيقي داخل جامعة البحرين.", voice: "brian", gap: 2.0 },
    { id: "yt-u08", kind: "gen", text: "عام ألفين وأربعة وُلد مشروع الطيف في صمت.", voice: "sarah", gap: 0.9 },
    { id: "yt-u08b", kind: "gen", text: "وفتاة... خبّأت كل شيء.", voice: "sarah", gap: 1.4 },
    { id: "yt-u09", kind: "gen", text: "اللعبة مبنية من ستة أقسام.", voice: "sarah", gap: 0.8 },
    { id: "yt-u10", kind: "gen", text: "غرفة العمليات... حيث تُحرَّر الوثائق.", voice: "eric", gap: 0.7 },
    { id: "yt-u11", kind: "gen", text: "مختبر التشفير... عشرة أسلحة ضد السر.", voice: "george", gap: 0.7 },
    { id: "yt-u12", kind: "gen", text: "خريطة الحرم... ومنارات في كل زاوية.", voice: "matilda", gap: 0.7 },
    { id: "yt-u13", kind: "gen", text: "غرفة الفرز... حيث الوثائق المزيفة تتربص.", voice: "adam", gap: 0.7 },
    { id: "yt-u14", kind: "gen", text: "الأرشيف الصوتي... أشرطة لا تُنسى.", voice: "lily", gap: 0.7 },
    { id: "yt-u15", kind: "gen", text: "والمتصدرون... حيث يُكتب التاريخ.", voice: "daniel", gap: 1.8 },
    { id: "yt-u16", kind: "gen", text: "امسح منارة بکاميرا هاتفك... فلتُختبر فوراً.", voice: "eric", gap: 1.4 },
    { id: "yt-u17", kind: "gen", text: "الأكواد منتشرة في الحرم... دع الشبكة تقودك.", voice: "eric", gap: 1.2 },
    { id: "yt-u18", kind: "gen", text: "لكن في الظل... الورثة يراقبون.", voice: "adam", gap: 0.9 },
    { id: "yt-u19", kind: "gen", text: "انسحبوا... وأنتم قادرون.", voice: "adam", gap: 1.2 },
    { id: "yt-u20", kind: "gen", text: "لكن الكاتبة سبقتهم جميعاً.", voice: "sarah", gap: 0.8 },
    { id: "yt-u21", kind: "gen", text: "الحقيقة التي تُدْفَن... تخرج من الشقّ.", voice: "lily", gap: 1.6 },
    { id: "yt-u22", kind: "gen", text: "النقاط تتدفق. البث حي. والأسماء تصعد.", voice: "matilda", gap: 1.2 },
    { id: "yt-u23", kind: "gen", text: "لكل جهاز تجربته: كمبيوتر، هاتف، تابلت.", voice: "river", gap: 1.6 },
    { id: "yt-u25", kind: "gen", text: "وفي النهاية... يبقى سؤال واحد.", voice: "brian", gap: 1.2 },
    { id: "yt-u26", kind: "gen", text: "أنت التاسع. كنتَ دائماً.", voice: "brian", gap: 1.0 },
    { id: "yt-u26b", kind: "gen", text: "اكتب اسمك على الجدار... وانقل الحقيقة.", voice: "lily", gap: 1.8 },
    { id: "yt-u27", kind: "gen", text: "الرابط في الوصف.", voice: "brian", gap: 0.7 },
    { id: "yt-u28", kind: "gen", text: "الإشارة تبدأ الليلة.", voice: "brian", gap: 0.8 },
    { id: "yt-u29", kind: "gen", text: "[whispers] ما نُسي... ينتظر من يتذكر.", voice: "lily", gap: 4.0 },
  ],
  sfx: [
    { id: "app:sfx-ambient-hum.mp3", at: "abs:0", vol: 0.5 },
    { id: "static-soft", at: "yt-u01-0.7", vol: 0.5 },
    { id: "impact-deep", at: "yt-u03+0.1", vol: 0.8 },
    { id: "whoosh-fast", at: "yt-u07-0.2", vol: 0.5 },
    { id: "riser-long", at: "yt-u08-2.5", vol: 0.6 },
    { id: "app:sfx-ui-click.mp3", at: "yt-u10", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "yt-u11", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "yt-u12", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "yt-u13", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "yt-u14", vol: 0.55 },
    { id: "app:sfx-ui-click.mp3", at: "yt-u15", vol: 0.65 },
    { id: "app:sfx-ui-success.mp3", at: "yt-u16", vol: 0.6 },
    { id: "glitch-burst", at: "yt-u18+0.05", vol: 0.6 },
    { id: "impact-hit", at: "yt-u19+0.1", vol: 0.75 },
    { id: "heartbeat-low", at: "yt-u25-0.8", vol: 0.4 },
    { id: "impact-deep", at: "yt-u26+0.05", vol: 0.85 },
    { id: "app:sfx-phone-ring.mp3", at: "yt-u28-1.0", vol: 0.45 },
    { id: "whisper-breath", at: "yt-u29-0.55", vol: 0.5 },
    { id: "stinger-dark", at: "yt-u29-0.3", vol: 0.55 },
  ],
  beats: [
    { id: "b-q", scene: "questionSlam", at: "yt-u01", data: { q: "؟" } },
    { id: "b-arch", scene: "archiveVault", at: "yt-u02", data: {} },
    { id: "b-9", scene: "guardianGrid", at: "yt-u03", data: { count: 9, label: "حراس" } },
    { id: "b-boot", scene: "bootTerm", at: "yt-u04", data: { lines: ["SECURE LINE", "UOB-NET // NODE 09", "AUTH ▸ PENDING"] } },
    { id: "b-trans", scene: "transmissionWave", at: "yt-u05", data: {} },
    { id: "b-invite", scene: "ctaCard", at: "yt-u07", data: { kw: "جامعة البحرين", sub: "تحدي حقيقي... مفتوح للطلبة" } },
    { id: "b-origin", scene: "archiveOrigin", at: "yt-u08", data: { year: "2004", initials: "ف.م" } },
    { id: "b-six", scene: "sixSections", at: "yt-u09", data: {} },
    { id: "b-ops", scene: "sectionTile", at: "yt-u10", data: { icon: "ops", t: "غرفة العمليات" } },
    { id: "b-lab", scene: "sectionTile", at: "yt-u11", data: { icon: "lab", t: "مختبر التشفير" } },
    { id: "b-map", scene: "sectionTile", at: "yt-u12", data: { icon: "map", t: "خريطة الحرم" } },
    { id: "b-sort", scene: "sectionTile", at: "yt-u13", data: { icon: "sort", t: "غرفة الفرز" } },
    { id: "b-tapes", scene: "sectionTile", at: "yt-u14", data: { icon: "tape", t: "الأرشيف الصوتي" } },
    { id: "b-top", scene: "sectionTile", at: "yt-u15", data: { icon: "top", t: "المتصدرون" } },
    { id: "b-qr", scene: "qrScan", at: "yt-u16", data: {} },
    { id: "b-heirs", scene: "heirGlitch", at: "yt-u19", data: {} },
    { id: "b-writer", scene: "writerCard", at: "yt-u21", data: { initials: "ف.م" } },
    { id: "b-board", scene: "leaderboard", at: "yt-u22", data: { rows: [["وكيل النبض", "1,240"], ["عين الطيف", "980"], ["ابن S17", "875"], ["؟؟؟", "26"]] } },
    { id: "b-devices", scene: "threeDevices", at: "yt-u23", data: {} },
    { id: "b-q2", scene: "countdownOne", at: "yt-u25", data: {} },
    { id: "b-finale", scene: "ninthReveal", at: "yt-u26", data: {} },
    { id: "b-cta", scene: "ctaCard", at: "yt-u27", data: { kw: "بروتوكول التاسع", sub: "الرابط في الوصف" } },
    { id: "b-title", scene: "titleSlam", at: "yt-u28", data: {} },
    { id: "b-end", scene: "endCard", at: "yt-u29", data: { line: "ما نُسي... ينتظر." } },
  ],
};

export const VIDEOS: Video[] = [R1, R2, R3, R4, R5, YT];

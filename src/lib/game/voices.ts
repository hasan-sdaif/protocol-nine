// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — فريق الأصوات (15 صوتاً متنوعاً)
// كل تسجيل صوتي له متحدث محدد — الكاتبة ف.م. صوت أنثى (Lily)،
// الحراس التسعة لكل حارس صوت مختلف، الورثة صوت شرير (Adam).
// الخريطة تطابق tools/game/generate-audio-voices.ts حرفياً.
// ═══════════════════════════════════════════════════════════

export interface VoiceInfo {
  /** المتحدث في القصة */
  speaker: string;
  /** نوع الصوت */
  gender: "male" | "female" | "neutral";
  /** اسم صوت ElevenLabs (للتوثيق فقط — لا API وقت التشغيل) */
  voice: string;
}

export const VOICE_CAST: Record<string, VoiceInfo> = {
  // ── الوسيط — Brian ──
  "deep-phone-boot-secure-line.mp3": { speaker: "الوسيط", gender: "male", voice: "Brian" },
  "deep-phone-intro-first-transmission.mp3": { speaker: "الوسيط", gender: "male", voice: "Brian" },
  "deep-phone-recruit-welcome.mp3": { speaker: "الوسيط", gender: "male", voice: "Brian" },
  "deep-phone-p9-threshold.mp3": { speaker: "الحارس التاسع — الوسيط", gender: "male", voice: "Brian" },
  "tense-phone-breach-warning.mp3": { speaker: "الوسيط", gender: "male", voice: "Brian" },
  "deep-phone-guardian-fell.mp3": { speaker: "الوسيط", gender: "male", voice: "Brian" },
  "deep-phone-finale-you-are-the-ninth.mp3": { speaker: "الوسيط", gender: "male", voice: "Brian" },
  "deep-phone-paths-seven-gates.mp3": { speaker: "الوسيط", gender: "male", voice: "Brian" },

  // ── الحراس التسعة — تسعة أصوات مختلفة ──
  "deep-phone-p1-perception.mp3": { speaker: "الحارس الأول", gender: "male", voice: "Eric" },
  "deep-phone-p2-shift.mp3": { speaker: "الحارس الثاني", gender: "male", voice: "George" },
  "deep-phone-p3-signal.mp3": { speaker: "الحارس الثالث", gender: "female", voice: "Alice" },
  "deep-phone-p4-geography.mp3": { speaker: "الحارس الرابع", gender: "male", voice: "Daniel" },
  "deep-phone-p5-weave.mp3": { speaker: "الحارس الخامس", gender: "female", voice: "Matilda" },
  "deep-phone-p6-concealment.mp3": { speaker: "الحارس السادس", gender: "male", voice: "Roger" },
  "deep-phone-p7-numbers.mp3": { speaker: "الحارس السابع", gender: "male", voice: "Callum" },
  "deep-phone-p8-layers.mp3": { speaker: "الحارس الثامن", gender: "male", voice: "Adam" },

  // ── الكاتبة ف.م. — Lily (أنثى) ──
  "distorted-tape-fm-lesson-plate.mp3": { speaker: "الكاتبة ف.م.", gender: "female", voice: "Lily" },
  "grieving-tape-writer-confession.mp3": { speaker: "الكاتبة ف.م.", gender: "female", voice: "Lily" },
  "whispering-tape-twin-versions.mp3": { speaker: "الكاتبة ف.م.", gender: "female", voice: "Lily" },
  "deep-phone-plate-transparent.mp3": { speaker: "الكاتبة ف.م.", gender: "female", voice: "Lily" },

  // ── ذاكرة الأرشيف — Sarah (أنثى) ──
  "mysterious-phone-p0-archive-origin.mp3": { speaker: "ذاكرة الأرشيف", gender: "female", voice: "Sarah" },
  "mysterious-phone-manama-diagnosis.mp3": { speaker: "ذاكرة الأرشيف", gender: "female", voice: "Sarah" },
  "mysterious-phone-hint-intel.mp3": { speaker: "مصدر مجهول", gender: "female", voice: "Sarah" },

  // ── الوارث — Adam ──
  "distorted-tape-heirs-fake-warning.mp3": { speaker: "الوارث", gender: "male", voice: "Adam" },
  "tense-phone-sorting-room.mp3": { speaker: "الوارث", gender: "male", voice: "Adam" },

  // ── الصوت السابع — Callum ──
  "haunted-tape-seventh-voice-echo.mp3": { speaker: "الصوت السابع", gender: "male", voice: "Callum" },

  // ── أشرطة خشنة/مشوهة ──
  "distorted-tape-scream-1998-basement.mp3": { speaker: "شريط القبو ١٩٩٨", gender: "male", voice: "Harry" },
  "distorted-tape-broadcast-spectrum-room.mp3": { speaker: "بث غرفة الطيف", gender: "male", voice: "Roger" },

  // ── عملاء وعميلات الميدان ──
  "urgent-phone-distress-call-guardian.mp3": { speaker: "العميلة المجهولة", gender: "female", voice: "Laura" },
  "cold-phone-quiet-secession.mp3": { speaker: "العميلة المجهولة", gender: "female", voice: "Laura" },
  "urgent-phone-field-scan-briefing.mp3": { speaker: "وكيل الميدان", gender: "male", voice: "Eric" },
  "tense-tape-knocking-archive-door.mp3": { speaker: "شاهد الأرشيف", gender: "male", voice: "Chris" },
  "mysterious-phone-scan-beacon-confirmed.mp3": { speaker: "شبكة المنارة", gender: "female", voice: "Matilda" },

  // ── متفرقات ──
  "deep-phone-alliance-trust.mp3": { speaker: "الوسيط المساعد", gender: "male", voice: "Chris" },
  "mysterious-phone-pulse-daily.mp3": { speaker: "النبض", gender: "neutral", voice: "River" },
  "deep-phone-isa-town-structure.mp3": { speaker: "إرسالية مدينة عيسى", gender: "male", voice: "Daniel" },
  "mysterious-phone-missing-26.mp3": { speaker: "الوثيقة الغائبة", gender: "female", voice: "Matilda" },
  "haunted-tape-footsteps-s17-corridor.mp3": { speaker: "ممر S17", gender: "neutral", voice: "River" },
};

/** استخراج اسم الملف من مسار صوتي مثل /audio/xxx.mp3 */
export function audioFileOf(src: string): string {
  const clean = src.split("?")[0];
  return clean.split("/").pop() ?? clean;
}

/** معلومات المتحدث لتسجيل صوتي (أو null إن لم يُوثَّق) */
export function speakerOf(src: string): VoiceInfo | null {
  return VOICE_CAST[audioFileOf(src)] ?? null;
}

/** إحصاءات الفريق — للعرض في واجهة الأرشيف */
export const VOICE_STATS = {
  total: Object.keys(VOICE_CAST).length,
  female: Object.values(VOICE_CAST).filter((v) => v.gender === "female").length,
  male: Object.values(VOICE_CAST).filter((v) => v.gender === "male").length,
  distinct: new Set(Object.values(VOICE_CAST).map((v) => v.voice)).size,
};

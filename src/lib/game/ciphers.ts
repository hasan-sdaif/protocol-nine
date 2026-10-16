// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — مختبر التشفير المشترك (العميل + الخادم)
// دوال نظيفة بلا اعتماديات — تُستخدم في المختبر وفي التحقق
// ═══════════════════════════════════════════════════════════

const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function caesar(text: string, shift: number): string {
  const k = ((shift % 26) + 26) % 26;
  return text.replace(/[a-z]/gi, (c) => {
    const up = c.toUpperCase();
    const i = A.indexOf(up);
    if (i < 0) return c;
    return A[(i + k) % 26] ?? c;
  });
}

export const rot13 = (text: string): string => caesar(text, 13);

export function atbash(text: string): string {
  return text.replace(/[a-z]/gi, (c) => {
    const up = c.toUpperCase();
    const i = A.indexOf(up);
    if (i < 0) return c;
    return A[25 - i] ?? c;
  });
}

export function vigenere(text: string, key: string, decrypt = false): string {
  const K = key.toUpperCase().replace(/[^A-Z]/g, "");
  if (!K) return text;
  let ki = 0;
  return text.replace(/[a-z]/gi, (c) => {
    const up = c.toUpperCase();
    const i = A.indexOf(up);
    if (i < 0) return c;
    const shift = A.indexOf(K[ki % K.length] ?? "A");
    ki++;
    return A[decrypt ? (i - shift + 26) % 26 : (i + shift) % 26] ?? c;
  });
}

export const reverseText = (text: string): string => [...text].reverse().join("");

export function b64Encode(text: string): string {
  try {
    // بيئة المتصفح
    if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(text)));
    return Buffer.from(text, "utf8").toString("base64");
  } catch {
    return "";
  }
}

export function b64Decode(text: string): string {
  try {
    if (typeof atob === "function") return decodeURIComponent(escape(atob(text.trim())));
    return Buffer.from(text.trim(), "base64").toString("utf8");
  } catch {
    return "— تشفير غير صالح —";
  }
}

// ── مورس ────────────────────────────────────────────────────
export const MORSE_TABLE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "·": ".-.-.-",
};

const MORSE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([k, v]) => [v, k])
);

export function toMorse(text: string): string {
  return [...text.toUpperCase()]
    .map((c) => MORSE_TABLE[c])
    .filter(Boolean)
    .join(" ");
}

export function fromMorse(signal: string): string {
  return signal
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const clean = tok.replace(/[^.\-·–]/g, "").replace(/·/g, ".").replace(/[–—]/g, "-");
      if (!clean) return "";
      return MORSE_REVERSE[clean] ?? "#";
    })
    .join("");
}

// ── A1Z26 ───────────────────────────────────────────────────
export function toA1Z26(text: string): string {
  return [...text.toUpperCase().replace(/[^A-Z]/g, "")]
    .map((c) => A.indexOf(c) + 1)
    .join(" ");
}

export function fromA1Z26(nums: string): string {
  return nums
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((n) => {
      const v = parseInt(n, 10);
      return v >= 1 && v <= 26 ? (A[v - 1] ?? "?") : "?";
    })
    .join("");
}

// ── الجُمّل العربي ─────────────────────────────────────────
export const ABJAD_TABLE: Record<string, number> = {
  ا: 1, أ: 1, إ: 1, آ: 1, ٱ: 1, ء: 1, ب: 2, ج: 3, د: 4, ه: 5, ة: 5,
  و: 6, ؤ: 6, ز: 7, ح: 8, ط: 9, ي: 10, ى: 10, ئ: 10, ك: 20,
  ل: 30, م: 40, ن: 50, س: 60, ع: 70, ف: 80, ص: 90, ق: 100, ر: 200,
  ش: 300, ت: 400, ث: 500, خ: 600, ذ: 700, ض: 800, ظ: 900, غ: 1000,
};

export function abjadValue(text: string): number {
  return [...text.replace(/[^\u0600-\u06FF]/g, "")].reduce(
    (sum, c) => sum + (ABJAD_TABLE[c] ?? 0),
    0
  );
}

// ── الأحرف غير المرئية (ستيغانوغرافي نصي) ──────────────────
const ZW0 = "\u200B"; // zero-width space = 0
const ZW1 = "\u200C"; // zero-width non-joiner = 1
const ZWSEP = "\u200D"; // zero-width joiner = فاصل بايتات

export function zwEncode(text: string): string {
  const bytes = typeof Buffer !== "undefined"
    ? Array.from(Buffer.from(text, "utf8"))
    : Array.from(new TextEncoder().encode(text));
  return bytes
    .map((b) => b.toString(2).padStart(8, "0"))
    .map((bits) => [...bits].map((x) => (x === "0" ? ZW0 : ZW1)).join(""))
    .join(ZWSEP);
}

export function zwDecode(text: string): string {
  const parts = text.split(ZWSEP).filter((p) => p.includes(ZW0) || p.includes(ZW1));
  const bytes: number[] = [];
  for (const p of parts) {
    const bits = [...p]
      .filter((c) => c === ZW0 || c === ZW1)
      .map((c) => (c === ZW0 ? "0" : "1"))
      .join("");
    if (bits.length === 8) bytes.push(parseInt(bits, 2));
  }
  if (!bytes.length) return "";
  try {
    if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("utf8");
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return "";
  }
}

export function zwDetect(text: string): boolean {
  return text.includes(ZW0) || text.includes(ZW1) || text.includes(ZWSEP);
}

// ── تطبيع الإجابات (التحقق من الحلول) ─────────────────────
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // تشكيل وتطويل
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .replace(/\s+/g, "");
}

export function answersMatch(input: string, accepted: string[]): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  return accepted.some((a) => normalizeAnswer(a) === n);
}

// ── تشفير عربي بالقيصر (للمختبر) ───────────────────────────
const AR = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";

export function caesarArabic(text: string, shift: number): string {
  const k = ((shift % AR.length) + AR.length) % AR.length;
  return [...text]
    .map((c) => {
      const i = AR.indexOf(c);
      if (i < 0) return c;
      return AR[(i + k) % AR.length] ?? c;
    })
    .join("");
}

// ── أرقام عربية ↔ هندية ────────────────────────────────────
export function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)] ?? d);
}

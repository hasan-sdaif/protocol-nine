// ═══════════════════════════════════════════════════════════
// بانى الخط الزمني — يحسب أزمنة الوحدات والكلمات والمؤثرات
// ويطبّع الفجوات لضبط المدة الهدف بدقة ±0.5s
// الخرج: out/<id>.timeline.json
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { VIDEOS, NEW_SFX, type Video, type Unit, type Beat, type Sfx } from "./scenarios";

const T = resolve(import.meta.dir, "..");
const UNITS = join(T, "assets/audio/units");
const SFXD = join(T, "assets/audio/sfx");
const APP = join(T, "assets/audio/app");
const OUT = join(T, "out");
mkdirSync(OUT, { recursive: true });

function dur(p: string): number {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) return 0;
  const d = parseFloat(r.stdout.trim());
  return isFinite(d) ? d : 0;
}

function unitFile(u: Unit): string | null {
  if (u.kind === "reuse") {
    const p = join(APP, u.file ?? "");
    return statSync(p).size > 0 ? p : null;
  }
  const p = join(UNITS, `${u.id}.mp3`);
  return statSync(p).size > 0 ? p : null;
}

function sfxFile(id: string): string | null {
  if (id.startsWith("app:")) {
    const p = join(APP, id.slice(4));
    return statSync(p).size > 0 ? p : null;
  }
  const p = join(SFXD, `${id}.mp3`);
  return statSync(p).size > 0 ? p : null;
}

/** تقسيم الكلمات داخل الوحدة توزيعاً تناسبياً بعدد الأحرف */
function splitWords(text: string, start: number, d: number): { t: number; d: number; text: string }[] {
  const clean = text.replace(/\[[^\]]*\]/g, " ").replace(/[.,!?؟،؛:…«»"'()\-\u064B-\u0652]/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter((w) => w.length > 0);
  if (words.length === 0) return [];
  const totalChars = words.reduce((s, w) => s + w.length, 0);
  let cursor = start + d * 0.06; // تأخير بسيط لبداية النطق
  const avail = d * 0.94;
  return words.map((w) => {
    const wd = Math.max(0.16, (w.length / totalChars) * avail);
    const item = { t: cursor, d: Math.min(wd, 1.0), text: w };
    cursor += wd;
    return item;
  });
}

interface RUnit { id: string; start: number; dur: number; file: string; words: { t: number; d: number; text: string }[]; cap: boolean }
interface RSfx { file: string; at: number; vol: number; id: string }
interface RBeat extends Beat { t: number }

function buildTimeline(v: Video) {
  // قياس المدد
  const durs = new Map<string, number>();
  const files = new Map<string, string>();
  for (const u of v.units) {
    const f = unitFile(u);
    if (!f) throw new Error(`ملف مفقود للوحدة ${u.id}`);
    files.set(u.id, f);
    durs.set(u.id, dur(f));
  }
  const sfxDurs = new Map<string, number>();
  for (const s of v.sfx) {
    const f = sfxFile(s.id);
    if (!f) throw new Error(`ملف مفقود للمؤثر ${s.id}`);
    files.set(`sfx:${s.id}`, f);
    sfxDurs.set(s.id, dur(f));
  }

  const LEAD = 0.9;      // صمت افتتاحي
  const TAIL = 1.4;      // صمت ختامي
  const sumDur = [...durs.values()].reduce((a, b) => a + b, 0);
  const nominalGaps = v.units.map((u) => u.gap ?? 1.0);
  const sumGaps = nominalGaps.reduce((a, b) => a + b, 0);
  const avail = v.targetDur - LEAD - TAIL - sumDur;

  // تطبيع الفجوات: مقياس ثم تكرار مع حدود
  let scale = avail / sumGaps;
  scale = Math.min(2.2, Math.max(0.35, scale));
  let gaps = nominalGaps.map((g) => Math.min(3.6, Math.max(0.22, g * scale)));
  // تكرار تكييفي (المشبوعات تعيق الدقة) — القياس بنفس معادلة النهاية الفعلية
  const realTotal = (gs: number[]) => LEAD + sumDur + gs.slice(0, -1).reduce((a, b) => a + b, 0) + TAIL;
  for (let it = 0; it < 14; it++) {
    const err = v.targetDur - realTotal(gaps);
    if (Math.abs(err) < 0.4) break;
    const free = gaps.map((g, i) => (g > 0.24 && g < 3.55 && nominalGaps[i] > 0.3 && i < gaps.length - 1 ? 1 : 0));
    const nFree = free.reduce((a, b) => a + b, 0);
    if (nFree === 0) break;
    const adj = err / nFree;
    gaps = gaps.map((g, i) => (free[i] ? Math.min(3.6, Math.max(0.22, g + adj)) : g));
  }

  // الحساب النهائي
  const runits: RUnit[] = [];
  let cursor = LEAD;
  v.units.forEach((u, i) => {
    const d = durs.get(u.id)!;
    runits.push({ id: u.id, start: cursor, dur: d, file: files.get(u.id)!, cap: u.cap !== false && u.kind === "gen" || u.cap === true, words: splitWords(u.text, cursor, d) });
    cursor += d + gaps[i];
  });
  const total = cursor - gaps[gaps.length - 1] + TAIL;

  // حل المرسيات
  function resolve(at: string): number {
    if (at.startsWith("abs:")) return parseFloat(at.slice(4));
    const m = at.match(/^([a-z0-9\-]+)([+\-])([\d.]+)$/i);
    if (m) {
      const u = runits.find((r) => r.id === m[1]);
      if (!u) throw new Error(`مرساة مجهولة: ${at}`);
      return u.start + (m[2] === "+" ? 1 : -1) * parseFloat(m[3]);
    }
    const u = runits.find((r) => r.id === at);
    if (!u) throw new Error(`مرساة مجهولة: ${at}`);
    return u.start;
  }

  const rsfx: RSfx[] = v.sfx.map((s) => ({
    id: s.id,
    file: files.get(`sfx:${s.id}`)!,
    at: Math.max(0, resolve(s.at)),
    vol: s.vol ?? 0.6,
  }));

  const rbeats: RBeat[] = v.beats.map((b) => ({ ...b, t: Math.max(0, resolve(b.at)) }));

  return {
    id: v.id, title: v.title, orientation: v.orientation, accent: v.accent, accentDim: v.accentDim,
    duration: +total.toFixed(3), lead: LEAD, tail: TAIL,
    units: runits, sfx: rsfx, beats: rbeats,
  };
}

for (const v of VIDEOS) {
  const tl = buildTimeline(v);
  writeFileSync(join(OUT, `${v.id}.timeline.json`), JSON.stringify(tl, null, 1), "utf8");
  const speech = tl.units.reduce((s, u) => s + u.dur, 0);
  console.log(`✓ ${v.id}: ${tl.duration.toFixed(1)}s (كلام ${speech.toFixed(0)}s • ${tl.units.length} وحدة • ${tl.beats.length} مشهد • ${tl.sfx.length} مؤثر)`);
}
console.log("✓ الخطوط الزمنية جاهزة");

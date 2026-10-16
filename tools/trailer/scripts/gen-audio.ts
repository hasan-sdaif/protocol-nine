// ═══════════════════════════════════════════════════════════
// توليد أصوات التريلر — الوحدات الجديدة + المؤثرات []
// ElevenLabs v4 بأصوات فريق اللعبة (15 صوتاً)
// ثم قص الصمت وتنعيم الحواف → assets/audio/units|sfx/<id>.mp3
// قابل لإعادة التشغيل — بوابة ميزانية صارمة
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { VIDEOS, NEW_SFX, VOICE_IDS, VOICE_SETTINGS } from "./scenarios";

const ROOT = resolve(import.meta.dir, "..", "..", "..");
const T = resolve(import.meta.dir, "..");
const UNITS_DIR = join(T, "assets/audio/units");
const SFX_DIR = join(T, "assets/audio/sfx");
const MODEL = "eleven_v4";

const OK = 8 * 1024;

function readEnvKey(): string | null {
  try {
    for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
      const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  } catch { /* */ }
  return null;
}
const KEY = readEnvKey();

function size(p: string) { try { return statSync(p).size; } catch { return 0; } }
function dur(p: string): number {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) return 0;
  const d = parseFloat(r.stdout.trim());
  return isFinite(d) ? d : 0;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tts(text: string, voiceKey: string): Promise<Buffer | null> {
  const vid = VOICE_IDS[voiceKey];
  const settings = VOICE_SETTINGS[voiceKey] ?? VOICE_SETTINGS.brian;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
    method: "POST",
    headers: { "xi-api-key": KEY ?? "", "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: settings }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) {
    let d = ""; try { d = (await res.text()).slice(0, 150); } catch { /* */ }
    console.error(`    ✗ HTTP ${res.status} ${d}`);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

async function getSub(): Promise<{ used: number; limit: number } | null> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": KEY ?? "" }, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    const d = (await res.json()) as { character_count?: number; character_limit?: number };
    if (typeof d.character_count !== "number") return null;
    return { used: d.character_count, limit: d.character_limit ?? 10000 };
  } catch { return null; }
}

// قص الصمت من البداية/النهاية + حشوات صغيرة — يحافظ على الكلمات (-45dB آمن)
function trimAudio(inp: string, outp: string): boolean {
  const r = spawnSync("ffmpeg", [
    "-y", "-v", "quiet", "-i", inp,
    "-af", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.10,areverse,afade=t=in:st=0:d=0.012",
    "-ar", "44100", "-ac", "1", "-b:a", "160k", outp,
  ], { encoding: "utf8" });
  return r.status === 0;
}

async function genOne(id: string, text: string, voice: string, outDir: string): Promise<"ok" | "skip" | "fail"> {
  const out = join(outDir, `${id}.mp3`);
  if (size(out) > OK && dur(out) > 0.3) return "skip";
  console.log(`  ▶ ${id} [${voice}] ${text.length}ch: ${text.slice(0, 60)}${text.length > 60 ? "…" : ""}`);
  let buf = await tts(text, voice);
  if (!buf || buf.length < OK) {
    await sleep(1500);
    buf = await tts(text, voice);
  }
  if (!buf || buf.length < OK) return "fail";
  const raw = join(outDir, `${id}.raw.mp3`);
  writeFileSync(raw, buf);
  if (!trimAudio(raw, out)) return "fail";
  const d = dur(out);
  console.log(`    ✓ ${(size(out) / 1024).toFixed(0)}KB ${d.toFixed(2)}s`);
  return d > 0.25 ? "ok" : "fail";
}

async function main() {
  mkdirSync(UNITS_DIR, { recursive: true });
  mkdirSync(SFX_DIR, { recursive: true });
  if (!KEY) { console.error("✗ لا يوجد مفتاح"); process.exit(1); }

  // جمع الوحدات الجديدة
  const jobs: { id: string; text: string; voice: string; dir: string }[] = [];
  for (const v of VIDEOS) {
    for (const u of v.units) if (u.kind === "gen") jobs.push({ id: u.id, text: u.text, voice: u.voice ?? "brian", dir: UNITS_DIR });
  }
  for (const s of NEW_SFX) jobs.push({ id: s.id, text: s.text, voice: s.voice, dir: SFX_DIR });

  const sumChars = jobs.reduce((s, j) => s + j.text.length, 0);
  console.log(`═══ توليد أصوات التريلر: ${jobs.length} عنصراً • ${sumChars} حرفاً ═══`);

  const sub = await getSub();
  if (!sub) { console.error("✗ فشل فحص الرصيد"); process.exit(1); }
  const remaining = sub.limit - sub.used;
  console.log(`الرصيد: ${remaining} حرفاً`);
  const pending = jobs.filter((j) => !(size(join(j.dir, `${j.id}.mp3`)) > OK));
  const pendingChars = pending.reduce((s, j) => s + j.text.length, 0);
  console.log(`سيُولَّد الآن: ${pending.length} عنصراً (${pendingChars} حرفاً)`);
  if (pendingChars > remaining) {
    console.error(`✗ الرصيد لا يكفي (${pendingChars} > ${remaining})`);
    process.exit(1);
  }

  const stats = { ok: 0, skip: 0, fail: 0 };
  for (const j of pending) {
    const r = await genOne(j.id, j.text, j.voice, j.dir);
    stats[r]++;
    if (r === "ok") await sleep(400);
  }
  // عناصر متخطاة (موجودة)
  stats.skip = jobs.length - pending.length - 0;

  console.log(`\n═══════════ الملخص ═══════════`);
  console.log(`جديد: ${stats.ok} • متخطى: ${stats.skip} • فاشل: ${stats.fail}`);
  const sub2 = await getSub();
  if (sub2) console.log(`الاستهلاك: ${sub2.used - sub.used} حرفاً — المتبقي ${sub2.limit - sub2.used}`);
  if (stats.fail > 0) { console.log("✗ إخفاقات — أعد التشغيل لإكمالها"); process.exit(1); }
  console.log("✓ اكتمل توليد الأصوات");
}

main().catch((e) => { console.error(e); process.exit(1); });

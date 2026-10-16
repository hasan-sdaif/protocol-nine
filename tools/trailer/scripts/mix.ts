// ═══════════════════════════════════════════════════════════
// مزج الصوت النهائي لكل فيديو:
//   درون داكن مولّد (brown noise LP + tremolo) + hum التطبيق
//   + الوحدات (adelay دقيق) + المؤثرات → loudnorm -16 → limiter
// الخرج: out/<id>-mix.mp3
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const T = resolve(import.meta.dir, "..");
const APP = join(T, "assets/audio/app");
const OUT = join(T, "out");
const DRONE = join(T, "assets/audio/_drone.wav");

interface TL {
  id: string; duration: number;
  units: { id: string; start: number; file: string }[];
  sfx: { id: string; file: string; at: number; vol: number }[];
}

// ── توليد الدرون الداكن مرة واحدة (60s أساس يُمدّ بالتكرار) ──
function makeDrone(): boolean {
  try { if (statSync(DRONE).size > 0) return true; } catch { /* توليد */ }
  const r = spawnSync("ffmpeg", [
    "-y", "-v", "quiet",
    "-f", "lavfi", "-i", "anoisesrc=color=brown:seed=971:duration=60:amplitude=0.5",
    "-f", "lavfi", "-i", "sine=frequency=41:duration=60",
    "-filter_complex",
    "[0:a]lowpass=f=110,volume=0.55,tremolo=f=0.13:d=0.35[nz];" +
    "[1:a]volume=0.16,tremolo=f=0.27:d=0.5[sb];" +
    "[nz][sb]amix=inputs=2:normalize=0,afade=t=in:st=0:d=2,alimiter=limit=0.7:level=false[a]",
    "-map", "[a]", "-ar", "44100", "-ac", "1", DRONE,
  ], { encoding: "utf8" });
  return r.status === 0 && statSync(DRONE).size > 0;
}

function run(cmd: string, args: string[], logName: string): boolean {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`✗ ${logName}: ${String(r.stderr || "").slice(-400)}`);
    return false;
  }
  return true;
}

function buildMix(tl: TL) {
  const hum = join(APP, "sfx-ambient-hum.mp3");
  const humDur = 12; // ملف hum قصير — يُكرَّر
  const total = tl.duration + 0.5;

  // 1) السرير: درون + hum مكرر بطول الفيديو
  const bed = join(OUT, `${tl.id}-bed.wav`);
  const bedArgs = [
    "-y", "-v", "quiet",
    "-stream_loop", "-1", "-t", total.toFixed(2), "-i", DRONE,
    "-stream_loop", "-1", "-t", total.toFixed(2), "-i", hum,
    "-filter_complex",
    `[1:a]volume=0.30,volume=0.45[h];` + // hum أخفض
      `[0:a]volume=0.34[nz];` +
      `[nz][h]amix=inputs=2:normalize=0,afade=t=out:st=${(total - 2.2).toFixed(2)}:d=2.2[bed]`,
    "-map", "[bed]", "-ar", "44100", "-ac", "1", bed,
  ];
  if (!run("ffmpeg", bedArgs, `bed ${tl.id}`)) return false;

  // 2) المزج الكامل: bed + وحدات + مؤثرات
  const inputs: string[] = ["-i", bed];
  const fc: string[] = [];
  let idx = 1;
  const mixLabels: string[] = ["[0:a]"];

  for (const u of tl.units) {
    inputs.push("-i", u.file);
    fc.push(`[${idx}:a]volume=1.0,adelay=${Math.round(u.start * 1000)}|${Math.round(u.start * 1000)}[u${idx}]`);
    mixLabels.push(`[u${idx}]`);
    idx++;
  }
  for (const s of tl.sfx) {
    inputs.push("-i", s.file);
    fc.push(`[${idx}:a]volume=${s.vol.toFixed(2)},adelay=${Math.round(s.at * 1000)}|${Math.round(s.at * 1000)}[s${idx}]`);
    mixLabels.push(`[s${idx}]`);
    idx++;
  }

  fc.push(
    `${mixLabels.join("")}amix=inputs=${idx}:normalize=0:duration=first[mixraw]`,
    `[mixraw]loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.891:level=false[mix]`,
  );

  const outMp3 = join(OUT, `${tl.id}-mix.mp3`);
  const args = ["-y", "-v", "warning", ...inputs, "-filter_complex", fc.join(";"), "-map", "[mix]", "-ar", "44100", "-ac", "1", "-b:a", "192k", outMp3];
  if (!run("ffmpeg", args, `mix ${tl.id}`)) return false;

  // تحقق المدة
  const pr = spawnSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", outMp3], { encoding: "utf8" });
  const d = parseFloat(pr.stdout?.trim() ?? "0");
  const ok = Math.abs(d - tl.duration) < 0.4;
  console.log(`${ok ? "✓" : "⚠"} ${tl.id}-mix.mp3: ${d.toFixed(2)}s (هدف ${tl.duration.toFixed(2)}s)`);
  return ok;
}

mkdirSync(OUT, { recursive: true });
if (!makeDrone()) { console.error("✗ فشل توليد الدرون"); process.exit(1); }
console.log("✓ الدرون جاهز");

for (const id of ["reel1", "reel2", "reel3", "reel4", "reel5", "youtube"]) {
  const tl = JSON.parse(readFileSync(join(OUT, `${id}.timeline.json`), "utf8")) as TL;
  buildMix(tl);
}
console.log("✓ المزجات جاهزة");

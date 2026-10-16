// ═══════════════════════════════════════════════════════════
// جراحة صوتية — استئصال انفجارات المؤثرات المُقولة بصوت بشري
// من التسجيلات المتبقية (بلا أي API) واستبدالها بمؤثرات DSP
// عبر خرائط الصمت المكتشفة يدوياً (silencedetect)
// ثم إعادة فلتر الوسيط + كتابة اللعبة والتريلر + تحديث المانيفست
// ═══════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..", "..");
const T = resolve(import.meta.dir, "..");
const GAME_AUDIO = join(ROOT, "public/audio");
const APP = join(T, "assets/audio/app");
const SFXD = join(T, "assets/audio/sfx");
const MANIFEST = join(GAME_AUDIO, "manifest.json");
const TMP = join(T, "out/surgery");
mkdirSync(TMP, { recursive: true });

interface Surgery {
  key: string;                    // معرف المانيفست
  section: "aa_audio" | "r3_audio";
  file: string;
  medium: "phone" | "tape";
  keep: [number, number][];       // مقاطع الكلام المحفوظة (الثواني)
  speechDelay: number;            // تأخير الكلام بعد القص
  layers: { sfx: string; at: number; vol: number; trim?: [number, number] }[];
  stripTag: string;
}

// خرائط الصمت (silencedetect -38dB) — الانفجارات المعزولة = مؤثرات مُقولة
const JOBS: Surgery[] = [
  {
    key: "aa-p0-archive-origin", section: "aa_audio", file: "mysterious-phone-p0-archive-origin.mp3", medium: "phone",
    keep: [[0.60, 9999]], speechDelay: 0.75,
    layers: [{ sfx: "recorder-clicks.mp3", at: 0, vol: 0.7 }],
    stripTag: "[old tape recorder clicks]",
  },
  {
    key: "r3-fm-plate", section: "r3_audio", file: "distorted-tape-fm-lesson-plate.mp3", medium: "tape",
    keep: [[0.62, 9999]], speechDelay: 0.75,
    layers: [{ sfx: "recorder-clicks.mp3", at: 0, vol: 0.7 }],
    stripTag: "[old tape recorder clicks]",
  },
  {
    key: "r3-spectrum", section: "r3_audio", file: "distorted-tape-broadcast-spectrum-room.mp3", medium: "tape",
    keep: [[0.70, 9999]], speechDelay: 1.5,
    layers: [{ sfx: "radio-tuning.mp3", at: 0, vol: 0.65 }],
    stripTag: "[radio static tuning]",
  },
  {
    key: "r3-seventh-voice", section: "r3_audio", file: "haunted-tape-seventh-voice-echo.mp3", medium: "tape",
    keep: [[1.05, 9999]], speechDelay: 1.0,
    layers: [{ sfx: "breath-low.mp3", at: 0, vol: 0.55 }],
    stripTag: "[low breathing]",
  },
  {
    key: "r3-twin", section: "r3_audio", file: "whispering-tape-twin-versions.mp3", medium: "tape",
    keep: [[0, 7.99]], speechDelay: 0,
    layers: [{ sfx: "tape-hiss.mp3", at: 7.8, vol: 0.5 }],
    stripTag: "[tape hiss]",
  },
  {
    key: "r3-beacon", section: "r3_audio", file: "mysterious-phone-scan-beacon-confirmed.mp3", medium: "phone",
    // استئصال انفجار النقرة المقول 3.731→3.811
    keep: [[0, 3.731], [3.811, 9999]], speechDelay: 0,
    layers: [{ sfx: "beeps-monitor.mp3", at: 3.55, vol: 0.55, trim: [0.25, 0.62] }],
    stripTag: "[beeps]",
  },
  {
    key: "r3-distress", section: "r3_audio", file: "urgent-phone-distress-call-guardian.mp3", medium: "phone",
    keep: [[0, 8.30]], speechDelay: 0,
    layers: [{ sfx: "line-cut.mp3", at: 8.32, vol: 0.6 }],
    stripTag: "[line cuts]",
  },
];

const run = (cmd: string, args: string[], name: string): boolean => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) { console.error(`  ✗ ${name}: ${String(r.stderr || "").slice(-300)}`); return false; }
  return true;
};
function dur(p: string): number {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" });
  const d = parseFloat(r.stdout?.trim() ?? "");
  return isFinite(d) ? d : 0;
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Record<string, unknown>;
let ok = 0, fail = 0;

for (const j of JOBS) {
  console.log(`▶ ${j.key} [${j.medium}]`);
  const src = join(GAME_AUDIO, j.file);

  // 1) بناء مسار الكلام من المقاطع المحفوظة
  const speechWav = join(TMP, `${j.key}.speech.wav`);
  const srcArgs: string[] = [];
  const fc: string[] = [];
  const labels: string[] = [];
  j.keep.forEach((k, i) => {
    srcArgs.push("-i", src);
    fc.push(`[${i}:a]atrim=start=${k[0]}:end=${k[1]},asetpts=PTS-STARTPTS[s${i}]`);
    labels.push(`[s${i}]`);
  });
  if (j.keep.length > 1) {
    fc.push(`${labels.join("")}concat=n=${j.keep.length}:v=0:a=1[sp]`);
  } else {
    fc.push(`${labels[0]}anull[sp]`);
  }
  if (!run("ffmpeg", ["-y", "-v", "quiet", ...srcArgs, "-filter_complex", fc.join(";"), "-map", "[sp]", "-ar", "44100", "-ac", "1", speechWav], `speech ${j.key}`)) { fail++; continue; }
  const speechDur = dur(speechWav);

  // 2) المزج: كلام (بتأخير) + مؤثرات DSP
  const inputs: string[] = ["-i", speechWav];
  const mix: string[] = [];
  const mixLabels: string[] = [];
  const delayMs = Math.round(j.speechDelay * 1000);
  mix.push(`[0:a]volume=1.0${delayMs > 0 ? `,adelay=${delayMs}|${delayMs}` : ""}[n0]`);
  mixLabels.push("[n0]");
  let idx = 1;
  for (const layer of j.layers) {
    inputs.push("-i", join(SFXD, layer.sfx));
    let chain = "";
    if (layer.trim) chain += `,atrim=start=${layer.trim[0]}:end=${layer.trim[1]},asetpts=PTS-STARTPTS`;
    const ms = Math.max(0, Math.round(layer.at * 1000));
    mix.push(`[${idx}:a]volume=${layer.vol}${chain},adelay=${ms}|${ms}[e${idx}]`);
    mixLabels.push(`[e${idx}]`);
    idx++;
  }
  mix.push(`${mixLabels.join("")}amix=inputs=${idx}:normalize=0:duration=longest,alimiter=limit=0.95:level=false[m]`);
  const mixedWav = join(TMP, `${j.key}.mixed.wav`);
  if (!run("ffmpeg", ["-y", "-v", "quiet", ...inputs, "-filter_complex", mix.join(";"), "-map", "[m]", "-ar", "44100", "-ac", "1", mixedWav], `mix ${j.key}`)) { fail++; continue; }

  // 3) فلتر الوسيط
  const af = j.medium === "tape" ? "highpass=f=200,lowpass=f=4800" : "highpass=f=300,lowpass=f=3400";
  const ar = j.medium === "tape" ? "16000" : "8000";
  const br = j.medium === "tape" ? "56k" : "48k";
  const finalMp3 = join(TMP, `${j.key}.final.mp3`);
  if (!run("ffmpeg", ["-y", "-v", "quiet", "-i", mixedWav, "-af", af, "-ar", ar, "-ac", "1", "-b:a", br, finalMp3], `dsp ${j.key}`)) { fail++; continue; }

  // 4) كتابة اللعبة + التريلر
  copyFileSync(finalMp3, join(GAME_AUDIO, j.file));
  copyFileSync(finalMp3, join(APP, j.file));
  console.log(`  ✓ ${j.file} — ${(speechDur + j.speechDelay).toFixed(2)}s كلام + ${j.layers.length} مؤثر DSP (${dur(join(GAME_AUDIO, j.file)).toFixed(2)}s نهائي)`);

  // 5) تحديث نص المانيفست
  const section = manifest[j.section] as { id: string; text: string; [k: string]: unknown }[];
  const entry = section.find((e) => e.id === j.key)!;
  entry.text = entry.text.replace(j.stripTag, "").replace(/\s{2,}/g, " ").trim();
  entry.effectsReplaced = true;
  if (!Array.isArray(entry.dspEffects)) entry.dspEffects = [];
  (entry.dspEffects as string[]).push(...j.layers.map((l) => l.sfx));
  ok++;
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
console.log(`\n═══ جراحة: نجح ${ok} • فشل ${fail} ═══`);
if (fail) process.exit(1);

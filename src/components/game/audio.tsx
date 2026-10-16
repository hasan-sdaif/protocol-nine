"use client";

// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — نظام الصوت الثابت
// كل الملفات MP3 محفوظة مسبقاً في public/audio — لا توليد ولا API
// مورس يُخلَّق محلياً بمذبذب Web Audio (تفاعل واجهة فقط)
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Radio, Volume2, VolumeX, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { MORSE_TABLE } from "@/lib/game/ciphers";
import { speakerOf } from "@/lib/game/voices";

export const AUDIO_SFX = {
  ring: "/audio/sfx-phone-ring.mp3",
  morse: "/audio/sfx-morse-shadow.mp3",
  hum: "/audio/sfx-ambient-hum.mp3",
  click: "/audio/sfx-ui-click.mp3",
  error: "/audio/sfx-ui-error.mp3",
  success: "/audio/sfx-ui-success.mp3",
} as const;

// ── المؤثرات الصوتية (ملفات ثابتة) ────────────────────────
class Sfx {
  private ambient: HTMLAudioElement | null = null;
  muted = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.muted = window.localStorage.getItem("p9-muted") === "1";
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("p9-muted", this.muted ? "1" : "0");
    }
    if (this.muted) this.stopAmbient();
    else this.startAmbient();
    return this.muted;
  }

  private play(file: string, volume = 0.5): void {
    if (this.muted || typeof window === "undefined") return;
    try {
      const a = new Audio(file);
      a.volume = volume;
      void a.play().catch(() => undefined);
    } catch {
      /* تجاهل */
    }
  }

  click() { this.play(AUDIO_SFX.click, 0.35); }
  success() { this.play(AUDIO_SFX.success, 0.55); }
  error() { this.play(AUDIO_SFX.error, 0.6); }
  ring() { this.play(AUDIO_SFX.ring, 0.5); }
  morseShadow() { this.play(AUDIO_SFX.morse, 0.5); }

  startAmbient() {
    if (this.muted || typeof window === "undefined" || this.ambient) return;
    try {
      const a = new Audio(AUDIO_SFX.hum);
      a.loop = true;
      a.volume = 0.16;
      void a.play().then(() => { this.ambient = a; }).catch(() => undefined);
    } catch {
      /* تجاهل */
    }
  }

  stopAmbient() {
    this.ambient?.pause();
    this.ambient = null;
  }
}

export const sfx = new Sfx();

// ── راديو الإرساليات: مشغّل شامل واحد للتشغيل التلقائي ──
// إرسالية واحدة تعمل في أي لحظة — تُوقف سابقتها تلقائياً
type DeckTrack = { src: string; label: string };
type DeckListener = (track: DeckTrack | null) => void;

class TransmissionDeck {
  private audio: HTMLAudioElement | null = null;
  private ring: HTMLAudioElement | null = null;
  private listeners = new Set<DeckListener>();
  track: DeckTrack | null = null;
  playing = false;
  progress = 0;
  /** آخر مقطع شُغّل — لمنع تكرار نفس الإرسالية تلقائياً */
  lastAuto: string | null = null;

  onChange(fn: DeckListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.playing ? this.track : null);
  }

  stop() {
    this.ring?.pause();
    this.ring = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.ontimeupdate = null;
      this.audio.onended = null;
    }
    this.audio = null;
    if (this.playing) {
      this.playing = false;
      this.progress = 0;
      this.emit();
    }
  }

  /** شغّل إرسالية: رنة قصيرة ثم الصوت — بلا أي API (ملفات ثابتة) */
  play(src: string, label = "إرسالية هاتفية", opts?: { ring?: boolean }) {
    if (typeof window === "undefined") return;
    this.stop();
    this.track = { src, label };
    if (sfx.muted) return;
    const useRing = opts?.ring !== false;
    const startVoice = () => {
      const voice = new Audio(src);
      this.audio = voice;
      voice.volume = 0.95;
      this.playing = true;
      this.emit();
      voice.ontimeupdate = () => {
        if (voice.duration > 0) {
          this.progress = voice.currentTime / voice.duration;
          this.emit();
        }
      };
      voice.onended = () => {
        this.playing = false;
        this.progress = 0;
        this.emit();
      };
      void voice.play().catch(() => {
        this.playing = false;
        this.emit();
      });
    };
    if (useRing) {
      const ring = new Audio(AUDIO_SFX.ring);
      ring.volume = 0.42;
      this.ring = ring;
      void ring.play().catch(() => undefined);
      window.setTimeout(() => {
        ring.pause();
        this.ring = null;
        startVoice();
      }, 2400);
    } else {
      startVoice();
    }
  }
}

export const deck = new TransmissionDeck();

// ── التشغيل التلقائي للإرساليات السياقية ─────────────────
// يعمل بعد أول تفاعل من المستخدم (سياسة المتصفحات)،
// ويحترم الكتم، ولا يكرر نفس المقطع مرتين متتاليتين
export function useAutoTransmission(src: string | null | undefined, label: string, opts?: { ring?: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const off = deck.onChange(() => force((n) => n + 1));
    return off;
  }, []);
  useEffect(() => {
    if (!src) return;
    if (sfx.muted) return;
    if (deck.lastAuto === src) return;
    deck.lastAuto = src;
    deck.play(src, label, opts);
  }, [src]);
}

// ── مؤشر الإرسالية الحية العائم (يظهر أثناء البث) ───────
export function LiveTransmissionBadge({ bottomOffset = "1.25rem" }: { bottomOffset?: string }) {
  const [track, setTrack] = useState<DeckTrack | null>(null);
  useEffect(() => deck.onChange(setTrack), []);
  if (!track) return null;
  return (
    <button
      type="button"
      onClick={() => deck.stop()}
      className="fixed bottom-[--bo] z-50 flex items-center gap-2 rounded-full border border-primary/40 bg-card/95 px-3 py-1.5 backdrop-blur-sm"
      style={{ bottom: bottomOffset, insetInlineStart: "1rem" } as React.CSSProperties}
      aria-label={`إرسالية تعمل: ${track.label} — إيقاف`}
    >
      <span className="rec-dot h-2 w-2 rounded-full bg-primary" />
      <span className="max-w-[150px] truncate text-[0.68rem] text-primary">{track.label}</span>
      <span className="font-mono text-[0.6rem] text-muted-foreground" dir="ltr">■ STOP</span>
    </button>
  );
}

// ── خلّق مورس محلياً (مذبذب — بلا أي API) ─────────────────
let audioCtx: AudioContext | null = null;
export function playMorseLocal(signal: string, wpm = 14): number {
  if (typeof window === "undefined") return 0;
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = audioCtx;
    const unit = 1.2 / wpm; // ثانية لكل عنصر
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 620;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    let t = ctx.currentTime + 0.05;
    const chars = signal.replace(/·/g, ".").replace(/[–—]/g, "-").split("");
    for (const c of chars) {
      if (c === ".") {
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.setValueAtTime(0, t + unit);
        t += unit * 2;
      } else if (c === "-") {
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.setValueAtTime(0, t + unit * 3);
        t += unit * 4;
      } else if (c === " ") {
        t += unit * 2;
      } else {
        t += unit * 4; // فاصل كلمات
      }
    }
    osc.start(ctx.currentTime);
    osc.stop(t + 0.1);
    return (t - ctx.currentTime) * 1000;
  } catch {
    return 0;
  }
}

export function playTextAsMorse(text: string): number {
  const up = text.toUpperCase();
  const signal = [...up]
    .map((c) => MORSE_TABLE[c])
    .filter(Boolean)
    .join(" ");
  return playMorseLocal(signal);
}

// ── شارة المتحدث: تميّز صوت أنثى/ذكر/محايد بصرياً ─────────
function SpeakerBadge({ src }: { src: string }) {
  const info = speakerOf(src);
  if (!info) return null;
  const isFemale = info.gender === "female";
  const isNeutral = info.gender === "neutral";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.58rem] font-bold leading-none",
        isFemale
          ? "border-rose-400/50 bg-rose-400/10 text-rose-300"
          : isNeutral
            ? "border-border/60 bg-muted/40 text-muted-foreground"
            : "border-primary/40 bg-primary/10 text-primary"
      )}
      title={`الصوت: ${info.voice} (${info.gender === "female" ? "أنثى" : info.gender === "male" ? "ذكر" : "محايد"})`}
    >
      <Mic className="h-2.5 w-2.5" />
      {info.speaker}
      {isFemale && <span aria-hidden>♀</span>}
    </span>
  );
}

// ── مشغّل الإرسالية: رنة ثم الصوت ─────────────────────────
export function PhonePlayer({
  src,
  label = "إرسالية هاتفية",
  compact = false,
}: {
  src: string;
  label?: string;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "ringing" | "playing">("idle");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      ringRef.current?.pause();
    };
  }, [src]);

  const stop = () => {
    audioRef.current?.pause();
    ringRef.current?.pause();
    setPhase("idle");
    setProgress(0);
  };

  const start = () => {
    sfx.click();
    stop();
    setPhase("ringing");
    const ring = new Audio(AUDIO_SFX.ring);
    ring.volume = 0.5;
    ringRef.current = ring;
    void ring.play().catch(() => undefined);
    const voice = new Audio(src);
    audioRef.current = voice;
    voice.volume = 0.95;
    const ringMs = 2600;
    window.setTimeout(() => {
      ring.pause();
      if (sfx.muted) {
        setPhase("idle");
        return;
      }
      setPhase("playing");
      voice.ontimeupdate = () => {
        if (voice.duration > 0) setProgress(voice.currentTime / voice.duration);
      };
      voice.onended = () => {
        setPhase("idle");
        setProgress(0);
      };
      void voice.play().catch(() => setPhase("idle"));
    }, ringMs);
  };

  const playing = phase !== "idle";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded border border-primary/25 bg-card/70 px-3",
        compact ? "py-1.5" : "py-2.5"
      )}
    >
      <button
        type="button"
        onClick={playing ? stop : start}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all",
          playing
            ? "border-primary bg-primary/20 text-primary pulse-ring"
            : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/15"
        )}
        aria-label={playing ? "إيقاف الإرسالية" : "تشغيل الإرسالية"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className={cn("h-3.5 w-3.5 shrink-0", playing && "text-primary")} />
          <span className="truncate">{label}</span>
          <SpeakerBadge src={src} />
          {phase === "ringing" && <span className="rec-dot text-primary">● حركة خط...</span>}
          {phase === "playing" && <span className="text-primary">● بث</span>}
        </div>
        {playing && (
          <div className="mt-1 h-1 overflow-hidden rounded bg-primary/10" dir="ltr">
            <div
              className="h-full bg-primary/70 transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── زر كتم/تشغيل الأجواء ──────────────────────────────────
export function MuteButton() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setMuted(sfx.muted);
    const on = () => {
      sfx.startAmbient();
      window.removeEventListener("pointerdown", on);
    };
    window.addEventListener("pointerdown", on);
    return () => window.removeEventListener("pointerdown", on);
  }, []);
  return (
    <button
      type="button"
      onClick={() => setMuted(sfx.toggleMute())}
      className="flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:text-primary"
      aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
      title={muted ? "تشغيل الصوت" : "كتم الصوت"}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}

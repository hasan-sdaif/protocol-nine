"use client";

// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — مؤثرات الواجهة (CRT / آلة كاتبة / وميض)
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ── طبقة الأجواء العامة (scanlines + vignette + noise) ────
export function CRTLayer() {
  return (
    <>
      <div className="crt-noise" aria-hidden="true" />
      <div className="crt-scanlines" aria-hidden="true" />
      <div className="crt-vignette" aria-hidden="true" />
    </>
  );
}

// ── آلة كاتبة: تظهر النص حرفاً حرفاً ───────────────────────
export function Typewriter({
  text,
  speed = 26,
  className,
  caret = true,
  onDone,
  as: Tag = "p",
}: {
  text: string;
  speed?: number;
  className?: string;
  caret?: boolean;
  onDone?: () => void;
  as?: "p" | "div" | "span" | "h1" | "h2" | "h3";
}) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => {
    setShown(0);
    doneRef.current = false;
  }, [text]);
  useEffect(() => {
    if (shown >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const t = setTimeout(() => setShown((s) => s + 1), speed);
    return () => clearTimeout(t);
  }, [shown, text, speed, onDone]);
  return (
    <Tag className={cn(caret && shown < text.length && "typewriter-caret", className)}>
      {text.slice(0, shown)}
    </Tag>
  );
}

// ── وميض انتهاك عند الخطأ ─────────────────────────────────
export function GlitchOnce({ trigger, children }: { trigger: number; children: React.ReactNode }) {
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (trigger <= 0) return;
    setBurst(true);
    const t = setTimeout(() => setBurst(false), 1200);
    return () => clearTimeout(t);
  }, [trigger]);
  return <div className={cn(burst && "glitch-burst")}>{children}</div>;
}

// ── عنوان قسم موحّد ───────────────────────────────────────
export function SectionHead({
  code,
  title,
  sub,
  icon,
}: {
  code: string;
  title: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded border border-primary/30 bg-primary/10 text-primary text-glow-amber">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[0.7rem] tracking-[0.3em] text-muted-foreground" dir="ltr">
          {code}
        </div>
        <h2 className="text-xl font-bold leading-tight text-foreground text-glow-amber sm:text-2xl">
          {title}
        </h2>
        {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

// ── شريحة إحصائية ─────────────────────────────────────────
export function StatChip({
  label,
  value,
  tone = "amber",
}: {
  label: string;
  value: string | number;
  tone?: "amber" | "green" | "red" | "muted";
}) {
  const tones: Record<string, string> = {
    amber: "border-primary/30 text-primary",
    green: "border-emerald-700/50 text-emerald-400",
    red: "border-destructive/40 text-red-400",
    muted: "border-border text-muted-foreground",
  };
  return (
    <div className={cn("rounded border bg-card/60 px-3 py-1.5 text-center", tones[tone])}>
      <div className="text-[0.65rem] text-muted-foreground">{label}</div>
      <div className="font-mono text-lg leading-none" dir="ltr">
        {value}
      </div>
    </div>
  );
}

// ── عدّاد نقطي متحرك (نقاط الوسيط) ────────────────────────
export function Dots({ n = 3 }: { n?: number }) {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="rec-dot inline-block h-1 w-1 rounded-full bg-primary"
          style={{ animationDelay: `${i * 0.25}s` }}
        />
      ))}
    </span>
  );
}

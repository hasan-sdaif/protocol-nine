"use client";

// ═══════════════════════════════════════════════════════════
// شاشة الإقلاع — CRT: تحميل ملفات الأرشيف
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, ChevronLeft } from "lucide-react";
import { Typewriter, Dots } from "./effects";
import { sfx } from "./audio";

const LINES = [
  { text: "> تهيئة الخط الآمن...", speed: 34 },
  { text: "> تحميل ملفات الأرشيف... [تم]", speed: 22 },
  { text: "> رُصد 10 بروتوكولات و101 وثيقة.", speed: 26 },
  { text: "> حالة الوثيقة AA-4-26: مفقودة. السبب: غير معروف.", speed: 30 },
  { text: "> تحذير: رُصدت 7 ملفات خارجية غير معتمدة.", speed: 24 },
  { text: "> الاتصال بالأرشيف المركزي... محاولة 1/3", speed: 40 },
  { text: "> الاتصال بالأرشيف المركزي... [تم]", speed: 40 },
  { text: "> الخط آمن. لا تتحدث. اسمع فقط.", speed: 55 },
];

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (lineIdx >= LINES.length) {
      const t = setTimeout(() => setReady(true), 400);
      return () => clearTimeout(t);
    }
  }, [lineIdx]);

  const skip = () => {
    if (started.current) return;
    started.current = true;
    sfx.click();
    onDone();
  };

  return (
    <div
      className="crt-flicker flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10"
      onClick={skip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && skip()}
      aria-label="شاشة إقلاع — انقر للتخطي"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/5 text-primary text-glow-amber seal-rotate">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="font-mono text-2xl tracking-[0.35em] text-primary text-glow-amber" dir="ltr">
            PROTOCOL&nbsp;NINE
          </h1>
          <p className="mt-2 font-doc text-lg text-foreground/90">البروتوكول التاسع</p>
          <p className="mt-1 text-xs text-muted-foreground">منظومة الظل — جامعة البحرين، صخير</p>
        </div>

        <div className="panel panel-corner-ticks p-5 sm:p-6">
          <div className="space-y-2 font-mono text-sm leading-7 sm:text-base" dir="ltr">
            {LINES.slice(0, lineIdx + 1).map((line, i) => (
              <div
                key={i}
                className={
                  line.text.includes("تحذير")
                    ? "text-red-400 text-glow-red"
                    : line.text.includes("[تم]")
                      ? "text-emerald-400"
                      : "text-foreground/85"
                }
              >
                {i === lineIdx ? (
                  <Typewriter
                    text={line.text}
                    speed={line.speed}
                    onDone={() => setLineIdx(i + 1)}
                    caret={false}
                  />
                ) : (
                  line.text
                )}
              </div>
            ))}
            {!ready && lineIdx < LINES.length && (
              <div className="text-primary">
                <Dots />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex min-h-[52px] items-center justify-center">
          {ready && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                skip();
              }}
              className="group flex items-center gap-2 rounded border border-primary/50 bg-primary/10 px-8 py-3 font-bold text-primary transition-all hover:bg-primary/20 pulse-ring"
            >
              <span className="font-doc text-lg">افتح الخط</span>
              <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-[0.65rem] text-muted-foreground/60">
          انقر في أي مكان للتخطي — AA: الأرشيف يُراقب — إنك لن تلاحظ هذا إلا إذا كنت تُلاحظ.
        </p>
      </div>
    </div>
  );
}

"use client";

// ═══════════════════════════════════════════════════════════
// عارض مواد اللغز — حسب نوع المادة
// code/morse/numbers/map/stego/invisible/vault/none
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { Copy, Check, MapPin, Volume2, Hand, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { playMorseLocal, playTextAsMorse, sfx } from "./audio";

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        sfx.click();
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* قد تكون محظورة */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[0.65rem] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      aria-label="نسخ المادة كاملة"
    >
      {done ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {done ? "نُسخت" : "انسخ كاملاً"}
    </button>
  );
}

// الحبر الخفي: يظهر عند الضغط المستمر (كاشف الضوء)
function InvisibleInk({ text }: { text: string }) {
  const [lit, setLit] = useState(false);
  return (
    <div>
      <div
        onPointerDown={() => setLit(true)}
        onPointerUp={() => setLit(false)}
        onPointerLeave={() => setLit(false)}
        onPointerCancel={() => setLit(false)}
        className={cn(
          "select-none rounded border border-dashed border-primary/30 bg-black/80 px-4 py-6 text-center font-doc text-lg transition-all",
          lit ? "ink-revealed border-primary/60 glow-soft-amber" : "ink-hidden cursor-pointer"
        )}
        role="button"
        tabIndex={0}
        aria-label="منطقة حبر خفي — اضغط باستمرار لتمرير الكاشف"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setLit((v) => !v);
        }}
      >
        {text}
      </div>
      <p className="mt-1.5 flex items-center justify-center gap-1 text-[0.65rem] text-muted-foreground">
        <Hand className="h-3 w-3" />
        اضغط باستمرار (أو المس واسحب) لتمرير كاشف الضوء فوق الأسطر المظلمة
      </p>
    </div>
  );
}

// مشغّل مورس محلي (مذبذب)
function MorsePlay({ signal, isShadowRecording }: { signal: string; isShadowRecording: boolean }) {
  const [playing, setPlaying] = useState(false);
  const play = () => {
    sfx.click();
    if (isShadowRecording) {
      // تسجيل الأرشيف الثابت «SHADOW»
      const a = new Audio("/audio/sfx-morse-shadow.mp3");
      a.volume = 0.5;
      setPlaying(true);
      a.onended = () => setPlaying(false);
      void a.play().catch(() => setPlaying(false));
      return;
    }
    const ms = playMorseLocal(signal);
    if (ms > 0) {
      setPlaying(true);
      setTimeout(() => setPlaying(false), ms);
    }
  };
  return (
    <button
      type="button"
      onClick={play}
      disabled={playing}
      className={cn(
        "flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors",
        playing
          ? "border-primary/60 bg-primary/20 text-primary"
          : "border-primary/30 text-primary hover:bg-primary/10"
      )}
      aria-label="استمع إلى الإشارة"
    >
      <Volume2 className={cn("h-3.5 w-3.5", playing && "animate-pulse")} />
      {playing ? "الإشارة تُبث..." : "استمع إلى الإشارة"}
    </button>
  );
}

export default function MaterialView({
  material,
  kind,
  puzzleId,
  onOpenMap,
}: {
  material: string;
  kind: string;
  puzzleId: string;
  onOpenMap?: (puzzleId: string) => void;
}) {
  if (kind === "vault") {
    return (
      <div className="rounded border border-primary/20 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-doc text-base text-foreground/90">{material}</p>
        <p className="mt-1 flex items-center gap-1 text-[0.65rem]">
          <Lightbulb className="h-3 w-3 text-primary" />
          لوحة الخزنة تفتح أدناه — تسع خانات بشظاياك التسع.
        </p>
      </div>
    );
  }

  if (kind === "map") {
    return (
      <div className="rounded border border-primary/20 bg-card/50 px-4 py-3">
        <p className="font-doc text-base leading-7 text-foreground/90">{material}</p>
        {onOpenMap && (
          <button
            type="button"
            onClick={() => {
              sfx.click();
              onOpenMap(puzzleId);
            }}
            className="mt-2 flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
          >
            <MapPin className="h-3.5 w-3.5" />
            افتح خريطة الحرم
          </button>
        )}
      </div>
    );
  }

  if (kind === "stego") {
    return (
      <div className="rounded border border-primary/20 bg-card/50 p-3">
        <p className="whitespace-pre-wrap break-all rounded bg-black/40 p-3 font-mono text-sm leading-7 text-foreground/85" dir="auto">
          {material}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[0.65rem] text-muted-foreground">
            يبدو بريئاً... انسخه «كاملاً» ثم المختبر ← محلل الطيف.
          </p>
          <CopyBtn text={material} />
        </div>
      </div>
    );
  }

  if (kind === "invisible") {
    return <InvisibleInk text={material} />;
  }

  if (kind === "morse") {
    return (
      <div className="rounded border border-primary/20 bg-card/50 p-3">
        <p className="break-all rounded bg-black/40 p-3 font-mono text-lg tracking-[0.2em] text-primary/90" dir="ltr">
          {material}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.65rem] text-muted-foreground">
            نقاط وشرطات — استمع أو اقرأ، ثم أداة مورس في المختبر.
          </p>
          <MorsePlay signal={material} isShadowRecording={puzzleId === "p3-a"} />
        </div>
      </div>
    );
  }

  if (kind === "code" || kind === "numbers") {
    return (
      <div className="rounded border border-primary/20 bg-card/50 p-3">
        <p className="break-all rounded bg-black/40 p-3 font-mono text-base leading-7 text-primary/90" dir="ltr">
          {material}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[0.65rem] text-muted-foreground">
            {kind === "numbers" ? "أرقام تنتظر أبجديتها..." : "شيفرة تنتظر فاكّها..."}
          </p>
          <CopyBtn text={material} />
        </div>
      </div>
    );
  }

  // none — اقتباس/نص سردي
  return (
    <div className="rounded border border-primary/20 bg-card/50 px-4 py-3">
      <p className="font-doc text-base leading-8 text-foreground/90">{material}</p>
    </div>
  );
}

// زر مورس عام للاستخدام في المختبر
export function MorseSynthButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        sfx.click();
        const ms = playTextAsMorse(text);
        if (ms > 0) {
          setPlaying(true);
          setTimeout(() => setPlaying(false), ms);
        }
      }}
      disabled={playing || !text.trim()}
      className="flex items-center gap-1.5 rounded border border-primary/30 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
    >
      <Volume2 className={cn("h-3.5 w-3.5", playing && "animate-pulse")} />
      {playing ? "يُبث..." : "اسمع المورس"}
    </button>
  );
}

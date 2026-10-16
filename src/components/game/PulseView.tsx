"use client";

// ═══════════════════════════════════════════════════════════
// النبض — إشارة الأرشيف اليومية (حتمية بالتاريخ + سلسلة)
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { Radio, Flame, Loader2, Send, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PhonePlayer, sfx } from "./audio";
import { SectionHead, StatChip, GlitchOnce } from "./effects";
import type { Game } from "./useGame";

export default function PulseView({ game }: { game: Game }) {
  const state = game.state;
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [glitch, setGlitch] = useState(0);

  if (!state) return null;
  const pulse = state.pulse;

  const submit = async () => {
    if (busy || !answer.trim()) return;
    setBusy(true);
    setFeedback(null);
    const res = await game.submitPulse(answer);
    setBusy(false);
    const r = res.data.result as { correct: boolean; message: string } | undefined;
    if (!res.ok || !r) {
      sfx.error();
      setGlitch((g) => g + 1);
      setFeedback({ ok: false, msg: res.data.error ?? "خلل في النبض." });
      return;
    }
    if (r.correct) {
      sfx.success();
      setFeedback({ ok: true, msg: r.message });
      setAnswer("");
    } else {
      sfx.error();
      setGlitch((g) => g + 1);
      setFeedback({ ok: false, msg: r.message });
    }
  };

  return (
    <div className="space-y-5">
      <div className="panel panel-corner-ticks p-4 sm:p-5">
        <SectionHead
          code={`PULSE // ${pulse.date}`}
          title="نبض الأرشيف"
          sub="إشارة واحدة كل يوم — لمن يراقب. فكّها اليوم أو انتظر الغد."
          icon={<Radio className="h-4 w-4" />}
        />
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatChip label="سلسلتك" value={`${pulse.streak} يوم`} tone="amber" />
          <StatChip label="مكافأة اليوم" value={`+${pulse.potentialPoints}`} tone="green" />
          <StatChip label="أسلوب الإشارة" value={pulse.methodName} tone="muted" />
        </div>

        <PhonePlayer src="/audio/mysterious-phone-pulse-daily.mp3" label="نشرة الوسيط — النبض" compact />

        {/* نشرة الوسيط */}
        <div className="mt-4 rounded border border-primary/20 bg-black/30 p-4">
          <div className="mb-1 font-mono text-[0.6rem] tracking-widest text-muted-foreground" dir="ltr">
            MEDIATOR BULLETIN
          </div>
          <p className="font-doc text-base leading-8 text-foreground/90">{pulse.story}</p>
        </div>

        {/* الإشارة */}
        <div className="mt-3 rounded border border-primary/25 bg-card/60 p-4">
          <p className="mb-2 text-[0.65rem] text-muted-foreground">إشارة اليوم — فكّها بأدوات المختبر:</p>
          <p className="break-all rounded bg-black/40 p-3 font-mono text-lg tracking-[0.15em] text-primary/95" dir="ltr">
            {pulse.material}
          </p>
        </div>

        {/* الحالة والحل */}
        {pulse.solved ? (
          <div className="mt-4 flex items-center gap-2 rounded border border-emerald-800/60 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-300 text-glow-green">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>نبضة اليوم فُكَّت. عد غداً — السلسلة {pulse.streak} يوم متصلة.</span>
          </div>
        ) : pulse.locked ? (
          <div className="mt-4 flex items-center gap-2 rounded border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-400">
            <Lock className="h-5 w-5 shrink-0" />
            <span>أخطأتَ اليوم — النبضة مقفلة حتى الغد. الغائب يخسر، واليقظ يتصدر.</span>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="قراءتك للإشارة..."
              dir="auto"
              disabled={busy}
            />
            <Button onClick={submit} disabled={busy || !answer.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only sm:not-sr-only sm:ml-1.5">أرسل</span>
            </Button>
          </div>
        )}

        {feedback && (
          <GlitchOnce trigger={glitch}>
            <p
              className={cn(
                "mt-3 rounded border px-3 py-2 text-sm",
                feedback.ok
                  ? "border-emerald-800/60 bg-emerald-950/25 text-emerald-300"
                  : "border-destructive/40 bg-destructive/10 text-red-400"
              )}
              role="status"
            >
              {feedback.msg}
            </p>
          </GlitchOnce>
        )}

        {/* سجل الأيام */}
        {pulse.history.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-[0.65rem] text-muted-foreground">آخر أيامك مع النبض:</p>
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {pulse.history.map((h) => (
                <div
                  key={h.date}
                  title={`${h.date} — ${h.solved ? "فُكَّت" : "أُسيئت"}`}
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-[0.65rem]",
                    h.solved
                      ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-400"
                      : "border-destructive/40 bg-destructive/10 text-red-400"
                  )}
                >
                  {h.date.slice(5)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel p-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Flame className="h-4 w-4 text-orange-400" />
          كل يوم متصل بالسلسلة يضيف +١٠ نقاط لمكافأة النبضة التالية (حتى +٥٠).
          يوم واحد فائت... والسلسلة تعود إلى الواحد.
        </p>
      </div>
    </div>
  );
}

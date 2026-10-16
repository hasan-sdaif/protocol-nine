"use client";

// ═══════════════════════════════════════════════════════════
// لوحة اللغز — مادة + إجابة + تلميحات + حالة الحل
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { CheckCircle2, Loader2, Send, Lightbulb, Lock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sfx } from "./audio";
import { GlitchOnce } from "./effects";
import MaterialView from "./MaterialView";
import type { Game } from "./useGame";
import type { ClientPuzzle } from "@/lib/game/engine";

const HINT_COSTS = [10, 20, 30];

export default function PuzzlePanel({
  game,
  puzzle,
  vaultSlots,
  shards,
  onOpenMap,
}: {
  game: Game;
  puzzle: ClientPuzzle;
  vaultSlots?: { riddle: string }[];
  shards?: { n: number; label: string; word: string | null }[];
  onOpenMap?: (puzzleId: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [vaultAnswers, setVaultAnswers] = useState<string[]>(() => (vaultSlots ?? []).map(() => ""));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [glitch, setGlitch] = useState(0);
  const [hintsOpen, setHintsOpen] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    const isVault = puzzle.materialKind === "vault";
    const res = isVault
      ? await game.submitPuzzle(puzzle.id, "", vaultAnswers)
      : await game.submitPuzzle(puzzle.id, answer);
    setBusy(false);
    const r = res.data.result as
      | { correct: boolean; message: string; pointsAwarded?: number; shard?: { word: string }; rankUp?: { name: string }; finished?: boolean; externalCompleted?: { name: string }; pathCompleted?: { name: string; seal: string } }
      | undefined;
    if (!res.ok || !r) {
      sfx.error();
      setGlitch((g) => g + 1);
      setFeedback({ ok: false, msg: res.data.error ?? "خلل في الإرسال." });
      return;
    }
      if (r.correct) {
      sfx.success();
      setFeedback({
        ok: true,
        msg:
          r.finished
            ? `${r.message} — اكتمل البروتوكول التاسع بأكمله!`
            : r.shard
              ? `${r.message} حصلت على شظية: «${r.shard.word}».`
              : r.pathCompleted
                ? `${r.message} اكتمل مسار «${r.pathCompleted.name}» — الخِتم: ${r.pathCompleted.seal}.`
                : r.externalCompleted
                  ? `${r.message} اكتمل ملحق «${r.externalCompleted.name}»!`
                  : r.message,
      });
      setAnswer("");
    } else {
      sfx.error();
      setGlitch((g) => g + 1);
      setFeedback({ ok: false, msg: r.message });
    }
  };

  const openHint = async (level: number) => {
    if (puzzle.hintsOpened >= level) return;
    const res = await game.openHint(puzzle.id, level);
    if (res.ok) sfx.click();
  };

  const lockedHints = puzzle.solved;
  const revealedHints = puzzle.hints.filter((h) => h !== null).length;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        puzzle.solved
          ? "border-emerald-800/60 bg-emerald-950/20"
          : "border-border bg-card/50 hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-foreground">{puzzle.title}</h4>
            <span className="font-mono text-[0.65rem] text-primary/80" dir="ltr">
              +{puzzle.points}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{puzzle.question}</p>
        </div>
        {puzzle.solved ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 text-glow-green" />
        ) : null}
      </div>

      <div className="mt-3">
        <MaterialView
          material={puzzle.material}
          kind={puzzle.materialKind}
          puzzleId={puzzle.id}
          onOpenMap={onOpenMap}
        />
      </div>

      {/* لوحة الخزنة */}
      {puzzle.materialKind === "vault" && vaultSlots && !puzzle.solved && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            ضع الشظايا التسع — كل خانة تحمل لغزها. الشظايا المحررة تظهر تلقائياً كتلميح.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {vaultSlots.map((slot, i) => {
              const shardHint =
                shards?.find((s) => s.word && s.n === i)?.word ?? null;
              return (
                <div key={i} className="flex items-center gap-2 rounded border border-border bg-black/30 px-2.5 py-1.5">
                  <span className="font-mono text-[0.7rem] text-muted-foreground" dir="ltr">
                    {i + 1}/9
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.65rem] text-muted-foreground">{slot.riddle}</div>
                    <Input
                      value={shardHint && !vaultAnswers[i] ? "" : vaultAnswers[i]}
                      placeholder={shardHint ? `الشظية المحررة: ${shardHint}` : "؟"}
                      onChange={(e) => {
                        const next = [...vaultAnswers];
                        next[i] = e.target.value;
                        setVaultAnswers(next);
                      }}
                      disabled={puzzle.solved}
                      className="h-7 border-none bg-transparent px-0 text-sm focus-visible:ring-0"
                      dir="auto"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
            أقفل الخزنة
          </Button>
        </div>
      )}

      {/* إدخال الإجابة العادي */}
      {puzzle.materialKind !== "vault" && !puzzle.solved && (
        <div className="mt-4 flex gap-2">
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="اكتب الإجابة..."
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
              "mt-3 rounded border px-3 py-2 text-sm leading-6",
              feedback.ok
                ? "border-emerald-800/60 bg-emerald-950/25 text-emerald-300 text-glow-green"
                : "border-destructive/40 bg-destructive/10 text-red-400 breach-shake"
            )}
            role="status"
          >
            {feedback.msg}
          </p>
        </GlitchOnce>
      )}

      {puzzle.solved && (
        <p className="mt-3 rounded border border-emerald-800/50 bg-emerald-950/20 px-3 py-2 font-doc text-sm text-emerald-300/90">
          ✓ حُلّ — الإجابة: {puzzle.hintsOpened >= 0 ? "" : ""}
          <span className="text-foreground/80">{puzzle.title}</span>
          {puzzle.wrongAttempts > 0 && (
            <span className="ml-2 font-mono text-[0.65rem] text-muted-foreground" dir="ltr">
              ({puzzle.wrongAttempts} محاولات فاشلة قبل السقوط)
            </span>
          )}
        </p>
      )}

      {/* التلميحات */}
      {!puzzle.solved && (
        <div className="mt-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => {
              sfx.click();
              setHintsOpen((v) => !v);
            }}
            className="flex w-full items-center justify-between text-xs text-muted-foreground transition-colors hover:text-primary"
            aria-expanded={hintsOpen}
          >
            <span className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              مصدر مجهول — التلميحات ({revealedHints}/3)
              {lockedHints && <Lock className="h-3 w-3" />}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", hintsOpen && "rotate-180")} />
          </button>
          {hintsOpen && (
            <div className="mt-2 space-y-1.5">
              {[0, 1, 2].map((i) => {
                const revealed = i < revealedHints;
                return revealed ? (
                  <p key={i} className="rounded border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-6 text-foreground/85">
                    <span className="font-mono ml-1 text-primary/70" dir="ltr">#{i + 1}</span>
                    {puzzle.hints[i]}
                  </p>
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openHint(i + 1)}
                    disabled={i > revealedHints}
                    className="flex w-full items-center justify-between rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>تلميح {i + 1} — من مصدر مجهول</span>
                    <span className="font-mono text-primary/70" dir="ltr">-{HINT_COSTS[i]} pts</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

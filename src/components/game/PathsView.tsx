"use client";

// ═══════════════════════════════════════════════════════════
// المسارات الميدانية — ست بوابات موازية للبروتوكولات
// كل مسار: قصة + إرسالية + ثلاثة ألغاز متسلسلة + خِتم
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import {
  Route, Lock, CheckCircle2, Award, MapPin, ChevronLeft, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BUILDINGS } from "@/lib/game/campus";
import { sfx, deck, useAutoTransmission } from "./audio";
import PuzzlePanel from "./PuzzlePanel";
import type { Game } from "./useGame";
import type { ClientPath } from "@/lib/game/engine";

const buildingName = (code: string) => BUILDINGS.find((b) => b.code === code)?.name ?? code;

export default function PathsView({ game, onOpenMap }: { game: Game; onOpenMap?: (puzzleId: string) => void }) {
  const state = game.state!;
  const paths = state.paths;
  const [selected, setSelected] = useState<string | null>(null);

  const solvedTotal = state.stats.pathSolved;
  const seals = paths.filter((p) => p.completed).length;

  // الإرسالية الافتتاحية للمسارات (مرة لكل جلسة)
  useAutoTransmission("/audio/deep-phone-paths-seven-gates.mp3", "الوسيط: سبع بوابات... سبعة مسارات");

  const path: ClientPath | undefined = useMemo(
    () => paths.find((p) => p.key === selected) ?? undefined,
    [paths, selected]
  );

  // أول مسار متاح افتراضياً عند الدخول
  const effective = path ?? paths.find((p) => p.unlocked && !p.completed) ?? paths[0];

  const selectPath = (p: ClientPath) => {
    sfx.click();
    setSelected(p.key);
    // إرسالية المسار تعمل عند اختياره
    if (p.unlocked) deck.play(p.audio, `مسار: ${p.name}`, { ring: false });
  };

  return (
    <div className="space-y-4">
      {/* ── الترويسة ── */}
      <section className="panel panel-corner-ticks blueprint-grid-fine p-4 sm:p-5" aria-labelledby="paths-title">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
            <Route className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="paths-title" className="text-lg font-bold text-foreground">
              المسارات الميدانية — البوابات الموازية
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              ست بوابات تعمل بجانب البروتوكولات، لا بعدها ولا قبلها. كل مسار يفتح باباً مستقلاً
              ويُختم بكلمة لا تُمنح إلا لمن أكمله. المفاتيح مبعثرة في الحكايات.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Circle className="h-3 w-3 fill-primary text-primary" />
                ألغاز المسارات: <span className="font-mono text-primary" dir="ltr">{solvedTotal}/{state.stats.pathTotal}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-chart-4" />
                أختمة مجموعـة: <span className="font-mono text-chart-4" dir="ltr">{seals}/{paths.length}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── بطاقات المسارات ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {paths.map((p) => {
          const solvedCount = p.puzzles.filter((pz) => pz.solved).length;
          const isSel = effective?.key === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => selectPath(p)}
              className={cn(
                "panel flex flex-col items-center gap-1.5 p-3 text-center transition-all hover:border-primary/40",
                isSel && "border-primary/60 bg-primary/10",
                !p.unlocked && "opacity-60"
              )}
              aria-pressed={isSel}
            >
              <span
                className={cn(
                  "font-mono text-2xl",
                  p.completed ? "text-chart-4 text-glow-gold" : p.unlocked ? "text-primary text-glow-ice" : "text-muted-foreground/50"
                )}
              >
                {p.sigil}
              </span>
              <span className={cn("text-sm font-bold", p.unlocked ? "text-foreground" : "text-muted-foreground")}>
                {p.name}
              </span>
              {!p.unlocked ? (
                <span className="flex items-center gap-1 text-[0.62rem] text-muted-foreground/70">
                  <Lock className="h-3 w-3" />
                  بعد البروتوكول {p.unlockMinProtocol}
                </span>
              ) : p.completed ? (
                <span className="flex items-center gap-1 text-[0.62rem] text-chart-4">
                  <Award className="h-3 w-3" />
                  خِتم: {p.seal?.word}
                </span>
              ) : (
                <span className="flex items-center gap-1" aria-label={`محسول ${solvedCount} من 3`}>
                  {p.puzzles.map((pz, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 w-4 rounded-full",
                        pz.solved ? "bg-chart-3" : "bg-primary/20"
                      )}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── تفاصيل المسار المحدد ── */}
      {effective && (
        <section className="space-y-4" aria-live="polite">
          {/* القصة والإرسالية */}
          <div className="doc-frame rounded-lg p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <span className="font-mono text-xl text-primary text-glow-ice">{effective.sigil}</span>
                {effective.name}
              </h3>
              {effective.completed && effective.seal && (
                <span className="flex items-center gap-1.5 rounded-full border border-chart-4/50 bg-chart-4/10 px-3 py-1 text-xs font-bold text-chart-4">
                  <Award className="h-3.5 w-3.5" />
                  خِتم {effective.seal.label}: {effective.seal.word}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-primary/80">{effective.tagline}</p>
            <p className="mt-3 font-doc text-sm leading-loose text-foreground/90">{effective.story}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => deck.play(effective.audio, `مسار: ${effective.name}`, { ring: false })}
                className="flex h-9 items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
              >
                ▶ إرسالية المسار
              </button>
              <span className="text-[0.65rem] text-muted-foreground/60">
                {effective.puzzles.filter((pz) => pz.solved).length}/{effective.puzzles.length} ألغاز
              </span>
            </div>
          </div>

          {/* الألغاز الثلاثة */}
          <div className="space-y-3">
            {effective.puzzles.map((pz, idx) => (
              <div key={pz.id}>
                {pz.solved ? (
                  <div className="panel border-chart-3/25 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-chart-3" />
                      <span className="text-sm font-bold text-foreground">
                        {idx + 1}. {pz.title}
                      </span>
                      <span className="font-mono text-[0.65rem] text-chart-3" dir="ltr">+{pz.points} ✓</span>
                    </div>
                    {/* الشظية القصصية المكشوفة */}
                    {effective.fragments[idx] && (
                      <p className="mt-2 border-s-2 border-primary/30 ps-3 font-doc text-sm leading-loose text-muted-foreground">
                        {effective.fragments[idx]}
                      </p>
                    )}
                  </div>
                ) : pz.locked ? (
                  <div className="panel flex items-center gap-3 p-4 opacity-70">
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <span className="text-sm font-bold text-muted-foreground">
                      {idx + 1}. {pz.title}
                    </span>
                    <span className="ms-auto text-[0.65rem] text-muted-foreground/60">
                      {effective.unlocked ? "حل ما قبله أولاً" : `بعد البروتوكول ${effective.unlockMinProtocol}`}
                    </span>
                  </div>
                ) : (
                  <div className="panel p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/50 bg-primary/15 font-mono text-xs text-primary" dir="ltr">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-foreground">{pz.title}</span>
                      <span className="ms-auto flex items-center gap-1.5 font-mono text-[0.65rem] text-muted-foreground">
                        {pz.building && (
                          <span className="flex items-center gap-1" dir="rtl">
                            <MapPin className="h-3 w-3 text-primary/70" />
                            {buildingName(pz.building)}
                          </span>
                        )}
                        <span dir="ltr">{pz.points} pts</span>
                      </span>
                    </div>
                    <PuzzlePanel game={game} puzzle={pz} onOpenMap={onOpenMap} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {!effective.unlocked && (
            <p className="rounded border border-border/60 bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
              <ChevronLeft className="me-1 inline h-4 w-4 rotate-180" />
              هذا المسار يتنفس بعد إتمام البروتوكول {effective.unlockMinProtocol} — تقدّم في العمليات ثم عد.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// ═══ نهاية PathsView ═══

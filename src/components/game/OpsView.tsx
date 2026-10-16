"use client";

// ═══════════════════════════════════════════════════════════
// العمليات — البروتوكولات العشرة + الملحقات الخارجية + الخزنة
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Lock, CheckCircle2, ChevronDown, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhonePlayer, sfx, useAutoTransmission } from "./audio";
import { SectionHead, StatChip } from "./effects";
import PuzzlePanel from "./PuzzlePanel";
import type { Game } from "./useGame";

export default function OpsView({
  game,
  onOpenMap,
}: {
  game: Game;
  onOpenMap: (puzzleId: string) => void;
}) {
  const state = game.state;

  // المفاتح قبل أي return — ترتيب الخطافات ثابت
  const activeDefault = useMemo(() => {
    if (!state) return 0;
    const p = state.protocols.find((pr) => pr.unlocked && !pr.completed);
    return p?.n ?? state.protocols[state.protocols.length - 1]?.n ?? 0;
  }, [state]);

  const [openSel, setOpenSel] = useState<number | "none" | undefined>(undefined);
  const open = openSel === undefined ? activeDefault : openSel === "none" ? null : openSel;

  // إرسالية البروتوكول المفتوح تعمل تلقائياً عند فتحه
  const openProto = state?.protocols.find((p) => p.n === open && p.unlocked) ?? null;
  useAutoTransmission(openProto?.audio ?? null, `إرسالية ${openProto?.guardianName ?? "البروتوكول"}`);

  if (!state) return null;

  const done = state.protocols.filter((p) => p.completed).length;
  const totalProto = state.protocols.length;

  return (
    <div className="space-y-6">
      {/* ملخص التقدم */}
      <div className="panel panel-corner-ticks p-4 sm:p-5">
        <SectionHead
          code="FIELD-OPERATIONS"
          title="غرفة العمليات"
          sub="عشرة أبواب متسلسلة — لا يُفتح الباب إلا بإسقاط من قبله"
          icon={<span className="font-mono text-sm">⌖</span>}
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          <StatChip label="بروتوكولات مكتملة" value={`${done}/${totalProto}`} tone="green" />
          <StatChip label="ألغاز محلولة" value={`${state.stats.solvedCount}/${state.stats.totalPuzzles}`} />
          <StatChip label="النقاط" value={state.agent.points} tone="amber" />
          <StatChip label="شظايا" value={state.shards.filter((s) => s.word).length} />
          <StatChip
            label="مسارات ميدانية"
            value={`${state.stats.pathSolved}/${state.stats.pathTotal}`}
            tone="amber"
          />
          <StatChip
            label="منارات ممسوحة"
            value={`${state.stats.scansFound}/${state.stats.scansTotal}`}
            tone="amber"
          />
          <StatChip
            label="ملحقات خارجية"
            value={`${state.stats.externalSolved}/${state.stats.externalTotal}`}
            tone={state.external.unlocked ? "amber" : "muted"}
          />
        </div>
      </div>

      {/* البروتوكولات */}
      <div className="relative">
        <div className="absolute bottom-4 right-[27px] top-4 w-px bg-gradient-to-b from-primary/40 via-primary/15 to-transparent" aria-hidden="true" />
        <div className="space-y-3">
          {state.protocols.map((proto) => {
            const isOpen = open === proto.n;
            const solvedCount = proto.puzzles.filter((p) => p.solved).length;
            return (
              <div key={proto.n} className="relative pr-12">
                <button
                  type="button"
                  className="absolute right-0 top-1.5 flex h-9 w-9 items-center justify-center rounded-full border font-mono text-sm transition-all"
                  aria-hidden="true"
                  tabIndex={-1}
                  style={{ pointerEvents: "none" }}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border",
                      proto.completed
                        ? "border-emerald-700/70 bg-emerald-950/40 text-emerald-400"
                        : proto.unlocked
                          ? "border-primary/60 bg-primary/15 text-primary pulse-ring"
                          : "border-border bg-card text-muted-foreground/50"
                    )}
                  >
                    {proto.completed ? <CheckCircle2 className="h-4 w-4" /> : proto.unlocked ? proto.n : <Lock className="h-3.5 w-3.5" />}
                  </span>
                </button>

                <div
                  className={cn(
                    "rounded-lg border transition-all",
                    proto.unlocked ? "border-border bg-card/60" : "border-border/50 bg-card/30 opacity-60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      sfx.click();
                      setOpenSel(open === proto.n ? "none" : proto.n);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[0.65rem] text-muted-foreground" dir="ltr">
                          {proto.n === 0 ? "ORIGIN" : `PROTOCOL-${proto.n}`}
                        </span>
                        <h3 className={cn("font-bold", proto.completed ? "text-emerald-300" : "text-foreground")}>
                          {proto.name}
                        </h3>
                        {proto.n === 0 && (
                          <span className="rounded border border-primary/30 px-1.5 py-0.5 text-[0.6rem] text-primary">أرشيف الغائبين</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {proto.guardianName} — {proto.unlocked ? (proto.completed ? "سقط" : `${solvedCount}/${proto.puzzles.length} ألغاز`) : "مغلق خلف الباب السابق"}
                      </p>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && proto.unlocked && (
                    <div className="space-y-4 border-t border-border px-4 py-4">
                      <PhonePlayer src={proto.audio} label={`إرسالية ${proto.guardianName}`} compact />
                      <div className="rounded border border-primary/15 bg-black/30 p-3">
                        <div className="mb-1 font-mono text-[0.6rem] tracking-widest text-muted-foreground" dir="ltr">
                          TRANSCRIPT
                        </div>
                        <div className="space-y-1 font-doc text-sm leading-7 text-foreground/85">
                          {proto.transcript.map((line, i) => (
                            <p key={i} className="line-reveal" style={{ animationDelay: `${i * 70}ms` }}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>

                      {proto.plateNote && (
                        <div className="rounded border border-primary/40 bg-primary/5 p-3">
                          <p className="flex items-center gap-1.5 text-[0.65rem] font-bold text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                            بين السطور — الصفيحة الشفافة
                          </p>
                          <p className="mt-1 font-doc text-sm leading-7 text-foreground/90">{proto.plateNote}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {proto.puzzles.map((pz) => (
                          <PuzzlePanel
                            key={pz.id}
                            game={game}
                            puzzle={pz}
                            vaultSlots={state.vaultSlots}
                            shards={state.shards}
                            onOpenMap={onOpenMap}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {isOpen && !proto.unlocked && (
                    <div className="border-t border-border px-4 py-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        <Lock className="ml-1 inline h-4 w-4" />
                        أدر ظهرك للباب، وأكمل ما قبله. الحارس لا يستقبل الزوار.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* الملحقات الخارجية */}
      <div className="panel p-4 sm:p-5">
        <SectionHead
          code="EXTERNAL-ANNEXES"
          title="الملاحق الخارجية"
          sub={state.external.unlocked ? "إرث مشروع الطيف في الحرمان الخارجيين" : `تُفتح بعد إتمام البروتوكول ${state.external.minProtocol}`}
          icon={<Building2 className="h-4 w-4" />}
        />
        {!state.external.unlocked ? (
          <p className="rounded border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            في مدينة عيسى والمنامة نائم فرعان من إرث الطيف... لا يُوقظهما إلا من عبر البروتوكول الثالث.
          </p>
        ) : (
          <div className="space-y-4">
            {state.external.branches.map((b) => {
              const solved = b.puzzles.filter((p) => p.solved).length;
              return (
                <details key={b.key} className="group rounded-lg border border-border bg-card/60">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-foreground">{b.name}</h3>
                        <span className="text-[0.65rem] text-muted-foreground">{b.campus}</span>
                        {b.completed && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {b.prize} — {solved}/{b.puzzles.length} ألغاز
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-4 border-t border-border px-4 py-4">
                    <PhonePlayer src={b.audio} label={`إرسالية من ${b.campus}`} compact />
                    <p className="font-doc text-sm leading-8 text-foreground/85">{b.story}</p>
                    <div className="space-y-3">
                      {b.puzzles.map((pz) => (
                        <PuzzlePanel key={pz.id} game={game} puzzle={pz} onOpenMap={onOpenMap} />
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {/* الخزنة */}
      <div className="panel p-4 sm:p-5">
        <SectionHead
          code="THE-VAULT"
          title="خزنة التسعة"
          sub={state.vaultUnlocked ? "تسع شظايا تنتظر مواضعها — والعاشر أنت" : "تظهر تفاصيلها عند اقترابك من العتبة"}
          icon={<span className="font-mono text-sm">⬟</span>}
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          {state.vaultSlots.map((slot, i) => {
            const shard = state.shards.find((s) => s.n === i);
            return (
              <div
                key={i}
                className={cn(
                  "rounded border px-3 py-3 text-center",
                  shard?.word
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-dashed border-border text-muted-foreground"
                )}
              >
                <div className="font-mono text-[0.6rem]" dir="ltr">{i + 1}/9</div>
                <div className="mt-1 text-[0.7rem] leading-5">{slot.riddle}</div>
                <div className="mt-1.5 font-doc text-lg font-bold">
                  {shard?.word ?? "—"}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {state.vaultUnlocked
            ? "اللوحة تعمل من داخل لغز «خزنة التسعة» في البروتوكول التاسع."
            : "اجمع الشظايا بإتمام البروتوكولات — الخزنة تُفتح لغزها عند البروتوكول التاسع."}
        </p>
      </div>
    </div>
  );
}

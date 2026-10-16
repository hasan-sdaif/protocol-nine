"use client";

// ═══════════════════════════════════════════════════════════
// السجل — ملف الوكيل: إحصاءات + خط زمني للأحداث
// ═══════════════════════════════════════════════════════════
import { ScrollText, ShieldAlert, Lightbulb, Trophy, Sparkles, Radio, Filter, Users, KeyRound, FileText, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHead, StatChip } from "./effects";
import type { Game } from "./useGame";

const KIND_META: Record<string, { icon: typeof Star; cls: string; label: string }> = {
  join: { icon: Users, cls: "text-primary", label: "انضمام" },
  clear: { icon: Trophy, cls: "text-emerald-400", label: "سقوط حارس" },
  breach: { icon: ShieldAlert, cls: "text-red-400", label: "اختراق فاشل" },
  hint: { icon: Lightbulb, cls: "text-yellow-500", label: "معلومة" },
  shard: { icon: Sparkles, cls: "text-primary", label: "شظية" },
  story: { icon: FileText, cls: "text-foreground/70", label: "وثيقة" },
  rank: { icon: Star, cls: "text-primary", label: "ترقية" },
  finish: { icon: Trophy, cls: "text-primary", label: "الخاتمة" },
  feel: { icon: FileText, cls: "text-foreground/70", label: "إجابة" },
  pulse: { icon: Radio, cls: "text-orange-400", label: "نبض" },
  sort: { icon: Filter, cls: "text-yellow-500", label: "فرز" },
  team: { icon: Users, cls: "text-primary", label: "حلف" },
  secede: { icon: Users, cls: "text-red-400", label: "انفصال" },
  plate: { icon: Sparkles, cls: "text-primary", label: "صفيحة" },
  ext: { icon: Trophy, cls: "text-emerald-400", label: "ملحق" },
};

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar", {
      timeZone: "Asia/Bahrain",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function JournalView({ game }: { game: Game }) {
  const state = game.state;
  if (!state) return null;
  const { agent, journal, stats } = state;

  const rankPct = agent.nextRank
    ? Math.min(100, Math.round(((agent.points - agent.rank.min) / (agent.nextRank.min - agent.rank.min)) * 100))
    : 100;

  return (
    <div className="space-y-5">
      {/* ملف الوكيل */}
      <div className="panel panel-corner-ticks p-4 sm:p-5">
        <SectionHead
          code={`AGENT-FILE // #${agent.memberNo}`}
          title={`ملف الوكيل «${agent.codename}»`}
          sub={`في منظومة الظل منذ ${fmtTime(agent.createdAt)}`}
          icon={<ScrollText className="h-4 w-4" />}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatChip label="النقاط" value={agent.points} tone="amber" />
          <StatChip label="ألغاز البروتوكولات" value={`${stats.solvedCount}/${stats.totalPuzzles}`} />
          <StatChip label="ملحقات خارجية" value={`${stats.externalSolved}/${stats.externalTotal}`} />
          <StatChip label="سلسلة النبض" value={`${agent.pulseStreak} يوم`} tone="green" />
          <StatChip label="محاولات فاشلة" value={agent.wrongAttempts} tone="red" />
          <StatChip label="تلميحات مفتوحة" value={agent.hintsUsed} tone="muted" />
          <StatChip label="رتبتك" value={agent.rank.name} tone="amber" />
          <StatChip
            label="شظايا"
            value={`${game.state?.shards.filter((s) => s.word).length ?? 0}/10`}
          />
        </div>

        {/* تقدم الرتبة */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{agent.rank.name} {agent.rank.sigil}</span>
            {agent.nextRank ? (
              <span>
                {agent.nextRank.name} عند <span className="font-mono" dir="ltr">{agent.nextRank.min}</span>
              </span>
            ) : (
              <span className="text-primary">أعلى رتبة — التاسع</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded bg-primary/10" dir="ltr">
            <div className="h-full bg-gradient-to-r from-primary/40 to-primary" style={{ width: `${rankPct}%` }} />
          </div>
        </div>

        {agent.finishedAt && (
          <div className="mt-4 rounded border border-primary/40 bg-primary/10 px-4 py-3 text-center">
            <p className="font-doc text-lg font-bold text-primary text-glow-amber">
              عبرتَ العتبة الأخيرة — التاسع رقم {agent.finaleRank}
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-[0.65rem] text-muted-foreground">
          هذه البيانات وفق الأرشيف. قد تختلف عمّا تعتقده عن نفسك.
        </p>
      </div>

      {/* الخط الزمني */}
      <div className="panel overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-bold text-foreground">سجل العمليات — كل حدث يُدوَّن تلقائياً</h3>
        </div>
        <div className="max-h-96 overflow-y-auto scroll-thin p-3">
          {journal.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              <Flame className="mx-auto mb-2 h-5 w-5 text-orange-400/60" />
              السجل فارغ... بعد لغزك الأول يبدأ الحبر بالجريان.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {journal.map((j, i) => {
                const meta = KIND_META[j.kind] ?? { icon: Star, cls: "text-muted-foreground", label: j.kind };
                const Icon = meta.icon;
                return (
                  <li
                    key={`${j.at}-${i}`}
                    className="line-reveal flex items-start gap-3 rounded border border-border/50 bg-card/30 px-3 py-2 text-sm"
                    style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                  >
                    <Icon className={cn("mt-1 h-4 w-4 shrink-0", meta.cls)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="leading-6 text-foreground/85">{j.text}</p>
                      <p className="text-[0.6rem] text-muted-foreground/70">
                        {meta.label} • {fmtTime(j.at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* مفاتيح اجتماعية */}
      <div className="panel p-4 sm:p-5">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-primary">
          <KeyRound className="h-4 w-4" />
          جملك المعيارية المكتسبة
        </h3>
        {state.dossier.filter((d) => d.phrase).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا جمل بعد — أكمل بروتوكولاً واحداً لتملك أول مفتاح اجتماعي.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {state.dossier
              .filter((d) => d.phrase)
              .map((d) => (
                <div key={d.n} className="rounded border border-primary/25 bg-primary/5 px-3 py-2">
                  <div className="text-[0.6rem] text-muted-foreground">
                    البروتوكول {d.n === 0 ? "صفر" : d.n}
                  </div>
                  <div className="font-doc text-sm text-foreground">«{d.phrase}»</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

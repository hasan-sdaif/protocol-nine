"use client";

// ═══════════════════════════════════════════════════════════
// المتصدرون — أفراد / حلفون / جدار التاسعين + بث الوسيط
// ═══════════════════════════════════════════════════════════
import { Trophy, Radio, Crown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHead, StatChip, Dots } from "./effects";
import type { Game } from "./useGame";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return `قبل ${Math.floor(h / 24)} ي`;
}

export default function BoardView({ game }: { game: Game }) {
  const board = game.board;
  const feed = game.feed;
  const me = game.state?.agent.codename;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* إحصاءات عامة */}
        <div className="panel panel-corner-ticks p-4 sm:p-5">
          <SectionHead
            code="LEADERBOARD // LIVE"
            title="المتصدرون"
            sub="التنافس حقيقي — تُحدَّث اللوحة كل ٢٠ ثانية"
            icon={<Trophy className="h-4 w-4" />}
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            <StatChip label="وكلاء نشطون" value={board?.stats.agents ?? 0} />
            <StatChip label="ألغاز سقطت" value={board?.stats.solves ?? 0} tone="green" />
            <StatChip label="أكملوا التاسع" value={board?.stats.finished ?? 0} tone="amber" />
            <StatChip label="صفائح مقتناة" value={board?.stats.plates ?? 0} />
            <StatChip label="نبضات اليوم" value={board?.stats.pulsesToday ?? 0} tone="green" />
          </div>
        </div>

        {/* منصة التتويج */}
        {board && board.top.length >= 3 && (
          <div className="panel p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Crown className="h-4 w-4" />
              <h3 className="font-bold">المنصة</h3>
            </div>
            <div className="grid grid-cols-3 items-end gap-2">
              {[1, 0, 2].map((idx) => {
                const a = board.top[idx];
                if (!a) return <div key={idx} />;
                const heights = ["h-20", "h-28", "h-16"];
                const orders = ["٢", "١", "٣"];
                return (
                  <div key={idx} className="text-center">
                    <div className={cn("mb-1 truncate text-sm font-bold", a.codename === me ? "text-primary text-glow-amber" : "text-foreground")}>
                      {a.codename}
                    </div>
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center rounded-t border border-primary/25 bg-gradient-to-t from-primary/5 to-primary/15",
                        heights[idx]
                      )}
                    >
                      <span className="font-mono text-2xl text-primary text-glow-amber">{orders[idx]}</span>
                      <span className="font-mono text-xs text-muted-foreground" dir="ltr">{a.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* جدول الأفراد */}
        <div className="panel overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <h3 className="font-bold text-foreground">الأفراد — أعلى ٢٠</h3>
          </div>
          <div className="max-h-96 overflow-y-auto scroll-thin">
            {!board ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Dots /> جارٍ جلب اللوحة...
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 text-[0.65rem] text-muted-foreground backdrop-blur">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-center font-normal">#</th>
                    <th className="px-2 py-2 text-right font-normal">الوكيل</th>
                    <th className="px-2 py-2 text-center font-normal">الحلف</th>
                    <th className="px-2 py-2 text-center font-normal">ألغاز</th>
                    <th className="px-2 py-2 text-center font-normal">سلسلة</th>
                    <th className="px-3 py-2 text-center font-normal">النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {board.top.map((a, i) => (
                    <tr
                      key={a.codename}
                      className={cn(
                        "border-b border-border/50",
                        a.codename === me && "bg-primary/10"
                      )}
                    >
                      <td className="px-2 py-2 text-center font-mono text-muted-foreground" dir="ltr">{i + 1}</td>
                      <td className="px-2 py-2">
                        <span className={cn("font-bold", a.codename === me ? "text-primary" : "text-foreground")}>
                          {a.codename}
                        </span>
                        {a.finished && <span className="ml-1.5 text-[0.6rem] text-emerald-400">✓ التاسع</span>}
                        <div className="text-[0.6rem] text-muted-foreground">{a.rank}</div>
                      </td>
                      <td className="px-2 py-2 text-center text-[0.65rem] text-muted-foreground">{a.team ?? "—"}</td>
                      <td className="px-2 py-2 text-center font-mono text-muted-foreground" dir="ltr">{a.solved}</td>
                      <td className="px-2 py-2 text-center">
                        {a.streak > 0 ? (
                          <span className="font-mono text-chart-4" dir="ltr">{a.streak}🔥</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-primary" dir="ltr">{a.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* الحلفون */}
        <div className="panel overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-foreground">الحلفون</h3>
          </div>
          <div className="max-h-72 overflow-y-auto scroll-thin">
            {!board || board.teams.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                لا حلفون بعد — أول من يشكّل حلفاً يكتب التاريخ باسمه.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 text-[0.65rem] text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-center font-normal">#</th>
                    <th className="px-2 py-2 text-right font-normal">الحلف</th>
                    <th className="px-2 py-2 text-center font-normal">أعضاء</th>
                    <th className="px-3 py-2 text-center font-normal">نقاط الحلف</th>
                  </tr>
                </thead>
                <tbody>
                  {board.teams.map((t, i) => (
                    <tr key={t.name} className="border-b border-border/50">
                      <td className="px-2 py-2 text-center font-mono text-muted-foreground" dir="ltr">{i + 1}</td>
                      <td className="px-2 py-2 font-bold text-foreground">{t.name}</td>
                      <td className="px-2 py-2 text-center font-mono text-muted-foreground" dir="ltr">
                        {t.members}/10
                        {t.seceded > 0 && <span className="text-[0.6rem] text-red-400"> ({t.seceded} انفصل)</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-primary" dir="ltr">{t.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* جدار التاسعين */}
        <div className="panel p-4 sm:p-5">
          <h3 className="mb-3 font-bold text-primary text-glow-amber">جدار التاسعين — من عبروا العتبة الأخيرة</h3>
          {!board || board.wallOfNine.length === 0 ? (
            <p className="rounded border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              الجدار فارغ... المقاعد التسعة الأولى تنتظر أصحابها.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {board.wallOfNine.map((a) => (
                <div key={a.codename} className="flex items-center justify-between rounded border border-primary/25 bg-primary/5 px-3 py-2">
                  <span className="truncate font-bold text-foreground">{a.codename}</span>
                  <span className="font-mono text-primary" dir="ltr">#{a.finaleRank}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* بث الوسيط */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="panel overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-3">
            <Radio className="h-4 w-4 text-primary rec-dot" />
            <h3 className="font-bold text-primary">بث الوسيط</h3>
          </div>
          <div className="max-h-[70vh] overflow-y-auto scroll-thin p-3">
            {feed.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                <Dots /> الموجة هادئة... الآن.
              </p>
            ) : (
              <ul className="space-y-2">
                {feed.map((e, i) => (
                  <li
                    key={`${e.at}-${i}`}
                    className={cn(
                      "rounded border px-3 py-2 text-xs leading-6",
                      e.kind === "finish"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : e.kind === "join"
                          ? "border-border bg-card/40 text-muted-foreground"
                          : e.kind === "team"
                            ? "border-emerald-900/50 bg-emerald-950/20 text-emerald-300/90"
                            : "border-border/60 bg-card/30 text-foreground/80"
                    )}
                  >
                    <span className="ml-2 font-mono text-[0.6rem] text-muted-foreground/70">
                      {timeAgo(e.at)}
                    </span>
                    <br />
                    {e.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border px-3 py-2 text-center text-[0.6rem] text-muted-foreground">
            تُبث الأحداث كما تقع — دون مواقع ودون محتويات.
          </div>
        </div>
      </aside>
    </div>
  );
}

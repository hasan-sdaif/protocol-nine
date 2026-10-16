"use client";

// ═══════════════════════════════════════════════════════════
// غرفة الفرز — وثائق مشبوهة: حقيقية أم من صنع الورثة؟
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { Filter, ShieldAlert, Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PhonePlayer, sfx } from "./audio";
import { SectionHead, StatChip } from "./effects";
import type { Game } from "./useGame";
import type { ClientSortDoc } from "@/lib/game/engine";

const FLAW_OPTIONS: { key: string; label: string; desc: string }[] = [
  { key: "code-deviation", label: "الرمز منحرف", desc: "حرف ناقص أو صفر مكان حرف — الكود لا يطابق التنسيق المعروف" },
  { key: "fact-contradiction", label: "تناقض وقائع", desc: "يزعم ما يناقض القصة المعروفة أو أرقامها" },
  { key: "impossible", label: "استحالة", desc: "زمن أو مكان لا يستقيم عقلياً (ساعة ١٤:٧١، طابق لا وجود له)" },
  { key: "style-mismatch", label: "أسلوب غريب", desc: "التوقيع لا يشبه أسلوب كاتبه المعروف" },
];

function DocCard({ game, doc }: { game: Game; doc: ClientSortDoc }) {
  const [verdict, setVerdict] = useState<"real" | "fake" | null>(null);
  const [flawKind, setFlawKind] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!verdict || busy) return;
    setBusy(true);
    await game.judgeDoc(doc.id, verdict, verdict === "fake" ? flawKind ?? undefined : undefined);
    setBusy(false);
  };

  const judged = doc.judged;

  return (
    <div
      className={cn(
        "doc-frame relative rounded-lg p-4",
        judged && (doc.correct ? "border-emerald-800/50" : "border-destructive/40")
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold tracking-wider text-primary" dir="ltr">
            {doc.code}
          </span>
          {judged && (
            doc.correct
              ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              : <XCircle className="h-4 w-4 text-red-400" />
          )}
        </div>
        <span className="font-doc text-sm text-muted-foreground">{doc.title}</span>
      </div>

      <p className="font-doc text-sm leading-8 text-foreground/90">{doc.body}</p>

      {!judged ? (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { sfx.click(); setVerdict("real"); }}
              className={cn(
                "flex-1 rounded border px-3 py-2 text-sm font-bold transition-colors",
                verdict === "real"
                  ? "border-emerald-700/70 bg-emerald-950/40 text-emerald-300"
                  : "border-border text-muted-foreground hover:border-emerald-700/50"
              )}
            >
              <Eye className="ml-1.5 inline h-4 w-4" />
              حقيقية — أثق بها
            </button>
            <button
              type="button"
              onClick={() => { sfx.click(); setVerdict("fake"); }}
              className={cn(
                "flex-1 rounded border px-3 py-2 text-sm font-bold transition-colors",
                verdict === "fake"
                  ? "border-destructive/60 bg-destructive/15 text-red-400"
                  : "border-border text-muted-foreground hover:border-destructive/50"
              )}
            >
              <ShieldAlert className="ml-1.5 inline h-4 w-4" />
              مزيفة — من الورثة
            </button>
          </div>

          {verdict === "fake" && (
            <div className="space-y-1.5">
              <p className="text-[0.65rem] text-muted-foreground">ما العلّة التي رصدتَها؟ (الإصابة الدقيقة تضاعف المكافأة)</p>
              {FLAW_OPTIONS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => { sfx.click(); setFlawKind(f.key); }}
                  className={cn(
                    "w-full rounded border px-3 py-1.5 text-right text-xs transition-colors",
                    flawKind === f.key
                      ? "border-destructive/60 bg-destructive/10 text-red-300"
                      : "border-border text-muted-foreground hover:border-destructive/40"
                  )}
                >
                  <span className="font-bold">{f.label}</span>
                  <span className="ml-2 text-[0.65rem] opacity-70">{f.desc}</span>
                </button>
              ))}
            </div>
          )}

          <Button
            onClick={submit}
            disabled={busy || !verdict || (verdict === "fake" && !flawKind)}
            className="w-full"
            variant="outline"
          >
            {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            سجّل الحكم — لا رجعة فيه
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div
            className={cn(
              "rounded border px-3 py-2 text-sm",
              doc.correct
                ? "border-emerald-800/60 bg-emerald-950/25 text-emerald-300"
                : "border-destructive/40 bg-destructive/10 text-red-400"
            )}
          >
            حكمك: {doc.myVerdict === "fake" ? "مزيفة" : "حقيقية"}
            {doc.myFlawKind && ` — ${FLAW_OPTIONS.find((f) => f.key === doc.myFlawKind)?.label ?? doc.myFlawKind}`}
            <span className="mx-2 opacity-50">|</span>
            {doc.correct ? "أصبتَ" : "أخطأتَ"}
            <span className="mx-2 opacity-50">|</span>
            <span className="font-mono" dir="ltr">
              {doc.pointsAwarded >= 0 ? `+${doc.pointsAwarded}` : doc.pointsAwarded}
            </span>
          </div>
          <p className="rounded border border-primary/20 bg-primary/5 px-3 py-2 font-doc text-sm leading-7 text-foreground/85">
            <span className="font-bold text-primary">الحقيقة: </span>
            {doc.truth}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SortingView({ game }: { game: Game }) {
  const state = game.state;
  if (!state) return null;
  const sorting = state.sorting;

  if (!sorting.unlocked) {
    return (
      <div className="panel panel-corner-ticks p-6 text-center">
        <SectionHead
          code="SORTING-ROOM // LOCKED"
          title="غرفة الفرز"
          sub={`تُفتح بعد إتمام البروتوكول ${sorting.minProtocol} — حين تبدأ موجة الشك الأولى`}
          icon={<Filter className="h-4 w-4" />}
        />
        <p className="mx-auto max-w-md rounded border border-dashed border-border px-4 py-8 text-sm leading-7 text-muted-foreground">
          في المستوى الثالث من الأرشيف القديم كتبت ف.م.: «أحداً ما كان يضع معلومات مزيفة داخل المشروع نفسه.
          لا تعرف من. ولا تعرف لماذا.» حين تصل، ستقف أنت حيث وقفت هي.
        </p>
      </div>
    );
  }

  const judgedCount = sorting.docs.filter((d) => d.judged).length;

  return (
    <div className="space-y-5">
      <div className="panel panel-corner-ticks p-4 sm:p-5">
        <SectionHead
          code="SORTING-ROOM"
          title="غرفة الفرز"
          sub="عشر وثائق وصلت من مصادر متعدقة — بعضها من صنع الورثة. الحكم واحد لكل وثيقة، ولا رجعة فيه."
          icon={<Filter className="h-4 w-4" />}
        />
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatChip label="حُكم عليها" value={`${judgedCount}/10`} />
          <StatChip label="كشفت تزييفاً" value={sorting.stats.correctFake} tone="green" />
          <StatChip label="وثّقت صحيحاً" value={sorting.stats.correctReal} tone="green" />
          <StatChip label="خدعك الورثة" value={sorting.stats.fooled} tone="red" />
        </div>
        <PhonePlayer src="/audio/tense-phone-sorting-room.mp3" label="تحذير الوسيط — غرفة الفرز" compact />
        <p className="mt-3 text-[0.65rem] leading-6 text-muted-foreground">
          اتهام وثيقة حقيقية بالتزييف: أول اثنين بلا عقوبة... ومن الثالث −١٠ نقاط لكل اتهام خاطئ.
          الوثيقة المزيفة الصحيحة مع علّتها الصائبة: +٣٥. المزيفة بعلة خاطئة: +١٥. الحقيقية الموثوقة: +٢٠.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sorting.docs.map((doc) => (
          <DocCard key={doc.id} game={game} doc={doc} />
        ))}
      </div>
    </div>
  );
}

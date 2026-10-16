"use client";

// ═══════════════════════════════════════════════════════════
// الخاتمة — الوثيقة ١٠١: أنت التاسع
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { Crown, Loader2, Send, Copy, Check, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhonePlayer, sfx } from "./audio";
import { SectionHead } from "./effects";
import type { Game } from "./useGame";

export default function FinaleView({ game }: { game: Game }) {
  const state = game.state;
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(!!state?.agent.finaleAnswer);
  const [copied, setCopied] = useState(false);

  if (!state) return null;
  const { agent } = state;

  const save = async () => {
    if (!answer.trim() || busy) return;
    setBusy(true);
    const res = await game.saveFinaleAnswer(answer.trim());
    setBusy(false);
    if (res.ok) {
      sfx.success();
      setSaved(true);
      await game.refresh();
    } else {
      sfx.error();
    }
  };

  const shareText = `أنا التاسع رقم ${agent.finaleRank ?? "؟"} — عبرت البروتوكولات العشرة لبروتوكول التاسع: من أرشيف الغائبين إلى خزنة التسعة. ما حُذف لم يختفِ. ما أُحرق لم يمت. ما نُسي ينتظر من يتذكر. [${agent.codename} — منظومة الظل، جامعة البحرين]`;

  return (
    <div className="space-y-6">
      {/* التتويج */}
      <div className="panel panel-corner-ticks p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-primary/50 bg-primary/10 seal-rotate">
          <Crown className="h-9 w-9 text-primary text-glow-amber" />
        </div>
        <div className="font-mono text-[0.65rem] tracking-[0.4em] text-muted-foreground" dir="ltr">
          DOCUMENT 101 // UNSEALED
        </div>
        <h1 className="mt-3 font-doc text-3xl font-bold leading-snug text-primary text-glow-amber sm:text-4xl">
          أنت التاسع رقم {agent.finaleRank ?? "؟"}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-muted-foreground">
          عشرة أبواب عبرتها: من بذرة أرشيف الغائبين إلى خزنة التسعة.
          الشظايا التسع رُصّت... والقفل العاشر كان أنت منذ البداية.
          البروتوكولات لم تختبر أحداً قبلك بهذا الشكل — لأنك الوحيد الذي عرف من البداية أنه داخل تجربة.
        </p>

        <div className="mx-auto mt-5 max-w-md">
          <PhonePlayer src="/audio/deep-phone-finale-you-are-the-ninth.mp3" label="الإرسالية الأخيرة — أنت التاسع" />
        </div>
      </div>

      {/* كشف الشروط */}
      <div className="panel p-5">
        <SectionHead
          code="TERMS // PAGE 2"
          title="هل قرأتَ الصفحة الثانية؟"
          sub="الآن يُكشف ما كان خافتاً"
          icon={<FileWarning className="h-4 w-4" />}
        />
        <p className="rounded border border-primary/25 bg-primary/5 px-4 py-3 font-doc text-sm leading-8 text-foreground/90">
          في شروط الانتساب، صفحة ثانية صغيرة، سطر خافت:
          «بمشاركتك تُقرّ بأن مسار قراراتك وتوقيتاتك واختياراتك في الإصرار والتوقف قد تُحلَّل ضمنياً
          كجزء من التجربة الجماعية للبروتوكول التاسع...»
          سجلك الشخصي — كل سقوط حارس، كل نبضة، كل تلميح اشتريته، كل مرة انكسرتَ ثم عدت —
          كان دائماً أمام عينيك في تبويب «السجل». هذا هو التحليل. وهذا هو الإقرار.
        </p>
      </div>

      {/* السؤال الأخير */}
      <div className="panel p-5">
        <SectionHead
          code="FINAL-QUESTION"
          title="سؤال الوثيقة ١٠١"
          sub="ما الشيء الذي تركه هذا التحدي في داخلك لن تستطيع وضعه في كلمة واحدة؟"
          icon={<span className="font-mono text-sm">؟</span>}
        />
        {saved ? (
          <div className="rounded border border-emerald-800/60 bg-emerald-950/25 px-4 py-3">
            <p className="text-sm text-emerald-300">حُفظت في الأرشيف — تُقرأ حيث تُقرأ الوثيقة ١٠١:</p>
            <p className="mt-2 font-doc text-base leading-8 text-foreground/90">«{agent.finaleAnswer}»</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="اكتب بصدق... ولو كلمات قليلة"
              maxLength={500}
              dir="auto"
              className="min-h-[90px]"
            />
            <Button onClick={save} disabled={busy || !answer.trim()}>
              {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
              احفظ الإجابة في الأرشيف
            </Button>
          </div>
        )}
      </div>

      {/* انقل الحقيقة */}
      <div className="panel p-5 text-center">
        <h3 className="font-bold text-primary text-glow-amber">انقل الحقيقة</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          الوثيقة ١٠١ تقول: اكتب اسمك على الجدار... شارك من وصلتَ إليه.
        </p>
        <div className="mx-auto mt-3 max-w-lg rounded border border-border bg-black/30 p-3 text-right text-sm leading-7 text-foreground/85">
          {shareText}
        </div>
        <Button
          variant="outline"
          className="mt-3"
          onClick={async () => {
            sfx.click();
            try { await navigator.clipboard.writeText(shareText); } catch { /* محظور */ }
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? <Check className="ml-2 h-4 w-4 text-emerald-400" /> : <Copy className="ml-2 h-4 w-4" />}
          {copied ? "نُسخت — انقلها" : "انسخ شهادتك"}
        </Button>
      </div>
    </div>
  );
}

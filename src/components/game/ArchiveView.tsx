"use client";

// ═══════════════════════════════════════════════════════════
// الأرشيف — الوثائق المحررة + الجمل المعيارية + الأرشيف الصوتي
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { Archive, Lock, Sparkles, Volume2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PhonePlayer, sfx } from "./audio";
import { SectionHead } from "./effects";
import type { Game } from "./useGame";
import { AUDIO_AA } from "@/lib/game/content-aa";

// واجهة الوثائق الصوتية من المحرك (المسارات فقط — بلا نصوص سرية)
import { PROTOCOLS } from "@/lib/game/content";

export default function ArchiveView({ game }: { game: Game }) {
  const state = game.state;
  const [buying, setBuying] = useState(false);
  const [buyMsg, setBuyMsg] = useState<string | null>(null);

  if (!state) return null;

  const buyPlate = async () => {
    setBuying(true);
    setBuyMsg(null);
    const res = await game.buyPlate();
    setBuying(false);
    if (res.ok) {
      sfx.success();
      setBuyMsg("الصفيحة بين يديك — ما بين السطور يُقرأ الآن.");
    } else {
      sfx.error();
      setBuyMsg(res.data.error ?? "خلل في الاقتناء.");
    }
  };

  // الأرشيف الصوتي: ما فُتح لهذا الوكيل
  const pathAudios = state.paths
    .filter((p) => p.unlocked)
    .map((p) => ({ file: p.audio, label: `إرسالية مسار: ${p.name}` }));
  const pathsOpen = state.paths.some((p) => p.unlocked);
  const tapes: { file: string; label: string }[] = [];
  if (pathsOpen) {
    tapes.push(
      { file: "/audio/distorted-tape-broadcast-spectrum-room.mp3", label: "شريط قديم: بث غرفة الطيف" },
      { file: "/audio/grieving-tape-writer-confession.mp3", label: "شريط قديم: اعتراف الكاتبة" },
      { file: "/audio/deep-phone-paths-seven-gates.mp3", label: "الوسيط: البوابات السبع" }
    );
  }
  if (state.paths.some((p) => p.key === "guardian" && p.unlocked)) {
    tapes.push(
      { file: "/audio/haunted-tape-seventh-voice-echo.mp3", label: "شريط قديم: الصوت السابع" },
      { file: "/audio/urgent-phone-distress-call-guardian.mp3", label: "نداء استغاثة: الحارس" }
    );
  }
  if (state.paths.some((p) => p.key === "heirs" && p.unlocked)) {
    tapes.push(
      { file: "/audio/whispering-tape-twin-versions.mp3", label: "شريط مهموس: النسختان التوأمان" },
      { file: "/audio/distorted-tape-heirs-fake-warning.mp3", label: "تحذير الورثة المشوّه" }
    );
  }
  if (state.paths.some((p) => p.key === "tenth" && p.unlocked)) {
    tapes.push(
      { file: "/audio/distorted-tape-scream-1998-basement.mp3", label: "شريط ١٩٩٨: القبو — صراخ" },
      { file: "/audio/haunted-tape-footsteps-s17-corridor.mp3", label: "شريط قديم: خطوات ممر S17" }
    );
  }
  if (state.agent.plateUnlocked) {
    tapes.push({ file: "/audio/distorted-tape-fm-lesson-plate.mp3", label: "درس ف.م.: الصفيحة" });
  }
  if (state.scans.foundCount > 0) {
    tapes.push({ file: "/audio/tense-tape-knocking-archive-door.mp3", label: "شريط قديم: طرق باب الأرشيف" });
  }
  tapes.push(
    { file: "/audio/urgent-phone-field-scan-briefing.mp3", label: "إحاطة الميدان" },
    { file: "/audio/mysterious-phone-scan-beacon-confirmed.mp3", label: "تأكيد المنارة" }
  );

  const unlockedAudio = [
    { file: "/audio/deep-phone-boot-secure-line.mp3", label: "الخط آمن — الإقلاع" },
    { file: "/audio/deep-phone-intro-first-transmission.mp3", label: "الإرسالية الأولى" },
    { file: "/audio/deep-phone-recruit-welcome.mp3", label: "ترحيب المنظومة" },
    ...state.protocols
      .filter((p) => p.unlocked)
      .map((p) => ({ file: p.audio, label: `إرسالية ${p.guardianName}` })),
    ...pathAudios,
    ...tapes,
    ...(state.agent.plateUnlocked
      ? [{ file: "/audio/deep-phone-plate-transparent.mp3", label: "الصفيحة الشفافة" }]
      : []),
    ...(state.sorting.unlocked
      ? [{ file: "/audio/tense-phone-sorting-room.mp3", label: "تحذير غرفة الفرز" }]
      : []),
    ...(state.external.unlocked
      ? [
          { file: "/audio/deep-phone-isa-town-structure.mp3", label: "إرسالية عيسى" },
          { file: "/audio/mysterious-phone-manama-diagnosis.mp3", label: "إرسالية المنامة" },
        ]
      : []),
    ...(state.team
      ? [
          { file: "/audio/deep-phone-alliance-trust.mp3", label: "حلف الثقة" },
          ...(state.team.mySeceded ? [{ file: "/audio/cold-phone-quiet-secession.mp3", label: "مسار الوحيد" }] : []),
        ]
      : []),
    ...(state.protocols[0]?.completed
      ? [{ file: "/audio/mysterious-phone-missing-26.mp3", label: "الوثيقة الغائبة — ٢٦" }]
      : []),
    ...(state.agent.finishedAt
      ? [{ file: "/audio/deep-phone-finale-you-are-the-ninth.mp3", label: "الخاتمة — أنت التاسع" }]
      : []),
  ];
  const totalAudio = 2 + PROTOCOLS.length + AUDIO_AA.length + 2 + pathAudios.length + tapes.length + 1;

  const plateArchiveNote = state.agent.plateUnlocked
    ? "خلف كل وثيقة محرَّرة سطرٌ أخير محفوظ لمن يملك الصفيحة: «أنت تقرأ الآن ما كُتب لغيرك... ووصل إليك»."
    : null;

  return (
    <div className="space-y-5">
      {/* الوثائق المحررة */}
      <div className="panel panel-corner-ticks p-4 sm:p-5">
        <SectionHead
          code="FREED-DOCUMENTS"
          title="الوثائق المحررة"
          sub="قصة الأرشيف تنكشف طبقة فوق طبقة — لكل بروتوكول مكتمل وثيقة"
          icon={<Archive className="h-4 w-4" />}
        />
        <div className="space-y-3">
          {state.dossier.map((d) => (
            <div
              key={d.n}
              className={cn(
                "rounded-lg border p-4",
                d.unlocked ? "doc-frame" : "border-dashed border-border/60 bg-card/30"
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className={cn("font-doc font-bold", d.unlocked ? "text-primary text-glow-amber" : "text-muted-foreground")}>
                  {d.title}
                </h3>
                <span className="font-mono text-[0.6rem] text-muted-foreground" dir="ltr">
                  {d.n === 0 ? "ORIGIN" : `P-${d.n}`}
                </span>
              </div>
              {d.unlocked ? (
                <>
                  <p className="font-doc text-sm leading-8 text-foreground/90">{d.body}</p>
                  {d.phrase && (
                    <div className="mt-3 rounded border border-primary/30 bg-primary/5 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-[0.65rem] font-bold text-primary">
                        <KeyRound className="h-3 w-3" />
                        الجملة المعيارية للبروتوكول {d.n === 0 ? "صفر" : d.n}
                      </p>
                      <p className="mt-1 font-doc text-base text-foreground">«{d.phrase}»</p>
                      <p className="mt-1 text-[0.6rem] leading-4 text-muted-foreground">
                        لا يعرفها إلا من عبر هذا الباب. استعملها لتتأكد أن محدّثك عبره فعلاً —
                        ولا تُفشِها لمن لم يعبره.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  تُحرَّر بإتمام {d.n === 0 ? "البروتوكول صفر" : `البروتوكول ${d.n}`}.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* الصفيحة الشفافة */}
      <div className="panel p-4 sm:p-5">
        <SectionHead
          code="TRANSPARENT-PLATE"
          title="الصفيحة الشفافة"
          sub={
            state.agent.plateUnlocked
              ? "بين يديك — تقرأ ما بين السطور في كل أنحاء المنظومة"
              : `أداة تُقتنى بالنقاط (${state.plate.cost}) بعد إتمام البروتوكول ${state.plate.minProtocol}`
          }
          icon={<Sparkles className="h-4 w-4" />}
        />
        {state.agent.plateUnlocked ? (
          <div className="rounded border border-primary/40 bg-primary/5 p-3">
            <p className="font-doc text-sm leading-7 text-foreground/90">
              الصفيحة تعمل بصمت. ستلاحظ أسطراً إضافية تتوهج في الخريطة، والبروتوكولات، والخزنة —
              كل ما كُتب «بين السطور» صار مقروءاً.
            </p>
            {plateArchiveNote && (
              <p className="mt-2 rounded border border-primary/25 bg-black/30 px-3 py-2 font-doc text-sm leading-7 text-primary/90">
                {plateArchiveNote}
              </p>
            )}
          </div>
        ) : state.plate.eligible ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={buyPlate} disabled={buying} variant="outline">
              {buying ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
              اقتنِ الصفيحة (−{state.plate.cost} نقطة)
            </Button>
            {buyMsg && <p className="text-sm text-primary">{buyMsg}</p>}
          </div>
        ) : (
          <p className="rounded border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
            بعض الوثائق تحمل طبقة ثانية لا تُقرأ إلا بمن يملكها. أكمل البروتوكول {state.plate.minProtocol}
            ووفّر {state.plate.cost} نقطة.
          </p>
        )}
      </div>

      {/* الأرشيف الصوتي */}
      <div className="panel p-4 sm:p-5">
        <SectionHead
          code="AUDIO-ARCHIVE"
          title="الأرشيف الصوتي"
          sub="تسجيلات هاتفية محفوظة — تفتح مع تقدمك. بعضها يحمل رسائل خفية، وبعضها مجرد قصة... لا يُعلن أيهما."
          icon={<Volume2 className="h-4 w-4" />}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {unlockedAudio.map((a) => (
            <PhonePlayer key={a.file} src={a.file} label={a.label} compact />
          ))}
        </div>
        <p className="mt-3 text-[0.65rem] leading-5 text-muted-foreground">
          {unlockedAudio.length} من {totalAudio} تسجيلاً مفتوحاً لك.
          كل الأصوات ملفات MP3 ثابتة في المشروع — لا استدعاءات API وقت التشغيل إطلاقاً.
        </p>
      </div>
    </div>
  );
}

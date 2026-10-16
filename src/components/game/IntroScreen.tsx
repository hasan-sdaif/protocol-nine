"use client";

// ═══════════════════════════════════════════════════════════
// شاشة التمهيد — شرح الزائر: ما هذا التحدي؟ وكيف يُلعب؟
// ═══════════════════════════════════════════════════════════
import { BookOpenText, KeyRound, Map, Trophy, Users, CalendarClock, Filter, ShieldQuestion, QrCode, Route, MonitorSmartphone, Volume2 } from "lucide-react";
import { PhonePlayer } from "./audio";
import { SectionHead } from "./effects";

const PILLARS = [
  {
    icon: BookOpenText,
    title: "قصة على طبقات",
    body: "قبل البروتوكولات التسعة كان «أرشيف الغائبين»: وحدة اسمها مشروع الطيف عملت في صمت بين ٢٠٠٤ و٢٠٠٨... وفتاة نسخت كل وثيقة وخبأتها في أرجاء الحرم. القصة تنكشف طبقة فوق طبقة — ما تعرفه اليوم سيبدو ساذجاً غداً.",
  },
  {
    icon: KeyRound,
    title: "تشفير حقيقي",
    body: "قيصر عربي وإنجليزي، فيجنير، مورس، أتباش، Base64، أبجدية الأرقام، حساب الجُمّل، ستّيغانوغرافي نصّي، وحبر لا يظهر إلا تحت الضوء. مختبر الأدوات بين يديك — لكن العين قبل الأداة.",
  },
  {
    icon: Map,
    title: "جغرافيا الحرم",
    body: "خريطة تفاعلية لجامعة البحرين — صخير، مرسومة بأسلوب غرفة عمليات ليلية. من محطة الحافلات إلى المسجد إلى المكتبة: بعض الألغاز لا تُحل إلا على الأرض... أو فوق الخريطة.",
  },
  {
    icon: Trophy,
    title: "تنافس حقيقي",
    body: "نقاط، رتب من «مجنّد» إلى «التاسع»، متصدرون أفراد وحلفون، جدار التاسعين لأول تسعة يُكملون — ونبض يومي يكافئ من لا يغيب. محاولة خاطئة تُنزف نقاطاً، والتلميح ثمنه مُقدَّم.",
  },
  {
    icon: Users,
    title: "حلف الثقة",
    body: "شكّل حلفاً سرياً (حتى ١٠) برمز دعوة، وقناة تُمحى رسائلها بعد ٢٤ ساعة. وثيقة مزيفة من الورثة؟ اتهمها بعلة موثقة... لكن اتهام وثيقة حقيقية من الثالث يُكلّفك. وثمّة «الانفصال الهادئ» — مرة واحدة، لا رجعة فيه.",
  },
  {
    icon: CalendarClock,
    title: "نبض الأرشيف",
    body: "كل يوم إشارة قصيرة بأسلوب متغيّر. حلّها اليوم أو انتظر نبضة الغد — سلسلة الأيام المتصلة تضاعف مكافأتك. الغائب يخسر، واليقظ يتصدر.",
  },
  {
    icon: Filter,
    title: "غرفة الفرز",
    body: "بعد البروتوكول الثالث تُفتح غرفة الوثائق المشبوهة: ١٠ وثائق، بعضها من صنع الورثة — رمز ينحرف بحرف، تاريخ لا يستقيم، طابق لا وجود له. فرّز بعين الباحث لا المتعجل.",
  },
  {
    icon: ShieldQuestion,
    title: "الصفيحة الشفافة",
    body: "أداة يقتنيها المتقدمون بالنقاط: تكشف ما بين السطور في الوثائق والخريطة والخزنة. بعض الأسرار لا تُقرأ إلا بمن يملكها.",
  },
  {
    icon: Route,
    title: "المسارات الميدانية",
    body: "ست بوابات موازية للبروتوكولات: الصدى، الكاتبة، الحارس، الورثة، المختبر العاشر، والبوصلة. كل مسار ثلاثة ألغاز متسلسلة وخِتم لا يُمنح إلا لمكمله — ١٩٨٠ نقطة من الحكايات الجانبية.",
  },
  {
    icon: QrCode,
    title: "منارات الميدان — داخل الجامعة",
    body: "١٤ رمز QR منتشرة في حرم صخير: وجّه كاميرا هاتفك من التطبيق فيُختبر فوراً — ٨ منها تحمل اختباراً بمكافأة. للمنظّمين استوديو لطباعة الرموز ونشرها في مواقعها الحقيقية.",
  },
  {
    icon: Volume2,
    title: "أشرطة قديمة تُسمع من ذاتها",
    body: "أكثر من ٤٠ تسجيلاً محفوظاً: إرساليات هاتفية وأشرطة عام ١٩٩٨ فيها صراخ من القبو وخطوات في ممر S17 وهمس النسختين التوأمين. الإرساليات تعمل تلقائياً حيث يجب أن تسمعها.",
  },
  {
    icon: MonitorSmartphone,
    title: "لكل جهاز تجربته",
    body: "على الكمبيوتر: مركز قيادة بسيماء أيقوني وبث حي جانبي واختصارات لوحة مفاتيح. على الهاتف: تطبيق وكيل ميداني بزر مسح مركزي في متناول الإبهام. وعلى التاب: غرفة عمليات بتبويبات أفقية — ثلاث تجارب مختلفة جذرياً لا مجرد تصغير.",
  },
];

export default function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* الترويسة */}
        <div className="mb-8 text-center">
          <div className="font-mono text-[0.7rem] tracking-[0.4em] text-muted-foreground" dir="ltr">
            THE NINTH PROTOCOL — FIELD MANUAL
          </div>
          <h1 className="mt-3 font-doc text-3xl font-bold leading-snug text-foreground text-glow-amber sm:text-4xl">
            ما حُذف لم يختفِ. ما أُحرق لم يمت.
            <br />
            ما نُسي ينتظر من يتذكر.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            تحدٍّ تشفيري سردي تنافسي — تجربة واقع بديل (ARG) لطلاب جامعة البحرين.
            عشرة بروتوكولات تحرس قصة المختبر العاشر، وأصلٌ غائب من مشروع الطيف.
            هذا دليلك قبل أن تبدأ: اقرأه مرة، ثم لا ترجع إليه أبداً.
          </p>
        </div>

        {/* الإرسالية الأولى */}
        <div className="panel panel-corner-ticks mb-8 p-5">
          <SectionHead
            code="TRANSMISSION-00"
            title="الإرسالية الأولى"
            sub="صوت هاتفي من رقم لا يُرد عليه أبداً"
            icon={<span className="font-mono text-sm">00</span>}
          />
          <PhonePlayer src="/audio/deep-phone-intro-first-transmission.mp3" label="إن كنتَ تسمع هذه الإرسالية..." />
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            كل الأصوات في هذا التحدي تسجيلات هاتفية حقيقية محفوظة في الأرشيف —
            لا يُولَّد أي صوت وقت التشغيل. إن سمعتَ تشويشاً فذلك لأن الخط قديم... أو لأن أحدهم يسمع معك.
          </p>
        </div>

        {/* الأعمدة */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p, i) => (
            <div
              key={p.title}
              className="panel p-4 transition-colors hover:border-primary/40"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/30 bg-primary/10 text-primary">
                  <p.icon className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-foreground">{p.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        {/* قواعد مختصرة */}
        <div className="panel mb-8 p-5">
          <h3 className="mb-3 font-bold text-primary text-glow-amber">قواعد الاختراق — اقرأها مرة واحدة</h3>
          <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
            <li>١. اسمك الحركي هو هويتك الوحيدة. لا أسماء حقيقية — أنت «وكيل» في منظومة الظل، ومعرّفك الرباعي يُمنح عند التسجيل.</li>
            <li>٢. البروتوكولات متسلسلة: لا يُفتح التاسع إلا بإسقاط من قبله. والبروتوكول صفر «أرشيف الغائبين» هو الباب الأول.</li>
            <li>٣. الإجابة الخاطئة تُنزف ٥ نقاط. التلميحات ثلاثة مستويات بأسعار متصاعدة (١٠/٢٠/٣٠) وتُخصم فوراً.</li>
            <li>٤. جلستك دائمة: تسجيل دخولك يبقى بعد إغلاق المتصفح وتحديث الصفحة — لن يطردك الأرشيف أبداً.</li>
            <li>٥. الجملة المعيارية لكل بروتوكول Completed تُكشف لك وحدك — استعملها لتتأكد أن محدّثك عبر الباب نفسه فعلاً.</li>
          </ul>
        </div>

        {/* زر البدء */}
        <div className="text-center">
          <button
            type="button"
            onClick={onStart}
            className="rounded border border-primary/50 bg-primary/10 px-10 py-4 font-doc text-xl font-bold text-primary transition-all hover:bg-primary/20 pulse-ring"
          >
            تسلَّم الخط الآمن — سجّل دخولك
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            التسجيل يمنحك الاسم الحركي والمعرّف الرباعي وملفاً في منظومة الظل. الجلسة تبقى مفتوحة دائماً.
          </p>
        </div>
      </div>
    </div>
  );
}

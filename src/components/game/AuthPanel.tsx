"use client";

// ═══════════════════════════════════════════════════════════
// لوحة الدخول — انتساب وكيل (شروط من صفحتين) أو عودة
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import { Loader2, LogIn, UserPlus, FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sfx } from "./audio";
import { setToken } from "./useGame";

type Mode = "login" | "register";

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; token?: string };
  return { ok: res.ok, data };
}

export default function AuthPanel({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [codename, setCodename] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsPage, setTermsPage] = useState(0); // ٠ = بيانات، ١ = الشروط صفحة ١، ٢ = الشروط صفحة ٢

  const switchMode = (m: Mode) => {
    sfx.click();
    setMode(m);
    setError(null);
    setTermsPage(0);
  };

  const doLogin = async () => {
    setBusy(true);
    setError(null);
    const { ok, data } = await post("/api/game/auth/login", { codename, passphrase });
    setBusy(false);
    if (!ok || !data.ok) {
      sfx.error();
      setError(data.error ?? "فشل الاتصال بالأرشيف.");
      return;
    }
    if (data.token) setToken(data.token);
    sfx.success();
    onAuthed();
  };

  const doRegister = async () => {
    setBusy(true);
    setError(null);
    const { ok, data } = await post("/api/game/auth/register", { codename, passphrase });
    setBusy(false);
    if (!ok || !data.ok) {
      sfx.error();
      setError(data.error ?? "فشل الانتساب.");
      return;
    }
    if (data.token) setToken(data.token);
    sfx.success();
    onAuthed();
  };

  const submit = () => {
    if (!codename.trim() || !passphrase) {
      setError("أكمل الحقول أولاً.");
      return;
    }
    if (mode === "register" && termsPage < 2) {
      setTermsPage(1);
      return;
    }
    if (mode === "register") {
      void doRegister();
    } else {
      void doLogin();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="font-mono text-[0.65rem] tracking-[0.4em] text-muted-foreground" dir="ltr">
            SECURE-LINE // AUTHENTICATION
          </div>
          <h1 className="mt-2 font-doc text-2xl font-bold text-foreground text-glow-amber">
            {mode === "login" ? "عودة الوكيل" : "انتساب وكيل جديد"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "login"
              ? "جلستك محفوظة عادة — إن طُردت من التحديث فأدخل بياناتك مرة واحدة فقط."
              : "اسمان فقط: اسم حركي وعبارة سر. لا بريد ولا رقم طالب."}
          </p>
        </div>

        <div className="panel panel-corner-ticks p-5 sm:p-6">
          {mode === "register" && termsPage === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codename">الاسم الحركي</Label>
                <Input
                  id="codename"
                  value={codename}
                  onChange={(e) => setCodename(e.target.value)}
                  placeholder="مثال: عين الصقر"
                  maxLength={24}
                  dir="auto"
                  autoFocus
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  ٣-٢٤ حرفاً. بهذا الاسم ستُعرف في المتصدرين — لا تستخدماً اسماً حقيقياً.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passphrase">عبارة السر</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="٤ أحرف على الأقل"
                  dir="auto"
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  مفتاح عودتك. احفظها — لا استرجاع بالبريد هنا.
                </p>
              </div>
              <Button onClick={submit} className="w-full" variant="outline">
                <UserPlus className="ml-2 h-4 w-4" />
                متابعة إلى الشروط
              </Button>
            </div>
          )}

          {mode === "register" && termsPage > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-primary">
                <FileText className="h-4 w-4" />
                <span>
                  شروط الانتساب — صفحة {termsPage} من ٢
                  {termsPage === 2 && <span className="text-muted-foreground"> (الأخيرة)</span>}
                </span>
              </div>
              <div className="doc-frame max-h-64 overflow-y-auto scroll-thin p-4 font-doc text-sm leading-7 text-foreground/90">
                {termsPage === 1 ? (
                  <div className="space-y-3">
                    <p>١. هذه تجربة خيالية محكمة التصميم — تجربة واقع بديل (ARG). لا وجود لوحدة بحثية حقيقية، وكل الشخصيات والأحداث خيال أدبي.</p>
                    <p>٢. المشاركة اختيارية في كل لحظة، والانسحاب حق فوري بلا أي لوم.</p>
                    <p>٣. لا تُجمع أي بيانات شخصية حقيقية: لا اسم ولا بريد ولا رقم طالب. هويتك اسم حركي فقط.</p>
                    <p>٤. جلستك دائمة عشر سنوات — لن تُطرد بتحديث الصفحة أبداً.</p>
                    <p>٥. احترم الحرم الجامعي وأهله عند أي بحث ميداني حقيقي. التحدي لا يطلب تجاوزاً على أحد.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p>٦. الإجابات الخاطئة تُنزف نقاطاً، والتلميحات مدفوعة مقدماً — القراءة الدقيقة أرخص من التسرع.</p>
                    <p>٧. الفرق قرار ثقة: الانضمام والانفصال الهادئ قرارات لا رجعة فيها.</p>
                    <p>٨. الوثائق المزيفة موجودة عمداً — التحقق النقدي جزء من اللعبة لا عيباً فيها.</p>
                    <p className="text-[0.68rem] leading-5 text-muted-foreground/70">
                      بمشاركتك تُقرّ بأن مسار قراراتك وتوقيتاتك واختياراتك في الإصرار والتوقف قد تُحلَّل ضمنياً كجزء من التجربة الجماعية للبروتوكول التاسع، وستُعلم بتفاصيل ذلك عند العتبة الأخيرة.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {termsPage === 1 ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={() => setTermsPage(0)}>
                      <ArrowRight className="ml-1 h-4 w-4" /> رجوع
                    </Button>
                    <Button className="flex-1" onClick={() => { sfx.click(); setTermsPage(2); }}>
                      الصفحة التالية <ArrowLeft className="mr-1 h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1" onClick={() => setTermsPage(1)}>
                      <ArrowRight className="ml-1 h-4 w-4" /> رجوع
                    </Button>
                    <Button className="flex-1" onClick={doRegister} disabled={busy}>
                      {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UserPlus className="ml-2 h-4 w-4" />}
                      {busy ? "جارٍ الانتساب..." : "أُقرّ — انتسبني"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {mode === "login" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-codename">الاسم الحركي</Label>
                <Input
                  id="login-codename"
                  value={codename}
                  onChange={(e) => setCodename(e.target.value)}
                  dir="auto"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-pass">عبارة السر</Label>
                <Input
                  id="login-pass"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  dir="auto"
                />
              </div>
              <Button onClick={submit} className="w-full" disabled={busy}>
                {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <LogIn className="ml-2 h-4 w-4" />}
                {busy ? "جارٍ فتح الخط..." : "افتح الخط الآمن"}
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-400 glitch-burst">
              {error}
            </p>
          )}

          <div className="mt-5 border-t border-border pt-4 text-center text-sm">
            {mode === "login" ? (
              <button type="button" className="text-primary hover:underline" onClick={() => switchMode("register")}>
                لا تملك ملفاً في منظومة الظل؟ انتسب الآن
              </button>
            ) : (
              <button type="button" className="text-primary hover:underline" onClick={() => switchMode("login")}>
                لديك ملف سابق؟ عد إلى الخط
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[0.65rem] leading-5 text-muted-foreground/70">
          AA — الأرشيف يُراقب — إنك لن تلاحظ هذا إلا إذا كنت تُلاحظ.
        </p>
      </div>
    </div>
  );
}

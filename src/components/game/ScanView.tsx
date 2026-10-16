"use client";

// ═══════════════════════════════════════════════════════════
// الميدان — منارات QR داخل جامعة البحرين
// الكاميرا تقرأ الرمز ← الشبكة تختبر الوكيل وتكشف الأرشيف
// + إدخال يدوي للأكواد + استوديو المنظّم لطباعة الرموز
// ═══════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import {
  QrCode, Camera, CameraOff, Keyboard, Loader2, MapPin, Award,
  Lightbulb as TorchIcon, ShieldQuestion, Printer, Lock, Volume2,
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BUILDINGS } from "@/lib/game/campus";
import { SCAN_POINTS } from "@/lib/game/content-paths";
import { sfx, deck, useAutoTransmission } from "./audio";
import { GlitchOnce } from "./effects";
import type { Game } from "./useGame";

interface ScanResultData {
  ok: boolean;
  alreadyFound?: boolean;
  title: string;
  story: string;
  audio: string;
  building: string;
  pointsAwarded: number;
  test: { question: string; bonusPoints: number; solved: boolean } | null;
  message: string;
}

const buildingName = (code: string) => BUILDINGS.find((b) => b.code === code)?.name ?? code;

export default function ScanView({ game }: { game: Game }) {
  const state = game.state!;
  const scans = state.scans;

  // ── التشغيل التلقائي لإحاطة الميدان (مرة لكل جلسة) ──
  useAutoTransmission("/audio/urgent-phone-field-scan-briefing.mp3", "إحاطة ميدانية: الأكواد منتشرة في الحرم");

  // ── الكاميرا ──
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastHitRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [camActive, setCamActive] = useState(false);
  const [camStarting, setCamStarting] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // ── النتيجة والاختبار ──
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [manualCode, setManualCode] = useState("");
  const [testAnswer, setTestAnswer] = useState("");
  const [testFeedback, setTestFeedback] = useState<{ ok: boolean; msg: string; reveal?: string } | null>(null);
  const [glitch, setGlitch] = useState(0);

  // ── استوديو المنظّم ──
  const [orgOpen, setOrgOpen] = useState(false);
  const [orgCode, setOrgCode] = useState("");
  const [orgUnlocked, setOrgUnlocked] = useState(false);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  const submitScan = useCallback(
    async (code: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setTestFeedback(null);
      setTestAnswer("");
      const res = await game.scanCode(code);
      submittingRef.current = false;
      setSubmitting(false);
      if (!res.ok) {
        sfx.error();
        setGlitch((g) => g + 1);
        setResult(null);
        setTestFeedback({ ok: false, msg: res.data.error ?? "رمز مرفوض." });
        return;
      }
      const r = res.data.result as unknown as ScanResultData;
      setResult(r);
      if (r.alreadyFound) sfx.click();
      else sfx.success();
      // إرسالية المنارة تعمل تلقائياً
      deck.play(r.audio, `منارة: ${r.title}`, { ring: false });
    },
    [game]
  );

  // ── حلقة فك QR — تعمل ما دامت الكاميرا نشطة ──
  useEffect(() => {
    if (!camActive) return;
    let alive = true;
    let raf = 0;
    const loop = () => {
      if (!alive) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const w = 320;
        const h = 320;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          const size = Math.min(video.videoWidth, video.videoHeight);
          const sx = (video.videoWidth - size) / 2;
          const sy = (video.videoHeight - size) / 2;
          ctx.drawImage(video, sx, sy, size, size, 0, 0, w, h);
          try {
            const img = ctx.getImageData(0, 0, w, h);
            const hit = jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
            if (hit && hit.data) {
              const now = Date.now();
              if (!(hit.data === lastHitRef.current.code && now - lastHitRef.current.at < 3500)) {
                lastHitRef.current = { code: hit.data, at: now };
                if (navigator.vibrate) navigator.vibrate(90);
                void submitScan(hit.data);
              }
            }
          } catch {
            /* تجاهل إطارات تالفة */
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [camActive, submitScan]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamActive(false);
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    setCamStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamActive(true);
      setCamStarting(false);
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.();
      setTorchSupported(!!caps && "torch" in caps);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (e) {
      setCamStarting(false);
      setCamActive(false);
      const name = e instanceof Error ? e.name : "";
      setCamError(
        name === "NotAllowedError"
          ? "رُفض إذن الكاميرا. اسمح به من إعدادات المتصفح ثم أعد المحاولة — أو استخدم الإدخال اليدوي أسفل."
          : name === "NotFoundError"
            ? "لا كاميرا على هذا الجهاز. استخدم الإدخال اليدوي."
            : "تعذر تشغيل الكاميرا. جرّب الإدخال اليدوي."
      );
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(!torchOn);
    } catch {
      setTorchSupported(false);
    }
  };

  // كود المنارة المعروضة حالياً (لإرسال الاختبار)
  const currentCode = (r: ScanResultData): string => {
    const sp = SCAN_POINTS.find((p) => p.title === r.title);
    return sp?.code ?? "";
  };

  const submitTestFor = async (code: string) => {
    if (!testAnswer.trim()) return;
    const res = await game.answerScanTest(code, testAnswer);
    const r = res.data.result as
      | { correct: boolean; pointsAwarded: number; revealAnswer: string; message: string }
      | undefined;
    if (!res.ok || !r) {
      sfx.error();
      setTestFeedback({ ok: false, msg: res.data.error ?? "خلل في الإرسال." });
      return;
    }
    if (r.correct) {
      sfx.success();
      setTestFeedback({ ok: true, msg: r.message, reveal: r.revealAnswer });
      setTestAnswer("");
    } else {
      sfx.error();
      setGlitch((g) => g + 1);
      setTestFeedback({ ok: false, msg: r.message });
    }
  };

  // ── استوديو المنظّم: توليد QR ──
  const unlockOrganizer = async () => {
    if (orgCode.trim() === "1998") {
      setOrgUnlocked(true);
      sfx.success();
      const urls: Record<string, string> = {};
      for (const sp of SCAN_POINTS) {
        urls[sp.code] = await QRCode.toDataURL(sp.code, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#032031", light: "#ffffff" },
        });
      }
      setQrUrls(urls);
    } else {
      sfx.error();
      setGlitch((g) => g + 1);
    }
  };

  const printSheet = () => {
    const cards = SCAN_POINTS.map(
      (sp) => `
      <div class="card">
        <img src="${qrUrls[sp.code] ?? ""}" alt="${sp.code}" />
        <div class="code">${sp.code}</div>
        <div class="bld">${buildingName(sp.building)} — ${sp.building}</div>
        <div class="ttl">${sp.title}</div>
        <div class="pts">${sp.points} نقطة${sp.test ? " + اختبار" : ""}</div>
      </div>`
    ).join("");
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>منارات بروتوكول التاسع — جامعة البحرين</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, "Segoe UI", Tahoma, sans-serif; background: #fff; color: #10202e; padding: 18px; }
        h1 { font-size: 17px; text-align: center; margin-bottom: 4px; }
        .sub { font-size: 11px; text-align: center; color: #4a6070; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .card { border: 1.5px solid #29506e; border-radius: 8px; padding: 10px; text-align: center; page-break-inside: avoid; }
        .card img { width: 100%; max-width: 150px; height: auto; }
        .code { font-family: monospace; font-size: 13px; font-weight: bold; letter-spacing: 1px; margin-top: 4px; }
        .bld { font-size: 11px; color: #35566e; margin-top: 2px; }
        .ttl { font-size: 12px; font-weight: bold; margin-top: 3px; }
        .pts { font-size: 10px; color: #6a8296; margin-top: 3px; }
        .foot { margin-top: 14px; font-size: 10px; text-align: center; color: #6a8296; }
        @media print { body { padding: 6px; } }
      </style></head><body>
      <h1>منارات بروتوكول التاسع — الميدان</h1>
      <div class="sub">تُطبع وتُعلَّق في مواقعها داخل حرم جامعة البحرين (الصخير) — يمسحها الطلاب من التطبيق</div>
      <div class="grid">${cards}</div>
      <div class="foot">بروتوكول التاسع — كل رمز يختبر الوكيل ويكشف جزءاً من الأرشيف الغائب</div>
      </body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.insetInlineEnd = "-9999px";
    iframe.style.width = "820px";
    iframe.style.height = "1100px";
    document.body.appendChild(iframe);
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 4000);
  };

  const foundPoints = scans.points.filter((p) => p.found);

  return (
    <GlitchOnce trigger={glitch}>
    <div className="space-y-4">
      {/* ── الإحاطة ── */}
      <section className="panel panel-corner-ticks blueprint-grid-fine p-4 sm:p-5" aria-labelledby="scan-title">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary beacon-pulse">
            <QrCode className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 id="scan-title" className="text-lg font-bold text-foreground">
              الميدان — منارات الأرشيف
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {scans.total} منارة منتشرة في حرم جامعة البحرين. وجّه الكاميرا إلى الرمز في موقعه الحقيقي،
              أو أدخل كوده يدوياً — فتختبرك الشبكة وتكشف ما خصّت به كل منارة من أرشيف الغائبين.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                ممسوحة: <span className="font-mono text-primary" dir="ltr">{scans.foundCount}/{scans.total}</span>
              </span>
              {scans.bonusPoints > 0 && (
                <span className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-chart-4" />
                  مكافآت اختبارات: <span className="font-mono text-chart-4" dir="ltr">+{scans.bonusPoints}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── الماسح ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel overflow-hidden" aria-label="ماسح الكاميرا">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-bold text-primary">
              <Camera className="h-4 w-4" />
              الماسح الحي
            </span>
            {camActive && torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs transition-colors",
                  torchOn
                    ? "border-chart-4/60 bg-chart-4/15 text-chart-4"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={torchOn}
              >
                <TorchIcon className="h-3.5 w-3.5" />
                الضوء
              </button>
            )}
          </div>
          <div className="p-4">
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg border border-primary/25 bg-[#03080f]">
              {/* إطار المسح */}
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className={cn("relative h-[62%] w-[62%]", camActive && "beacon-pulse")}>
                  <div className="absolute inset-0 rounded-xl border-2 border-primary/50" />
                  <div className="absolute -top-1 right-0 h-5 w-5 rounded-tr-xl border-t-2 border-r-2 border-primary" />
                  <div className="absolute -top-1 left-0 h-5 w-5 rounded-tl-xl border-t-2 border-l-2 border-primary" />
                  <div className="absolute -bottom-1 right-0 h-5 w-5 rounded-br-xl border-b-2 border-r-2 border-primary" />
                  <div className="absolute -bottom-1 left-0 h-5 w-5 rounded-bl-xl border-b-2 border-l-2 border-primary" />
                </div>
              </div>
              <video
                ref={videoRef}
                className={cn("h-full w-full object-cover", !camActive && "opacity-25")}
                playsInline
                muted
                autoPlay
                aria-label="بث الكاميرا الخلفية"
              />
              <canvas ref={canvasRef} className="hidden" aria-hidden />
              {!camActive && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  {camStarting ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">جارٍ تأمين الخط البصري...</p>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-10 w-10 text-primary/60" />
                      <p className="text-sm text-muted-foreground">
                        الكاميرا مطفأة. شغّلها عندما تقف أمام منارة في الحرم.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            {camError && (
              <p className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-red-300" role="alert">
                {camError}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              {camActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded border border-destructive/50 bg-destructive/10 px-4 text-sm font-bold text-red-300 transition-colors hover:bg-destructive/20"
                >
                  <CameraOff className="h-4 w-4" />
                  إيقاف الكاميرا
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  disabled={camStarting}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded border border-primary/50 bg-primary/15 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
                >
                  {camStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  تشغيل الكاميرا
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── الإدخال اليدوي + النتيجة ── */}
        <section className="panel p-4" aria-label="الإدخال اليدوي ونتيجة المسح">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <Keyboard className="h-4 w-4" />
            الإدخال اليدوي
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) void submitScan(manualCode);
            }}
          >
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="P9-QR-S17-1998"
              dir="ltr"
              className="h-11 flex-1 rounded border border-input bg-secondary/40 px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 focus:outline-none"
              aria-label="كود المنارة"
            />
            <button
              type="submit"
              disabled={submitting || !manualCode.trim()}
              className="flex h-11 items-center gap-2 rounded border border-primary/50 bg-primary/15 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              مسح
            </button>
          </form>
          <p className="mt-1.5 text-[0.68rem] text-muted-foreground/70">
            الكود مطبوع بجوار كل منارة — للوكيل الذي لا كاميرا معه أو يقرأ من بعيد.
          </p>

          {/* نتيجة المسح */}
          {testFeedback && !result && (
            <div
              className={cn(
                "mt-3 rounded border px-3 py-2 text-sm",
                testFeedback.ok
                  ? "border-chart-3/40 bg-chart-3/10 text-chart-3"
                  : "border-destructive/40 bg-destructive/10 text-red-300"
              )}
              role="status"
            >
              {testFeedback.msg}
            </div>
          )}
          {result && (
            <div className="doc-frame mt-4 rounded-lg p-4 line-reveal">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[0.6rem] tracking-widest text-primary/70" dir="ltr">
                    {currentCode(result) || "BEACON"}
                  </div>
                  <h3 className="mt-0.5 text-base font-bold text-foreground">{result.title}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {buildingName(result.building)} — <span className="font-mono" dir="ltr">{result.building}</span>
                  </p>
                </div>
                {result.pointsAwarded > 0 && (
                  <span className="shrink-0 rounded-full border border-chart-4/50 bg-chart-4/10 px-2.5 py-1 font-mono text-xs text-chart-4" dir="ltr">
                    +{result.pointsAwarded}
                  </span>
                )}
              </div>
              <p className="mt-3 font-doc text-sm leading-loose text-foreground/90">{result.story}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => deck.play(result.audio, `منارة: ${result.title}`, { ring: false })}
                  className="flex h-9 items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  إعادة إرسالية المنارة
                </button>
                {result.alreadyFound && (
                  <span className="text-[0.65rem] text-muted-foreground/60">ممسوحة سابقاً</span>
                )}
              </div>

              {/* اختبار المنارة */}
              {result.test && (
                <div className="mt-4 rounded border border-primary/25 bg-secondary/30 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                    <ShieldQuestion className="h-4 w-4" />
                    اختبار المنارة
                    <span className="font-mono text-[0.6rem] text-chart-4" dir="ltr">+{result.test.bonusPoints}</span>
                  </div>
                  {result.test.solved ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-chart-3">
                      <CheckCircle2 className="h-4 w-4" />
                      اجتزتَ الاختبار — المنارة اقتنعت بك.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{result.test.question}</p>
                      <form
                        className="mt-2 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void submitTestFor(currentCode(result));
                        }}
                      >
                        <input
                          value={testAnswer}
                          onChange={(e) => setTestAnswer(e.target.value)}
                          placeholder="إجابتك..."
                          className="h-10 flex-1 rounded border border-input bg-background/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/60 focus:outline-none"
                          aria-label="إجابة اختبار المنارة"
                        />
                        <button
                          type="submit"
                          disabled={!testAnswer.trim()}
                          className="h-10 rounded border border-primary/50 bg-primary/15 px-3.5 text-sm font-bold text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
                        >
                          أجب
                        </button>
                      </form>
                    </>
                  )}
                  {testFeedback && (
                    <div
                      className={cn(
                        "mt-2 rounded border px-3 py-2 text-sm",
                        testFeedback.ok
                          ? "border-chart-3/40 bg-chart-3/10 text-chart-3"
                          : "border-destructive/40 bg-destructive/10 text-red-300"
                      )}
                      role="status"
                    >
                      {testFeedback.msg}
                      {testFeedback.reveal && (
                        <p className="mt-1 text-xs text-muted-foreground">الحقيقة: {testFeedback.reveal}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── سجل المنارات ── */}
      <section className="panel p-4" aria-labelledby="beacons-title">
        <button
          type="button"
          onClick={() => sfx.click()}
          className="flex w-full items-center justify-between"
          aria-expanded
          aria-controls="beacons-list"
        >
          <h2 id="beacons-title" className="flex items-center gap-2 text-sm font-bold text-primary">
            <MapPin className="h-4 w-4" />
            سجل المنارات ({scans.foundCount}/{scans.total})
          </h2>
        </button>
        <div id="beacons-list" className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {scans.points.map((p) => (
            <div
              key={p.id}
              className={cn(
                "rounded-lg border p-3",
                p.found
                  ? "border-chart-3/30 bg-chart-3/5"
                  : p.locked
                    ? "border-border/50 bg-muted/30 opacity-70"
                    : "border-primary/25 bg-secondary/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.found ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-chart-3" />
                    ) : p.locked ? (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    ) : (
                      <QrCode className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    )}
                    <span className={cn("truncate text-sm font-bold", p.locked ? "text-muted-foreground" : "text-foreground")}>
                      {p.title}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                    {buildingName(p.building)} — <span className="font-mono" dir="ltr">{p.building}</span>
                    <span className="mx-1.5 text-muted-foreground/30">|</span>
                    <span className="font-mono" dir="ltr">{p.code}</span>
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground" dir="ltr">
                  {p.found ? "✓" : p.locked ? `P${p.minProtocol}` : p.points}
                </span>
              </div>
              {p.found && p.test && (
                <p className={cn("mt-1.5 text-[0.68rem]", p.test.solved ? "text-chart-3" : "text-chart-4")}>
                  {p.test.solved ? "الاختبار مجتاز" : "اختبار بانتظار إجابتك"}
                </p>
              )}
              {p.locked && (
                <p className="mt-1.5 text-[0.68rem] text-muted-foreground/70">
                  تُصبح مسموعة بعد إتمام البروتوكول {Math.max(0, p.minProtocol - 1)}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── استوديو المنظّم ── */}
      <section className="panel p-4" aria-labelledby="org-title">
        <button
          type="button"
          onClick={() => {
            sfx.click();
            setOrgOpen((o) => !o);
          }}
          className="flex w-full items-center justify-between text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          aria-expanded={orgOpen}
          aria-controls="org-panel"
        >
          <span id="org-title" className="flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            أدوات المنظّم — لطباعة المنارات ونشرها في الحرم
          </span>
          {orgOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {orgOpen && (
          <div id="org-panel" className="mt-3 border-t border-border/60 pt-3">
            {!orgUnlocked ? (
              <form
                className="flex max-w-md gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void unlockOrganizer();
                }}
              >
                <input
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value)}
                  placeholder="رمز المنظّم"
                  dir="ltr"
                  type="password"
                  className="h-10 flex-1 rounded border border-input bg-secondary/40 px-3 font-mono text-sm text-foreground focus:border-primary/60 focus:outline-none"
                  aria-label="رمز المنظّم"
                />
                <button
                  type="submit"
                  className="h-10 rounded border border-border px-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  فتح
                </button>
              </form>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={printSheet}
                    disabled={Object.keys(qrUrls).length === 0}
                    className="flex h-10 items-center gap-2 rounded border border-primary/50 bg-primary/15 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" />
                    طباعة ورقة المنارات ({SCAN_POINTS.length})
                  </button>
                  <span className="text-xs text-muted-foreground">
                    أدر الورقة على الجدران والأعمدة في مواقعها — الطلاب يمسحونها من التطبيق.
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                  {SCAN_POINTS.map((sp) => (
                    <div key={sp.code} className="rounded border border-border/60 bg-white p-1.5 text-center no-print">
                      {qrUrls[sp.code] && (
                        <img src={qrUrls[sp.code]} alt={`QR ${sp.code}`} className="mx-auto h-auto w-full" />
                      )}
                      <div className="font-mono text-[0.55rem] font-bold text-[#032031]" dir="ltr">{sp.code}</div>
                      <div className="text-[0.5rem] text-[#35566e]" dir="rtl">{buildingName(sp.building)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
    </GlitchOnce>
  );
}

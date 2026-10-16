"use client";

// ═══════════════════════════════════════════════════════════
// المختبر — أدوات التشفير التفاعلية (كلها محلياً في المتصفح)
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Copy, Check, FlaskConical, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  caesar, caesarArabic, atbash, vigenere, reverseText,
  b64Encode, b64Decode, toMorse, fromMorse, toA1Z26, fromA1Z26,
  abjadValue, zwDecode, zwDetect,
} from "@/lib/game/ciphers";
import { sfx } from "./audio";
import { SectionHead } from "./effects";
import { MorseSynthButton } from "./MaterialView";

type ToolKey = "caesar" | "atbash" | "vigenere" | "base64" | "morse" | "a1z26" | "reverse" | "abjad" | "spectro";

const TOOLS: { key: ToolKey; label: string; hint: string }[] = [
  { key: "caesar", label: "قيصر", hint: "الانزياح — عربي وإنجليزي" },
  { key: "vigenere", label: "فيجنير", hint: "نسيج بالمفتاح" },
  { key: "atbash", label: "أتباش", hint: "المرآة الكاملة" },
  { key: "base64", label: "Base64", hint: "الستة والستون" },
  { key: "morse", label: "مورس", hint: "نقاط وشرطات" },
  { key: "a1z26", label: "الأرقام", hint: "A=1 … Z=26" },
  { key: "reverse", label: "العكس", hint: "قلب النص" },
  { key: "abjad", label: "الجُمّل", hint: "حساب الأحرف العربية" },
  { key: "spectro", label: "محلل الطيف", hint: "الأحرف غير المرئية" },
];

function OutBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <div className="min-h-[2.75rem] break-all rounded border border-primary/25 bg-black/40 p-3 font-mono text-sm leading-7 text-primary/95" dir="auto">
        {text || <span className="text-muted-foreground/50">—</span>}
      </div>
      {text && (
        <button
          type="button"
          onClick={async () => {
            sfx.click();
            try { await navigator.clipboard.writeText(text); } catch { /* محظور */ }
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="absolute left-2 top-2 flex items-center gap-1 rounded border border-border bg-background/80 px-2 py-0.5 text-[0.6rem] text-muted-foreground hover:text-primary"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "نُسخت" : "نسخ"}
        </button>
      )}
    </div>
  );
}

export default function LabView() {
  const [tool, setTool] = useState<ToolKey>("caesar");
  const [input, setInput] = useState("");
  const [shift, setShift] = useState(3);
  const [arabicMode, setArabicMode] = useState(false);
  const [decode, setDecode] = useState(true);
  const [key, setKey] = useState("SAKHIR");

  const output = useMemo(() => {
    const t = input;
    if (!t.trim()) return "";
    try {
      switch (tool) {
        case "caesar": {
          if (arabicMode) {
            return caesarArabic(t, decode ? -shift : shift);
          }
          return caesar(t, decode ? -shift : shift);
        }
        case "atbash":
          return atbash(t);
        case "vigenere":
          return vigenere(t, key, decode);
        case "base64":
          return decode ? b64Decode(t) : b64Encode(t);
        case "morse":
          return decode ? fromMorse(t) : toMorse(t);
        case "a1z26":
          return decode ? fromA1Z26(t) : toA1Z26(t);
        case "reverse":
          return reverseText(t);
        case "abjad":
          return String(abjadValue(t));
        case "spectro": {
          if (!zwDetect(t)) return "— لا رصد لأحرف خفية في هذا النص —";
          const decoded = zwDecode(t);
          return decoded
            ? `⟡ رُصد! الهمس الخفي:\n«${decoded}»`
            : "— رُصدت أحرف خفية لكنها غير قابلة للفك —";
        }
      }
    } catch {
      return "— مدخل غير صالح —";
    }
    return "";
  }, [input, tool, shift, arabicMode, decode, key]);

  const showShift = tool === "caesar";
  const showKey = tool === "vigenere";
  const showDecodeToggle = ["caesar", "vigenere", "base64", "morse", "a1z26"].includes(tool);

  return (
    <div className="space-y-5">
      <div className="panel panel-corner-ticks p-4 sm:p-5">
        <SectionHead
          code="CRYPTO-LAB"
          title="مختبر التشفير"
          sub="أدواتك المحلية — كل شيء يُحسب في متصفحك، لا يغادر شيئٌ خطَّك"
          icon={<FlaskConical className="h-4 w-4" />}
        />
        <div className="flex flex-wrap gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                sfx.click();
                setTool(t.key);
              }}
              title={t.hint}
              className={cn(
                "rounded border px-3 py-1.5 text-xs font-bold transition-all",
                tool === t.key
                  ? "border-primary/50 bg-primary/15 text-primary text-glow-amber"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel space-y-4 p-4 sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="lab-input">
            {tool === "spectro" ? "الصق النص الكامل المشبوه هنا" : "النص"}
            {tool === "abjad" && " (عربي)"}
          </Label>
          <textarea
            id="lab-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[90px] w-full rounded border border-input bg-black/30 px-3 py-2 font-mono text-sm leading-7 text-foreground outline-none focus:border-primary/50"
            dir="auto"
            spellCheck={false}
          />
        </div>

        {showShift && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>الإزاحة</Label>
              <span className="font-mono text-primary" dir="ltr">{shift}</span>
            </div>
            <Slider
              value={[shift]}
              min={1}
              max={27}
              step={1}
              onValueChange={(v) => setShift(v[0] ?? 3)}
            />
            <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
              <span>عربي: أقصى إزاحة ٢٨</span>
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  setArabicMode((v) => !v);
                }}
                className={cn(
                  "rounded border px-2 py-0.5 transition-colors",
                  arabicMode ? "border-primary/50 bg-primary/15 text-primary" : "border-border hover:text-primary"
                )}
              >
                {arabicMode ? "الوضع العربي (قيصر عربي)" : "الوضع الإنجليزي"}
              </button>
            </div>
          </div>
        )}

        {showKey && (
          <div className="space-y-2">
            <Label htmlFor="lab-key">المفتاح (إنجليزي)</Label>
            <Input
              id="lab-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              dir="ltr"
              className="font-mono"
            />
          </div>
        )}

        {showDecodeToggle && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sfx.click();
                setDecode((v) => !v);
              }}
            >
              <ArrowLeftRight className="ml-1.5 h-3.5 w-3.5" />
              {decode ? "وضع الفك" : "وضع التشفير"}
            </Button>
            <span className="text-[0.65rem] text-muted-foreground">
              {decode ? "حوّل الشيفرة إلى نص" : "حوّل النص إلى شيفرة"}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label>الناتج</Label>
          <OutBox text={output} />
        </div>

        {tool === "morse" && input.trim() && (
          <div className="flex flex-wrap items-center gap-2">
            <MorseSynthButton text={decode ? output || input : output} />
            <span className="text-[0.65rem] text-muted-foreground">
              اسمع الناتج — مذبذب محلي لا يستهلك شيئاً
            </span>
          </div>
        )}

        {tool === "spectro" && (
          <p className="text-[0.65rem] leading-5 text-muted-foreground">
            المحلل يبحث عن الأحرف صفريّة العرض (ZWSP/ZWNJ/ZWJ) المخفية بين الحروف المرئية —
            بعض وثائق الحارس السادس تُخفي همساً لا يُرى. انسخ الوثيقة «كاملة» ثم الصقها هنا.
          </p>
        )}
      </div>
    </div>
  );
}

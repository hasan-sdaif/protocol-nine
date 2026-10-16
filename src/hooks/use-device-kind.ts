"use client";

// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — نوع الجهاز
// تجربة مختلفة تماماً لكل جهاز: كمبيوتر / هاتف / تاب
// كمبيوتر: مؤشر دقيق (pointer: fine) وعرض ≥1024
// هاتف: لمس خشن وعرض <768 — تاب: لمس خشن وعرض ≥768
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";

export type DeviceKind = "mobile" | "tablet" | "desktop";

function detect(): DeviceKind {
  if (typeof window === "undefined") return "desktop";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const w = window.innerWidth;
  if (coarse) return w >= 768 ? "tablet" : "mobile";
  return w >= 1024 ? "desktop" : w >= 768 ? "tablet" : "mobile";
}

export function useDeviceKind(): DeviceKind {
  // الطرفية تُقدَّر بعد التركيب — قبل ذلك نحتفظ بالافتراضي لتجنب انزياح hydration
  const [kind, setKind] = useState<DeviceKind | null>(null);

  useEffect(() => {
    const calc = () => setKind(detect());
    calc();
    const coarseMq = window.matchMedia("(pointer: coarse)");
    coarseMq.addEventListener?.("change", calc);
    window.addEventListener("resize", calc);
    return () => {
      coarseMq.removeEventListener?.("change", calc);
      window.removeEventListener("resize", calc);
    };
  }, []);

  return kind ?? "desktop";
}

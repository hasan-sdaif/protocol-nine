"use client";

// ═══════════════════════════════════════════════════════════
// الخريطة — غرفة العمليات الليلية (هندسة OSM حقيقية)
// المناطق تنير مع تقدم البروتوكولات + توهج ألغاز الجغرافيا
// ═══════════════════════════════════════════════════════════
import { useMemo } from "react";
import { Map as MapIcon, Sparkles } from "lucide-react";
import CampusMap from "./CampusMap";
import { SectionHead } from "./effects";
import type { Game } from "./useGame";

// تدرّج إضاءة المناطق مع إتمام البروتوكولات (n = أعلى بروتوكول مكتمل)
const AREA_UNLOCKS: Record<string, number> = {
  library: -1, // مضاءة منذ الانضمام — قلب الأرشيف
  transport: -1,
  garden: -1,
  science: 0,
  mosque: 0,
  halls: 1,
  arts: 2,
  law: 3,
  business: 3,
  it: 4,
  east: 4,
  education: 5,
  health: 6,
  sports: 6,
  food: 7,
};

// ألغاز الجغرافيا: أي المباني تُوهَج حسب اللغز النشط
const PUZZLE_HIGHLIGHTS: Record<string, string[]> = {
  "p4-a": ["BUS", "S18"],
  "p4-b": ["S6", "S3"],
  "p0-a": ["S3"],
  "p0-c": ["S47"],
};

export default function MapPanel({
  game,
  focusPuzzleId,
  onClearFocus,
}: {
  game: Game;
  focusPuzzleId?: string | null;
  onClearFocus?: () => void;
}) {
  const state = game.state;

  const unlockedAreas = useMemo(() => {
    if (!state) return [] as string[];
    const highest = state.protocols.reduce(
      (h, p) => (p.completed ? Math.max(h, p.n) : h),
      -1
    );
    return Object.entries(AREA_UNLOCKS)
      .filter(([, min]) => highest >= min)
      .map(([key]) => key);
  }, [state]);

  const highlightCodes = useMemo(() => {
    if (!focusPuzzleId) return undefined;
    return PUZZLE_HIGHLIGHTS[focusPuzzleId];
  }, [focusPuzzleId]);

  if (!state) return null;

  const plateNote = state.agent.plateUnlocked
    ? "بين البستان والمكتبة ممرٌّ لا يمرّ منه أحد وقت المغرب. ف.م. كانت تجلس هناك."
    : null;

  return (
    <div className="space-y-5">
      <div className="panel panel-corner-ticks p-4 sm:p-5">
        <SectionHead
          code="SAKHEIR-TACTICAL-MAP"
          title="خريطة الحرم — صخير"
          sub="اسحب للتجوال • عجلة/قرص للتقريب • انقر مبنى لتفاصيله — المناطق تنير مع تقدمك"
          icon={<MapIcon className="h-4 w-4" />}
        />
        {highlightCodes && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded border border-emerald-800/60 bg-emerald-950/25 px-3 py-2 text-sm">
            <span className="text-emerald-300">
              توهّج الاستهداف نشط — المباني المرتبطة بلغزك مُحاطة بإطار أخضر.
            </span>
            {onClearFocus && (
              <button
                type="button"
                onClick={onClearFocus}
                className="shrink-0 rounded border border-border px-2 py-1 text-[0.65rem] text-muted-foreground hover:text-primary"
              >
                إطفاء الاستهداف
              </button>
            )}
          </div>
        )}
        {plateNote && (
          <div className="mb-3 rounded border border-primary/40 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              بين السطور — الصفيحة الشفافة
            </p>
            <p className="mt-1 font-doc text-sm leading-7 text-foreground/90">{plateNote}</p>
          </div>
        )}
        <div className="overflow-hidden rounded-lg border border-primary/20">
          <CampusMap
            unlockedAreas={unlockedAreas}
            highlightCodes={highlightCodes}
            onSelectBuilding={() => undefined}
            height="70vh"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] text-muted-foreground">
          <span>
            {unlockedAreas.length}/16 منطقة مضاءة — أكمل البروتوكولات لتنير البقية.
          </span>
          <span>هندسة حقيقية مبنية على بيانات OpenStreetMap لحرم صخير.</span>
        </div>
      </div>
    </div>
  );
}

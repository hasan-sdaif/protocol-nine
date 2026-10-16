"use client";

// ═════════════════════════════════════════════════════════════════════
// CampusMap — الخريطة التفاعلية لجامعة البحرين (حرم الصخير)
// هوية «المخطط الهندسي الأزرق الليلي» (Blueprint Ice-Blue): سماوي/جليدي على كحلي عميق
// SVG + React فقط — تكبير/تحريك/قرص يدويّة بلا أي مكتبة خارجية.
// ═════════════════════════════════════════════════════════════════════

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AREAS,
  BUILDINGS,
  CAMPUS_PATHS,
  CAMPUS_VIEW,
  buildingByCode,
  type BuildingDef,
} from "@/lib/game/campus";

export interface CampusMapProps {
  /** مفاتيح المناطق المضاءة (المفتوحة) */
  unlockedAreas: string[];
  /** رموز مبانٍ مميّزة بتوهج أخضر */
  highlightCodes?: string[];
  /** رموز مبانٍ عليها «منارة ميدانية» — معيّن سماوي نابض فوق مركز المبنى */
  beaconCodes?: string[];
  /** يُستدعى عند اختيار مبنى (نقراً أو بلوحة المفاتيح) */
  onSelectBuilding?: (code: string) => void;
  /** ارتفاع الحاوية — افتراضياً "70vh" */
  height?: string;
  className?: string;
}

// ── ثوابت الفضاء والتحويل ──────────────────────────────────────────
const W = CAMPUS_VIEW.w;
const H = CAMPUS_VIEW.h;
const MIN_K = 0.5;
const MAX_K = 5;
const PAN_MARGIN = 260; // سماح التحريك خارج الحرم (وحدات viewBox)
const GRID_STEP = 100; // شبكة الرؤية التكتيكية
const LOCK_AT = 1.6; // ظهور أيقونة القفل
const LABEL_AT = 1.8; // ظهور التسميات
const METERS_PER_UNIT = 1200 / 1400; // 1400 وحدة ≈ 1.2 كم
const DRAG_THRESHOLD = 8; // بكسل شاشة — بعده يُعدّ التفاعل سحباً لا نقراً
const EMPTY_CODES: string[] = [];

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;
const arDigits = (n: number): string =>
  String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)] ?? d);

const NICE_METERS = [25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000];

// شبكة الإحداثيات — كل 100 وحدة (تُبنى مرة واحدة على مستوى الوحدة)
const GRID_D = (() => {
  let d = "";
  for (let x = 0; x <= W; x += GRID_STEP) d += `M${x} 0V${H}`;
  for (let y = 0; y <= H; y += GRID_STEP) d += `M0 ${y}H${W}`;
  return d;
})();

// CSS الخاص بعناصر SVG (مضمّن داخل <svg> — أسماء مسبوقة بـ cmp-)
const SVG_CSS = `
.cmp-b { cursor: pointer; outline: none; }
.cmp-b .cmp-shape { fill: rgba(56,189,248,.10); stroke: rgba(56,189,248,.70); stroke-width: 1.1; transition: fill .16s ease, stroke .16s ease; }
.cmp-b:hover .cmp-shape, .cmp-b:focus-visible .cmp-shape { fill: rgba(125,211,252,.25); stroke: rgba(125,211,252,.95); }
.cmp-b.cmp-locked { cursor: default; }
.cmp-b.cmp-locked .cmp-shape { fill: rgba(28,25,23,.30); stroke: rgba(68,64,60,.40); stroke-width: 1; transition: none; }
.cmp-b.cmp-locked:hover .cmp-shape { fill: rgba(28,25,23,.30); }
.cmp-b.cmp-locked:focus-visible .cmp-shape { stroke: rgba(168,162,158,.75); }
.cmp-b.cmp-hi .cmp-shape { fill: rgba(74,222,128,.12); stroke: rgba(74,222,128,.90); }
.cmp-b.cmp-hi:hover .cmp-shape { fill: rgba(74,222,128,.22); }
.cmp-b.cmp-selected .cmp-shape { fill: rgba(125,211,252,.28); stroke: #7dd3fc; stroke-width: 1.6; }
.cmp-pulse { transform-box: fill-box; transform-origin: center; animation: cmpPulse 1.7s cubic-bezier(.2,.6,.35,1) infinite; will-change: transform, opacity; }
.cmp-pulse-2 { animation-delay: .85s; }
@keyframes cmpPulse {
  0% { transform: scale(.5); opacity: .95; }
  75% { opacity: .18; }
  100% { transform: scale(1.32); opacity: 0; }
}
.cmp-beacon-pulse { transform-box: fill-box; transform-origin: center; animation: cmpBeaconPulse 2.3s cubic-bezier(.2,.6,.35,1) infinite; will-change: transform, opacity; }
@keyframes cmpBeaconPulse {
  0% { transform: scale(.55); opacity: .9; }
  70% { opacity: .15; }
  100% { transform: scale(1.55); opacity: 0; }
}
.cmp-world { will-change: transform; }
`;

interface Transform {
  x: number;
  y: number;
  k: number;
}
interface Pt {
  x: number;
  y: number;
}

/** يُبقي مركز الشاشة فوق الحرم (بهامش) أثناء التحريك والتكبير */
function clampTf(t: Transform): Transform {
  const mx = W / 2 + t.k * PAN_MARGIN;
  const mnX = W / 2 - t.k * (W + PAN_MARGIN);
  const my = H / 2 + t.k * PAN_MARGIN;
  const mnY = H / 2 - t.k * (H + PAN_MARGIN);
  return { k: t.k, x: clamp(t.x, mnX, mx), y: clamp(t.y, mnY, my) };
}

// ── طبقة التضاريس — ثابتة تماماً، memo بلا خصائص (لا تُعاد رسمها أبداً) ──
const TerrainLayer = memo(function TerrainLayer() {
  return (
    <g pointerEvents="none" aria-hidden="true">
      {/* الأرض — كحلي عميق */}
      <path d={CAMPUS_PATHS.land} fill="#0a1425" stroke="#1d3157" strokeWidth={0.6} />
      {/* المياه — teal داكن جداً (لا أزرق) */}
      <path d={CAMPUS_PATHS.water} fill="#0f2a2a" stroke="#16443d" strokeWidth={0.5} strokeOpacity={0.5} />
      {/* شبكة المخطط الهندسي — كل 100 وحدة بشفافية 4٪ */}
      <path d={GRID_D} fill="none" stroke="#0ea5e9" strokeOpacity={0.04} strokeWidth={1} />
      {/* الطرق — هرمية سماوية جليدية */}
      <path d={CAMPUS_PATHS.roadMajor} fill="none" stroke="rgba(125,211,252,0.50)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <path d={CAMPUS_PATHS.roadMinorHigh} fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={CAMPUS_PATHS.roadMinorMid} fill="none" stroke="rgba(125,211,252,0.25)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={CAMPUS_PATHS.roadMinorLow} fill="none" stroke="rgba(125,211,252,0.15)" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
      {/* ممرات المشي — متقطعة جليدية */}
      <path d={CAMPUS_PATHS.roadPath} fill="none" stroke="rgba(125,211,252,0.18)" strokeWidth={0.8} strokeDasharray="4 3" />
      {/* بصمات المباني الأصلية (OSM) — طبقة خافتة جداً */}
      <path d={CAMPUS_PATHS.buildings} fill="rgba(8,47,73,0.40)" stroke="rgba(56,189,248,0.15)" strokeWidth={0.6} />
    </g>
  );
});

// ── عقدة مبنى واحد ─────────────────────────────────────────────────
interface BuildingNodeProps {
  b: BuildingDef;
  locked: boolean;
  hi: boolean;
  sel: boolean;
  /** عليه منارة ميدانية (beaconCodes) — تُلحق التلميحة بالعنوان والتسمية */
  bcn: boolean;
  k: number;
  /** مقياس الواجهة: بكسل شاشة ← وحدة خريطة (pxPerUnit × k) — للأحجام الثابتة ظاهرياً */
  ui: number;
  onSelect: (code: string) => void;
}

function BuildingNode({ b, locked, hi, sel, bcn, k, ui, onSelect }: BuildingNodeProps) {
  /** px شاشة ← وحدات خريطة (يتضمن القسمة على scale) */
  const s = (px: number): number => (ui > 0.0001 ? px / ui : px);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.round ? Math.min(b.w, b.h) / 2 : 3;
  const areaName = AREAS[b.area]?.name ?? b.area;
  const title = `${b.code} — ${b.name} — ${areaName}`;
  const cls = ["cmp-b", locked ? "cmp-locked" : "", hi ? "cmp-hi" : "", sel ? "cmp-selected" : ""]
    .filter(Boolean)
    .join(" ");

  // حلقة النبض حول المبنى المحدد
  const ringR = Math.max(b.w, b.h) / 2 + s(9);

  // حلقة التمييز المتقطعة المتحركة
  const dashPad = s(5);

  // التسمية (ثابتة الحجم الظاهري)
  const fsName = s(12.5);
  const fsCode = s(9.5);
  const bgPad = s(7);
  const bgW = Math.max(b.name.length * fsName * 0.55, b.code.length * fsCode * 0.75) + bgPad * 2;
  const bgH = s(29);

  return (
    <g
      className={cls}
      data-bld={b.code}
      role="button"
      tabIndex={0}
      aria-label={`${title}${locked ? " — منطقة غير ممسوحة" : ""}${bcn ? " — منارة ميدانية" : ""}. اضغط لعرض التفاصيل.`}
      onClick={() => onSelect(b.code)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(b.code);
        }
      }}
    >
      <title>{`${title}${locked ? " (غير ممسوح)" : ""}${bcn ? " — منارة ميدانية — امسحها في الميدان" : ""}`}</title>

      <g opacity={locked ? 0.35 : 1}>
        <rect className="cmp-shape" x={b.x} y={b.y} width={b.w} height={b.h} rx={rx} />
        {hi && (
          <rect
            x={b.x - dashPad}
            y={b.y - dashPad}
            width={b.w + dashPad * 2}
            height={b.h + dashPad * 2}
            rx={rx + dashPad}
            fill="none"
            stroke="#4ade80"
            strokeWidth={s(1.6)}
            strokeDasharray={`${s(9)} ${s(6)}`}
            style={{ filter: `drop-shadow(0 0 ${s(5)}px rgba(74,222,128,0.5))` }}
            pointerEvents="none"
          >
            <animate attributeName="stroke-dashoffset" from={0} to={-s(15)} dur="1.5s" repeatCount="indefinite" />
          </rect>
        )}
      </g>

      {sel && (
        <>
          <circle className="cmp-pulse" cx={cx} cy={cy} r={ringR} fill="none" stroke="#7dd3fc" strokeWidth={s(2)} pointerEvents="none" />
          <circle className="cmp-pulse cmp-pulse-2" cx={cx} cy={cy} r={ringR} fill="none" stroke="#38bdf8" strokeWidth={s(1.5)} pointerEvents="none" />
        </>
      )}

      {locked
        ? k >= LOCK_AT && (
            <g transform={`translate(${cx - s(5)} ${b.y - s(12)}) scale(${s(10) / 24})`} pointerEvents="none">
              <path
                d="M12 1.5A4.5 4.5 0 0 0 7.5 6v3H6.6A1.6 1.6 0 0 0 5 10.6v8.8A1.6 1.6 0 0 0 6.6 21h10.8A1.6 1.6 0 0 0 19 19.4v-8.8A1.6 1.6 0 0 0 17.4 9h-.9V6A4.5 4.5 0 0 0 12 1.5Zm-3 7.5V6a3 3 0 0 1 6 0v3H9Z"
                fill="#38bdf8"
                opacity={0.95}
              />
            </g>
          )
        : k >= LABEL_AT && (
            <g pointerEvents="none">
              <rect
                x={cx - bgW / 2}
                y={cy - bgH / 2}
                width={bgW}
                height={bgH}
                rx={s(3)}
                fill="rgba(4,7,13,0.72)"
                stroke="rgba(56,189,248,0.18)"
                strokeWidth={s(0.7)}
              />
              <text
                x={cx}
                y={cy - s(2.5)}
                textAnchor="middle"
                fontSize={fsName}
                fill="#eff6ff"
                style={{ direction: "rtl" }}
              >
                {b.name}
              </text>
              <text
                x={cx}
                y={cy + s(10)}
                textAnchor="middle"
                fontSize={fsCode}
                fill="#7dd3fc"
                style={{ fontFamily: "var(--font-mono, monospace)", letterSpacing: `${s(0.6)}px` }}
              >
                {b.code}
              </text>
            </g>
          )}
    </g>
  );
}

// ── طبقة المباني التفاعلية — memo (لا تُعاد رسمها عند التحريك/التمرير فقط) ──
interface BuildingsLayerProps {
  k: number;
  ui: number;
  unlocked: Set<string>;
  highlights: Set<string>;
  beacons: Set<string>;
  selected: string | null;
  onSelect: (code: string) => void;
}

const BuildingsLayer = memo(function BuildingsLayer({ k, ui, unlocked, highlights, beacons, selected, onSelect }: BuildingsLayerProps) {
  return (
    <g>
      {BUILDINGS.map((b) => (
        <BuildingNode
          key={b.code}
          b={b}
          locked={!unlocked.has(b.area)}
          hi={highlights.has(b.code)}
          sel={selected === b.code}
          bcn={beacons.has(b.code)}
          k={k}
          ui={ui}
          onSelect={onSelect}
        />
      ))}
    </g>
  );
});

// ── طبقة المنارات — معيّنات سماوية نابضة فوق مراكز المباني المنارة ──
// زخرفة بحتة: pointer-events: none على كل عناصرها — لا تُعطّل النقر ولا السحب.
interface BeaconLayerProps {
  k: number;
  ui: number;
  beacons: Set<string>;
}

const BeaconLayer = memo(function BeaconLayer({ k, ui, beacons }: BeaconLayerProps) {
  const s = (px: number): number => (ui > 0.0001 ? px / ui : px);
  if (beacons.size === 0) return null;
  return (
    <g pointerEvents="none" aria-hidden="true">
      {BUILDINGS.filter((b) => beacons.has(b.code)).map((b) => {
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        // المعيّن: ~10px ظاهرية (مقسومة على المقياس مثل التسميات)
        const half = s(5);
        // حلقة النبض حول المعيّن بحجم ظاهري ثابت؛ وعند التصغير دون ×١ لها أرضية
        // بنصف أكبر بُعد للمبنى (بتنعيم clamp(1-k)) كي تبقى المنارة مميّزة في العرض البعيد
        const ringR = Math.max(half + s(10), (Math.max(b.w, b.h) / 2) * clamp(1 - k, 0, 1));
        return (
          <g key={b.code}>
            <circle
              className="cmp-beacon-pulse"
              cx={cx}
              cy={cy}
              r={ringR}
              fill="none"
              stroke="rgba(103,232,249,0.75)"
              strokeWidth={s(1.6)}
              pointerEvents="none"
            />
            <rect
              x={cx - half}
              y={cy - half}
              width={half * 2}
              height={half * 2}
              transform={`rotate(45 ${cx} ${cy})`}
              fill="rgba(103,232,249,0.40)"
              stroke="rgba(165,243,252,0.90)"
              strokeWidth={s(1.1)}
              style={{ filter: `drop-shadow(0 0 ${s(5)}px rgba(103,232,249,0.55))` }}
              pointerEvents="none"
            />
          </g>
        );
      })}
    </g>
  );
});

// ── أنماط أزرار التحكم (44px لمس على الصغير) ────────────────────────
const CTRL_BTN =
  "flex h-11 w-11 items-center justify-center rounded-md border border-sky-500/30 bg-[#04070d]/85 text-sky-300 backdrop-blur transition-all hover:border-sky-300/60 hover:bg-sky-500/15 active:scale-95 focus-visible:outline focus-visible:outline-sky-300 sm:h-9 sm:w-9";

// ═════════════════════════════════════════════════════════════════════
// المكوّن الرئيسي
// ═════════════════════════════════════════════════════════════════════
function CampusMap({
  unlockedAreas,
  highlightCodes,
  beaconCodes,
  onSelectBuilding,
  height = "70vh",
  className,
}: CampusMapProps) {
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [anim, setAnim] = useState(false);
  const [pxPerUnit, setPxPerUnit] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tfRef = useRef<Transform>(tf);
  const pointersRef = useRef<Map<number, Pt>>(new Map());
  const dragRef = useRef<Pt | null>(null);
  const pinchRef = useRef<{ d0: number; t0: Transform; p0: Pt } | null>(null);
  const movedRef = useRef(0);
  const lastPointerTypeRef = useRef("mouse");
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickLockRef = useRef(0); // يمنع «النقر» الذي يتبع سحباً انتهى للتوّ
  const selectCbRef = useRef(onSelectBuilding);

  const gid = `cmp-vignette-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const legendId = `cmp-legend-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const unlockedSet = useMemo(() => new Set(unlockedAreas), [unlockedAreas]);
  const highlightsSet = useMemo(() => new Set(highlightCodes ?? EMPTY_CODES), [highlightCodes]);
  const beaconsSet = useMemo(() => new Set(beaconCodes ?? EMPTY_CODES), [beaconCodes]);

  const selB = useMemo(() => (selected ? buildingByCode(selected) ?? null : null), [selected]);
  const selUnlocked = selB ? unlockedSet.has(selB.area) : false;
  const selArea = selB ? AREAS[selB.area] : undefined;

  const ui = Math.max(pxPerUnit * tf.k, 0.0001);

  // مزامنة مرجع ردّ الاختيار (يبقى الاستدعاء مستقرّاً للمذكّرات)
  useEffect(() => {
    selectCbRef.current = onSelectBuilding;
  });

  // ── أدوات التحويل ──
  const applyTf = useCallback((t: Transform) => {
    tfRef.current = t;
    setTf(t);
  }, []);

  const toViewBox = useCallback((clientX: number, clientY: number): Pt | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // ── الانتقال الناعم (للأزرار فقط — التفاعل المباشر فوري) ──
  const cancelAnim = useCallback(() => {
    if (animTimerRef.current !== null) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
  }, []);

  const scheduleAnim = useCallback(() => {
    cancelAnim();
    animTimerRef.current = setTimeout(() => {
      animTimerRef.current = null;
      setAnim(false);
    }, 420);
  }, [cancelAnim]);

  /** تكبير حول نقطة (بوحدات viewBox) مع تثبيتها تحت المؤشر */
  const zoomAt = useCallback(
    (px: number, py: number, k2: number, smooth: boolean) => {
      const t = tfRef.current;
      const nk = clamp(k2, MIN_K, MAX_K);
      if (nk === t.k) return;
      const f = (t.k - nk) / t.k;
      applyTf(clampTf({ k: nk, x: t.x + (px - t.x) * f, y: t.y + (py - t.y) * f }));
      if (smooth) {
        setAnim(true);
        scheduleAnim();
      } else {
        setAnim(false);
        cancelAnim();
      }
    },
    [applyTf, scheduleAnim, cancelAnim]
  );

  // ── عجلة الفأرة (مستمع غير سلبي ليمكن preventDefault) ──
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const p = toViewBox(e.clientX, e.clientY);
      if (!p) return;
      // تطبيع deltaMode (سطر/صفحة ← بكسل) ليعمل التكبير بإيقاع واحد في كل المتصفحات
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 100 : 1;
      const k2 = clamp(tfRef.current.k * Math.exp(-e.deltaY * unit * 0.0016), MIN_K, MAX_K);
      zoomAt(p.x, p.y, k2, false);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toViewBox, zoomAt]);

  // ── قياس مقياس العرض (بكسل لكل وحدة viewBox) ──
  useEffect(() => {
    const el = containerRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;
    const measure = (): void => {
      const ctm = svg.getScreenCTM();
      if (ctm && ctm.a > 0) setPxPerUnit(ctm.a);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── تنظيف عند الرفع ──
  useEffect(() => {
    return () => {
      if (animTimerRef.current !== null) clearTimeout(animTimerRef.current);
      pointersRef.current.clear();
    };
  }, []);

  // ── المؤشرات الموحّدة: سحب + قرص ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      lastPointerTypeRef.current = e.pointerType;
      cancelAnim();
      setAnim(false);
      movedRef.current = 0;
      // الالتقاط على العنصر المضغوط نفسه (لا على الجذر) حتى تبقى النقرات على المباني صالحة
      const target = e.target as Element;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        /* متصفحات قديمة */
      }
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()];
        const mid = toViewBox((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
        if (mid) {
          pinchRef.current = {
            d0: Math.max(Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), 1),
            t0: tfRef.current,
            p0: mid,
          };
        }
        dragRef.current = null;
      } else if (pointersRef.current.size === 1) {
        dragRef.current = toViewBox(e.clientX, e.clientY);
      }
    },
    [cancelAnim, toViewBox]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const ptrs = pointersRef.current;
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId);
      if (prev) movedRef.current += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const pinch = pinchRef.current;
      if (pinch && ptrs.size >= 2) {
        const pts = [...ptrs.values()];
        const a = pts[0];
        const b = pts[1];
        const p1 = toViewBox((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (!p1) return;
        const k2 = clamp(pinch.t0.k * (Math.hypot(b.x - a.x, b.y - a.y) / pinch.d0), MIN_K, MAX_K);
        const c = { x: (pinch.p0.x - pinch.t0.x) / pinch.t0.k, y: (pinch.p0.y - pinch.t0.y) / pinch.t0.k };
        applyTf(clampTf({ k: k2, x: p1.x - c.x * k2, y: p1.y - c.y * k2 }));
      } else if (dragRef.current) {
        const p = toViewBox(e.clientX, e.clientY);
        if (!p) return;
        const t = tfRef.current;
        applyTf(clampTf({ ...t, x: t.x + p.x - dragRef.current.x, y: t.y + p.y - dragRef.current.y }));
        dragRef.current = p;
      }
    },
    [applyTf, toViewBox]
  );

  const endPointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const ptrs = pointersRef.current;
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinchRef.current = null;
      if (ptrs.size === 1) {
        const [only] = [...ptrs.values()];
        dragRef.current = toViewBox(only.x, only.y);
      } else if (ptrs.size === 0) {
        dragRef.current = null;
        if (movedRef.current > DRAG_THRESHOLD) clickLockRef.current = Date.now() + 400;
      }
    },
    [toViewBox]
  );

  // ── الاختيار ──
  const selectBuilding = useCallback((code: string) => {
    if (Date.now() < clickLockRef.current) return; // كان سحباً
    setSelected(code);
    selectCbRef.current?.(code);
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget) return;
    if (Date.now() < clickLockRef.current) return;
    setSelected(null);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (lastPointerTypeRef.current === "touch") return;
      if (movedRef.current > DRAG_THRESHOLD) return;
      const t = e.target as Element;
      if (t instanceof Element && t.closest("[data-bld]")) return;
      const p = toViewBox(e.clientX, e.clientY);
      if (p) zoomAt(p.x, p.y, tfRef.current.k * 1.8, true);
    },
    [toViewBox, zoomAt]
  );

  const zoomIn = useCallback(() => zoomAt(W / 2, H / 2, tfRef.current.k * 1.45, true), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(W / 2, H / 2, tfRef.current.k / 1.45, true), [zoomAt]);
  const resetView = useCallback(() => {
    cancelAnim();
    applyTf({ x: 0, y: 0, k: 1 });
    setAnim(true);
    scheduleAnim();
  }, [applyTf, cancelAnim, scheduleAnim]);

  // ── مقياس الرسم (يختار قيمة لطيفة بحجم شريط بين ~56 و150 بكسل) ──
  const pxPerMeter = (pxPerUnit * tf.k) / METERS_PER_UNIT;
  let barM = NICE_METERS[0];
  for (const d of NICE_METERS) {
    if (d * pxPerMeter <= 150) barM = d;
  }
  const barPx = Math.max(20, Math.round(barM * pxPerMeter));

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className={`relative w-full select-none overflow-hidden overscroll-contain bg-[#04070d] ${className ?? ""}`}
      style={{ height }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-full w-full touch-none"
        style={{ touchAction: "none" }}
        role="img"
        aria-label="خريطة تفاعلية لحرم جامعة البحرين في الصخير. اسحب للتحريك، واستخدم عجلة الفأرة أو القرص باللمس أو أزرار التكبير للتكبير والتصغير، واضغط على مبنى لعرض تفاصيله."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClick={handleBackgroundClick}
        onDoubleClick={handleDoubleClick}
      >
        <style>{SVG_CSS}</style>
        <defs>
          {/* إضاءة دائرية خفيفة حول مركز العرض + تعتيم الأطراف */}
          <radialGradient id={gid} cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.07" />
            <stop offset="42%" stopColor="#38bdf8" stopOpacity="0.025" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        <g
          className="cmp-world"
          style={{
            transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.k})`,
            transition: anim ? "transform 380ms cubic-bezier(.22,.61,.36,1)" : "none",
          }}
        >
          <TerrainLayer />
          <BuildingsLayer
            k={tf.k}
            ui={ui}
            unlocked={unlockedSet}
            highlights={highlightsSet}
            beacons={beaconsSet}
            selected={selected}
            onSelect={selectBuilding}
          />
          <BeaconLayer k={tf.k} ui={ui} beacons={beaconsSet} />
        </g>

        <rect x={0} y={0} width={W} height={H} fill={`url(#${gid})`} pointerEvents="none" />
      </svg>

      {/* أقواس زاوية تكتيكية */}
      <div className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        <div className="absolute left-1 top-1 h-2.5 w-2.5 border-l border-t border-sky-500/30" />
        <div className="absolute right-1 top-1 h-2.5 w-2.5 border-r border-t border-sky-500/30" />
        <div className="absolute bottom-1 left-1 h-2.5 w-2.5 border-b border-l border-sky-500/30" />
        <div className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b border-r border-sky-500/30" />
      </div>

      {/* البوصلة */}
      <div className="absolute left-2.5 top-2.5 z-10 flex flex-col items-center rounded-md border border-sky-500/20 bg-[#04070d]/80 px-2 py-1.5 backdrop-blur">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="1" />
          <path d="M12 3.2 15 12H9Z" fill="#7dd3fc" />
          <path d="M12 20.8 15 12H9Z" fill="#075985" />
          <circle cx="12" cy="12" r="1.1" fill="#38bdf8" />
        </svg>
        <span className="mt-0.5 text-[9px] leading-none tracking-wide text-sky-300/80">شمال</span>
      </div>

      {/* لوحة الرموز القابلة للطي */}
      <div className="absolute right-2.5 top-2.5 z-10">
        <button
          type="button"
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
          aria-controls={legendId}
          aria-label="تبديل لوحة الرموز"
          className="flex items-center gap-1.5 rounded-md border border-sky-500/25 bg-[#04070d]/85 px-2.5 py-1.5 text-[11px] font-medium text-sky-300/90 backdrop-blur transition-colors hover:border-sky-300/50 hover:text-sky-200 focus-visible:outline focus-visible:outline-sky-300"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            aria-hidden="true"
            className={`transition-transform ${legendOpen ? "" : "-rotate-90"}`}
          >
            <path d="M1.5 3.2 5 6.8 8.5 3.2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          دليل الرموز
        </button>
        {legendOpen && (
          <div
            id={legendId}
            className="mt-1.5 w-44 space-y-2 rounded-md border border-sky-500/20 bg-[#04070d]/90 p-2.5 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-[11px] text-sky-100">
              <span className="h-3.5 w-6 shrink-0 rounded-[3px] border border-sky-400/70 bg-sky-400/10" />
              مبنى مضاء
            </div>
            <div className="flex items-center gap-2 text-[11px] text-sky-100">
              <span className="h-3.5 w-6 shrink-0 rounded-[3px] border border-stone-700/40 bg-stone-900/30 opacity-60" />
              مبنى غير ممسوح
            </div>
            <div className="flex items-center gap-2 text-[11px] text-sky-100">
              <span className="relative flex h-3.5 w-6 shrink-0 items-center justify-center">
                <span className="h-2.5 w-4 rounded-[2px] border border-sky-300 bg-sky-300/25" />
                <span className="absolute inset-0 rounded-full border border-dashed border-sky-300/70" />
              </span>
              مبنى محدد
            </div>
            <div className="flex items-center gap-2 text-[11px] text-sky-100">
              <span className="h-3.5 w-6 shrink-0 rounded-[3px] border border-emerald-400 bg-emerald-400/15 shadow-[0_0_8px_rgba(74,222,128,0.45)]" />
              منطقة مهمة
            </div>
          </div>
        )}
      </div>

      {/* مقياس الرسم */}
      <div className="absolute bottom-2.5 left-2.5 z-10 rounded-md border border-sky-500/15 bg-[#04070d]/80 px-2 py-1.5 backdrop-blur">
        <div className="flex items-center gap-1.5" dir="rtl">
          <div className="h-1.5 border-x border-b border-sky-300/80" style={{ width: `${barPx}px` }} />
          <span className="whitespace-nowrap text-[10px] leading-none text-sky-200">
            ≈ {arDigits(barM)} متر
          </span>
        </div>
      </div>

      {/* أزرار التكبير */}
      <div className="absolute bottom-2.5 right-2.5 z-10 flex flex-col items-center gap-1.5">
        <span
          dir="ltr"
          className="rounded bg-[#04070d]/85 px-1.5 py-0.5 font-mono text-[9px] leading-none text-sky-300/70 backdrop-blur"
        >
          ×{tf.k.toFixed(1)}
        </span>
        <button type="button" onClick={zoomIn} aria-label="تكبير الخريطة" className={CTRL_BTN}>
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" onClick={zoomOut} aria-label="تصغير الخريطة" className={CTRL_BTN}>
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.2 8h9.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" onClick={resetView} aria-label="إعادة ضبط العرض" className={CTRL_BTN}>
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 1.2v2.4M8 12.4v2.4M1.2 8h2.4M12.4 8h2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* شريط المعلومات السفلي العائم */}
      {selB && (
        <div className="absolute inset-x-2 bottom-16 z-20 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:inset-x-auto sm:bottom-3 sm:left-1/2 sm:w-[440px] sm:-translate-x-1/2">
          <div className="flex items-start gap-3 rounded-lg border border-sky-500/30 bg-[#04070d]/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur">
            <div
              dir="ltr"
              className="shrink-0 font-mono text-2xl font-bold leading-none text-sky-300 [text-shadow:0_0_12px_rgba(125,211,252,0.35)]"
            >
              {selB.code}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-blue-50">{selB.name}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-sky-200">
                <span className="text-sky-400/80">{selArea?.name ?? selB.area}</span>
                {selArea ? ` — ${selArea.desc}` : ""}
              </div>
            </div>
            {!selUnlocked && (
              <span className="shrink-0 rounded border border-red-600/40 bg-red-950/40 px-1.5 py-0.5 text-[10px] leading-none text-red-400">
                منطقة غير ممسوحة
              </span>
            )}
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="إغلاق لوحة معلومات المبنى"
              className="shrink-0 rounded p-1 text-sky-300/60 transition-colors hover:bg-sky-500/10 hover:text-sky-300 focus-visible:outline focus-visible:outline-sky-300"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampusMap;
export { CampusMap };

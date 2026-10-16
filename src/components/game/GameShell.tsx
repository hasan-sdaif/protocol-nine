"use client";

// ═══════════════════════════════════════════════════════════
// هيكل اللعبة — ثلاث تجارب مختلفة جذرياً حسب الجهاز:
// ▌كمبيوتر: مركز قيادة — سيماء أيقوني + بث حي جانبي +
//   شريط أخبار سلكي + اختصارات لوحة المفاتيح
// ▌هاتف: تطبيق وكيل ميداني — شريط سفلي بخمس تبويبات +
//   زر المسح المركزي المرتفع + صفحات بلمسة إبهام
// ▌تاب: غرفة عمليات — شريط حالة + تبويبات أفقية + أعمدة مزدوجة
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import {
  Layers, FlaskConical, Map as MapIcon, Trophy, Archive, Radio,
  Users, ScrollText, LogOut, Flame, Sparkles, Crown, Route,
  QrCode, LayoutGrid, Activity, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MuteButton, sfx, LiveTransmissionBadge } from "./audio";
import { useDeviceKind } from "@/hooks/use-device-kind";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Game } from "./useGame";

export type ViewKey =
  | "ops" | "paths" | "scan" | "lab" | "map" | "pulse" | "sorting" | "board"
  | "archive" | "team" | "journal" | "finale";

interface NavItem {
  key: ViewKey;
  label: string;
  short: string;
  icon: typeof Layers;
  needs?: (g: Game) => boolean;
}

const NAV: NavItem[] = [
  { key: "ops", label: "العمليات", short: "عمليات", icon: Layers },
  { key: "paths", label: "المسارات الميدانية", short: "مسارات", icon: Route },
  { key: "scan", label: "المسح الميداني", short: "المسح", icon: QrCode },
  { key: "lab", label: "مختبر التشفير", short: "مختبر", icon: FlaskConical },
  { key: "map", label: "خريطة الحرم", short: "خريطة", icon: MapIcon },
  { key: "pulse", label: "نبض الأرشيف", short: "نبض", icon: Radio },
  { key: "sorting", label: "غرفة الفرز", short: "فرز", icon: LayoutGrid, needs: (g) => !!g.state?.sorting.unlocked },
  { key: "board", label: "المتصدرون والبث", short: "الشبكة", icon: Trophy },
  { key: "archive", label: "الأرشيف والصوتيات", short: "أرشيف", icon: Archive },
  { key: "team", label: "الحلف", short: "الحلف", icon: Users },
  { key: "journal", label: "سجل الوكيل", short: "السجل", icon: ScrollText },
  { key: "finale", label: "شهادة التاسع", short: "الخاتمة", icon: Crown, needs: (g) => !!g.state?.agent.finishedAt },
];

// اختصارات لوحة المفاتيح (كمبيوتر فقط)
const HOTKEYS: Record<string, ViewKey> = {
  "1": "ops", "2": "paths", "3": "scan", "4": "lab", "5": "map",
  "6": "pulse", "7": "board", "8": "archive", "9": "team", "0": "journal",
};

export default function GameShell({
  game,
  active,
  onNavigate,
  children,
}: {
  game: Game;
  active: ViewKey;
  onNavigate: (v: ViewKey) => void;
  children: React.ReactNode;
}) {
  const device = useDeviceKind();
  const [loggingOut, setLoggingOut] = useState(false);
  const state = game.state;
  const nav = NAV.filter((n) => !n.needs || n.needs(game));

  // اختصارات لوحة المفاتيح — تجربة الكمبيوتر
  useEffect(() => {
    if (device !== "desktop") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const view = HOTKEYS[e.key];
      if (view && nav.some((n) => n.key === view)) {
        sfx.click();
        onNavigate(view);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [device, nav, onNavigate]);

  if (!state) return null;

  const handleLogout = async () => {
    sfx.click();
    setLoggingOut(true);
    await game.logout();
  };

  const go = (v: ViewKey) => {
    sfx.click();
    onNavigate(v);
  };

  if (device === "mobile") {
    // ▌▌▌ هاتف — تطبيق الوكيل الميداني ▌▌▌
    const tabBar: NavItem[] = [
      nav.find((n) => n.key === "ops")!,
      nav.find((n) => n.key === "paths")!,
      nav.find((n) => n.key === "scan")!,
      nav.find((n) => n.key === "board")!,
    ];
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <MobileHeader game={game} loggingOut={loggingOut} onLogout={handleLogout} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-24 pt-3">{children}</main>
        <LiveTransmissionBadge bottomOffset="5.25rem" />
        {/* الشريط السفلي — خمس خانات والمسح في المركز مرتفعاً */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[#061020]/97 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
          aria-label="أقسام منظومة الظل"
        >
          <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1">
            {tabBar.slice(0, 2).map((n) => (
              <TabButton key={n.key} item={n} active={active === n.key} onClick={() => go(n.key)} />
            ))}
            {/* زر المسح المركزي المرتفع */}
            <div className="relative w-16 shrink-0">
              <button
                type="button"
                onClick={() => go("scan")}
                className={cn(
                  "absolute -top-5 right-1/2 flex h-14 w-14 translate-x-1/2 items-center justify-center rounded-full border-2 border-primary/70 bg-gradient-to-b from-[#0d2b46] to-[#061020] text-primary shadow-[0_0_24px_rgba(85,194,242,0.35)] transition-transform active:scale-95",
                  active === "scan" && "scale-110 border-primary shadow-[0_0_34px_rgba(85,194,242,0.55)]"
                )}
                aria-label="المسح الميداني — افتح الكاميرا"
                aria-current={active === "scan" ? "page" : undefined}
              >
                <QrCode className="h-7 w-7" />
              </button>
            </div>
            {tabBar.slice(2).map((n) => (
              <TabButton key={n.key} item={n} active={active === n.key} onClick={() => go(n.key)} />
            ))}
            <MoreSheet nav={nav} active={active} onGo={go} />
          </div>
        </nav>
      </div>
    );
  }

  if (device === "tablet") {
    // ▌▌▌ تاب — غرفة العمليات الميدانية ▌▌▌
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <StatusBar game={game} device="tablet" loggingOut={loggingOut} onLogout={handleLogout} />
        <nav
          className="sticky top-[57px] z-30 border-b border-border bg-background/95 backdrop-blur-sm"
          aria-label="أقسام منظومة الظل"
        >
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 py-2 no-scrollbar">
            {nav.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => go(n.key)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-md border px-3.5 text-sm transition-all",
                  active === n.key
                    ? "border-primary/60 bg-primary/15 text-primary text-glow-ice"
                    : "border-transparent text-muted-foreground hover:border-primary/25 hover:text-foreground"
                )}
                aria-current={active === n.key ? "page" : undefined}
              >
                <n.icon className="h-4 w-4" />
                <span className="font-bold">{n.short}</span>
              </button>
            ))}
          </div>
        </nav>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">{children}</main>
        <LiveTransmissionBadge />
        <TabletFooter />
      </div>
    );
  }

  // ▌▌▌ كمبيوتر — مركز القيادة ▌▌▌
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StatusBar game={game} device="desktop" loggingOut={loggingOut} onLogout={handleLogout} />
      {/* الشريط السلكي — آخر نبضات الشبكة */}
      <WireTicker feed={game.feed} />
      <div className="flex flex-1">
        {/* السيماء الأيقوني — يمين الشاشة */}
        <nav
          className="sticky top-[93px] hidden h-fit w-[4.4rem] shrink-0 flex-col gap-1 border-s border-border bg-[#061020]/60 py-3 md:flex lg:w-[10.5rem]"
          aria-label="أقسام مركز القيادة"
        >
          {nav.map((n) => {
            const hk = Object.keys(HOTKEYS).find((k) => HOTKEYS[k] === n.key);
            return (
            <button
              key={n.key}
              type="button"
              onClick={() => go(n.key)}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-md border px-3 transition-all lg:mx-2 lg:w-[calc(100%-1rem)]",
                active === n.key
                  ? "border-primary/60 bg-primary/15 text-primary text-glow-ice"
                  : "border-transparent text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground"
              )}
              aria-current={active === n.key ? "page" : undefined}
              title={`${n.label}${hk ? ` (اختصار: ${hk})` : ""}`}
            >
              <n.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden text-sm font-bold lg:inline">{n.short}</span>
              <span className="hidden font-mono text-[0.6rem] text-muted-foreground/50 lg:ms-auto lg:inline" dir="ltr">
                {hk ?? ""}
              </span>
              <span className="sr-only">{n.label}</span>
            </button>
            );
          })}
        </nav>
        {/* مساحة العرض الرئيسية */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">{children}</main>
        {/* عمود المعلومات — بث حي وإحصاءات (شاشات كبيرة) */}
        <aside className="sticky top-[93px] hidden h-fit w-72 shrink-0 border-e border-border bg-[#061020]/60 p-3 xl:block">
          <IntelSidebar game={game} onGo={go} />
        </aside>
      </div>
      <LiveTransmissionBadge />
      <DesktopFooter stats={state.stats} scans={state.scans} />
    </div>
  );
}

// ═══ عناصر مشتركة ═════════════════════════════════════════

function AgentChip({ game, compact = false }: { game: Game; compact?: boolean }) {
  const { agent } = game.state!;
  const nextRank = agent.nextRank;
  const rankProgress = nextRank
    ? Math.min(100, Math.round(((agent.points - agent.rank.min) / (nextRank.min - agent.rank.min)) * 100))
    : 100;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
        <span className="font-mono text-lg text-glow-ice">{agent.rank.sigil}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate font-bold text-foreground">{agent.codename}</span>
          <span className="font-mono text-[0.65rem] text-muted-foreground" dir="ltr">#{agent.memberNo}</span>
          {agent.plateUnlocked && (
            <Sparkles className="h-3.5 w-3.5 text-chart-4" aria-label="الصفيحة الشفافة" />
          )}
        </div>
        <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
          <span className="truncate">{agent.rank.name}</span>
          <span className="font-mono text-primary" dir="ltr">{agent.points} pts</span>
          {agent.pulseStreak > 0 && (
            <span className="flex items-center gap-0.5 text-chart-4" title={`سلسلة نبض: ${agent.pulseStreak} يوم`}>
              <Flame className="h-3 w-3" />
              <span className="font-mono">{agent.pulseStreak}</span>
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <div className="hidden w-40 sm:block">
          <div className="h-1.5 overflow-hidden rounded bg-primary/10" dir="ltr" title={nextRank ? `${nextRank.name} عند ${nextRank.min}` : "أعلى رتبة"}>
            <div className="h-full bg-gradient-to-r from-primary/50 to-primary" style={{ width: `${rankProgress}%` }} />
          </div>
          {nextRank && (
            <div className="mt-1 text-center text-[0.6rem] text-muted-foreground" dir="ltr">
              {nextRank.min - agent.points} → {nextRank.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBar({
  game,
  device,
  loggingOut,
  onLogout,
}: {
  game: Game;
  device: "desktop" | "tablet";
  loggingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className={cn("mx-auto flex items-center gap-3 px-3 py-2.5", device === "desktop" ? "max-w-[1600px] px-5" : "max-w-5xl")}>
        <AgentChip game={game} compact={device === "tablet"} />
        <MuteButton />
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-red-400"
          aria-label="إغلاق الخط (خروج)"
          title="إغلاق الخط — لن يضيع تقدمك"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function MobileHeader({ game, loggingOut, onLogout }: { game: Game; loggingOut: boolean; onLogout: () => void }) {
  const { agent } = game.state!;
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[#061020]/97 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-sm text-primary text-glow-ice">
          {agent.rank.sigil}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-foreground">{agent.codename}</span>
            <span className="font-mono text-[0.6rem] text-muted-foreground" dir="ltr">#{agent.memberNo}</span>
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
            <span className="font-mono text-primary" dir="ltr">{agent.points} pts</span>
            <span className="truncate">{agent.rank.name}</span>
          </div>
        </div>
        <MuteButton />
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-red-400"
          aria-label="إغلاق الخط (خروج)"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function TabButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-16 min-w-[3.6rem] flex-col items-center justify-center gap-1 rounded-lg px-1 pt-1 transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <item.icon className={cn("h-5 w-5", active && "text-glow-ice")} />
      <span className="text-[0.62rem] font-bold">{item.short}</span>
    </button>
  );
}

function MoreSheet({ nav, active, onGo }: { nav: NavItem[]; active: ViewKey; onGo: (v: ViewKey) => void }) {
  const [open, setOpen] = useState(false);
  const extra = nav.filter(
    (n) => !["ops", "paths", "scan", "board"].includes(n.key)
  );
  const activeInExtra = extra.some((n) => n.key === active);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-16 min-w-[3.6rem] flex-col items-center justify-center gap-1 rounded-lg px-1 pt-1 transition-colors",
            activeInExtra ? "text-primary" : "text-muted-foreground"
          )}
          aria-label="المزيد من الأقسام"
        >
          <ChevronLeft className="h-5 w-5 rotate-180" />
          <span className="text-[0.62rem] font-bold">المزيد</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[62vh] max-h-[540px] border-t border-primary/25 bg-[#061020] p-0" dir="rtl">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-right text-sm font-bold text-primary">أقسام منظومة الظل</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] scroll-thin">
          {extra.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => {
                setOpen(false);
                onGo(n.key);
              }}
              className={cn(
                "flex min-h-[4.8rem] flex-col items-center justify-center gap-1.5 rounded-lg border p-3 transition-colors",
                active === n.key
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <n.icon className="h-6 w-6" />
              <span className="text-xs font-bold">{n.short}</span>
              <span className="text-[0.6rem] text-muted-foreground/70">{n.label.replace(n.short, "").trim()}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ═══ سطح المكتب: الشريط السلكي + عمود المعلومات ═════════

function WireTicker({ feed }: { feed: { at: string; kind: string; text: string }[] }) {
  const items = feed.slice(0, 10);
  if (items.length === 0) return <div className="h-7 border-b border-border bg-[#061020]/60" />;
  const doubled = [...items, ...items];
  return (
    <div className="relative h-7 overflow-hidden border-b border-border bg-[#061020]/80" dir="rtl">
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 flex items-center gap-1.5 bg-[#061020] px-3">
        <Activity className="h-3 w-3 text-primary rec-dot" />
        <span className="font-mono text-[0.6rem] tracking-widest text-primary" dir="ltr">WIRE</span>
      </div>
      <div className="wire-marquee flex h-full items-center whitespace-nowrap pe-8">
        {doubled.map((e, i) => (
          <span key={i} className="mx-4 text-[0.65rem] text-muted-foreground">
            <span className={cn("font-mono text-[0.55rem]", e.kind === "finish" ? "text-chart-4" : e.kind === "scan" ? "text-primary" : "text-muted-foreground/60")} dir="ltr">
              {e.kind === "finish" ? "◆" : e.kind === "scan" ? "◇" : "·"}
            </span>
            {" "}
            {e.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function IntelSidebar({ game, onGo }: { game: Game; onGo: (v: ViewKey) => void }) {
  const state = game.state!;
  const feed = game.feed.slice(0, 8);
  const s = state.stats;
  return (
    <div className="flex flex-col gap-3">
      <div className="panel panel-corner-ticks p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[0.6rem] tracking-widest text-primary" dir="ltr">FIELD INTEL</span>
          <span className="rec-dot h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[0.68rem]">
          <IntelStat label="ألغاز محسومة" value={`${s.solvedCount}/${s.totalPuzzles}`} />
          <IntelStat label="مسارات" value={`${s.pathSolved}/${s.pathTotal}`} />
          <IntelStat label="منارات" value={`${s.scansFound}/${s.scansTotal}`} />
          <IntelStat label="ملحقات" value={`${s.externalSolved}/${s.externalTotal}`} />
        </dl>
        <button
          type="button"
          onClick={() => onGo("scan")}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-2 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          <QrCode className="h-3.5 w-3.5" />
          ابدأ المسح الميداني
        </button>
      </div>
      <div className="panel p-3">
        <div className="mb-2 font-mono text-[0.6rem] tracking-widest text-primary" dir="ltr">LIVE WIRE</div>
        <ul className="max-h-72 space-y-2 overflow-y-auto scroll-thin" dir="rtl">
          {feed.length === 0 && (
            <li className="text-[0.68rem] text-muted-foreground">الشبكة هادئة... مؤقتاً.</li>
          )}
          {feed.map((e, i) => (
            <li key={i} className="border-s-2 border-primary/25 ps-2 text-[0.68rem] leading-relaxed text-muted-foreground">
              <span className={cn(
                "me-1 font-mono text-[0.55rem]",
                e.kind === "finish" ? "text-chart-4" : e.kind === "scan" ? "text-primary" : e.kind === "clear" ? "text-chart-3" : "text-muted-foreground/50"
              )} dir="ltr">
                {new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {e.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function IntelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-secondary/30 px-2 py-1">
      <dt className="text-[0.58rem] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs text-foreground" dir="ltr">{value}</dd>
    </div>
  );
}

function DesktopFooter({ stats, scans }: { stats: { solvedCount: number; totalPuzzles: number; pathSolved: number; pathTotal: number; scansFound: number; scansTotal: number }; scans: { foundCount: number; total: number } }) {
  return (
    <footer className="mt-auto border-t border-border bg-background/95">
      <div className="mx-auto max-w-[1600px] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[0.6rem] tracking-widest text-muted-foreground/50" dir="ltr">
            PROTOCOL NINE — THE ABSENT ARCHIVE // UOB SAKHEER FIELD GRID
          </p>
          <p className="hidden font-mono text-[0.58rem] text-muted-foreground/40 md:block" dir="rtl">
            اختصارات: ١ عمليات · ٢ مسارات · ٣ مسح · ٤ مختبر · ٥ خريطة · ٦ نبض · ٧ متصدرون · ٨ أرشيف · ٩ حلف · ٠ سجل
          </p>
        </div>
        <p className="mt-1 text-center text-[0.65rem] text-muted-foreground/70">
          كل الأصوات تسجيلات محفوظة في الأرشيف ({scans.foundCount}/{scans.total} منارة ممسوحة) — لا توليد وقت التشغيل. جلستك دائمة عشر سنوات.
        </p>
      </div>
    </footer>
  );
}

function TabletFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background/95">
      <div className="mx-auto max-w-5xl px-4 py-3 text-center">
        <p className="font-mono text-[0.6rem] tracking-widest text-muted-foreground/50" dir="ltr">
          PROTOCOL NINE — FIELD OPS ROOM // UOB SAKHEER
        </p>
        <p className="mt-1 text-[0.65rem] text-muted-foreground/70">
          كل الأصوات تسجيلات محفوظة في الأرشيف — لا توليد وقت التشغيل. جلستك دائمة عشر سنوات.
        </p>
      </div>
    </footer>
  );
}

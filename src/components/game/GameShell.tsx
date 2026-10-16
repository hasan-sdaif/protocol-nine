"use client";

// ═══════════════════════════════════════════════════════════
// هيكل اللعبة — الترويسة + شريط التنقل + مساحة العرض
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import {
  Layers, FlaskConical, Map as MapIcon, Trophy, Archive, Radio,
  Users, ScrollText, Lock, LogOut, Flame, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MuteButton, sfx } from "./audio";
import type { Game } from "./useGame";

export type ViewKey =
  | "ops" | "lab" | "map" | "pulse" | "sorting" | "board" | "archive" | "team" | "journal" | "finale";

const NAV: { key: ViewKey; label: string; icon: typeof Layers; needs?: (g: Game) => boolean }[] = [
  { key: "ops", label: "العمليات", icon: Layers },
  { key: "lab", label: "المختبر", icon: FlaskConical },
  { key: "map", label: "الخريطة", icon: MapIcon },
  { key: "pulse", label: "النبض", icon: Radio },
  { key: "sorting", label: "الفرز", icon: Lock, needs: (g) => !!g.state?.sorting.unlocked },
  { key: "board", label: "المتصدرون", icon: Trophy },
  { key: "archive", label: "الأرشيف", icon: Archive },
  { key: "team", label: "الفريق", icon: Users },
  { key: "journal", label: "السجل", icon: ScrollText },
];

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
  const [loggingOut, setLoggingOut] = useState(false);
  const state = game.state;
  const nav = NAV.filter((n) => !n.needs || n.needs(game));

  if (!state) return null;
  const { agent } = state;
  const nextRank = agent.nextRank;
  const rankProgress = nextRank
    ? Math.min(100, Math.round(((agent.points - agent.rank.min) / (nextRank.min - agent.rank.min)) * 100))
    : 100;

  const handleLogout = async () => {
    sfx.click();
    setLoggingOut(true);
    await game.logout();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* الترويسة */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
              <span className="font-mono text-lg text-glow-amber">{agent.rank.sigil}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate font-bold text-foreground">{agent.codename}</span>
                <span className="font-mono text-[0.65rem] text-muted-foreground" dir="ltr">
                  #{agent.memberNo}
                </span>
                {agent.plateUnlocked && (
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-label="الصفيحة الشفافة" />
                )}
              </div>
              <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
                <span className="truncate">{agent.rank.name}</span>
                <span className="font-mono text-primary" dir="ltr">
                  {agent.points} pts
                </span>
                {agent.pulseStreak > 0 && (
                  <span className="flex items-center gap-0.5 text-orange-400" title={`سلسلة نبض: ${agent.pulseStreak} يوم`}>
                    <Flame className="h-3 w-3" />
                    <span className="font-mono">{agent.pulseStreak}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

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

          <MuteButton />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-red-400"
            aria-label="إغلاق الخط (خروج)"
            title="إغلاق الخط — لن يضيع تقدمك"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* شريط التنقل */}
      <nav
        className="sticky top-[57px] z-30 border-b border-border bg-background/95 backdrop-blur-sm"
        aria-label="أقسام منظومة الظل"
      >
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-1.5 no-scrollbar sm:justify-center sm:px-5">
          {nav.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => {
                sfx.click();
                onNavigate(n.key);
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-all",
                active === n.key
                  ? "border-primary/50 bg-primary/15 text-primary text-glow-amber"
                  : "border-transparent text-muted-foreground hover:border-primary/25 hover:text-foreground"
              )}
              aria-current={active === n.key ? "page" : undefined}
            >
              <n.icon className="h-3.5 w-3.5" />
              <span className="font-bold">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* مساحة العرض */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-5 sm:py-7">{children}</main>

      {/* تذييل ثابت أسفل الشاشة */}
      <footer className="mt-auto border-t border-border bg-background/95">
        <div className="mx-auto max-w-6xl px-3 py-3 text-center sm:px-5">
          <p className="font-mono text-[0.6rem] tracking-widest text-muted-foreground/50" dir="ltr">
            PROTOCOL NINE — THE ABSENT ARCHIVE // UOB SAKHEER
          </p>
          <p className="mt-1 text-[0.65rem] text-muted-foreground/70">
            كل الأصوات تسجيلات هاتفية محفوظة في الأرشيف — لا توليد وقت التشغيل.
            جلستك دائمة عشر سنوات.
          </p>
        </div>
      </footer>
    </div>
  );
}

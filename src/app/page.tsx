"use client";

// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — الصفحة الرئيسية
// إقلاع → تمهيد → مصادقة → منظومة الظل (الجلسة دائمة)
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { CRTLayer } from "@/components/game/effects";
import BootScreen from "@/components/game/BootScreen";
import IntroScreen from "@/components/game/IntroScreen";
import AuthPanel from "@/components/game/AuthPanel";
import GameShell, { type ViewKey } from "@/components/game/GameShell";
import OpsView from "@/components/game/OpsView";
import LabView from "@/components/game/LabView";
import MapPanel from "@/components/game/MapPanel";
import PulseView from "@/components/game/PulseView";
import SortingView from "@/components/game/SortingView";
import BoardView from "@/components/game/BoardView";
import ArchiveView from "@/components/game/ArchiveView";
import TeamView from "@/components/game/TeamView";
import JournalView from "@/components/game/JournalView";
import FinaleView from "@/components/game/FinaleView";
import { useGame } from "@/components/game/useGame";

type Phase = "boot" | "intro" | "auth" | "app";

export default function Home() {
  const game = useGame();
  const [phase, setPhase] = useState<Phase>("boot");
  const [view, setView] = useState<ViewKey>("ops");
  const [mapFocus, setMapFocus] = useState<string | null>(null);
  const [announcedFinale, setAnnouncedFinale] = useState(false);

  // استعادة الجلسة الدائمة: الوكيل المسجَّل يدخل مباشرة — لا إقلاع، لا طرد
  useEffect(() => {
    if (game.authed === true) {
      setPhase("app");
    } else if (game.authed === false) {
      if (typeof window !== "undefined" && window.localStorage.getItem("p9-booted") === "1") {
        setPhase("auth");
      }
    }
  }, [game.authed]);

  // إعلان الخاتمة عند أول دخول بعد الإتمام (مرة واحدة للجلسة)
  useEffect(() => {
    if (phase === "app" && game.state?.agent.finishedAt && !announcedFinale) {
      setAnnouncedFinale(true);
      setView("finale");
    }
  }, [phase, game.state?.agent.finishedAt, announcedFinale]);

  const openMapForPuzzle = (puzzleId: string) => {
    setMapFocus(puzzleId);
    setView("map");
  };

  // ── تحميل الجلسة ──
  if (game.loading && game.authed === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <CRTLayer />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-mono text-sm tracking-widest text-muted-foreground" dir="ltr">
          RESTORING SECURE LINE...
        </p>
      </div>
    );
  }

  // ── المراحل الأولى ──
  if (phase === "boot") {
    return (
      <>
        <CRTLayer />
        <BootScreen
          onDone={() => {
            window.localStorage.setItem("p9-booted", "1");
            setPhase("intro");
          }}
        />
      </>
    );
  }

  if (phase === "intro") {
    return (
      <>
        <CRTLayer />
        <IntroScreen onStart={() => setPhase("auth")} />
      </>
    );
  }

  if (phase === "auth") {
    return (
      <>
        <CRTLayer />
        <AuthPanel
          onAuthed={() => {
            setPhase("app");
            void game.refresh();
          }}
        />
      </>
    );
  }

  if (!game.state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <CRTLayer />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── التطبيق ──
  const finished = !!game.state.agent.finishedAt;

  return (
    <>
      <CRTLayer />
      <GameShell game={game} active={view} onNavigate={(v) => setView(v)}>
        {finished && (
          <button
            type="button"
            onClick={() => setView("finale")}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded border border-primary/50 bg-primary/10 px-4 py-3 font-doc text-lg font-bold text-primary text-glow-amber transition-colors hover:bg-primary/20 pulse-ring"
          >
            <Crown className="h-5 w-5" />
            عبرتَ العتبة الأخيرة — أنت التاسع رقم {game.state.agent.finaleRank}
            <span className="text-xs font-normal text-muted-foreground">(افتح شهادتك الكاملة)</span>
          </button>
        )}

        {view === "ops" && <OpsView game={game} onOpenMap={openMapForPuzzle} />}
        {view === "lab" && <LabView />}
        {view === "map" && (
          <MapPanel game={game} focusPuzzleId={mapFocus} onClearFocus={() => setMapFocus(null)} />
        )}
        {view === "pulse" && <PulseView game={game} />}
        {view === "sorting" && <SortingView game={game} />}
        {view === "board" && <BoardView game={game} />}
        {view === "archive" && <ArchiveView game={game} />}
        {view === "team" && <TeamView game={game} />}
        {view === "journal" && <JournalView game={game} />}
        {view === "finale" && <FinaleView game={game} />}
      </GameShell>
    </>
  );
}

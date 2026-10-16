"use client";

// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — طبقة بيانات الواجهة
// جلسة دائمة: كوكي httpOnly + نسخة احتياطية في localStorage
// ═══════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "@/lib/game/engine";

const TOKEN_KEY = "p9-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

async function api<T = unknown>(
  path: string,
  body?: unknown,
  method: "GET" | "POST" = body ? "POST" : "GET"
): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["x-p9-token"] = token;
  if (body !== undefined) headers["content-type"] = "application/json";
  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "تعذر الوصول للأرشيف." } as T & { error?: string } };
  }
}

export interface FeedEvent {
  at: string;
  kind: string;
  text: string;
}

export interface LeaderboardData {
  ok: boolean;
  top: {
    codename: string;
    memberNo: number;
    points: number;
    rank: string;
    solved: number;
    finished: boolean;
    finaleRank: number | null;
    team: string | null;
    streak: number;
  }[];
  wallOfNine: { codename: string; finaleRank: number | null; finishedAt: string | null; points: number }[];
  teams: { name: string; points: number; members: number; seceded: number }[];
  stats: { agents: number; solves: number; finished: number; plates: number; pulsesToday: number };
}

export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [board, setBoard] = useState<LeaderboardData | null>(null);
  const feedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const res = await api<{ state: GameState }>("/api/game/state");
    if (res.ok && res.data.state) {
      setState(res.data.state);
      setAuthed(true);
    } else {
      setAuthed(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // البث الحي + المتصدرون: تحديث دوري كل ٢٠ ثانية عند النشاط
  useEffect(() => {
    if (authed !== true) return;
    const pull = async () => {
      const [f, b] = await Promise.all([
        api<{ events: FeedEvent[] }>("/api/game/feed"),
        api<LeaderboardData>("/api/game/leaderboard"),
      ]);
      if (f.ok && f.data.events) setFeed(f.data.events);
      if (b.ok) setBoard(b.data as LeaderboardData);
    };
    void pull();
    feedTimer.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void pull();
      }
    }, 20000);
    return () => {
      if (feedTimer.current) clearInterval(feedTimer.current);
    };
  }, [authed, state?.agent.points]);

  const submitPuzzle = useCallback(
    async (puzzleId: string, answer: string, vaultAnswers?: string[]) => {
      const res = await api<{ result: Record<string, unknown> }>("/api/game/submit", {
        puzzleId,
        answer,
        vaultAnswers,
      });
      await refresh();
      return res;
    },
    [refresh]
  );

  const openHint = useCallback(
    async (puzzleId: string, level: number) => {
      const res = await api<{ hint: string; cost: number }>("/api/game/hint", {
        puzzleId,
        level,
      });
      await refresh();
      return res;
    },
    [refresh]
  );

  const submitPulse = useCallback(
    async (answer: string) => {
      const res = await api<{ result: Record<string, unknown> }>("/api/game/pulse", { answer });
      await refresh();
      return res;
    },
    [refresh]
  );

  const judgeDoc = useCallback(
    async (docId: string, verdict: "real" | "fake", flawKind?: string) => {
      const res = await api<{ result: Record<string, unknown> }>("/api/game/sorting", {
        docId,
        verdict,
        flawKind,
      });
      await refresh();
      return res;
    },
    [refresh]
  );

  const teamAction = useCallback(
    async (action: string, extra?: Record<string, unknown>) => {
      const res = await api<Record<string, unknown>>("/api/game/team", { action, ...extra });
      await refresh();
      return res;
    },
    [refresh]
  );

  const buyPlate = useCallback(async () => {
    const res = await api<{ notes: { target: string; text: string }[] }>("/api/game/plate", {});
    await refresh();
    return res;
  }, [refresh]);

  const saveFinaleAnswer = useCallback(async (answer: string) => {
    return api("/api/game/finale", { answer });
  }, []);

  const logout = useCallback(async () => {
    await api("/api/game/auth/logout", {});
    clearToken();
    setAuthed(false);
    setState(null);
  }, []);

  return {
    state,
    loading,
    authed,
    feed,
    board,
    refresh,
    submitPuzzle,
    openHint,
    submitPulse,
    judgeDoc,
    teamAction,
    buyPlate,
    saveFinaleAnswer,
    logout,
  };
}

export type Game = ReturnType<typeof useGame>;

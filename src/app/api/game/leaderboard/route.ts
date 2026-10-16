// GET /api/game/leaderboard — المتصدرون + جدار التاسعين + حلفون + إحصاءات
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rankFor } from "@/lib/game/content";

export async function GET() {
  try {
    const [top, wall, teams, totals, pulsesToday] = await Promise.all([
      db.agent.findMany({
        orderBy: [{ points: "desc" }, { createdAt: "asc" }],
        take: 20,
        select: {
          codename: true,
          memberNo: true,
          points: true,
          finishedAt: true,
          finaleRank: true,
          createdAt: true,
          plateUnlocked: true,
          pulseStreak: true,
          teamId: true,
          solves: { select: { puzzleId: true } },
        },
      }),
      db.agent.findMany({
        where: { finaleRank: { not: null } },
        orderBy: { finaleRank: "asc" },
        take: 9,
        select: { codename: true, finaleRank: true, finishedAt: true, points: true },
      }),
      db.team.findMany({
        include: { members: { select: { points: true, secededAt: true } } },
      }),
      Promise.all([
        db.agent.count(),
        db.solve.groupBy({ by: ["puzzleId"], _count: { puzzleId: true } }),
        db.agent.count({ where: { finishedAt: { not: null } } }),
        db.agent.count({ where: { plateUnlocked: true } }),
      ]),
      // نبضات اليوم (بتوقيت البحرين)
      (async () => {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Bahrain",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        return db.dailyPulse.count({ where: { dateStr: today, solved: true } });
      })(),
    ]);

    const teamMap = new Map(teams.map((t) => [t.id, t.name]));
    const [agentsCount, solveGroups, finishedCount, plateCount] = totals;
    const solvesCount = solveGroups.reduce((a, g) => a + g._count.puzzleId, 0);

    const teamBoard = teams
      .map((t) => ({
        name: t.name,
        points: t.members.filter((m) => !m.secededAt).reduce((a, m) => a + m.points, 0),
        members: t.members.filter((m) => !m.secededAt).length,
        seceded: t.members.filter((m) => m.secededAt).length,
      }))
      .filter((t) => t.members > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      top: top.map((a) => ({
        codename: a.codename,
        memberNo: a.memberNo,
        points: a.points,
        rank: rankFor(a.points).name,
        solved: a.solves.length,
        finished: !!a.finishedAt,
        finaleRank: a.finaleRank,
        team: a.teamId ? teamMap.get(a.teamId) ?? null : null,
        streak: a.pulseStreak,
      })),
      wallOfNine: wall.map((a) => ({
        codename: a.codename,
        finaleRank: a.finaleRank,
        finishedAt: a.finishedAt?.toISOString() ?? null,
        points: a.points,
      })),
      teams: teamBoard,
      stats: {
        agents: agentsCount,
        solves: solvesCount,
        finished: finishedCount,
        plates: plateCount,
        pulsesToday,
      },
    });
  } catch (e) {
    console.error("leaderboard error", e);
    return NextResponse.json({ error: "خلل في لوحة المتصدرين." }, { status: 500 });
  }
}

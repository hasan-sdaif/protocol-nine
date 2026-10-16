// POST /api/game/hint — شراء تلميح بالنقاط
import { NextRequest, NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/game/auth";
import { buyHint } from "@/lib/game/engine";

export async function POST(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "الخط غير مؤمَّن." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const puzzleId = String(body?.puzzleId ?? "");
  const level = Number(body?.level ?? 0);

  const result = await buyHint(agent, puzzleId, level);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, result });
}

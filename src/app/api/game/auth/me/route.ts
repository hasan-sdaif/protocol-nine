// GET /api/game/auth/me — استعادة الجلسة الدائمة (كوكي أو هيدر)
import { NextRequest, NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/game/auth";
import { buildGameState } from "@/lib/game/engine";

export async function GET(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "لا جلسة." }, { status: 401 });
  const state = await buildGameState(agent);
  return NextResponse.json({ ok: true, state });
}

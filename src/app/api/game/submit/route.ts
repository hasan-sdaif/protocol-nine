// POST /api/game/submit — تسجيل إجابة لغز
import { NextRequest, NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/game/auth";
import { submitAnswer } from "@/lib/game/engine";

export async function POST(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "الخط غير مؤمَّن." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const puzzleId = String(body?.puzzleId ?? "");
  const answer = String(body?.answer ?? "");
  const vaultAnswers = Array.isArray(body?.vaultAnswers)
    ? body.vaultAnswers.map((v: unknown) => String(v))
    : undefined;

  if (!puzzleId) return NextResponse.json({ error: "معرّف لغز مفقود." }, { status: 400 });

  const result = await submitAnswer(agent, puzzleId, answer, vaultAnswers);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, result });
}

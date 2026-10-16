// POST /api/game/pulse — إجابة نبض الأرشيف اليومي
import { NextRequest, NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/game/auth";
import { submitPulse } from "@/lib/game/engine";

export async function POST(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "الخط غير مؤمَّن." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const answer = String(body?.answer ?? "");
  if (!answer.trim()) {
    return NextResponse.json({ error: "الإشارة تنتظر قراءتك." }, { status: 400 });
  }

  const result = await submitPulse(agent, answer);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}

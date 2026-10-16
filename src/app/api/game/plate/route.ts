// POST /api/game/plate — اقتناء الصفيحة الشفافة
import { NextRequest, NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/game/auth";
import { buyPlate } from "@/lib/game/engine";

export async function POST(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "الخط غير مؤمَّن." }, { status: 401 });

  const result = await buyPlate(agent);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, notes: result.notes });
}

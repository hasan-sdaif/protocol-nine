// POST /api/game/scan — منارات المسح الميداني (QR)
// { action: "scan", code } — مسح منارة (من الكاميرا أو الإدخال اليدوي)
// { action: "test", code, answer } — إجابة اختبار المنارة
import { NextRequest, NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/game/auth";
import { answerScanTest, scanBeacon } from "@/lib/game/engine";

export async function POST(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "الخط غير مؤمَّن." }, { status: 401 });

  let body: { action?: string; code?: string; answer?: string };
  try {
    body = (await req.json()) as { action?: string; code?: string; answer?: string };
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const code = (body.code ?? "").toString().slice(0, 64);
  if (!code.trim()) return NextResponse.json({ error: "أدخل رمز المنارة." }, { status: 400 });

  if (body.action === "test") {
    const answer = (body.answer ?? "").toString().slice(0, 120);
    const result = await answerScanTest(agent, code, answer);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ result });
  }

  const result = await scanBeacon(agent, code);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ result });
}

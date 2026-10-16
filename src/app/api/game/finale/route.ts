// POST /api/game/finale — إجابة السؤال الأخير: «ماذا تشعر؟»
// تُحفظ في الأرشيف كما في الوثيقة ١٠١
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAgent } from "@/lib/game/auth";

export async function POST(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "الخط غير مؤمَّن." }, { status: 401 });

  if (!agent.finishedAt) {
    return NextResponse.json(
      { error: "السؤال الأخير ينتظر من يكمل البروتوكول التاسع." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const answer = String(body?.answer ?? "").trim().slice(0, 500);
  if (answer.length < 2) {
    return NextResponse.json({ error: "اكتب شعورك بصدق ولو كلمة واحدة." }, { status: 400 });
  }

  await db.agent.update({ where: { id: agent.id }, data: { finaleAnswer: answer } });
  await db.journal.create({
    data: {
      agentId: agent.id,
      kind: "feel",
      text: `أجاب الوكيل عن سؤال الوثيقة ١٠١: «${answer}» — حُفظت في الأرشيف.`,
    },
  });

  return NextResponse.json({ ok: true });
}

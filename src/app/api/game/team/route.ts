// POST /api/game/team — عمليات الحلف: إنشاء / انضمام / انفصال / رسالة
import { NextRequest, NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/game/auth";
import {
  createTeam,
  joinTeam,
  secedeFromTeam,
  postTeamMessage,
} from "@/lib/game/engine";

export async function POST(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "الخط غير مؤمَّن." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");

  try {
    switch (action) {
      case "create": {
        const name = String(body?.name ?? "");
        const result = await createTeam(agent, name);
        if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ ok: true, team: result.team });
      }
      case "join": {
        const code = String(body?.code ?? "");
        const result = await joinTeam(agent, code);
        if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ ok: true });
      }
      case "secede": {
        const result = await secedeFromTeam(agent);
        if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ ok: true });
      }
      case "message": {
        const text = String(body?.text ?? "");
        const result = await postTeamMessage(agent, text);
        if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "عملية غير معروفة." }, { status: 400 });
    }
  } catch (e) {
    console.error("team error", e);
    return NextResponse.json({ error: "خلل في قناة الحلف." }, { status: 500 });
  }
}

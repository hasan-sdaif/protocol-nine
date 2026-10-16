// POST /api/game/auth/login — عودة الوكيل (جلسة دائمة)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  normalizeCodename,
  COOKIE_NAME,
} from "@/lib/game/auth";

const TEN_YEARS_S = 10 * 365 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const codename = normalizeCodename(String(body?.codename ?? ""));
    const passphrase = String(body?.passphrase ?? "");

    const agent = await db.agent.findUnique({ where: { codename } });
    if (!agent || !verifyPassword(passphrase, agent.passHash)) {
      return NextResponse.json(
        { error: "اسم حركي أو عبارة سر غير صحيحة." },
        { status: 401 }
      );
    }

    const session = await createSession(agent.id);

    const res = NextResponse.json({
      ok: true,
      token: session.token,
      agent: { codename: agent.codename, points: agent.points },
    });
    res.cookies.set(COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TEN_YEARS_S,
    });
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "خلل في العودة." }, { status: 500 });
  }
}

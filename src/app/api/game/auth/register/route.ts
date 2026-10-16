// POST /api/game/auth/register — انتساب وكيل جديد
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  createSession,
  normalizeCodename,
  validCodename,
  COOKIE_NAME,
} from "@/lib/game/auth";

const TEN_YEARS_S = 10 * 365 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const codename = normalizeCodename(String(body?.codename ?? ""));
    const passphrase = String(body?.passphrase ?? "");

    if (!validCodename(codename)) {
      return NextResponse.json(
        { error: "الاسم الحركي: ٣-٢٤ حرفاً عربية أو إنجليزية أو أرقام." },
        { status: 400 }
      );
    }
    if (passphrase.length < 4) {
      return NextResponse.json(
        { error: "عبارة السر: ٤ أحرف على الأقل." },
        { status: 400 }
      );
    }

    const exists = await db.agent.findUnique({ where: { codename } });
    if (exists) {
      return NextResponse.json(
        { error: "هذا الاسم الحركي محجوز لوكيل آخر." },
        { status: 409 }
      );
    }

    // المعرّف الرباعي — نظام أرشيف الغائبين (يُشاركه الوكيل مع من يثق بهم)
    let memberNo = 1000 + Math.floor(Math.random() * 9000);
    for (let i = 0; i < 8; i++) {
      const clash = await db.agent.findUnique({ where: { memberNo } });
      if (!clash) break;
      memberNo = 1000 + Math.floor(Math.random() * 9000);
    }

    const agent = await db.agent.create({
      data: { codename, passHash: hashPassword(passphrase), memberNo },
    });
    await db.journal.create({
      data: {
        agentId: agent.id,
        kind: "join",
        text: `انضمام الوكيل «${codename}» إلى منظومة الظل. البروتوكول العاشر بدأ التسجيل.`,
      },
    });

    const session = await createSession(agent.id);

    const res = NextResponse.json({
      ok: true,
      token: session.token,
      agent: { codename: agent.codename, points: 0 },
    });
    res.cookies.set(COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TEN_YEARS_S,
    });
    return res;
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json({ error: "خلل في الانتساب." }, { status: 500 });
  }
}

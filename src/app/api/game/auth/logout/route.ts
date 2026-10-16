// POST /api/game/auth/logout — قطع الخط الآمن (اختياري فقط)
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/game/auth";

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? req.headers.get("x-p9-token") ?? undefined;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

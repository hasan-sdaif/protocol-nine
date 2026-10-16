// GET /api/game/feed — بث الوسيط: تدفق الأحداث الحية
import { NextResponse } from "next/server";
import { getFeed } from "@/lib/game/engine";

export async function GET() {
  try {
    const events = await getFeed();
    return NextResponse.json({ ok: true, events });
  } catch (e) {
    console.error("feed error", e);
    return NextResponse.json({ error: "خلل في البث." }, { status: 500 });
  }
}

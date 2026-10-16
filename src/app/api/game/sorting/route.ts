// POST /api/game/sorting — حكم على وثيقة مشبوهة في غرفة الفرز
import { NextRequest, NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/game/auth";
import { sortVerdict } from "@/lib/game/engine";

const VALID_VERDICTS = new Set(["real", "fake"]);
const VALID_FLAWS = new Set([
  "code-deviation",
  "fact-contradiction",
  "impossible",
  "style-mismatch",
]);

export async function POST(req: NextRequest) {
  const agent = await getSessionAgent(req);
  if (!agent) return NextResponse.json({ error: "الخط غير مؤمَّن." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const docId = String(body?.docId ?? "");
  const verdict = String(body?.verdict ?? "");
  const flawKind = body?.flawKind != null ? String(body.flawKind) : undefined;

  if (!docId) return NextResponse.json({ error: "وثيقة غير محددة." }, { status: 400 });
  if (!VALID_VERDICTS.has(verdict)) {
    return NextResponse.json({ error: "الحكم إما حقيقية أو مزيفة." }, { status: 400 });
  }
  if (verdict === "fake" && (!flawKind || !VALID_FLAWS.has(flawKind))) {
    return NextResponse.json({ error: "حدّد علّة التزييف." }, { status: 400 });
  }

  const result = await sortVerdict(
    agent,
    docId,
    verdict as "real" | "fake",
    flawKind
  );
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, result });
}

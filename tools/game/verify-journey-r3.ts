// ═══════════════════════════════════════════════════════════
// اختبار رحلة R3: المسارات + منارات QR عبر HTTP API
// bun tools/game/verify-journey-r3.ts
// ═══════════════════════════════════════════════════════════
const BASE = "http://localhost:3000";
let token = "";
let pass = 0;
let fail = 0;

function ok(cond: boolean, label: string, extra?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}${extra ? " — " + extra : ""}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${extra ? " — " + extra : ""}`);
  }
}

async function api(path: string, body?: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers["x-p9-token"] = token;
  const res = await fetch(BASE + path, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
}

async function main() {
  console.log("── 1) الانتساب ──");
  const codename = "رائد-التحقق-" + Math.floor(Math.random() * 9000);
  let r = await api("/api/game/auth/register", { codename, passphrase: "verify-r3-9", confirm: true, ack1: true, ack2: true });
  ok(r.status === 200 && r.data.token, "تسجيل وكيل جديد", String((r.data.agent as Record<string, unknown>)?.memberNo ?? ""));
  token = (r.data.token as string) ?? "";
  const memberNo = ((r.data.agent as Record<string, unknown>)?.memberNo as number) ?? 0;

  console.log("── 2) حل P0 + P1 + P2 (فتح المسارات عند البروتوكول ٢) ──");
  const answers: [string, string][] = [
    ["p0-a", "المكتبة"],
    ["p0-b", "مكان مهجور"],
    ["p0-c", "155"],
    ["p0-d", "26"],
    ["p1-a", "SAKHIR"],
    ["p1-b", "بروتوكول"],
    ["p2-a", "WATCHER"],
    ["p2-b", "المكتبة"],
  ];
  for (const [pid, ans] of answers) {
    r = await api("/api/game/submit", { puzzleId: pid, answer: ans });
    ok(r.status === 200 && (r.data.result as Record<string, unknown>)?.correct === true, `حل ${pid}`);
  }

  console.log("── 3) الحالة: المسارات والمنارات ──");
  r = await api("/api/game/state");
  const state = r.data.state as Record<string, unknown>;
  ok(!!state.paths && Array.isArray(state.paths) && (state.paths as unknown[]).length === 6, "٦ مسارات في الحالة");
  ok(!!state.scans && Array.isArray((state.scans as Record<string, unknown>).points), "قسم المنارات في الحالة");
  const paths = state.paths as { key: string; unlocked: boolean; puzzles: { id: string; locked?: boolean }[] }[];
  ok(paths.find((p) => p.key === "echo")?.unlocked === true, "مسار الصدى مفتوح (بروتوكول ٢)");
  ok(paths.find((p) => p.key === "compass")?.unlocked === false, "مسار البوصلة مغلق (بروتوكول ٥)");
  const echo = paths.find((p) => p.key === "echo")!;
  ok(echo.puzzles[0].locked !== true, "أول لغز في الصدى غير مقفول");

  console.log("── 4) مسح منارة + اختبار ──");
  r = await api("/api/game/scan", { action: "scan", code: "P9-QR-S3-01" });
  let res = r.data.result as Record<string, unknown>;
  ok(r.status === 200 && res.ok === true && (res.pointsAwarded as number) > 0, "مسح منارة S3-01", `+${res.pointsAwarded}`);
  r = await api("/api/game/scan", { action: "scan", code: "P9-QR-S17-05" });
  res = r.data.result as Record<string, unknown>;
  ok(res.ok === true && !!res.test, "مسح منارة S17-05 باختبار", `+${res.pointsAwarded}`);
  const code17 = "P9-QR-S17-05";
  r = await api("/api/game/scan", { action: "test", code: code17, answer: "خمسة" });
  let tres = r.data.result as Record<string, unknown>;
  ok(tres.correct === false, "إجابة اختبار خاطئة تُرفض بلطف");
  r = await api("/api/game/scan", { action: "test", code: code17, answer: "تسعة" });
  tres = r.data.result as Record<string, unknown>;
  ok(tres.correct === true && (tres.pointsAwarded as number) === 25, "إجابة اختبار S17-05 (تسعة كراسٍ)", `+${tres.pointsAwarded}`);
  r = await api("/api/game/scan", { action: "scan", code: "P9-QR-S3-01" });
  res = r.data.result as Record<string, unknown>;
  ok(res.alreadyFound === true && (res.pointsAwarded as number) === 0, "إعادة مسح نفس المنارة = موجود سابقاً");
  r = await api("/api/game/scan", { action: "scan", code: "P9-QR-XXX-99" });
  ok(r.status === 400, "رمز مجهول يُرفض");

  console.log("── 5) حل مسار الصدى كاملاً ──");
  const pathAnswers: [string, string][] = [
    ["path-echo-1", "SPECTRUM"],
    ["path-echo-2", "ONAIR"],
    ["path-echo-3", "البث الأخير لم ينته"],
  ];
  for (const [pid, ans] of pathAnswers) {
    r = await api("/api/game/submit", { puzzleId: pid, answer: ans });
    const pr = r.data.result as Record<string, unknown>;
    ok(r.status === 200 && pr?.correct === true, `حل ${pid}`, pr?.pathCompleted ? "خِتم الصدى!" : "");
  }
  r = await api("/api/game/submit", { puzzleId: "path-writer-2", answer: "المخبأ" });
  ok(r.status === 400, "لغز ثانٍ في مسار قبل حل الأول يُرفض");

  console.log("── 6) الحالة النهائية + البث ──");
  r = await api("/api/game/state");
  const s2 = r.data.state as Record<string, unknown>;
  const paths2 = s2.paths as { key: string; completed: boolean; seal: { word: string } | null; fragments: (string | null)[] }[];
  const echo2 = paths2.find((p) => p.key === "echo")!;
  ok(echo2.completed === true && echo2.seal?.word === "الصدى", "خِتم الصدى مُمنوح", echo2.seal?.word ?? "");
  ok(echo2.fragments.every((f) => !!f), "الشظايا الثلاث مكشوفة");
  const scans2 = s2.scans as { foundCount: number; total: number; bonusPoints: number };
  ok(scans2.foundCount === 2 && scans2.total === 14 && scans2.bonusPoints === 25, "إحصاءات المنارات", `${scans2.foundCount}/${scans2.total} +${scans2.bonusPoints}`);
  const stats2 = s2.stats as { pathSolved: number; pathTotal: number; scansFound: number };
  ok(stats2.pathSolved === 3 && stats2.pathTotal === 18, "إحصاءات المسارات", `${stats2.pathSolved}/${stats2.pathTotal}`);
  r = await api("/api/game/feed");
  const events = r.data.events as { kind: string; text: string }[];
  ok(events.some((e) => e.kind === "scan"), "بث الوسيط يعرض أحداث المسح");
  ok(events.some((e) => e.kind === "path" && e.text.includes("الصدى")), "البث يعرض خِتم المسار");
  r = await api("/api/game/leaderboard");
  ok(r.status === 200, "المتصدرون يعملون");
  const me = (r.data.top as { codename: string }[]).find((a) => a.codename === codename);
  ok(!!me, "الوكيل الجديد في المتصدرين");

  console.log("── 7) التلميحات على لغز مسار ──");
  r = await api("/api/game/hint", { puzzleId: "path-writer-1", level: 1 });
  const hintRes = ((r.data.result ?? r.data) as Record<string, unknown>);
  ok(r.status === 200 && !!(hintRes.hint as string), "شراء تلميح للغز مسار يعمل");

  console.log(`\n═══ النتيجة: ${pass} ✓ / ${fail} ✗ ═══`);
  console.log(`الوكيل: ${codename} (#${memberNo})`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

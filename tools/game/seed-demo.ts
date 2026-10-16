// ═══════════════════════════════════════════════════════════
// بذر مشهد تنافسي حي — وكلاء تجريبيون بتقدم متنوع + حلف + نبض
// يُشغَّل مرة واحدة: bun tools/game/seed-demo.ts
// ═══════════════════════════════════════════════════════════
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const P0 = ["p0-a", "p0-b", "p0-c", "p0-d"];
const P1 = ["p1-a", "p1-b"];
const P2 = ["p2-a", "p2-b"];
const P3 = ["p3-a", "p3-b"];
const P4 = ["p4-a", "p4-b"];
const P5 = ["p5-a", "p5-b"];
const P6 = ["p6-a", "p6-b"];

const POINTS: Record<string, number> = {
  "p0-a": 50, "p0-b": 60, "p0-c": 70, "p0-d": 90,
  "p1-a": 60, "p1-b": 60,
  "p2-a": 80, "p2-b": 80,
  "p3-a": 100, "p3-b": 100,
  "p4-a": 110, "p4-b": 110,
  "p5-a": 140, "p5-b": 140,
  "p6-a": 160, "p6-b": 160,
  "ext-eng-a": 120, "ext-eng-b": 140, "ext-hsc-a": 120,
};

function bahrainToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

async function main() {
  // تنظيف كامل للمشهد التجريبي السابق
  await db.teamMessage.deleteMany();
  await db.team.deleteMany();
  await db.sortAttempt.deleteMany();
  await db.dailyPulse.deleteMany();
  await db.journal.deleteMany();
  await db.hintUnlock.deleteMany();
  await db.solve.deleteMany();
  await db.session.deleteMany();
  await db.agent.deleteMany();

  const now = Date.now();
  const hour = 3600 * 1000;

  interface SeedAgent {
    codename: string; memberNo: number; puzzles: string[]; plate?: boolean;
    pulseStreak?: number; lastSeenHours?: number;
  }

  const seeds: SeedAgent[] = [
    { codename: "عين الصقر", memberNo: 4471, puzzles: [...P0, ...P1, ...P2, ...P3, ...P4], pulseStreak: 3, lastSeenHours: 1 },
    { codename: "ذاكرة الماء", memberNo: 2013, puzzles: [...P0, ...P1, ...P2, ...P3, ...P4, ...P5, ...P6], plate: true, pulseStreak: 5, lastSeenHours: 0.2 },
    { codename: "الحبر الأخير", memberNo: 1908, puzzles: [...P0, ...P1, ...P2], pulseStreak: 1, lastSeenHours: 4 },
    { codename: "صمت المكتبة", memberNo: 3011, puzzles: [...P0], lastSeenHours: 20 },
    { codename: "بوابة الشرق", memberNo: 5040, puzzles: [...P0, ...P1, ...P2, ...P3, "ext-eng-a", "ext-eng-b", "ext-hsc-a"], lastSeenHours: 8 },
  ];

  const today = bahrainToday();
  const created: { id: string; codename: string; points: number }[] = [];

  for (const [i, s] of seeds.entries()) {
    let points = s.puzzles.reduce((a, p) => a + (POINTS[p] ?? 0), 0);
    if (s.pulseStreak) points += 40 + Math.min(s.pulseStreak - 1, 5) * 10;

    const agent = await db.agent.create({
      data: {
        codename: s.codename,
        passHash: hashPassword("demo-" + s.memberNo),
        memberNo: s.memberNo,
        points,
        plateUnlocked: !!s.plate,
        pulseStreak: s.pulseStreak ?? 0,
        lastPulseDate: s.pulseStreak ? today : null,
        createdAt: new Date(now - (14 - i * 2) * 24 * hour),
        lastSeenAt: new Date(now - (s.lastSeenHours ?? 3) * hour),
      },
    });
    created.push({ id: agent.id, codename: s.codename, points });

    // حلول موزعة على اليومين الماضيين (ليبث الخبر حياً)
    for (const [j, pid] of s.puzzles.entries()) {
      await db.solve.create({
        data: {
          agentId: agent.id,
          puzzleId: pid,
          points: POINTS[pid] ?? 0,
          attempts: j % 4 === 0 ? 1 : 0,
          hintLevel: j % 5 === 0 ? 1 : 0,
          solvedAt: new Date(now - (30 - j * 1.5 - i * 2) * hour),
        },
      });
      await db.journal.create({
        data: {
          agentId: agent.id,
          kind: "clear",
          text: `سقط الحارس: حُلّ لغز «${pid}» (+${POINTS[pid] ?? 0} نقطة).`,
          createdAt: new Date(now - (30 - j * 1.5 - i * 2) * hour),
        },
      });
    }

    // نبض اليوم
    if (s.pulseStreak) {
      await db.dailyPulse.create({
        data: { agentId: agent.id, dateStr: today, solved: true, attempts: 1, points: 40 + Math.min(s.pulseStreak - 1, 5) * 10 },
      });
    }
    if (s.plate) {
      await db.journal.create({
        data: { agentId: agent.id, kind: "plate", text: "اقتنيتَ الصفيحة الشفافة (−150 نقطة). ما بين السطور يُقرأ الآن.", createdAt: new Date(now - 26 * hour) },
      });
    }
    await db.journal.create({
      data: { agentId: agent.id, kind: "join", text: `انضمام الوكيل «${s.codename}» إلى منظومة الظل. البروتوكول العاشر بدأ التسجيل.`, createdAt: new Date(now - (14 - i * 2) * 24 * hour) },
    });
  }

  // حلف «عيون الليل»: ثلاثة أعضاء
  const team = await db.team.create({
    data: { name: "عيون الليل", inviteCode: "314159" },
  });
  for (const c of created.slice(0, 3)) {
    await db.agent.update({
      where: { id: c.id },
      data: { teamId: team.id, joinedTeamAt: new Date(now - 40 * hour) },
    });
  }
  const msgs: { codename: string; text: string; h: number }[] = [
    { codename: "الوسيط", text: "قُد الحلف باسمه. الثقة تُبنى هنا... وتُختبر خارج هنا.", h: 40 },
    { codename: "ذاكرة الماء", text: "البروتوكول الخامس يحتاج مفتاحاً من ستة أحرف — من برحلة الأولى. راجعوا الأرشيف.", h: 9 },
    { codename: "عين الصقر", text: "غرفة الفرز ليست للاندفاع. راقبوا الرمز قبل القصة.", h: 6 },
    { codename: "الحبر الأخير", text: "أوشكت على الانزياح الثالث... الليلة إن شاء الله.", h: 2 },
  ];
  for (const m of msgs) {
    await db.teamMessage.create({
      data: {
        teamId: team.id,
        agentId: "",
        codename: m.codename,
        text: m.text,
        createdAt: new Date(now - m.h * hour),
        expiresAt: new Date(now - m.h * hour + 24 * hour),
      },
    });
  }

  console.log("✓ بُذر المشهد التنافسي:");
  console.log("  وكلاء:", created.map((c) => `${c.codename} (${c.points})`).join("، "));
  console.log("  الحلف: عيون الليل — 314159 (٣ أعضاء)");
  console.log("  نبضات اليوم:", seeds.filter((s) => s.pulseStreak).length);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

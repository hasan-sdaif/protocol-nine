// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — محرك اللعبة (منطق الخادم)
// البروتوكولات العشرة (الأصل + التسعة) • الملحقات الخارجية •
// النبض اليومي • غرفة الفرز • الفرق والانفصال • الصفيحة • الجمل
// ═══════════════════════════════════════════════════════════
import { createHash } from "crypto";
import { db } from "@/lib/db";
import type { Agent } from "@prisma/client";
import { answersMatch, normalizeAnswer } from "./ciphers";
import { SCORING, rankFor, nextRank } from "./content";
import type { PuzzleDef } from "./content";
import {
  ALL_PROTOCOLS,
  VAULT_SLOTS_FULL,
  VERIFICATION_PHRASES,
  PLATE_NOTES,
  MECHANICS,
  allPuzzleById,
} from "./content-aa";
import { EXTERNAL_BRANCHES, SORTING_DOCS, PULSE_POOL } from "./content-external";
import {
  caesar,
  atbash,
  reverseText,
  toMorse,
  toA1Z26,
  rot13,
} from "./ciphers";

// ── أنواع الحالة المرسلة للعميل ───────────────────────────
export interface ClientPuzzle {
  id: string;
  title: string;
  question: string;
  material: string;
  materialKind: string;
  points: number;
  solved: boolean;
  wrongAttempts: number;
  hintsOpened: number;
  hints: (string | null)[];
}

export interface ClientProtocol {
  n: number;
  key: string;
  name: string;
  guardianName: string;
  audio: string;
  unlocked: boolean;
  completed: boolean;
  transcript: string[];
  puzzles: ClientPuzzle[];
  plateNote: string | null;
}

export interface ClientDossierEntry {
  n: number;
  title: string;
  body: string;
  unlocked: boolean;
  phrase: string | null;
}

export interface ClientShard {
  n: number;
  label: string;
  word: string | null;
}

export interface ClientJournalEntry {
  kind: string;
  text: string;
  at: string;
}

export interface ClientTeamMember {
  codename: string;
  memberNo: number;
  points: number;
  rankName: string;
  solvedCount: number;
  seceded: boolean;
  isMe: boolean;
  lastSeenAt: string;
}

export interface ClientTeamMessage {
  id: string;
  codename: string;
  text: string;
  at: string;
  expiresAt: string;
  system: boolean;
}

export interface ClientTeam {
  name: string;
  inviteCode: string;
  createdAt: string;
  teamPoints: number;
  members: ClientTeamMember[];
  messages: ClientTeamMessage[];
  mySeceded: boolean;
  canSecede: boolean;
  secedeHint: string;
}

export interface ClientPulse {
  date: string;
  story: string;
  material: string;
  methodName: string;
  solved: boolean;
  locked: boolean;
  streak: number;
  potentialPoints: number;
  history: { date: string; solved: boolean }[];
}

export interface ClientSortDoc {
  id: string;
  code: string;
  title: string;
  body: string;
  judged: boolean;
  myVerdict: string | null;
  myFlawKind: string | null;
  correct: boolean | null;
  pointsAwarded: number;
  truth: string | null; // flawNote — يُكشف بعد الحكم
}

export interface ClientExternalBranch {
  key: string;
  name: string;
  campus: string;
  prize: string;
  story: string;
  audio: string;
  transcript: string[];
  puzzles: ClientPuzzle[];
  completed: boolean;
}

export interface GameState {
  agent: {
    codename: string;
    memberNo: number;
    points: number;
    rank: { name: string; code: string; sigil: string; min: number };
    nextRank: { name: string; code: string; min: number } | null;
    wrongAttempts: number;
    hintsUsed: number;
    finishedAt: string | null;
    finaleRank: number | null;
    finaleAnswer: string | null;
    createdAt: string;
    plateUnlocked: boolean;
    pulseStreak: number;
  };
  protocols: ClientProtocol[];
  dossier: ClientDossierEntry[];
  shards: ClientShard[];
  vaultSlots: { riddle: string }[];
  vaultUnlocked: boolean;
  journal: ClientJournalEntry[];
  stats: {
    solvedCount: number;
    totalPuzzles: number;
    externalSolved: number;
    externalTotal: number;
  };
  team: ClientTeam | null;
  canJoinTeam: boolean;
  pulse: ClientPulse;
  sorting: {
    unlocked: boolean;
    minProtocol: number;
    docs: ClientSortDoc[];
    stats: { correctFake: number; correctReal: number; fooled: number; wrongAccusations: number };
  };
  plate: { unlocked: boolean; cost: number; eligible: boolean; minProtocol: number };
  external: {
    unlocked: boolean;
    minProtocol: number;
    branches: ClientExternalBranch[];
  };
}

// ── مساعدات داخلية ────────────────────────────────────────
async function journal(agentId: string, kind: string, text: string) {
  await db.journal.create({ data: { agentId, kind, text } });
}

export function protocolUnlocked(n: number, solvedIds: Set<string>): boolean {
  if (n <= 0) return true; // البروتوكول صفر مفتوح دائماً — البذرة
  const prev = ALL_PROTOCOLS.find((p) => p.n === n - 1);
  if (!prev) return false;
  return prev.puzzles.every((pz) => solvedIds.has(pz.id));
}

export function protocolCompleted(n: number, solvedIds: Set<string>): boolean {
  const proto = ALL_PROTOCOLS.find((p) => p.n === n);
  if (!proto) return false;
  return proto.puzzles.every((pz) => solvedIds.has(pz.id));
}

function highestCompletedProtocol(solvedIds: Set<string>): number {
  let h = -1;
  for (const p of ALL_PROTOCOLS) if (protocolCompleted(p.n, solvedIds)) h = Math.max(h, p.n);
  return h;
}

// ── التاريخ بتوقيت البحرين ─────────────────────────────────
export function bahrainDateStr(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bahrain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function yesterdayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

// ── النبض اليومي: توليد حتمي من التاريخ ───────────────────
interface PulseInstance {
  word: { ar: string; en: string; story: string };
  material: string;
  methodName: string;
  methodKey: string;
}

const PULSE_METHODS: { key: string; name: string; encode: (en: string) => string }[] = [
  { key: "caesar3", name: "انزياح ثلاثي", encode: (w) => caesar(w, 3) },
  { key: "atbash", name: "المرآة (أتباش)", encode: (w) => atbash(w) },
  { key: "reverse", name: "المرآة المكسورة (عكس)", encode: (w) => reverseText(w) },
  { key: "morse", name: "النقاط والشرطات", encode: (w) => toMorse(w) },
  { key: "a1z26", name: "أبجدية الأرقام", encode: (w) => toA1Z26(w) },
  { key: "rot13", name: "ثلاثة عشر", encode: (w) => rot13(w) },
];

export function pulseForDate(dateStr: string): PulseInstance {
  const h = createHash("sha256").update(`p9-pulse-${dateStr}`).digest();
  const idx = h.readUInt32BE(0) % PULSE_POOL.length;
  const method = PULSE_METHODS[h.readUInt32BE(4) % PULSE_METHODS.length];
  if (!method || !PULSE_POOL[idx]) {
    const fallback = PULSE_POOL[0];
    const fbMethod = PULSE_METHODS[0];
    return {
      word: fallback,
      material: fbMethod.encode(fallback.en),
      methodName: fbMethod.name,
      methodKey: fbMethod.key,
    };
  }
  const word = PULSE_POOL[idx];
  return {
    word,
    material: method.encode(word.en),
    methodName: method.name,
    methodKey: method.key,
  };
}

// ── بناء الحالة الكاملة ───────────────────────────────────
export async function buildGameState(agent: Agent): Promise<GameState> {
  const [solves, hintRows, journalRows, pulseRows, sortRows, pulseHistory] = await Promise.all([
    db.solve.findMany({ where: { agentId: agent.id } }),
    db.hintUnlock.findMany({ where: { agentId: agent.id } }),
    db.journal.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    db.dailyPulse.findMany({ where: { agentId: agent.id } }),
    db.sortAttempt.findMany({ where: { agentId: agent.id } }),
    db.dailyPulse.findMany({
      where: { agentId: agent.id },
      orderBy: { dateStr: "desc" },
      take: 7,
    }),
  ]);

  const solvedIds = new Set(solves.map((s) => s.puzzleId));
  const rank = rankFor(agent.points);
  const nr = nextRank(agent.points);
  const highestCompleted = highestCompletedProtocol(solvedIds);

  const protocols: ClientProtocol[] = ALL_PROTOCOLS.map((proto) => {
    const unlocked = protocolUnlocked(proto.n, solvedIds);
    const completed = protocolCompleted(proto.n, solvedIds);
    return {
      n: proto.n,
      key: proto.key,
      name: proto.name,
      guardianName: proto.guardianName,
      audio: proto.audio,
      unlocked,
      completed,
      transcript: proto.transcript,
      puzzles: proto.puzzles.map((pz): ClientPuzzle => {
        const solve = solves.find((s) => s.puzzleId === pz.id);
        const opened = hintRows
          .filter((h) => h.puzzleId === pz.id)
          .map((h) => h.level)
          .sort((a, b) => a - b);
        const hintsOpened = opened.length;
        return {
          id: pz.id,
          title: pz.title,
          question: pz.question,
          material: pz.material,
          materialKind: pz.materialKind,
          points: pz.points,
          solved: !!solve,
          wrongAttempts: solve?.attempts ?? 0,
          hintsOpened,
          hints: [0, 1, 2].map((i) => (i < hintsOpened ? pz.hints[i] ?? null : null)),
        };
      }),
      plateNote:
        agent.plateUnlocked
          ? PLATE_NOTES.find((n) => n.target === (proto.n === 0 ? "p0" : `p${proto.n}`))?.text ?? null
          : null,
    };
  });

  // ── الفريق ──
  let team: ClientTeam | null = null;
  if (agent.teamId) {
    const t = await db.team.findUnique({
      where: { id: agent.teamId },
      include: {
        members: {
          orderBy: { points: "desc" },
        },
        messages: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (t) {
      const memberSolves = await db.solve.groupBy({
        by: ["agentId"],
        where: { agentId: { in: t.members.map((m) => m.id) } },
        _count: { agentId: true },
      });
      const solveCountMap = new Map(memberSolves.map((g) => [g.agentId, g._count.agentId]));
      const activeMembers = t.members.filter((m) => !m.secededAt);
      team = {
        name: t.name,
        inviteCode: t.inviteCode,
        createdAt: t.createdAt.toISOString(),
        teamPoints: activeMembers.reduce((a, m) => a + m.points, 0),
        members: t.members.map((m) => ({
          codename: m.codename,
          memberNo: m.memberNo,
          points: m.points,
          rankName: rankFor(m.points).name,
          solvedCount: solveCountMap.get(m.id) ?? 0,
          seceded: !!m.secededAt,
          isMe: m.id === agent.id,
          lastSeenAt: m.lastSeenAt.toISOString(),
        })),
        messages: t.messages.map((msg) => ({
          id: msg.id,
          codename: msg.codename,
          text: msg.text,
          at: msg.createdAt.toISOString(),
          expiresAt: msg.expiresAt.toISOString(),
          system: msg.agentId === "",
        })),
        mySeceded: !!agent.secededAt,
        canSecede:
          !agent.secededAt && highestCompleted >= MECHANICS.secedeMinProtocol,
        secedeHint:
          agent.secededAt
            ? "اخترتَ مسار الوحيد. لا طريق للرجوع."
            : highestCompleted >= MECHANICS.secedeMinProtocol
              ? "الانفصال متاح الآن — مرة واحدة، ولا رجعة فيه."
              : `الانفصال يُتاح بعد إتمام البروتوكول ${MECHANICS.secedeMinProtocol}.`,
      };
    }
  }

  // ── النبض اليومي ──
  const today = bahrainDateStr();
  const todayPulse = pulseForDate(today);
  const todayRow = pulseRows.find((p) => p.dateStr === today);
  const streak =
    todayRow?.solved || agent.lastPulseDate === yesterdayOf(today)
      ? agent.pulseStreak
      : agent.lastPulseDate === today
        ? agent.pulseStreak
        : 0;
  const nextStreak = agent.lastPulseDate === yesterdayOf(today) ? agent.pulseStreak + 1 : 1;
  const pulse: ClientPulse = {
    date: today,
    story: todayPulse.word.story,
    material: todayPulse.material,
    methodName: todayPulse.methodName,
    solved: !!todayRow?.solved,
    locked: !!todayRow && !todayRow.solved,
    streak,
    potentialPoints:
      MECHANICS.pulseBase +
      Math.min(Math.max(nextStreak - 1, 0), MECHANICS.pulseStreakCap) * MECHANICS.pulseStreakBonus,
    history: pulseHistory
      .sort((a, b) => (a.dateStr < b.dateStr ? 1 : -1))
      .slice(0, 7)
      .map((p) => ({ date: p.dateStr, solved: p.solved })),
  };

  // ── غرفة الفرز ──
  const sortingUnlocked = highestCompleted >= MECHANICS.sortingMinProtocol;
  const sortStats = {
    correctFake: sortRows.filter((r) => r.verdict === "fake" && r.correct).length,
    correctReal: sortRows.filter((r) => r.verdict === "real" && r.correct).length,
    fooled: agent.fooledCount,
    wrongAccusations: agent.reportsWrong,
  };
  const sorting = {
    unlocked: sortingUnlocked,
    minProtocol: MECHANICS.sortingMinProtocol,
    docs: SORTING_DOCS.map((doc): ClientSortDoc => {
      const attempt = sortRows.find((r) => r.docId === doc.id);
      return {
        id: doc.id,
        code: doc.code,
        title: doc.title,
        body: doc.body,
        judged: !!attempt,
        myVerdict: attempt?.verdict ?? null,
        myFlawKind: attempt?.flawKind ?? null,
        correct: attempt ? attempt.verdict === (doc.isFake ? "fake" : "real") : null,
        pointsAwarded: attempt?.points ?? 0,
        truth: attempt ? doc.flawNote : null,
      };
    }),
    stats: sortStats,
  };

  // ── الملحقات الخارجية ──
  const externalUnlocked = highestCompleted >= MECHANICS.externalMinProtocol;
  const external = {
    unlocked: externalUnlocked,
    minProtocol: MECHANICS.externalMinProtocol,
    branches: EXTERNAL_BRANCHES.map((b): ClientExternalBranch => {
      const extSolves = solves.filter((s) => b.puzzles.some((p) => p.id === s.puzzleId));
      return {
        key: b.key,
        name: b.name,
        campus: b.campus,
        prize: b.prize,
        story: b.story,
        audio: b.audio,
        transcript: b.transcript,
        completed: b.puzzles.every((p) => solvedIds.has(p.id)),
        puzzles: b.puzzles.map((pz): ClientPuzzle => {
          const solve = solves.find((s) => s.puzzleId === pz.id);
          const opened = hintRows
            .filter((h) => h.puzzleId === pz.id)
            .map((h) => h.level)
            .sort((a, b2) => a - b2);
          return {
            id: pz.id,
            title: pz.title,
            question: pz.question,
            material: pz.material,
            materialKind: pz.materialKind,
            points: pz.points,
            solved: !!solve,
            wrongAttempts: solve?.attempts ?? 0,
            hintsOpened: opened.length,
            hints: [0, 1, 2].map((i) => (i < opened.length ? pz.hints[i] ?? null : null)),
          };
        }),
      };
    }),
  };

  const extSolved = solves.filter((s) => s.puzzleId.startsWith("ext-")).length;
  const extTotal = EXTERNAL_BRANCHES.reduce((a, b) => a + b.puzzles.length, 0);

  return {
    agent: {
      codename: agent.codename,
      memberNo: agent.memberNo,
      points: agent.points,
      rank: { name: rank.name, code: rank.code, sigil: rank.sigil, min: rank.min },
      nextRank: nr ? { name: nr.name, code: nr.code, min: nr.min } : null,
      wrongAttempts: agent.wrongAttempts,
      hintsUsed: agent.hintsUsed,
      finishedAt: agent.finishedAt?.toISOString() ?? null,
      finaleRank: agent.finaleRank,
      finaleAnswer: agent.finaleAnswer,
      createdAt: agent.createdAt.toISOString(),
      plateUnlocked: agent.plateUnlocked,
      pulseStreak: agent.pulseStreak,
    },
    protocols,
    dossier: ALL_PROTOCOLS.map((proto) => ({
      n: proto.n,
      title: proto.dossier.title,
      body: proto.dossier.body,
      unlocked: protocolCompleted(proto.n, solvedIds),
      phrase: protocolCompleted(proto.n, solvedIds) ? VERIFICATION_PHRASES[proto.n] ?? null : null,
    })),
    shards: ALL_PROTOCOLS.map((proto) => ({
      n: proto.n,
      label: proto.shard.label,
      word: protocolCompleted(proto.n, solvedIds) ? proto.shard.word : null,
    })),
    vaultSlots: VAULT_SLOTS_FULL.map((s) => ({ riddle: s.riddle })),
    vaultUnlocked: highestCompleted >= 8,
    journal: journalRows.map((j) => ({
      kind: j.kind,
      text: j.text,
      at: j.createdAt.toISOString(),
    })),
    stats: {
      solvedCount: solvedIds.size - extSolved,
      totalPuzzles: ALL_PROTOCOLS.reduce((a, p) => a + p.puzzles.length, 0),
      externalSolved: extSolved,
      externalTotal: extTotal,
    },
    team,
    canJoinTeam: !agent.teamId && !agent.secededAt,
    pulse,
    sorting,
    plate: {
      unlocked: agent.plateUnlocked,
      cost: MECHANICS.plateCost,
      eligible:
        !agent.plateUnlocked &&
        highestCompleted >= MECHANICS.plateMinProtocol &&
        agent.points >= MECHANICS.plateCost,
      minProtocol: MECHANICS.plateMinProtocol,
    },
    external,
  };
}

// ── التحقق من إجابة (بروتوكولات + ملحقات) ─────────────────
export interface SubmitResult {
  correct: boolean;
  alreadySolved?: boolean;
  pointsAwarded: number;
  pointsPenalty?: number;
  totalPoints: number;
  protocolCompleted?: boolean;
  externalCompleted?: { name: string; prize: string } | null;
  shard?: { word: string; label: string } | null;
  dossierUnlocked?: { title: string; body: string } | null;
  phrase?: string | null;
  rankUp?: { name: string; code: string; sigil: string } | null;
  finished?: boolean;
  finaleRank?: number | null;
  message: string;
}

function findExternalPuzzle(puzzleId: string): { puzzle: PuzzleDef; branchKey: string } | undefined {
  for (const b of EXTERNAL_BRANCHES) {
    const puzzle = b.puzzles.find((p) => p.id === puzzleId);
    if (puzzle) return { puzzle, branchKey: b.key };
  }
  return undefined;
}

function validateAnswer(
  puzzle: PuzzleDef,
  answer: string,
  agent: Agent,
  vaultAnswers?: string[]
): boolean {
  if (puzzle.id === "p9-a") {
    if (!vaultAnswers || vaultAnswers.length !== VAULT_SLOTS_FULL.length) return false;
    return VAULT_SLOTS_FULL.every((slot, i) =>
      answersMatch(vaultAnswers[i] ?? "", [slot.answer])
    );
  }
  if (puzzle.id === "p9-b") {
    return normalizeAnswer(answer) === normalizeAnswer(agent.codename);
  }
  return answersMatch(answer, puzzle.answers);
}

export async function submitAnswer(
  agent: Agent,
  puzzleId: string,
  answer: string,
  vaultAnswers?: string[]
): Promise<SubmitResult | { error: string }> {
  const solves = await db.solve.findMany({ where: { agentId: agent.id } });
  const solvedIds = new Set(solves.map((s) => s.puzzleId));

  // ── ملحقات خارجية ──
  const ext = findExternalPuzzle(puzzleId);
  if (ext) {
    const branch = EXTERNAL_BRANCHES.find((b) => b.key === ext.branchKey);
    if (!branch) return { error: "الملحق غير موجود." };
    if (solvedIds.has(puzzleId)) {
      return {
        correct: true,
        alreadySolved: true,
        pointsAwarded: 0,
        totalPoints: agent.points,
        message: "هذا اللغز محلول من قبل.",
      };
    }
    if (highestCompletedProtocol(solvedIds) < MECHANICS.externalMinProtocol) {
      return { error: "الملاحق الخارجية تُفتح بعد إتمام البروتوكول الثالث." };
    }
    return applySolve(agent, ext.puzzle, solvedIds, answer, {
      kind: "ext",
      label: `${branch.name} — ${ext.puzzle.title}`,
      branch,
    });
  }

  // ── بروتوكولات الأصل والتسعة ──
  const found = allPuzzleById(puzzleId);
  if (!found) return { error: "لغز غير موجود." };
  const { protocol, puzzle } = found;

  if (solvedIds.has(puzzleId)) {
    return {
      correct: true,
      alreadySolved: true,
      pointsAwarded: 0,
      totalPoints: agent.points,
      message: "هذا اللغز محلول من قبل.",
    };
  }

  if (!protocolUnlocked(protocol.n, solvedIds)) {
    return { error: "هذا البروتوكول مغلق. أكمل ما قبله أولاً." };
  }

  return applySolve(agent, puzzle, solvedIds, answer, {
    kind: "protocol",
    label: `${puzzle.title}`,
    protocol,
    vaultAnswers,
  });
}

// ── المسار المشترك للحل ────────────────────────────────────
async function applySolve(
  agent: Agent,
  puzzle: PuzzleDef,
  solvedIds: Set<string>,
  answer: string,
  ctx: {
    kind: "protocol" | "ext";
    label: string;
    protocol?: (typeof ALL_PROTOCOLS)[number];
    branch?: (typeof EXTERNAL_BRANCHES)[number];
    vaultAnswers?: string[];
  },
): Promise<SubmitResult | { error: string }> {
  const correct = validateAnswer(puzzle, answer, agent, ctx.vaultAnswers);
  if (!correct) {
    const penalty = SCORING.wrongAttemptPenalty;
    const newPoints = Math.max(0, agent.points - penalty);
    await db.agent.update({
      where: { id: agent.id },
      data: { points: newPoints, wrongAttempts: { increment: 1 } },
    });
    await journal(
      agent.id,
      "breach",
      `محاولة اختراق فاشلة على «${ctx.label}» [${puzzle.id}] — خُصمت ${penalty} نقاط.`
    );
    return {
      correct: false,
      pointsAwarded: 0,
      pointsPenalty: penalty,
      totalPoints: newPoints,
      message: "الإجابة مرفوضة. السجل يعمل... والنقاط تنزف.",
    };
  }

  const attempts = await countWrongAttempts(agent.id, puzzle.id);
  const hintLevel = await maxHintLevel(agent.id, puzzle.id);

  await db.solve.create({
    data: { agentId: agent.id, puzzleId: puzzle.id, points: puzzle.points, attempts, hintLevel },
  });

  let totalPoints = agent.points + puzzle.points;
  await journal(agent.id, "clear", `سقط الحارس: حُلّ لغز «${ctx.label}» (+${puzzle.points} نقطة).`);

  solvedIds.add(puzzle.id);
  const result: SubmitResult = {
    correct: true,
    pointsAwarded: puzzle.points,
    totalPoints,
    message: `إجابة صحيحة. +${puzzle.points} نقطة.`,
  };

  // اكتمال البروتوكول؟
  if (ctx.kind === "protocol" && ctx.protocol) {
    const nowCompleted = protocolCompleted(ctx.protocol.n, solvedIds);
    if (nowCompleted) {
      result.protocolCompleted = true;
      result.shard = { word: ctx.protocol.shard.word, label: ctx.protocol.shard.label };
      result.dossierUnlocked = {
        title: ctx.protocol.dossier.title,
        body: ctx.protocol.dossier.body,
      };
      result.phrase = VERIFICATION_PHRASES[ctx.protocol.n] ?? null;
      await journal(
        agent.id,
        "shard",
        `اكتمل البروتوكول ${ctx.protocol.n} «${ctx.protocol.name}» — حصلت على الشظية: ${ctx.protocol.shard.word}.`
      );
      await journal(agent.id, "story", `وثيقة مُحرَّرة من الأرشيف: «${ctx.protocol.dossier.title}».`);
    }

    // الإتمام الكلي؟
    const allDone = ALL_PROTOCOLS.every((p) =>
      p.puzzles.every((pz) => solvedIds.has(pz.id))
    );
    if (allDone && !agent.finishedAt) {
      const finishedCount = await db.agent.count({ where: { finishedAt: { not: null } } });
      const finaleRank = finishedCount + 1;
      totalPoints += SCORING.finishBonus;
      await db.agent.update({
        where: { id: agent.id },
        data: { points: totalPoints, finishedAt: new Date(), finaleRank },
      });
      await journal(
        agent.id,
        "finish",
        `اكتمل البروتوكول التاسع. أنت التاسع رقم ${finaleRank}. مُنحت ${SCORING.finishBonus} نقطة الإتمام.`
      );
      result.finished = true;
      result.finaleRank = finaleRank;
      result.pointsAwarded += SCORING.finishBonus;
    }
  }

  // اكتمال ملحق خارجي؟
  if (ctx.kind === "ext" && ctx.branch) {
    const branchDone = ctx.branch.puzzles.every((p) => solvedIds.has(p.id));
    if (branchDone) {
      result.externalCompleted = { name: ctx.branch.name, prize: ctx.branch.prize };
      await journal(
        agent.id,
        "ext",
        `اكتمل ملحق «${ctx.branch.name}» — ${ctx.branch.prize}.`
      );
    }
  }

  // ترقية الرتبة؟
  const oldRank = rankFor(agent.points);
  const newRank = rankFor(totalPoints);
  if (newRank.min > oldRank.min) {
    await journal(agent.id, "rank", `ترقية: أصبحتَ «${newRank.name}» (${newRank.code}).`);
    result.rankUp = { name: newRank.name, code: newRank.code, sigil: newRank.sigil };
  }

  if (!result.finished) {
    await db.agent.update({ where: { id: agent.id }, data: { points: totalPoints } });
  }
  result.totalPoints = totalPoints;

  return result;
}

// ── التلميحات ─────────────────────────────────────────────
export async function buyHint(
  agent: Agent,
  puzzleId: string,
  level: number
): Promise<{ hint: string; cost: number; totalPoints: number } | { error: string }> {
  if (level < 1 || level > 3) return { error: "مستوى تلميح غير صالح." };

  const solvedIds = new Set(
    (await db.solve.findMany({ where: { agentId: agent.id } })).map((s) => s.puzzleId)
  );

  let puzzle: PuzzleDef | undefined;
  let protoN: number | null = null;
  const inProtocol = allPuzzleById(puzzleId);
  if (inProtocol) {
    puzzle = inProtocol.puzzle;
    protoN = inProtocol.protocol.n;
  } else {
    const ext = findExternalPuzzle(puzzleId);
    if (ext) puzzle = ext.puzzle;
  }
  if (!puzzle) return { error: "لغز غير موجود." };
  if (solvedIds.has(puzzleId)) return { error: "اللغز محلول — لا حاجة للتلميح." };
  if (protoN !== null && !protocolUnlocked(protoN, solvedIds)) {
    return { error: "البروتوكول مغلق." };
  }
  if (protoN === null && highestCompletedProtocol(solvedIds) < MECHANICS.externalMinProtocol) {
    return { error: "الملاحق الخارجية مغلقة." };
  }

  const existing = await db.hintUnlock.findMany({ where: { agentId: agent.id, puzzleId } });
  const openedLevels = new Set(existing.map((h) => h.level));
  if (openedLevels.has(level)) return { error: "هذا التلميح مفتوح بالفعل." };
  if (level > 1 && !openedLevels.has(level - 1)) {
    return { error: "افتح التلميح الأدنى أولاً." };
  }

  const cost = SCORING.hintCosts[level - 1] ?? 30;
  const newPoints = Math.max(0, agent.points - cost);

  await db.hintUnlock.create({ data: { agentId: agent.id, puzzleId, level } });
  await db.agent.update({
    where: { id: agent.id },
    data: { points: newPoints, hintsUsed: { increment: 1 } },
  });
  await journal(agent.id, "hint", `وصلت معلومة من مصدر مجهول حول «${puzzle.title}» (−${cost} نقاط).`);

  return { hint: puzzle.hints[level - 1] ?? "", cost, totalPoints: newPoints };
}

// ── النبض اليومي ──────────────────────────────────────────
export async function submitPulse(
  agent: Agent,
  answer: string
): Promise<
  | { correct: boolean; solved: boolean; locked: boolean; pointsAwarded: number; streak: number; message: string }
  | { error: string }
> {
  const today = bahrainDateStr();
  const pulse = pulseForDate(today);
  const row = await db.dailyPulse.findUnique({
    where: { agentId_dateStr: { agentId: agent.id, dateStr: today } },
  });

  if (row?.solved) {
    return {
      correct: true,
      solved: true,
      locked: false,
      pointsAwarded: 0,
      streak: agent.pulseStreak,
      message: "نبضة اليوم محسومة. عد غداً.",
    };
  }
  if (row && !row.solved) {
    return {
      correct: false,
      solved: false,
      locked: true,
      pointsAwarded: 0,
      streak: agent.pulseStreak,
      message: "أخطأتَ اليوم. النبضة مقفلة حتى الغد.",
    };
  }

  const ok =
    answersMatch(answer, [pulse.word.ar]) ||
    answer.trim().toUpperCase() === pulse.word.en;

  if (!ok) {
    await db.dailyPulse.create({
      data: { agentId: agent.id, dateStr: today, solved: false, attempts: 1, points: 0 },
    });
    await journal(agent.id, "pulse", `نبضة ${today}: إشارة أُسيئ قراءتها. الغد نافذة جديدة.`);
    return {
      correct: false,
      solved: false,
      locked: true,
      pointsAwarded: 0,
      streak: agent.pulseStreak,
      message: "الإشارة أُسيئت قراءتها. النبضة مقفلة حتى الغد.",
    };
  }

  const newStreak = agent.lastPulseDate === yesterdayOf(today) ? agent.pulseStreak + 1 : 1;
  const bonus =
    Math.min(Math.max(newStreak - 1, 0), MECHANICS.pulseStreakCap) * MECHANICS.pulseStreakBonus;
  const points = MECHANICS.pulseBase + bonus;

  await db.dailyPulse.create({
    data: { agentId: agent.id, dateStr: today, solved: true, attempts: 1, points },
  });
  await db.agent.update({
    where: { id: agent.id },
    data: {
      points: { increment: points },
      pulseStreak: newStreak,
      lastPulseDate: today,
    },
  });
  await journal(
    agent.id,
    "pulse",
    `نبضة ${today}: فُكَّت الإشارة «${pulse.word.ar}» (+${points} نقطة${bonus > 0 ? ` — منها ${bonus} مكافأة سلسلة` : ""}).`
  );

  return {
    correct: true,
    solved: true,
    locked: false,
    pointsAwarded: points,
    streak: newStreak,
    message: `النبضة فُكَّت (+${points} نقطة).`,
  };
}

// ── غرفة الفرز ────────────────────────────────────────────
export async function sortVerdict(
  agent: Agent,
  docId: string,
  verdict: "real" | "fake",
  flawKind?: string
): Promise<
  | { correct: boolean; fooled: boolean; pointsAwarded: number; pointsPenalty: number; truth: string; message: string }
  | { error: string }
> {
  const solvedIds = new Set(
    (await db.solve.findMany({ where: { agentId: agent.id } })).map((s) => s.puzzleId)
  );
  if (highestCompletedProtocol(solvedIds) < MECHANICS.sortingMinProtocol) {
    return { error: "غرفة الفرز تُفتح بعد إتمام البروتوكول الثالث." };
  }

  const doc = SORTING_DOCS.find((d) => d.id === docId);
  if (!doc) return { error: "وثيقة غير موجودة." };

  const existing = await db.sortAttempt.findUnique({
    where: { agentId_docId: { agentId: agent.id, docId } },
  });
  if (existing) return { error: "حكمك على هذه الوثيقة مسجَّل. لا رجعة فيه." };

  let points = 0;
  let fooled = false;
  let penalty = 0;

  if (doc.isFake) {
    if (verdict === "fake") {
      points = flawKind === doc.flawKind ? MECHANICS.sortRewardFull : MECHANICS.sortRewardPartial;
    } else {
      fooled = true;
    }
  } else {
    if (verdict === "real") {
      points = MECHANICS.sortRewardReal;
    } else {
      // اتهام خاطئ لوثيقة حقيقية — عقوبة من الثالث
      const newWrong = agent.reportsWrong + 1;
      if (newWrong > MECHANICS.sortWrongAccuseFree) penalty = MECHANICS.sortWrongPenalty;
    }
  }

  const net = points - penalty;
  await db.sortAttempt.create({
    data: {
      agentId: agent.id,
      docId,
      verdict,
      flawKind: verdict === "fake" ? flawKind ?? null : null,
      correct: verdict === (doc.isFake ? "fake" : "real"),
      points: net,
    },
  });
  await db.agent.update({
    where: { id: agent.id },
    data: {
      points: Math.max(0, agent.points + net),
      reportsCorrect: verdict === (doc.isFake ? "fake" : "real") ? { increment: 1 } : undefined,
      reportsWrong: verdict === "fake" && !doc.isFake ? { increment: 1 } : undefined,
      fooledCount: fooled ? { increment: 1 } : undefined,
    },
  });
  await journal(
    agent.id,
    "sort",
    `غرفة الفرز: حكمت على «${doc.code}» بأنها ${verdict === "fake" ? "مزيفة" : "حقيقية"} — ${net >= 0 ? `+${net}` : net} نقاط.`
  );

  return {
    correct: verdict === (doc.isFake ? "fake" : "real"),
    fooled,
    pointsAwarded: points,
    pointsPenalty: penalty,
    truth: doc.flawNote,
    message: doc.isFake
      ? verdict === "fake"
        ? flawKind === doc.flawKind
          ? "فرز مثالي: الوثيقة مزيفة... وأصبتَ العلة بالضبط."
          : "صحيح أنها مزيفة... لكن العلة أفلتت منك."
        : "خدعك الورثة. كانت مزيفة."
      : verdict === "real"
        ? "ثقتك في محلها. الوثيقة حقيقية."
        : "اتهمت وثيقة حقيقية. الورثة يضحكون.",
  };
}

// ── الصفيحة الشفافة ───────────────────────────────────────
export async function buyPlate(
  agent: Agent
): Promise<{ ok: boolean; notes: { target: string; text: string }[] } | { error: string }> {
  if (agent.plateUnlocked) return { error: "الصفيحة بين يديك أصلاً." };
  const solvedIds = new Set(
    (await db.solve.findMany({ where: { agentId: agent.id } })).map((s) => s.puzzleId)
  );
  if (highestCompletedProtocol(solvedIds) < MECHANICS.plateMinProtocol) {
    return { error: `الصفيحة تُعرض بعد إتمام البروتوكول ${MECHANICS.plateMinProtocol}.` };
  }
  if (agent.points < MECHANICS.plateCost) {
    return { error: `تحتاج ${MECHANICS.plateCost} نقطة. لديك ${agent.points} فقط.` };
  }
  const newPoints = agent.points - MECHANICS.plateCost;
  await db.agent.update({
    where: { id: agent.id },
    data: { points: newPoints, plateUnlocked: true },
  });
  await journal(agent.id, "plate", `اقتنيتَ الصفيحة الشفافة (−${MECHANICS.plateCost} نقطة). ما بين السطور يُقرأ الآن.`);
  return { ok: true, notes: PLATE_NOTES };
}

// ── الفرق ─────────────────────────────────────────────────
function genInviteCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createTeam(
  agent: Agent,
  name: string
): Promise<{ ok: true; team: { name: string; inviteCode: string } } | { error: string }> {
  if (agent.teamId || agent.secededAt) return { error: "قرار الفريق حُسم في ملفك." };
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 24);
  if (clean.length < 3) return { error: "اسم الحلف: ٣ أحرف على الأقل." };
  if (!/^[\p{L}\p{N}_. -]+$/u.test(clean)) return { error: "اسم الحلف يحتوي رموزاً غير مقبولة." };
  const exists = await db.team.findUnique({ where: { name: clean } });
  if (exists) return { error: "هذا الاسم محجوز لحلف آخر." };

  let inviteCode = genInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db.team.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = genInviteCode();
  }

  const team = await db.team.create({ data: { name: clean, inviteCode } });
  await db.agent.update({
    where: { id: agent.id },
    data: { teamId: team.id, joinedTeamAt: new Date() },
  });
  await db.teamMessage.create({
    data: {
      teamId: team.id,
      agentId: "",
      codename: "الوسيط",
      text: "قُد الحلف باسمه. الثقة تُبنى هنا... وتُختبر خارج هنا.",
      expiresAt: new Date(Date.now() + MECHANICS.messageTTLhours * 3600 * 1000),
    },
  });
  await journal(agent.id, "team", `شكّلتَ الحلف «${clean}» — رمز الدعوة ${inviteCode}.`);
  return { ok: true, team: { name: clean, inviteCode } };
}

export async function joinTeam(
  agent: Agent,
  code: string
): Promise<{ ok: true } | { error: string }> {
  if (agent.teamId || agent.secededAt) return { error: "قرار الفريق حُسم في ملفك." };
  const team = await db.team.findUnique({
    where: { inviteCode: code.trim() },
    include: { members: true },
  });
  if (!team) return { error: "لا حلف يحمل هذا الرمز." };
  const active = team.members.filter((m) => !m.secededAt).length;
  if (active >= MECHANICS.teamMaxMembers) {
    return { error: "الحلف اكتمل (١٠ من عشرة). الثقة أيضاً لها سقف." };
  }
  await db.agent.update({
    where: { id: agent.id },
    data: { teamId: team.id, joinedTeamAt: new Date() },
  });
  await db.teamMessage.create({
    data: {
      teamId: team.id,
      agentId: "",
      codename: "الوسيط",
      text: `انضم ${agent.codename} إلى الحلف. المعرّف ${agent.memberNo}.`,
      expiresAt: new Date(Date.now() + MECHANICS.messageTTLhours * 3600 * 1000),
    },
  });
  await journal(agent.id, "team", `انضممتَ إلى الحلف «${team.name}».`);
  return { ok: true };
}

export async function secedeFromTeam(agent: Agent): Promise<{ ok: true } | { error: string }> {
  if (!agent.teamId) return { error: "لست في حلف." };
  if (agent.secededAt) return { error: "انفصلتَ بالفعل. الكلمة واحدة." };
  const solvedIds = new Set(
    (await db.solve.findMany({ where: { agentId: agent.id } })).map((s) => s.puzzleId)
  );
  if (highestCompletedProtocol(solvedIds) < MECHANICS.secedeMinProtocol) {
    return { error: `الانفصال يُتاح بعد إتمام البروتوكول ${MECHANICS.secedeMinProtocol}.` };
  }
  await db.agent.update({ where: { id: agent.id }, data: { secededAt: new Date() } });
  await db.teamMessage.create({
    data: {
      teamId: agent.teamId,
      agentId: "",
      codename: "الوسيط",
      text: "أحد الأعضاء اختار مسار الوحيد. لا تسألوا من. استمروا.",
      expiresAt: new Date(Date.now() + MECHANICS.messageTTLhours * 3600 * 1000),
    },
  });
  await journal(agent.id, "secede", "اخترتَ مسار الوحيد. لا أحد يعلم... إلا الوسيط.");
  return { ok: true };
}

export async function postTeamMessage(
  agent: Agent,
  text: string
): Promise<{ ok: true } | { error: string }> {
  if (!agent.teamId) return { error: "لا قناة بلا حلف." };
  if (agent.secededAt) return { error: "المنفصل لا يهمس في القناة." };
  const clean = text.trim().slice(0, MECHANICS.messageMaxLen);
  if (!clean) return { error: "رسالة فارغة." };
  await db.teamMessage.create({
    data: {
      teamId: agent.teamId,
      agentId: agent.id,
      codename: agent.codename,
      text: clean,
      expiresAt: new Date(Date.now() + MECHANICS.messageTTLhours * 3600 * 1000),
    },
  });
  return { ok: true };
}

// ── بث الوسيط: تدفق الأحداث الحية ─────────────────────────
export async function getFeed(): Promise<{ at: string; kind: string; text: string }[]> {
  const [recentSolves, recentFinishes, recentJoins, recentTeams] = await Promise.all([
    db.solve.findMany({
      orderBy: { solvedAt: "desc" },
      take: 18,
      include: { agent: { select: { codename: true } } },
    }),
    db.agent.findMany({
      where: { finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: 3,
      select: { codename: true, finishedAt: true, finaleRank: true },
    }),
    db.journal.findMany({
      where: { kind: "join" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { text: true, createdAt: true },
    }),
    db.journal.findMany({
      where: { kind: "team" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { text: true, createdAt: true },
    }),
  ]);

  const events: { at: string; kind: string; text: string }[] = [];

  for (const s of recentSolves) {
    const found = allPuzzleById(s.puzzleId);
    const ext = findExternalPuzzle(s.puzzleId);
    const title = found?.puzzle.title ?? ext?.puzzle.title ?? s.puzzleId;
    const protoName =
      found?.protocol.name ?? EXTERNAL_BRANCHES.find((b) => b.puzzles.some((p) => p.id === s.puzzleId))?.name ?? "";
    events.push({
      at: s.solvedAt.toISOString(),
      kind: "clear",
      text: `«${s.agent.codename}» أسقط حارس ${protoName ? `«${protoName}»` : ""} — ${title}.`,
    });
  }
  for (const f of recentFinishes) {
    events.push({
      at: (f.finishedAt ?? new Date()).toISOString(),
      kind: "finish",
      text: `«${f.codename}» عبر العتبة الأخيرة — التاسع رقم ${f.finaleRank ?? "؟"}.`,
    });
  }
  for (const j of recentJoins) {
    events.push({ at: j.createdAt.toISOString(), kind: "join", text: j.text });
  }
  for (const t of recentTeams) {
    events.push({ at: t.createdAt.toISOString(), kind: "team", text: t.text });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  return events.slice(0, 26);
}

// ── أدوات عد ──────────────────────────────────────────────
async function countWrongAttempts(agentId: string, puzzleId: string): Promise<number> {
  const entries = await db.journal.findMany({
    where: { agentId, kind: "breach", text: { contains: puzzleId } },
  });
  return entries.length;
}

async function maxHintLevel(agentId: string, puzzleId: string): Promise<number> {
  const rows = await db.hintUnlock.findMany({ where: { agentId, puzzleId } });
  return rows.reduce((m, r) => Math.max(m, r.level), 0);
}

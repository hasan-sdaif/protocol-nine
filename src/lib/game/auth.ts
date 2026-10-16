// ═══════════════════════════════════════════════════════════
// بروتوكول التاسع — المصادقة والجلسات الدائمة
// الجلسة صالحة ١٠ سنوات: لا يُطرد الوكيل أبداً بتحديث الصفحة
// التوكن يُحمل في كوكي httpOnly + نسخة احتياطية في localStorage
// ═══════════════════════════════════════════════════════════
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Agent, Session } from "@prisma/client";

export const COOKIE_NAME = "p9_token";
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

// ── كلمات المرور (scrypt) ─────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ── الجلسات ───────────────────────────────────────────────
export function newToken(): string {
  return createHash("sha256").update(randomBytes(48)).digest("hex");
}

export async function createSession(agentId: string): Promise<Session> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + TEN_YEARS_MS);
  return db.session.create({ data: { token, agentId, expiresAt } });
}

export async function getSessionAgent(req?: NextRequest): Promise<Agent | null> {
  let token: string | undefined;

  // ١) من الهيدر (نسخة localStorage الاحتياطية)
  if (req) {
    const header = req.headers.get("x-p9-token");
    if (header) token = header;
  }

  // ٢) من الكوكي الدائم
  if (!token) {
    const jar = await cookies();
    token = jar.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { agent: true },
  });

  if (!session) return null;

  // لا نطرده أبداً — لكن لو مضت أكثر من ١٠ سنوات نتجاوز الحد المنطقي
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // تحديث آخر ظهور (بلا انتظار)
  db.agent
    .update({ where: { id: session.agentId }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);
  db.session
    .update({ where: { id: session.id }, data: { lastSeen: new Date() } })
    .catch(() => undefined);

  return session.agent;
}

export function normalizeCodename(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 24);
}

export function validCodename(name: string): boolean {
  const n = normalizeCodename(name);
  return n.length >= 3 && n.length <= 24 && /^[\p{L}\p{N}_. -]+$/u.test(n);
}

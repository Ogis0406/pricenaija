import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import { authTokens, type User, userSessions, users } from "../drizzle/schema";
import { getDb } from "./db";
import { sendAccountEmail } from "./email";

const scrypt = promisify(scryptCallback);
export const APP_SESSION_COOKIE = "pn_session";
const SESSION_DAYS = 30;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; start: number }>();

export function enforceRateLimit(req: Request, bucket: string, limit = 8) {
  if (attempts.size > 5000) {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, value] of attempts) if (value.start < cutoff) attempts.delete(key);
  }
  const key = `${bucket}:${req.ip || req.socket.remoteAddress || "unknown"}`;
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now - current.start > WINDOW_MS) {
    attempts.set(key, { count: 1, start: now });
    return;
  }
  if (current.count >= limit) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait a little and try again." });
  current.count += 1;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  if (!encoded) return false;
  const [algorithm, saltHex, hashHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sessionCookieOptions(req: Request) {
  let localHttp = false;
  try {
    const origin = req.get("origin");
    if (origin) {
      const parsed = new URL(origin);
      localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    }
  } catch { /* Invalid or absent Origin remains on the secure Preview/public path. */ }
  return localHttp
    ? { httpOnly: true, secure: false, sameSite: "lax" as const, path: "/" }
    : { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" };
}

export async function setSessionCookie(req: Request, res: Response, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Account service is temporarily unavailable.");
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(userSessions).values({ userId, tokenHash: sha256(raw), expiresAt });
  // HTTPS Preview is cross-site; only a literal loopback HTTP Origin gets local-only cookie flags.
  res.cookie(APP_SESSION_COOKIE, raw, { ...sessionCookieOptions(req), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
}

export async function clearSession(req: Request, res: Response) {
  const raw = parseSessionCookie(req.headers.cookie);
  const db = await getDb();
  if (raw && db) await db.delete(userSessions).where(eq(userSessions.tokenHash, sha256(raw)));
  res.clearCookie(APP_SESSION_COOKIE, sessionCookieOptions(req));
}

function parseSessionCookie(header?: string) {
  const pair = header?.split(";").map(part => part.trim()).find(part => part.startsWith(`${APP_SESSION_COOKIE}=`));
  if (!pair) return null;
  try { return decodeURIComponent(pair.slice(APP_SESSION_COOKIE.length + 1)); } catch { return null; }
}

export async function resolveSessionUser(req: Request): Promise<User | null> {
  const raw = parseSessionCookie(req.headers.cookie);
  if (!raw) return null;
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ user: users }).from(userSessions).innerJoin(users, eq(userSessions.userId, users.id)).where(and(eq(userSessions.tokenHash, sha256(raw)), gt(userSessions.expiresAt, new Date()))).limit(1);
  return rows[0]?.user ?? null;
}

export async function createAuthToken(userId: number, purpose: "verify_email" | "reset_password") {
  const db = await getDb();
  if (!db) throw new Error("Account service is temporarily unavailable.");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (purpose === "verify_email" ? 24 : 1) * 60 * 60 * 1000);
  await db.insert(authTokens).values({ userId, purpose, tokenHash: sha256(token), expiresAt });
  return token;
}

export async function deliverAuthLink(email: string, purpose: "verify_email" | "reset_password", token: string) {
  const path = purpose === "verify_email" ? `/verify-email?token=${encodeURIComponent(token)}` : `/forgot-password?token=${encodeURIComponent(token)}`;
  const subject = purpose === "verify_email" ? "Verify your PriceNaija email" : "Reset your PriceNaija password";
  const action = purpose === "verify_email" ? "Verify email" : "Reset password";
  const result = await sendAccountEmail({ to: email, subject, action, path, purpose });
  if (!result.sent && process.env.NODE_ENV === "development") return { delivered: false, developmentPath: path };
  if (!result.sent) throw new Error("Email delivery is not configured. Please try again later.");
  return { delivered: true };
}

export async function consumeAuthToken(token: string, purpose: "verify_email" | "reset_password") {
  const db = await getDb();
  if (!db) throw new Error("Account service is temporarily unavailable.");
  const tokenHash = sha256(token);
  const rows = await db.select().from(authTokens).where(and(eq(authTokens.tokenHash, tokenHash), eq(authTokens.purpose, purpose), isNull(authTokens.consumedAt), gt(authTokens.expiresAt, new Date()))).limit(1);
  const record = rows[0];
  if (!record) return null;
  const updated = await db.update(authTokens).set({ consumedAt: new Date() }).where(and(eq(authTokens.id, record.id), isNull(authTokens.consumedAt), gt(authTokens.expiresAt, new Date())));
  const affected = Number((updated as any)[0]?.affectedRows ?? 0);
  return affected === 1 ? record.userId : null;
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const normalized = email.trim().toLowerCase();
  const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  return rows[0] ?? null;
}

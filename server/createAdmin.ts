import { eq } from "drizzle-orm";
import { adminUsers, users } from "../drizzle/schema";
import { closeDb, getDb } from "./db";
import { hashPassword, verifyPassword } from "./accountAuth";

const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD;

async function provisionInitialAdmin() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("[Admin setup] Set a valid INITIAL_ADMIN_EMAIL through protected backend configuration.");
  }
  if (!password || password.length < 10 || password.length > 128) {
    throw new Error("[Admin setup] Set INITIAL_ADMIN_PASSWORD (10–128 characters) through protected backend configuration.");
  }

  const db = await getDb();
  if (!db) throw new Error("[Admin setup] The database is unavailable; no admin account was changed.");

  const existingRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const existing = existingRows[0];
  if (existing?.accountRole === "admin" && existing.role === "admin") {
    const membership = await db.select({ userId: adminUsers.userId }).from(adminUsers).where(eq(adminUsers.userId, existing.id)).limit(1);
    if (membership[0]) {
      console.info("[Admin setup] Initial administrator is already provisioned; no account data was changed.");
      return;
    }
  }

  if (existing && (!existing.emailVerifiedAt || !existing.passwordHash)) {
    throw new Error("[Admin setup] Existing account must have a verified email/password login before it can be promoted. No account data was changed.");
  }
  if (existing && !await verifyPassword(password, existing.passwordHash)) {
    throw new Error("[Admin setup] The supplied password did not authenticate the existing account. No account data was changed.");
  }
  if (!existing && password.length < 14) {
    throw new Error("[Admin setup] A new administrator password must be 14–128 characters.");
  }

  await db.transaction(async tx => {
    const latestRows = await tx.select().from(users).where(eq(users.email, email)).limit(1);
    let userId: number;
    if (latestRows[0]) {
      const latest = latestRows[0];
      if (!latest.emailVerifiedAt || !latest.passwordHash || !await verifyPassword(password, latest.passwordHash)) {
        throw new Error("[Admin setup] Existing account credentials changed during setup; no admin role was granted.");
      }
      userId = latest.id;
      await tx.update(users).set({ accountRole: "admin", role: "admin" }).where(eq(users.id, userId));
    } else {
      if (existing) throw new Error("[Admin setup] Existing account changed during setup; rerun after review.");
      const passwordHash = await hashPassword(password);
      const inserted = await tx.insert(users).values({
        name: "PriceNaija Administrator",
        email,
        loginMethod: "email_password",
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "admin",
        accountRole: "admin",
        openId: null,
      });
      userId = Number((inserted as any)[0]?.insertId);
      if (!userId) throw new Error("[Admin setup] The database did not return the new account ID.");
    }

    await tx.insert(adminUsers).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  });
  console.info("[Admin setup] Initial administrator provisioned. Sign in using the configured email/password; no credential was printed.");
}

provisionInitialAdmin()
  .catch(error => {
    const safeMessage = error instanceof Error && error.message.startsWith("[Admin setup]")
      ? error.message
      : "[Admin setup] Failed; check backend database availability and migration status.";
    console.error(safeMessage);
    process.exitCode = 1;
  })
  .finally(() => closeDb().catch(() => {
    console.error("[Admin setup] Database pool shutdown failed.");
    process.exitCode = 1;
  }));

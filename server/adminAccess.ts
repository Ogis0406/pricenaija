import { and, eq } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { adminUsers, users } from "../drizzle/schema";
import { getDb } from "./db";

export type DatabaseAdminStatus = "allowed" | "unauthenticated" | "forbidden" | "unavailable";

export async function checkDatabaseAdmin(user: User | null | undefined): Promise<DatabaseAdminStatus> {
  if (!user) return "unauthenticated";
  const db = await getDb();
  if (!db) return "unavailable";
  const membership = await db.select({ userId: adminUsers.userId })
    .from(users)
    .innerJoin(adminUsers, eq(adminUsers.userId, users.id))
    .where(and(eq(users.id, user.id), eq(users.accountRole, "admin"), eq(users.role, "admin")))
    .limit(1);
  return membership.length ? "allowed" : "forbidden";
}

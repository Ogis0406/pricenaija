import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, like, lte, max, min, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  adminUsers, authTokens, businessAppeals, businessEvents, businesses, businessProducts, categories,
  communityComments, communityLikes, communityPosts, communityReports, locations,
  notifications, priceAlerts, priceHistory, priceReports, products, savedProducts,
  searchHistory, trustReports, userSessions, users,
} from "../drizzle/schema";
import { formatNaira, slugify } from "@shared/price";
import {
  clearSession, consumeAuthToken, createAuthToken, deliverAuthLink, enforceRateLimit,
  findUserByEmail, hashPassword, setSessionCookie, verifyPassword,
} from "./accountAuth";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, businessProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { isTransactionalEmailReady } from "./email";

const publicUser = (user: typeof users.$inferSelect | null) => user ? ({
  id: user.id, name: user.name, email: user.email, accountRole: user.accountRole,
  emailVerified: !!user.emailVerifiedAt, phone: user.phone, city: user.city, state: user.state,
  profileImageUrl: user.profileImageUrl, notificationsEnabled: user.notificationsEnabled,
}) : null;
const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The PriceNaija database is not available yet." });
  return db;
};
const cleanText = (value: string, maxLength: number) => value.trim().slice(0, maxLength);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().refine(value => {
  if (!value) return true;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getTime() <= Date.now() + 86400000;
}, "Choose a valid date that is not in the future.");
function observedDate(value?: string) { return value ? new Date(`${value}T12:00:00.000Z`) : new Date(); }
async function storeImage(dataUrl: string | undefined, keyPrefix: string) {
  if (!dataUrl) return undefined;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a JPG, PNG or WebP image." });
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Image must be 3MB or smaller." });
  const uploaded = await storagePut(`${keyPrefix}/${Date.now()}-${randomBytes(8).toString("hex")}.${match[1].split("/")[1]}`, bytes, match[1]);
  return uploaded.url;
}
type NotificationType = typeof notifications.$inferInsert["type"];
async function createUserNotification(db: any, userId: number, type: NotificationType, title: string, message: string) {
  const [preference] = await db.select({ enabled: users.notificationsEnabled }).from(users).where(eq(users.id, userId)).limit(1);
  if (preference?.enabled) await db.insert(notifications).values({ userId, type, title, message });
}

const authRouter = router({
  me: publicProcedure.query(({ ctx }) => publicUser(ctx.user)),
  signUp: publicProcedure.input(z.object({ name: z.string().min(2).max(100), email: z.string().email().max(320), password: z.string().min(10).max(128), accountRole: z.enum(["consumer", "business"]).default("consumer") })).mutation(async ({ input, ctx }) => {
    enforceRateLimit(ctx.req, "signup", 5);
    if (process.env.NODE_ENV === "production" && !isTransactionalEmailReady()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Sign-up email delivery is not configured yet. Please try again later." });
    const db = await requireDb();
    const email = input.email.trim().toLowerCase();
    if (await findUserByEmail(email)) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
    const result = await db.insert(users).values({ name: cleanText(input.name, 100), email, passwordHash: await hashPassword(input.password), loginMethod: "email_password", accountRole: input.accountRole, role: "user", openId: null });
    const userId = Number((result as any)[0]?.insertId);
    if (!userId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Account could not be created." });
    const token = await createAuthToken(userId, "verify_email");
    const delivery = await deliverAuthLink(email, "verify_email", token);
    return { ok: true, message: "Check your email to verify your PriceNaija account.", developmentVerifyPath: delivery.developmentPath ?? null };
  }),
  login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(1).max(128) })).mutation(async ({ input, ctx }) => {
    enforceRateLimit(ctx.req, "login", 10);
    const user = await findUserByEmail(input.email);
    const valid = await verifyPassword(input.password, user?.passwordHash ?? null);
    if (!user || !valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
    if (!user.emailVerifiedAt) throw new TRPCError({ code: "FORBIDDEN", message: "Please verify your email before signing in." });
    const db = await requireDb();
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
    await setSessionCookie(ctx.req, ctx.res, user.id);
    return { user: publicUser({ ...user, lastSignedIn: new Date() }) };
  }),
  logout: publicProcedure.mutation(async ({ ctx }) => { await clearSession(ctx.req, ctx.res); return { success: true }; }),
  verifyEmail: publicProcedure.input(z.object({ token: z.string().min(20).max(200) })).mutation(async ({ input }) => {
    const id = await consumeAuthToken(input.token, "verify_email");
    if (!id) throw new TRPCError({ code: "BAD_REQUEST", message: "This verification link is invalid or has expired." });
    const db = await requireDb();
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id));
    await createUserNotification(db, id, "account_security", "Email address verified", "Your PriceNaija email is verified and you can sign in.");
    return { ok: true, message: "Email verified. You can now sign in." };
  }),
  requestPasswordReset: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input, ctx }) => {
    enforceRateLimit(ctx.req, "password-reset", 8);
    const user = await findUserByEmail(input.email);
    let developmentResetPath: string | null = null;
    if (user?.emailVerifiedAt && (isTransactionalEmailReady() || process.env.NODE_ENV === "development")) {
      const token = await createAuthToken(user.id, "reset_password");
      const delivery = await deliverAuthLink(user.email!, "reset_password", token);
      developmentResetPath = delivery.developmentPath ?? null;
    }
    return { ok: true, message: "If an account exists for that address, password-reset instructions will be sent.", developmentResetPath };
  }),
  resetPassword: publicProcedure.input(z.object({ token: z.string().min(20).max(200), password: z.string().min(10).max(128) })).mutation(async ({ input }) => {
    const userId = await consumeAuthToken(input.token, "reset_password");
    if (!userId) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
    const db = await requireDb();
    await db.update(users).set({ passwordHash: await hashPassword(input.password) }).where(eq(users.id, userId));
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
    await createUserNotification(db, userId, "account_security", "Password updated", "Your PriceNaija password was changed. Other active sessions have been signed out.");
    return { ok: true, message: "Password updated. Please sign in with your new password." };
  }),
});

const reportSchema = z.object({
  productId: z.number().int().positive().optional(), productName: z.string().min(2).max(180),
  category: z.string().min(2).max(100), brand: z.string().max(120).optional(),
  quantityLabel: z.string().min(1).max(80), priceNaira: z.number().int().positive().max(500000000),
  city: z.string().min(2).max(100), state: z.string().min(2).max(100),
  market: z.string().max(180).optional(), sellerName: z.string().max(180).optional(),
  sellerContact: z.string().max(64).optional(), description: z.string().max(2000).optional(),
  evidenceDataUrl: z.string().max(5_500_000).optional(), observedAt: dateOnly,
});

const productsRouter = router({
  search: publicProcedure.input(z.object({
    query: z.string().max(120).optional(), category: z.string().max(100).optional(), city: z.string().max(100).optional(),
    minPrice: z.number().int().nonnegative().optional(), maxPrice: z.number().int().positive().optional(),
    minRating: z.number().min(0).max(5).optional(), verifiedOnly: z.boolean().optional(), updatedWithinDays: z.number().int().min(1).max(365).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await getDb(); if (!db) return [];
    const cutoff = new Date(Date.now() - 180 * 86400000);
    const filters: any[] = [eq(products.isActive, true)];
    if (input?.category) filters.push(eq(categories.name, input.category));
    if (input?.city) filters.push(eq(locations.city, input.city));
    if (input?.minPrice !== undefined) filters.push(or(gte(businessProducts.priceNaira, input.minPrice), gte(priceReports.priceNaira, input.minPrice)));
    if (input?.maxPrice !== undefined) filters.push(or(lte(businessProducts.priceNaira, input.maxPrice), lte(priceReports.priceNaira, input.maxPrice)));
    if (input?.minRating !== undefined) filters.push(gte(businesses.ratingTenths, Math.round(input.minRating * 10)));
    if (input?.verifiedOnly) filters.push(eq(businesses.verificationStatus, "verified"));
    if (input?.updatedWithinDays) { const since = new Date(Date.now() - input.updatedWithinDays * 86400000); filters.push(or(gt(businessProducts.updatedAt, since), gt(priceReports.observedAt, since))); }
    const query = input?.query?.trim().toLowerCase();
    if (query) {
      const pattern = `%${query}%`;
      filters.push(or(
        sql`LOWER(${products.name}) LIKE ${pattern}`,
        sql`LOWER(${products.brand}) LIKE ${pattern}`,
        sql`LOWER(${categories.name}) LIKE ${pattern}`,
        sql`LOWER(${businesses.name}) LIKE ${pattern}`,
        sql`LOWER(${locations.city}) LIKE ${pattern}`,
        sql`LOWER(${locations.state}) LIKE ${pattern}`,
      ));
    }
    const condition = and(...filters);
    const rows = await db.selectDistinct({ product: products, categoryName: categories.name })
      .from(products).leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(businessProducts, and(eq(businessProducts.productId, products.id), eq(businessProducts.available, true)))
      .leftJoin(businesses, eq(businessProducts.businessId, businesses.id))
      .leftJoin(locations, eq(businesses.locationId, locations.id))
      .leftJoin(priceReports, and(eq(priceReports.productId, products.id), eq(priceReports.status, "verified"), eq(priceReports.isDemo, false), gt(priceReports.observedAt, cutoff)))
      .where(condition).orderBy(products.name).limit(100);
    if (!rows.length) return [];
    const ids = [...new Set(rows.map(row => row.product.id))];
    const verifiedRows = await db.select({ productId: priceReports.productId, priceNaira: priceReports.priceNaira, observedAt: priceReports.observedAt }).from(priceReports)
      .where(and(inArray(priceReports.productId, ids), eq(priceReports.status, "verified"), eq(priceReports.isDemo, false), gt(priceReports.observedAt, cutoff)))
      .orderBy(desc(priceReports.observedAt)).limit(5000);
    const sellerRows = await db.select({ productId: businessProducts.productId, priceNaira: businessProducts.priceNaira, ratingTenths: businesses.ratingTenths, verificationStatus: businesses.verificationStatus, isDemo: businesses.isDemo }).from(businessProducts)
      .innerJoin(businesses, eq(businessProducts.businessId, businesses.id)).where(and(inArray(businessProducts.productId, ids), eq(businessProducts.available, true))).limit(5000);
    const byProduct = new Map<number, typeof verifiedRows>();
    for (const report of verifiedRows) if (report.productId !== null) byProduct.set(report.productId, [...(byProduct.get(report.productId) ?? []), report]);
    const sellerSummary = new Map<number, { lowest: number | null; ratings: number[] }>();
    for (const seller of sellerRows) if (!seller.isDemo) { const current = sellerSummary.get(seller.productId) ?? { lowest: null, ratings: [] }; current.lowest = current.lowest === null ? seller.priceNaira : Math.min(current.lowest, seller.priceNaira); if (seller.verificationStatus === "verified" && seller.ratingTenths > 0) current.ratings.push(seller.ratingTenths); sellerSummary.set(seller.productId, current); }
    return rows.map(row => {
      const reports = byProduct.get(row.product.id) ?? [];
      const prices = reports.map(report => report.priceNaira);
      const seller = sellerSummary.get(row.product.id);
      return { ...row.product, categoryName: row.categoryName, verifiedPrices: prices.length ? { low: Math.min(...prices), high: Math.max(...prices), average: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length), count: prices.length, lastUpdated: reports[0]?.observedAt ?? null } : null, lowestSellerPrice: seller?.lowest ?? null, averageSellerRating: seller?.ratings.length ? seller.ratings.reduce((sum, rating) => sum + rating, 0) / seller.ratings.length / 10 : null, demoLabel: row.product.isDemo ? "Demo data" : null };
    });
  }),
  bySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(220) })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return null;
    const rows = await db.select({ product: products, categoryName: categories.name }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.slug, input.slug), eq(products.isActive, true))).limit(1);
    const row = rows[0]; if (!row) return null;
    const cutoff = new Date(Date.now() - 180 * 86400000);
    const [verified, sellerRows] = await Promise.all([
      db.select({ priceNaira: priceReports.priceNaira, observedAt: priceReports.observedAt }).from(priceReports).where(and(eq(priceReports.productId, row.product.id), eq(priceReports.status, "verified"), eq(priceReports.isDemo, false), gt(priceReports.observedAt, cutoff))).orderBy(desc(priceReports.observedAt)).limit(500),
      db.select({ listing: businessProducts, businessName: businesses.name, businessSlug: businesses.slug, verificationStatus: businesses.verificationStatus, businessIsDemo: businesses.isDemo, ratingTenths: businesses.ratingTenths, city: locations.city, state: locations.state }).from(businessProducts).innerJoin(businesses, eq(businessProducts.businessId, businesses.id)).leftJoin(locations, eq(businesses.locationId, locations.id)).where(and(eq(businessProducts.productId, row.product.id), eq(businessProducts.available, true))).orderBy(asc(businessProducts.priceNaira)).limit(50),
    ]);
    const prices = verified.map(report => report.priceNaira);
    return {
      product: row.product, categoryName: row.categoryName,
      verifiedPrices: prices.length ? { low: Math.min(...prices), high: Math.max(...prices), average: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length), count: prices.length, lastUpdated: verified[0]?.observedAt ?? null } : null,
      sellers: sellerRows.map(item => ({ id: item.listing.id, priceNaira: item.listing.priceNaira, updatedAt: item.listing.updatedAt, businessName: item.businessName, businessSlug: item.businessSlug, verificationStatus: item.verificationStatus, businessIsDemo: item.businessIsDemo, ratingTenths: item.ratingTenths, city: item.city, state: item.state, priceLabel: "Seller-listed · not independently verified" })),
    };
  }),
  trackSearch: publicProcedure.input(z.object({ query: z.string().min(1).max(120), category: z.string().max(100).optional(), city: z.string().max(100).optional() })).mutation(async ({ input, ctx }) => {
    enforceRateLimit(ctx.req, "search-track", 40);
    const db = await getDb(); if (!db) return { recorded: false };
    await db.insert(searchHistory).values({ userId: ctx.user?.id ?? null, query: cleanText(input.query, 120), category: input.category ? cleanText(input.category, 100) : null, city: input.city ? cleanText(input.city, 100) : null });
    return { recorded: true };
  }),
  fairPrice: publicProcedure.input(z.object({ productName: z.string().min(2).max(180), productId: z.number().int().positive().optional(), quantityLabel: z.string().min(1).max(80), city: z.string().min(2).max(100) })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return { available: false, count: 0 };
    const cutoff = new Date(Date.now() - 180 * 86400000);
    const productFilter = input.productId ? eq(priceReports.productId, input.productId) : eq(priceReports.productName, input.productName);
    const rows = await db.select({ priceNaira: priceReports.priceNaira, observedAt: priceReports.observedAt }).from(priceReports)
      .where(and(productFilter, eq(priceReports.quantityLabel, input.quantityLabel), eq(priceReports.city, input.city), eq(priceReports.status, "verified"), eq(priceReports.isDemo, false), gt(priceReports.observedAt, cutoff)))
      .orderBy(desc(priceReports.observedAt)).limit(100);
    if (!rows.length) return { available: false, count: 0 };
    const prices = rows.map(row => row.priceNaira).sort((a, b) => a - b);
    return { available: true, count: prices.length, low: prices[0], high: prices[prices.length - 1], average: Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length), lastUpdated: rows[0].observedAt };
  }),
  marketSummary: publicProcedure.input(z.object({ productName: z.string().min(2).max(180), productId: z.number().int().positive().optional(), quantityLabel: z.string().min(1).max(80).optional(), city: z.string().max(100).optional() })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return [];
    const cutoff = new Date(Date.now() - 180 * 86400000);
    const productFilter = input.productId ? eq(priceReports.productId, input.productId) : eq(priceReports.productName, input.productName);
    const filters: any[] = [productFilter, ...(input.quantityLabel ? [eq(priceReports.quantityLabel, input.quantityLabel)] : []), eq(priceReports.status, "verified"), eq(priceReports.isDemo, false), gt(priceReports.observedAt, cutoff)];
    if (input.city) filters.push(eq(priceReports.city, input.city));
    const rows = await db.select({ city: priceReports.city, state: priceReports.state, priceNaira: priceReports.priceNaira, observedAt: priceReports.observedAt }).from(priceReports).where(and(...filters)).orderBy(desc(priceReports.observedAt)).limit(2000);
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) grouped.set(row.city, [...(grouped.get(row.city) ?? []), row]);
    return [...grouped.entries()].map(([city, values]) => ({ city, state: values[0].state, average: Math.round(values.reduce((sum, row) => sum + row.priceNaira, 0) / values.length), lowest: Math.min(...values.map(row => row.priceNaira)), highest: Math.max(...values.map(row => row.priceNaira)), count: values.length, lastUpdated: values[0].observedAt }));
  }),
  submit: protectedProcedure.input(reportSchema).mutation(async ({ input, ctx }) => {
    enforceRateLimit(ctx.req, "price-report", 5);
    const db = await requireDb();
    const productName = cleanText(input.productName, 180);
    if (input.productId) {
      const matched = await db.select({ id: products.id, name: products.name, quantityLabel: products.quantityLabel }).from(products).where(and(eq(products.id, input.productId), eq(products.isActive, true))).limit(1);
      if (!matched[0] || matched[0].name !== productName || matched[0].quantityLabel !== input.quantityLabel) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a matching catalogue product and quantity, or remove the catalogue selection." });
    }
    const similar = await db.select({ id: priceReports.id }).from(priceReports).where(and(eq(priceReports.reporterId, ctx.user.id), eq(priceReports.productName, productName), eq(priceReports.priceNaira, input.priceNaira), eq(priceReports.city, input.city), eq(priceReports.status, "pending"))).limit(1);
    if (similar.length) throw new TRPCError({ code: "CONFLICT", message: "You already submitted this price and it is awaiting review." });
    const evidenceUrl = await storeImage(input.evidenceDataUrl, `price-reports/${ctx.user.id}`);
    const result = await db.insert(priceReports).values({ reporterId: ctx.user.id, productId: input.productId ?? null, productName, category: cleanText(input.category, 100), brand: input.brand ? cleanText(input.brand, 120) : null, quantityLabel: cleanText(input.quantityLabel, 80), priceNaira: input.priceNaira, city: cleanText(input.city, 100), state: cleanText(input.state, 100), market: input.market ? cleanText(input.market, 180) : null, sellerName: input.sellerName ? cleanText(input.sellerName, 180) : null, sellerContact: input.sellerContact ? cleanText(input.sellerContact, 64) : null, description: input.description ? cleanText(input.description, 2000) : null, evidenceUrl: evidenceUrl ?? null, observedAt: observedDate(input.observedAt), status: "pending", isDemo: false });
    const admins = await db.select({ userId: adminUsers.userId }).from(adminUsers);
    for (const admin of admins) await createUserNotification(db, admin.userId, "new_price_report", "New price report submitted", `${productName} · ${formatNaira(input.priceNaira)} in ${cleanText(input.city, 100)} is awaiting review.`);
    return { ok: true, id: Number((result as any)[0]?.insertId), status: "pending", message: "Thank you for helping Nigerians discover better prices." };
  }),
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(priceReports).where(eq(priceReports.reporterId, ctx.user.id)).orderBy(desc(priceReports.createdAt)).limit(50);
  }),
  history: publicProcedure.input(z.object({ productId: z.number().int().positive(), days: z.number().int().min(30).max(365).default(90) })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return [];
    const since = new Date(Date.now() - input.days * 86400000);
    return db.select().from(priceHistory).where(and(eq(priceHistory.productId, input.productId), eq(priceHistory.isVerified, true), eq(priceHistory.isDemo, false), gt(priceHistory.recordedAt, since))).orderBy(priceHistory.recordedAt).limit(180);
  }),
});

const accountRouter = router({
  saved: protectedProcedure.query(async ({ ctx }) => { const db = await requireDb(); return db.select({ saved: savedProducts, product: products }).from(savedProducts).innerJoin(products, eq(savedProducts.productId, products.id)).where(eq(savedProducts.userId, ctx.user.id)).orderBy(desc(savedProducts.createdAt)); }),
  toggleSaved: protectedProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(async ({ input, ctx }) => { const db = await requireDb(); const existing = await db.select().from(savedProducts).where(and(eq(savedProducts.userId, ctx.user.id), eq(savedProducts.productId, input.productId))).limit(1); if (existing[0]) { await db.delete(savedProducts).where(eq(savedProducts.id, existing[0].id)); return { saved: false }; } await db.insert(savedProducts).values({ userId: ctx.user.id, productId: input.productId }); return { saved: true }; }),
  alerts: protectedProcedure.query(async ({ ctx }) => { const db = await requireDb(); return db.select({ alert: priceAlerts, product: products }).from(priceAlerts).innerJoin(products, eq(priceAlerts.productId, products.id)).where(eq(priceAlerts.userId, ctx.user.id)).orderBy(desc(priceAlerts.createdAt)); }),
  createAlert: protectedProcedure.input(z.object({ productId: z.number().int().positive(), targetPriceNaira: z.number().int().positive().max(500000000) })).mutation(async ({ input, ctx }) => { const db = await requireDb(); const product = await db.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).limit(1); if (!product[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." }); await db.insert(priceAlerts).values({ ...input, userId: ctx.user.id }); return { ok: true }; }),
  removeAlert: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => { const db = await requireDb(); await db.update(priceAlerts).set({ isActive: false }).where(and(eq(priceAlerts.id, input.id), eq(priceAlerts.userId, ctx.user.id), eq(priceAlerts.isActive, true))); return { ok: true }; }),
  notifications: protectedProcedure.query(async ({ ctx }) => { const db = await requireDb(); return db.select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(30); }),
  markNotificationRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => { const db = await requireDb(); await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id))); return { ok: true }; }),
  recentSearches: protectedProcedure.query(async ({ ctx }) => { const db = await requireDb(); return db.select().from(searchHistory).where(eq(searchHistory.userId, ctx.user.id)).orderBy(desc(searchHistory.createdAt)).limit(10); }),
  updateProfile: protectedProcedure.input(z.object({ name: z.string().min(2).max(100), phone: z.string().max(32).optional(), city: z.string().max(100).optional(), state: z.string().max(100).optional(), notificationsEnabled: z.boolean().optional(), profileImageDataUrl: z.string().max(5_500_000).optional() })).mutation(async ({ input, ctx }) => { const db = await requireDb(); const profileImageUrl = await storeImage(input.profileImageDataUrl, `avatars/${ctx.user.id}`); await db.update(users).set({ name: cleanText(input.name, 100), phone: input.phone ?? null, city: input.city ? cleanText(input.city, 100) : null, state: input.state ? cleanText(input.state, 100) : null, ...(input.notificationsEnabled !== undefined ? { notificationsEnabled: input.notificationsEnabled } : {}), ...(profileImageUrl ? { profileImageUrl } : {}) }).where(eq(users.id, ctx.user.id)); return { ok: true }; }),
});

const businessRouter = router({
  list: publicProcedure.input(z.object({ query: z.string().max(120).optional(), city: z.string().max(100).optional(), category: z.string().max(100).optional(), verifiedOnly: z.boolean().optional(), minRating: z.number().min(0).max(5).optional(), minPrice: z.number().int().nonnegative().optional(), maxPrice: z.number().int().positive().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb(); if (!db) return [];
    const filters: any[] = [];
    if (input?.city) filters.push(eq(locations.city, input.city));
    if (input?.category) filters.push(eq(businesses.category, input.category));
    if (input?.verifiedOnly) filters.push(eq(businesses.verificationStatus, "verified"));
    if (input?.minRating !== undefined) filters.push(gte(businesses.ratingTenths, Math.round(input.minRating * 10)));
    if (input?.minPrice !== undefined) filters.push(gte(businessProducts.priceNaira, input.minPrice));
    if (input?.maxPrice !== undefined) filters.push(lte(businessProducts.priceNaira, input.maxPrice));
    const q = input?.query?.trim().toLowerCase();
    if (q) {
      const pattern = `%${q}%`;
      filters.push(or(
        sql`LOWER(${businesses.name}) LIKE ${pattern}`,
        sql`LOWER(${businesses.category}) LIKE ${pattern}`,
        sql`LOWER(${businesses.description}) LIKE ${pattern}`,
        sql`LOWER(${products.name}) LIKE ${pattern}`,
      ));
    }
    const rows = await db.selectDistinct({ business: businesses, city: locations.city, state: locations.state })
      .from(businesses).leftJoin(locations, eq(businesses.locationId, locations.id))
      .leftJoin(businessProducts, and(eq(businessProducts.businessId, businesses.id), eq(businessProducts.available, true)))
      .leftJoin(products, eq(businessProducts.productId, products.id))
      .where(filters.length ? and(...filters) : undefined).orderBy(businesses.name).limit(100);
    return rows.map(row => ({ id: row.business.id, name: row.business.name, slug: row.business.slug, description: row.business.description, category: row.business.category, logoUrl: row.business.logoUrl, verificationStatus: row.business.verificationStatus, ratingTenths: row.business.ratingTenths, isDemo: row.business.isDemo, city: row.city, state: row.state, rating: row.business.ratingTenths / 10 }));
  }),
  bySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(200) })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return null;
    const rows = await db.select({ business: businesses, city: locations.city, state: locations.state }).from(businesses).leftJoin(locations, eq(businesses.locationId, locations.id)).where(eq(businesses.slug, input.slug)).limit(1);
    if (!rows[0]) return null;
    const listings = await db.select({ listing: businessProducts, product: products }).from(businessProducts).innerJoin(products, eq(businessProducts.productId, products.id)).where(and(eq(businessProducts.businessId, rows[0].business.id), eq(businessProducts.available, true))).orderBy(desc(businessProducts.updatedAt));
    const reports = await db.select({ value: count() }).from(trustReports).where(and(eq(trustReports.businessId, rows[0].business.id), eq(trustReports.status, "pending")));
    return { id: rows[0].business.id, name: rows[0].business.name, slug: rows[0].business.slug, description: rows[0].business.description, category: rows[0].business.category, logoUrl: rows[0].business.logoUrl, contactPhone: rows[0].business.verificationStatus === "verified" ? rows[0].business.contactPhone : null, verificationStatus: rows[0].business.verificationStatus, ratingTenths: rows[0].business.ratingTenths, isDemo: rows[0].business.isDemo, city: rows[0].city, state: rows[0].state, rating: rows[0].business.ratingTenths / 10, listings, communityReportCount: reports[0]?.value ?? 0 };
  }),
  myProfiles: businessProcedure.query(async ({ ctx }) => { const db = await requireDb(); return db.select().from(businesses).where(eq(businesses.ownerId, ctx.user.id)).orderBy(desc(businesses.createdAt)); }),
  ownerOverview: businessProcedure.input(z.object({ businessId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const rows = await db.select({ business: businesses, city: locations.city, state: locations.state }).from(businesses).leftJoin(locations, eq(businesses.locationId, locations.id)).where(and(eq(businesses.id, input.businessId), eq(businesses.ownerId, ctx.user.id))).limit(1);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Business profile not found for this account." });
    const [listingRows, views, leads] = await Promise.all([
      db.select({ listing: businessProducts, product: products }).from(businessProducts).innerJoin(products, eq(businessProducts.productId, products.id)).where(and(eq(businessProducts.businessId, input.businessId), eq(businessProducts.available, true))).orderBy(desc(businessProducts.updatedAt)),
      db.select({ total: count() }).from(businessEvents).where(and(eq(businessEvents.businessId, input.businessId), eq(businessEvents.eventType, "view"))),
      db.select({ total: count() }).from(businessEvents).where(and(eq(businessEvents.businessId, input.businessId), eq(businessEvents.eventType, "lead"))),
    ]);
    const verifiedRows = await db.select({ productName: priceReports.productName, priceNaira: priceReports.priceNaira }).from(priceReports).where(and(eq(priceReports.city, rows[0].city ?? ""), eq(priceReports.status, "verified"), eq(priceReports.isDemo, false), gt(priceReports.observedAt, new Date(Date.now() - 180 * 86400000)))).limit(1000);
    const intelligence = listingRows.map(({ listing, product }) => {
      const matches = verifiedRows.filter(report => report.productName.toLowerCase() === product.name.toLowerCase());
      const average = matches.length ? Math.round(matches.reduce((sum, row) => sum + row.priceNaira, 0) / matches.length) : null;
      return { productName: product.name, city: rows[0].city ?? "your city", yourPrice: listing.priceNaira, average, position: average === null ? "No verified data" : listing.priceNaira < average ? "Below verified average" : listing.priceNaira > average ? "Above verified average" : "At verified average" };
    });
    return { business: { ...rows[0].business, city: rows[0].city, state: rows[0].state }, listings: listingRows, views: views[0]?.total ?? 0, leads: leads[0]?.total ?? 0, priceUpdates: listingRows.length, intelligence };
  }),
  addListing: businessProcedure.input(z.object({ businessId: z.number().int().positive(), productId: z.number().int().positive(), priceNaira: z.number().int().positive().max(500000000) })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const owned = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.id, input.businessId), eq(businesses.ownerId, ctx.user.id))).limit(1);
    if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Business profile not found for this account." });
    const product = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.isActive, true))).limit(1);
    if (!product[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
    await db.insert(businessProducts).values({ businessId: input.businessId, productId: input.productId, priceNaira: input.priceNaira, available: true }).onDuplicateKeyUpdate({ set: { priceNaira: input.priceNaira, available: true } });
    return { ok: true };
  }),
  trackEvent: publicProcedure.input(z.object({ businessId: z.number().int().positive(), event: z.enum(["view", "lead"]) })).mutation(async ({ input, ctx }) => {
    enforceRateLimit(ctx.req, "business-event", 100);
    const db = await requireDb();
    const business = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.id, input.businessId), eq(businesses.isDemo, false))).limit(1);
    if (!business[0]) return { recorded: false };
    await db.insert(businessEvents).values({ businessId: input.businessId, userId: ctx.user?.id ?? null, eventType: input.event });
    return { recorded: true };
  }),
  createProfile: businessProcedure.input(z.object({ name: z.string().min(2).max(180), description: z.string().max(2000), category: z.string().max(100), city: z.string().max(100), phone: z.string().max(32).optional() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const location = await db.select({ id: locations.id }).from(locations).where(eq(locations.city, input.city)).limit(1);
    const base = slugify(input.name) || `business-${ctx.user.id}`;
    const slug = `${base}-${ctx.user.id}`;
    const result = await db.insert(businesses).values({ ownerId: ctx.user.id, locationId: location[0]?.id ?? null, name: cleanText(input.name, 180), slug, description: cleanText(input.description, 2000), category: cleanText(input.category, 100), contactPhone: input.phone ?? null, verificationStatus: "pending", isDemo: false });
    return { id: Number((result as any)[0]?.insertId), slug };
  }),
  report: protectedProcedure.input(z.object({ businessId: z.number().int().positive().optional(), subjectName: z.string().max(180).optional(), reason: z.string().min(2).max(120), description: z.string().min(10).max(2000), evidenceDataUrl: z.string().max(5_500_000).optional(), observedAt: dateOnly })).mutation(async ({ input, ctx }) => {
    enforceRateLimit(ctx.req, "trust-report", 5);
    const db = await requireDb();
    if (input.businessId) { const found = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, input.businessId)).limit(1); if (!found[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Business profile not found." }); }
    const evidenceUrl = await storeImage(input.evidenceDataUrl, `trust-reports/${ctx.user.id}`);
    await db.insert(trustReports).values({ businessId: input.businessId ?? null, reporterId: ctx.user.id, subjectName: input.subjectName ? cleanText(input.subjectName, 180) : null, reason: cleanText(input.reason, 120), description: cleanText(input.description, 2000), evidenceUrl: evidenceUrl ?? null, observedAt: observedDate(input.observedAt), status: "pending" });
    const admins = await db.select({ userId: adminUsers.userId }).from(adminUsers);
    for (const admin of admins) await createUserNotification(db, admin.userId, "trust_report", "New community concern", "A trust and safety report is awaiting neutral review.");
    return { ok: true };
  }),
  reportCount: publicProcedure.input(z.object({ businessId: z.number().int().positive() })).query(async ({ input }) => { const db = await getDb(); if (!db) return { count: 0 }; const rows = await db.select({ value: count() }).from(trustReports).where(and(eq(trustReports.businessId, input.businessId), inArray(trustReports.status, ["pending", "under_review"]))); return { count: rows[0]?.value ?? 0 }; }),
  appeal: businessProcedure.input(z.object({ businessId: z.number().int().positive(), message: z.string().min(10).max(2000) })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const owned = await db.select({ id: businesses.id }).from(businesses).where(and(eq(businesses.id, input.businessId), eq(businesses.ownerId, ctx.user.id))).limit(1);
    if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND", message: "That business profile is not owned by your account." });
    await db.insert(businessAppeals).values({ businessId: input.businessId, userId: ctx.user.id, message: cleanText(input.message, 2000) });
    return { ok: true };
  }),
});

const communityRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb(); if (!db) return [];
    const rows = await db.select({ post: communityPosts, authorName: users.name }).from(communityPosts).leftJoin(users, eq(communityPosts.userId, users.id)).where(eq(communityPosts.status, "visible")).orderBy(desc(communityPosts.createdAt)).limit(60);
    if (!rows.length) return [];
    const ids = rows.map(row => row.post.id);
    const [likes, comments] = await Promise.all([
      db.select({ postId: communityLikes.postId, total: count() }).from(communityLikes).where(inArray(communityLikes.postId, ids)).groupBy(communityLikes.postId),
      db.select({ postId: communityComments.postId, total: count() }).from(communityComments).where(and(inArray(communityComments.postId, ids), eq(communityComments.status, "visible"))).groupBy(communityComments.postId),
    ]);
    const likeMap = new Map(likes.map(row => [row.postId, row.total]));
    const commentMap = new Map(comments.map(row => [row.postId, row.total]));
    return rows.map(row => ({ ...row.post, authorName: row.authorName || "PriceNaija member", likeCount: likeMap.get(row.post.id) ?? 0, commentCount: commentMap.get(row.post.id) ?? 0 }));
  }),
  comments: publicProcedure.input(z.object({ postId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return [];
    return db.select({ comment: communityComments, authorName: users.name }).from(communityComments).leftJoin(users, eq(communityComments.userId, users.id)).where(and(eq(communityComments.postId, input.postId), eq(communityComments.status, "visible"))).orderBy(communityComments.createdAt).limit(100);
  }),
  post: protectedProcedure.input(z.object({ topic: z.enum(["prices", "markets", "products", "shopping", "tips"]), title: z.string().min(5).max(180), body: z.string().min(10).max(4000) })).mutation(async ({ input, ctx }) => { enforceRateLimit(ctx.req, "community-post", 5); const db = await requireDb(); const result = await db.insert(communityPosts).values({ ...input, title: cleanText(input.title, 180), body: cleanText(input.body, 4000), userId: ctx.user.id }); return { id: Number((result as any)[0]?.insertId) }; }),
  comment: protectedProcedure.input(z.object({ postId: z.number().int().positive(), body: z.string().min(2).max(2000) })).mutation(async ({ input, ctx }) => { enforceRateLimit(ctx.req, "community-comment", 15); const db = await requireDb(); const post = await db.select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.id, input.postId), eq(communityPosts.status, "visible"))).limit(1); if (!post[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Community post not found." }); await db.insert(communityComments).values({ ...input, body: cleanText(input.body, 2000), userId: ctx.user.id }); return { ok: true }; }),
  like: protectedProcedure.input(z.object({ postId: z.number().int().positive() })).mutation(async ({ input, ctx }) => { const db = await requireDb(); const post = await db.select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.id, input.postId), eq(communityPosts.status, "visible"))).limit(1); if (!post[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Community post not found." }); const current = await db.select().from(communityLikes).where(and(eq(communityLikes.postId, input.postId), eq(communityLikes.userId, ctx.user.id))).limit(1); if (current.length) await db.delete(communityLikes).where(eq(communityLikes.id, current[0].id)); else await db.insert(communityLikes).values({ postId: input.postId, userId: ctx.user.id }); return { liked: !current.length }; }),
  report: protectedProcedure.input(z.object({ postId: z.number().int().positive(), reason: z.string().min(2).max(120) })).mutation(async ({ input, ctx }) => { enforceRateLimit(ctx.req, "community-report", 5); const db = await requireDb(); await db.insert(communityReports).values({ postId: input.postId, reporterId: ctx.user.id, reason: cleanText(input.reason, 120) }); return { ok: true }; }),
});

const adminRouter = router({
  access: adminProcedure.query(({ ctx }) => ({ allowed: true, user: publicUser(ctx.user) })),
  stats: adminProcedure.query(async () => {
    const db = await requireDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [allUsers, activeUsers, newUsers, verifiedEmails, unverifiedEmails, consumers, businessAccounts, adminAccounts, reports, verified, pending, businessesCount, verifiedBusinesses, pendingTrust, searches, mostReported, recentHistory] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(users).where(gt(users.lastSignedIn, thirtyDaysAgo)),
      db.select({ value: count() }).from(users).where(gt(users.createdAt, thirtyDaysAgo)),
      db.select({ value: count() }).from(users).where(isNotNull(users.emailVerifiedAt)),
      db.select({ value: count() }).from(users).where(isNull(users.emailVerifiedAt)),
      db.select({ value: count() }).from(users).where(eq(users.accountRole, "consumer")),
      db.select({ value: count() }).from(users).where(eq(users.accountRole, "business")),
      db.select({ value: count() }).from(users).where(eq(users.accountRole, "admin")),
      db.select({ value: count() }).from(priceReports),
      db.select({ value: count() }).from(priceReports).where(eq(priceReports.status, "verified")),
      db.select({ value: count() }).from(priceReports).where(eq(priceReports.status, "pending")),
      db.select({ value: count() }).from(businesses),
      db.select({ value: count() }).from(businesses).where(and(eq(businesses.verificationStatus, "verified"), eq(businesses.isDemo, false))),
      db.select({ value: count() }).from(trustReports).where(eq(trustReports.status, "pending")),
      db.select({ query: searchHistory.query, total: count() }).from(searchHistory).groupBy(searchHistory.query).orderBy(desc(count())).limit(5),
      db.select({ productName: priceReports.productName, total: count() }).from(priceReports).groupBy(priceReports.productName).orderBy(desc(count())).limit(5),
      db.select({ productId: priceHistory.productId, priceNaira: priceHistory.priceNaira }).from(priceHistory).where(and(eq(priceHistory.isVerified, true), eq(priceHistory.isDemo, false), gt(priceHistory.recordedAt, new Date(Date.now() - 90 * 86400000)))).orderBy(desc(priceHistory.recordedAt)).limit(1000),
    ]);
    const byProduct = new Map<number, number[]>();
    for (const row of recentHistory) byProduct.set(row.productId, [...(byProduct.get(row.productId) ?? []), row.priceNaira]);
    const changes = [...byProduct.values()].filter(values => values.length > 1).map(values => { const baseline = values.slice(1).reduce((sum, value) => sum + value, 0) / (values.length - 1); return baseline > 0 ? ((values[0] - baseline) / baseline) * 100 : 0; });
    return {
      users: allUsers[0]?.value ?? 0, activeUsers: activeUsers[0]?.value ?? 0, newUsers: newUsers[0]?.value ?? 0,
      verifiedEmails: verifiedEmails[0]?.value ?? 0, unverifiedEmails: unverifiedEmails[0]?.value ?? 0,
      consumers: consumers[0]?.value ?? 0, businessAccounts: businessAccounts[0]?.value ?? 0, adminAccounts: adminAccounts[0]?.value ?? 0,
      reports: reports[0]?.value ?? 0, verifiedReports: verified[0]?.value ?? 0, pendingReports: pending[0]?.value ?? 0,
      businesses: businessesCount[0]?.value ?? 0, verifiedBusinesses: verifiedBusinesses[0]?.value ?? 0, pendingTrustReports: pendingTrust[0]?.value ?? 0,
      mostSearched: searches, mostReported,
      averagePriceChangePct: changes.length ? Number((changes.reduce((sum, value) => sum + value, 0) / changes.length).toFixed(1)) : null,
      demoLabel: "Live database totals",
    };
  }),
  reports: adminProcedure.input(z.object({ status: z.enum(["pending", "under_review", "verified", "rejected", "open"]).optional() }).optional()).query(async ({ input }) => { const db = await requireDb(); const statusFilter = input?.status === "open" ? inArray(priceReports.status, ["pending", "under_review"]) : input?.status ? eq(priceReports.status, input.status) : undefined; return db.select({ report: priceReports, reporterName: users.name }).from(priceReports).leftJoin(users, eq(priceReports.reporterId, users.id)).where(statusFilter).orderBy(desc(priceReports.createdAt)).limit(100); }),
  reviewReport: adminProcedure.input(z.object({ id: z.number().int().positive(), action: z.enum(["under_review", "verified", "rejected", "request_info"]), note: z.string().max(1000).optional() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb(); const rows = await db.select().from(priceReports).where(eq(priceReports.id, input.id)).limit(1); const report = rows[0];
    if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Price report not found." });
    if (input.action === "under_review" || input.action === "request_info") {
      const note = input.note ?? (input.action === "request_info" ? "More information requested. Please review your submission." : "Your price report is under review.");
      await db.update(priceReports).set({ status: "under_review", reviewerId: ctx.user.id, reviewNote: note, reviewedAt: new Date() }).where(eq(priceReports.id, input.id));
      if (input.action === "request_info" && report.reporterId) await createUserNotification(db, report.reporterId, "report_request_info", "More information requested", note);
      return { ok: true };
    }
    const status = input.action;
    let productId = report.productId;
    if (status === "verified" && !productId) {
      const matches = await db.select({ id: products.id }).from(products).where(and(eq(products.name, report.productName), eq(products.quantityLabel, report.quantityLabel), eq(products.isActive, true))).limit(1);
      productId = matches[0]?.id ?? null;
    }
    await db.update(priceReports).set({ status, reviewerId: ctx.user.id, reviewNote: input.note ?? null, reviewedAt: new Date(), ...(status === "verified" && productId ? { productId } : {}) }).where(eq(priceReports.id, input.id));
    if (status === "verified") {
      if (productId) {
        await db.insert(priceHistory).values({ productId, priceNaira: report.priceNaira, isVerified: true, isDemo: false, reportId: report.id, locationId: report.locationId ?? null, recordedAt: report.observedAt });
        const matchingAlerts = await db.select().from(priceAlerts).where(and(eq(priceAlerts.productId, productId), eq(priceAlerts.isActive, true)));
        for (const alert of matchingAlerts) if (report.priceNaira <= alert.targetPriceNaira) { await db.update(priceAlerts).set({ isActive: false, triggeredAt: new Date() }).where(eq(priceAlerts.id, alert.id)); await createUserNotification(db, alert.userId, "price_alert", "Your price alert was reached", `${report.productName} was reported at ${formatNaira(report.priceNaira)} in ${report.city}.`); }
      }
    }
    if (report.reporterId) await createUserNotification(db, report.reporterId, status === "verified" ? "report_verified" : "report_rejected", status === "verified" ? "Price report verified" : "Price report reviewed", status === "verified" ? `Your ${report.productName} price report was verified.` : (input.note || `Your ${report.productName} price report was not verified.`));
    return { ok: true };
  }),
  businesses: adminProcedure.query(async () => { const db = await requireDb(); return db.select().from(businesses).orderBy(desc(businesses.createdAt)).limit(100); }),
  verifyBusiness: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["verified", "rejected"]) })).mutation(async ({ input }) => {
    const db = await requireDb(); const found = await db.select().from(businesses).where(eq(businesses.id, input.id)).limit(1);
    if (!found[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Business profile not found." });
    if (found[0].isDemo) throw new TRPCError({ code: "BAD_REQUEST", message: "Demo profiles cannot be verified as real businesses." });
    await db.update(businesses).set({ verificationStatus: input.status }).where(eq(businesses.id, input.id));
    if (found[0].ownerId) await createUserNotification(db, found[0].ownerId, "business_verification", input.status === "verified" ? "Business profile verified" : "Business profile reviewed", `${found[0].name} was ${input.status === "verified" ? "verified" : "not approved"} by PriceNaija review.`);
    return { ok: true };
  }),
  trustReports: adminProcedure.input(z.object({ status: z.enum(["pending", "under_review", "resolved", "dismissed"]).optional() }).optional()).query(async ({ input }) => { const db = await requireDb(); return db.select({ report: trustReports, reporterName: users.name, businessName: businesses.name }).from(trustReports).leftJoin(users, eq(trustReports.reporterId, users.id)).leftJoin(businesses, eq(trustReports.businessId, businesses.id)).where(input?.status ? eq(trustReports.status, input.status) : undefined).orderBy(desc(trustReports.createdAt)).limit(100); }),
  reviewTrustReport: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["under_review", "resolved", "dismissed"]) })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(trustReports).set({ status: input.status, reviewedAt: new Date() }).where(eq(trustReports.id, input.id)); return { ok: true }; }),
  appeals: adminProcedure.input(z.object({ status: z.enum(["pending", "under_review", "resolved", "rejected"]).optional() }).optional()).query(async ({ input }) => { const db = await requireDb(); return db.select({ appeal: businessAppeals, businessName: businesses.name, ownerName: users.name }).from(businessAppeals).leftJoin(businesses, eq(businessAppeals.businessId, businesses.id)).leftJoin(users, eq(businessAppeals.userId, users.id)).where(input?.status ? eq(businessAppeals.status, input.status) : undefined).orderBy(desc(businessAppeals.createdAt)).limit(100); }),
  reviewAppeal: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["under_review", "resolved", "rejected"]) })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(businessAppeals).set({ status: input.status }).where(eq(businessAppeals.id, input.id)); return { ok: true }; }),
  users: adminProcedure.input(z.object({
    search: z.string().trim().max(120).optional(),
    role: z.enum(["all", "consumer", "business", "admin"]).optional(),
    verification: z.enum(["all", "verified", "unverified"]).optional(),
    page: z.number().int().min(1).max(100000).optional(),
    pageSize: z.number().int().min(10).max(100).optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const page = input?.page ?? 1;
    const pageSize = input?.pageSize ?? 25;
    const searchTerm = input?.search?.trim();
    const escapedSearch = searchTerm?.replace(/[\\%_]/g, "\\$&");
    const where = and(
      escapedSearch ? or(like(users.name, `%${escapedSearch}%`), like(users.email, `%${escapedSearch}%`)) : undefined,
      input?.role && input.role !== "all" ? eq(users.accountRole, input.role) : undefined,
      input?.verification === "verified" ? isNotNull(users.emailVerifiedAt) : undefined,
      input?.verification === "unverified" ? isNull(users.emailVerifiedAt) : undefined,
    );
    const [items, totals] = await Promise.all([
      db.select({ id: users.id, name: users.name, email: users.email, accountRole: users.accountRole, emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn })
        .from(users).where(where).orderBy(desc(users.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ total: count() }).from(users).where(where),
    ]);
    const total = totals[0]?.total ?? 0;
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }),
  updateUserRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), accountRole: z.enum(["consumer", "business"]) })).mutation(async ({ input }) => { const db = await requireDb(); const target = await db.select({ role: users.role, accountRole: users.accountRole }).from(users).where(eq(users.id, input.userId)).limit(1); if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." }); const admin = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.userId, input.userId)).limit(1); if (target[0].accountRole === "admin" || target[0].role === "admin" || admin[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Administrator roles are managed through protected server configuration." }); await db.update(users).set({ accountRole: input.accountRole, role: "user" }).where(eq(users.id, input.userId)); return { ok: true }; }),
  products: adminProcedure.query(async () => { const db = await requireDb(); return db.select({ product: products, categoryName: categories.name }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).orderBy(products.name).limit(300); }),
  createProduct: adminProcedure.input(z.object({ name: z.string().min(2).max(180), category: z.string().min(2).max(100), brand: z.string().max(120).optional(), quantityLabel: z.string().min(1).max(80), description: z.string().max(2000).optional() })).mutation(async ({ input }) => { const db = await requireDb(); const cat = await db.select({ id: categories.id }).from(categories).where(eq(categories.name, input.category)).limit(1); const base = slugify(input.name).slice(0, 180); await db.insert(products).values({ name: cleanText(input.name, 180), slug: `${base}-${Date.now().toString(36)}`, categoryId: cat[0]?.id ?? null, brand: input.brand ? cleanText(input.brand, 120) : null, quantityLabel: cleanText(input.quantityLabel, 80), description: input.description ? cleanText(input.description, 2000) : null, isDemo: false, isActive: true }); return { ok: true }; }),
  categories: adminProcedure.query(async () => { const db = await requireDb(); return db.select().from(categories).orderBy(categories.name); }),
  createCategory: adminProcedure.input(z.object({ name: z.string().min(2).max(100) })).mutation(async ({ input }) => { const db = await requireDb(); const name = cleanText(input.name, 100); await db.insert(categories).values({ name, slug: slugify(name).slice(0, 120) }).onDuplicateKeyUpdate({ set: { name } }); return { ok: true }; }),
  alerts: adminProcedure.query(async () => { const db = await requireDb(); return db.select({ alert: priceAlerts, userName: users.name, productName: products.name }).from(priceAlerts).leftJoin(users, eq(priceAlerts.userId, users.id)).leftJoin(products, eq(priceAlerts.productId, products.id)).orderBy(desc(priceAlerts.createdAt)).limit(200); }),
});

export const appRouter = router({ system: systemRouter, auth: authRouter, products: productsRouter, account: accountRouter, businesses: businessRouter, community: communityRouter, admin: adminRouter });
export type AppRouter = typeof appRouter;

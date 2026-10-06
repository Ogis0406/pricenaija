import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  accountRole: mysqlEnum("accountRole", ["consumer", "business", "admin"]).default("consumer").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  phone: varchar("phone", { length: 32 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  profileImageUrl: varchar("profileImageUrl", { length: 500 }),
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => ({
  emailUnique: uniqueIndex("users_email_uq").on(table.email),
  roleIndex: index("users_account_role_idx").on(table.accountRole),
}));

export const userSessions = mysqlTable("user_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userIndex: index("sessions_user_idx").on(table.userId), expiryIndex: index("sessions_expiry_idx").on(table.expiresAt) }));

export const authTokens = mysqlTable("auth_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  purpose: mysqlEnum("purpose", ["verify_email", "reset_password"]).notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userPurposeIndex: index("auth_tokens_user_purpose_idx").on(table.userId, table.purpose) }));

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  latitude: int("latitude"),
  longitude: int("longitude"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ stateIndex: index("locations_state_idx").on(table.state) }));

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId"),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  brand: varchar("brand", { length: 120 }),
  quantityLabel: varchar("quantityLabel", { length: 80 }),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  isDemo: boolean("isDemo").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ nameIndex: index("products_name_idx").on(table.name), categoryIndex: index("products_category_idx").on(table.categoryId) }));

export const businesses = mysqlTable("businesses", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId"),
  locationId: int("locationId"),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  logoUrl: varchar("logoUrl", { length: 500 }),
  contactPhone: varchar("contactPhone", { length: 32 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  verificationStatus: mysqlEnum("businessVerificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  ratingTenths: int("ratingTenths").default(0).notNull(),
  isDemo: boolean("isDemo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ ownerIndex: index("business_owner_idx").on(table.ownerId), locationIndex: index("business_location_idx").on(table.locationId), verifyIndex: index("business_verify_idx").on(table.verificationStatus) }));

export const businessProducts = mysqlTable("business_products", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  productId: int("productId").notNull(),
  priceNaira: int("priceNaira").notNull(),
  available: boolean("available").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ uniqueListing: uniqueIndex("business_product_uq").on(table.businessId, table.productId), productIdx: index("business_products_product_idx").on(table.productId) }));

export const businessEvents = mysqlTable("business_events", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId"),
  eventType: mysqlEnum("businessEventType", ["view", "lead"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ businessEventIdx: index("business_events_business_type_idx").on(table.businessId, table.eventType, table.createdAt) }));

export const priceReports = mysqlTable("price_reports", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId"),
  locationId: int("locationId"),
  businessId: int("businessId"),
  reporterId: int("reporterId"),
  reviewerId: int("reviewerId"),
  productName: varchar("productName", { length: 180 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 120 }),
  quantityLabel: varchar("quantityLabel", { length: 80 }).notNull(),
  priceNaira: int("priceNaira").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  market: varchar("market", { length: 180 }),
  sellerName: varchar("sellerName", { length: 180 }),
  sellerContact: varchar("sellerContact", { length: 64 }),
  description: text("description"),
  evidenceUrl: varchar("evidenceUrl", { length: 500 }),
  status: mysqlEnum("status", ["pending", "under_review", "verified", "rejected"]).default("pending").notNull(),
  reviewNote: text("reviewNote"),
  isDemo: boolean("isDemo").default(false).notNull(),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
}, table => ({ productStatusIdx: index("reports_product_status_idx").on(table.productId, table.status), locationStatusIdx: index("reports_location_status_idx").on(table.state, table.city, table.status), reporterIdx: index("reports_reporter_idx").on(table.reporterId), createdIdx: index("reports_created_idx").on(table.createdAt) }));

export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  locationId: int("locationId"),
  reportId: int("reportId"),
  priceNaira: int("priceNaira").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  isDemo: boolean("isDemo").default(false).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, table => ({ productDateIdx: index("history_product_date_idx").on(table.productId, table.recordedAt), locationIdx: index("history_location_idx").on(table.locationId) }));

export const priceAlerts = mysqlTable("price_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  targetPriceNaira: int("targetPriceNaira").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  triggeredAt: timestamp("triggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userIdx: index("alerts_user_idx").on(table.userId), activeProductIdx: index("alerts_active_product_idx").on(table.productId, table.isActive) }));

export const savedProducts = mysqlTable("saved_products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ uniqueSaved: uniqueIndex("saved_product_uq").on(table.userId, table.productId), userIdx: index("saved_user_idx").on(table.userId) }));

export const trustReports = mysqlTable("trust_reports", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId"),
  reporterId: int("reporterId"),
  reason: varchar("reason", { length: 120 }).notNull(),
  subjectName: varchar("subjectName", { length: 180 }),
  description: text("description").notNull(),
  evidenceUrl: varchar("evidenceUrl", { length: 500 }),
  status: mysqlEnum("trustReportStatus", ["pending", "under_review", "resolved", "dismissed"]).default("pending").notNull(),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
}, table => ({ businessIdx: index("trust_business_idx").on(table.businessId), statusIdx: index("trust_status_idx").on(table.status) }));

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userCreatedIdx: index("notifications_user_date_idx").on(table.userId, table.createdAt) }));

export const searchHistory = mysqlTable("search_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  query: varchar("query", { length: 120 }).notNull(),
  category: varchar("category", { length: 100 }),
  city: varchar("city", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userDateIdx: index("search_history_user_date_idx").on(table.userId, table.createdAt), queryDateIdx: index("search_history_query_date_idx").on(table.query, table.createdAt) }));

export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ businessIdx: index("reviews_business_idx").on(table.businessId) }));

export const businessAppeals = mysqlTable("business_appeals", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(),
  userId: int("userId").notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("appealStatus", ["pending", "under_review", "resolved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ businessIdx: index("appeals_business_idx").on(table.businessId) }));

export const communityPosts = mysqlTable("community_posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topic: mysqlEnum("topic", ["prices", "markets", "products", "shopping", "tips"]).default("prices").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("postStatus", ["visible", "hidden", "removed"]).default("visible").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ topicDateIdx: index("community_topic_date_idx").on(table.topic, table.createdAt) }));

export const communityComments = mysqlTable("community_comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("commentStatus", ["visible", "hidden", "removed"]).default("visible").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ postDateIdx: index("community_comments_post_idx").on(table.postId, table.createdAt) }));

export const communityLikes = mysqlTable("community_likes", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ likeUnique: uniqueIndex("community_like_uq").on(table.postId, table.userId) }));

export const communityReports = mysqlTable("community_reports", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId"),
  commentId: int("commentId"),
  reporterId: int("reporterId").notNull(),
  reason: varchar("reason", { length: 120 }).notNull(),
  status: mysqlEnum("communityReportStatus", ["pending", "reviewed", "dismissed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ statusIdx: index("community_reports_status_idx").on(table.status) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type PriceReport = typeof priceReports.$inferSelect;

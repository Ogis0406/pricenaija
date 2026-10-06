CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `auth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purpose` enum('verify_email','reset_password') NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `business_appeals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`message` text NOT NULL,
	`appealStatus` enum('pending','under_review','resolved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `business_appeals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`productId` int NOT NULL,
	`priceNaira` int NOT NULL,
	`available` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_product_uq` UNIQUE(`businessId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int,
	`locationId` int,
	`name` varchar(180) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`description` text,
	`category` varchar(100),
	`logoUrl` varchar(500),
	`contactPhone` varchar(32),
	`contactEmail` varchar(320),
	`businessVerificationStatus` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`ratingTenths` int NOT NULL DEFAULT 0,
	`isDemo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `businesses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `community_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`body` text NOT NULL,
	`commentStatus` enum('visible','hidden','removed') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_like_uq` UNIQUE(`postId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `community_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topic` enum('prices','markets','products','shopping','tips') NOT NULL DEFAULT 'prices',
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`postStatus` enum('visible','hidden','removed') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int,
	`commentId` int,
	`reporterId` int NOT NULL,
	`reason` varchar(120) NOT NULL,
	`communityReportStatus` enum('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(100) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`latitude` int,
	`longitude` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`targetPriceNaira` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`triggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`locationId` int,
	`reportId` int,
	`priceNaira` int NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`isDemo` boolean NOT NULL DEFAULT false,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int,
	`locationId` int,
	`businessId` int,
	`reporterId` int,
	`reviewerId` int,
	`productName` varchar(180) NOT NULL,
	`category` varchar(100) NOT NULL,
	`brand` varchar(120),
	`quantityLabel` varchar(80) NOT NULL,
	`priceNaira` int NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(100) NOT NULL,
	`market` varchar(180),
	`sellerName` varchar(180),
	`sellerContact` varchar(64),
	`description` text,
	`evidenceUrl` varchar(500),
	`status` enum('pending','under_review','verified','rejected') NOT NULL DEFAULT 'pending',
	`reviewNote` text,
	`isDemo` boolean NOT NULL DEFAULT false,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `price_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int,
	`name` varchar(180) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`brand` varchar(120),
	`quantityLabel` varchar(80),
	`description` text,
	`imageUrl` varchar(500),
	`isDemo` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_product_uq` UNIQUE(`userId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `trust_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int,
	`reporterId` int,
	`reason` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`evidenceUrl` varchar(500),
	`trustReportStatus` enum('pending','under_review','resolved','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `trust_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `accountRole` enum('consumer','business','admin') DEFAULT 'consumer' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `state` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `profileImageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_uq` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `auth_tokens_user_purpose_idx` ON `auth_tokens` (`userId`,`purpose`);--> statement-breakpoint
CREATE INDEX `appeals_business_idx` ON `business_appeals` (`businessId`);--> statement-breakpoint
CREATE INDEX `business_products_product_idx` ON `business_products` (`productId`);--> statement-breakpoint
CREATE INDEX `business_owner_idx` ON `businesses` (`ownerId`);--> statement-breakpoint
CREATE INDEX `business_location_idx` ON `businesses` (`locationId`);--> statement-breakpoint
CREATE INDEX `business_verify_idx` ON `businesses` (`businessVerificationStatus`);--> statement-breakpoint
CREATE INDEX `community_comments_post_idx` ON `community_comments` (`postId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_topic_date_idx` ON `community_posts` (`topic`,`createdAt`);--> statement-breakpoint
CREATE INDEX `community_reports_status_idx` ON `community_reports` (`communityReportStatus`);--> statement-breakpoint
CREATE INDEX `locations_state_idx` ON `locations` (`state`);--> statement-breakpoint
CREATE INDEX `notifications_user_date_idx` ON `notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `alerts_user_idx` ON `price_alerts` (`userId`);--> statement-breakpoint
CREATE INDEX `alerts_active_product_idx` ON `price_alerts` (`productId`,`isActive`);--> statement-breakpoint
CREATE INDEX `history_product_date_idx` ON `price_history` (`productId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `history_location_idx` ON `price_history` (`locationId`);--> statement-breakpoint
CREATE INDEX `reports_product_status_idx` ON `price_reports` (`productId`,`status`);--> statement-breakpoint
CREATE INDEX `reports_location_status_idx` ON `price_reports` (`state`,`city`,`status`);--> statement-breakpoint
CREATE INDEX `reports_reporter_idx` ON `price_reports` (`reporterId`);--> statement-breakpoint
CREATE INDEX `reports_created_idx` ON `price_reports` (`createdAt`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`categoryId`);--> statement-breakpoint
CREATE INDEX `reviews_business_idx` ON `reviews` (`businessId`);--> statement-breakpoint
CREATE INDEX `saved_user_idx` ON `saved_products` (`userId`);--> statement-breakpoint
CREATE INDEX `trust_business_idx` ON `trust_reports` (`businessId`);--> statement-breakpoint
CREATE INDEX `trust_status_idx` ON `trust_reports` (`trustReportStatus`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `user_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `user_sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `users_account_role_idx` ON `users` (`accountRole`);
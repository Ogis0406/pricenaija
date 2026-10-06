CREATE TABLE `business_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int,
	`businessEventType` enum('view','lead') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `business_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`query` varchar(120) NOT NULL,
	`category` varchar(100),
	`city` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trust_reports` ADD `subjectName` varchar(180);--> statement-breakpoint
ALTER TABLE `trust_reports` ADD `observedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notificationsEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `business_events_business_type_idx` ON `business_events` (`businessId`,`businessEventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `search_history_user_date_idx` ON `search_history` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `search_history_query_date_idx` ON `search_history` (`query`,`createdAt`);
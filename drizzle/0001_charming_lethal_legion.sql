CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`sourceType` enum('pdf','text') NOT NULL,
	`fileKey` varchar(512),
	`fileUrl` varchar(1024),
	`extractedText` text NOT NULL,
	`charCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studySetId` int NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`sourceNote` text,
	`sortOrder` int NOT NULL,
	`intervalDays` int NOT NULL DEFAULT 0,
	`easeFactor` int NOT NULL DEFAULT 250,
	`dueAt` timestamp NOT NULL DEFAULT (now()),
	`lastReviewedAt` timestamp,
	`reviewCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `flashcards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`studySetId` int NOT NULL,
	`score` int NOT NULL,
	`total` int NOT NULL,
	`answers` json NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studySetId` int NOT NULL,
	`prompt` text NOT NULL,
	`options` json NOT NULL,
	`correctIndex` int NOT NULL,
	`explanation` text NOT NULL,
	`sourceNote` text,
	`sortOrder` int NOT NULL,
	CONSTRAINT `quizQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminderSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`cronTaskUid` varchar(65),
	`reminderHourUtc` int NOT NULL DEFAULT 17,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminderSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminderSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `reviewEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`flashcardId` int NOT NULL,
	`rating` enum('again','hard','good','easy') NOT NULL,
	`previousIntervalDays` int NOT NULL,
	`nextIntervalDays` int NOT NULL,
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studySets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text,
	`questionCount` int NOT NULL DEFAULT 0,
	`flashcardCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studySets_id` PRIMARY KEY(`id`)
);

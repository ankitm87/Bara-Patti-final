CREATE TABLE `game_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`playerName` varchar(128) NOT NULL,
	`userId` int,
	`seat` int NOT NULL,
	`handsWon` int NOT NULL DEFAULT 0,
	`points` int NOT NULL DEFAULT 0,
	`hadTrio` boolean NOT NULL DEFAULT false,
	`groupName` varchar(128) NOT NULL DEFAULT 'Default',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` varchar(16) NOT NULL,
	`groupName` varchar(128) NOT NULL DEFAULT 'Default',
	`roundNumber` int NOT NULL DEFAULT 1,
	`trumpSuit` varchar(16),
	`hasTrio` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_sessions_id` PRIMARY KEY(`id`)
);

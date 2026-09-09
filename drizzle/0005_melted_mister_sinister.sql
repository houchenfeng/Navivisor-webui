CREATE TABLE `turn_errors` (
	`thread_id` text NOT NULL,
	`turn_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`thread_id`, `turn_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_turn_errors_thread` ON `turn_errors` (`thread_id`);
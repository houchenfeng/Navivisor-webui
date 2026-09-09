CREATE TABLE `turn_diffs` (
	`thread_id` text NOT NULL,
	`turn_id` text NOT NULL,
	`diff` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`thread_id`, `turn_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_turn_diffs_thread` ON `turn_diffs` (`thread_id`);
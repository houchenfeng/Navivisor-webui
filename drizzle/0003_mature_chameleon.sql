CREATE TABLE `pending_server_requests` (
	`generation` integer NOT NULL,
	`request_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`turn_id` text,
	`item_id` text,
	`method` text NOT NULL,
	`params_json` text NOT NULL,
	`status` text NOT NULL,
	`resolved_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`resolved_at` integer,
	PRIMARY KEY(`generation`, `request_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_pending_requests_thread_status` ON `pending_server_requests` (`thread_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_pending_requests_status_updated` ON `pending_server_requests` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `thread_tabs` (
	`scope` text NOT NULL,
	`thread_id` text NOT NULL,
	`position` integer NOT NULL,
	`mode` text NOT NULL,
	`cwd` text,
	`title` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `thread_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_thread_tabs_scope_position` ON `thread_tabs` (`scope`,`position`);
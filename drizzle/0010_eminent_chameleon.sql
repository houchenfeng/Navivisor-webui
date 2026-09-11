CREATE TABLE `research_agent_invocations` (
	`run_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`turn_id` text NOT NULL,
	`model` text,
	`effort` text,
	`service_tier` text,
	`skill_name` text NOT NULL,
	`skill_path` text NOT NULL,
	`skill_sha256` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_research_agent_turn` ON `research_agent_invocations` (`thread_id`,`turn_id`);--> statement-breakpoint
CREATE TABLE `research_agent_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`module` text NOT NULL,
	`thread_id` text NOT NULL,
	`cwd` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_research_agent_project_module` ON `research_agent_sessions` (`project_id`,`module`);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_research_agent_thread` ON `research_agent_sessions` (`thread_id`);--> statement-breakpoint
CREATE TABLE `research_artifacts` (
	`artifact_id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`project_id` text NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`media_type` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`simulated` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_research_artifacts_project_path` ON `research_artifacts` (`project_id`,`path`);--> statement-breakpoint
CREATE INDEX `idx_research_artifacts_run` ON `research_artifacts` (`run_id`);--> statement-breakpoint
CREATE INDEX `idx_research_artifacts_project_role` ON `research_artifacts` (`project_id`,`role`);--> statement-breakpoint
CREATE TABLE `research_projects` (
	`project_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`root_path` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_research_projects_root` ON `research_projects` (`root_path`);--> statement-breakpoint
CREATE TABLE `research_runs` (
	`run_id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`module` text NOT NULL,
	`stage` text NOT NULL,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`manifest_path` text NOT NULL,
	`retry_of_run_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_research_runs_project_created` ON `research_runs` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_research_runs_status` ON `research_runs` (`status`);
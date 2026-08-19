CREATE TABLE `daily_checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`log_date` text NOT NULL,
	`bed_time` text,
	`wake_time` text,
	`sleep_hours` real,
	`sleep_quality` integer,
	`energy_morning` integer,
	`energy_evening` integer,
	`mood_word` text,
	`gratitude` text,
	`drain` text,
	`slipped_habit_ids` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_checkins_date_idx` ON `daily_checkins` (`log_date`);--> statement-breakpoint
CREATE TABLE `habit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`log_date` text NOT NULL,
	`value` real DEFAULT 1 NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habit_logs_habit_date_idx` ON `habit_logs` (`habit_id`,`log_date`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`emoji` text,
	`kind` text DEFAULT 'boolean' NOT NULL,
	`unit` text,
	`target_value` real,
	`direction` text DEFAULT 'build' NOT NULL,
	`color_token` text DEFAULT 'matcha' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT 'Elizabeth' NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`wake_goal` text,
	`sleep_goal_hours` real,
	`energy_goal` integer,
	`onboarded_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monthly_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`title` text NOT NULL,
	`category` text,
	`why_it_matters` text,
	`metric_label` text,
	`target_value` real,
	`current_value` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`end_of_month_reflection` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`week_start` text NOT NULL,
	`what_went_wrong` text,
	`what_drained_me` text,
	`what_i_learned` text,
	`wins` text DEFAULT '[]' NOT NULL,
	`one_change_next_week` text,
	`week_rating` integer,
	`computed_sleep_avg` real,
	`computed_energy_avg` real,
	`computed_habit_pct` real,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_reviews_week_idx` ON `weekly_reviews` (`week_start`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_assignment_id` integer,
	`course_id` text,
	`title` text NOT NULL,
	`due_at` integer,
	`points_possible` real,
	`submitted_at` integer,
	`graded_score` real,
	`html_url` text,
	`my_status` text DEFAULT 'not_started' NOT NULL,
	`my_priority` text DEFAULT 'normal' NOT NULL,
	`est_minutes` integer,
	`is_manual` integer DEFAULT false NOT NULL,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assignments_canvas_id_idx` ON `assignments` (`canvas_assignment_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_course_id` integer,
	`name` text NOT NULL,
	`code` text,
	`term` text,
	`color_token` text DEFAULT 'iris' NOT NULL,
	`is_hidden` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_canvas_id_idx` ON `courses` (`canvas_course_id`);--> statement-breakpoint
CREATE TABLE `job_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`source` text,
	`location` text,
	`work_mode` text,
	`applied_on` text,
	`status` text DEFAULT 'saved' NOT NULL,
	`next_step` text,
	`next_step_date` text,
	`contact_name` text,
	`contact_email` text,
	`posting_url` text,
	`comp_note` text,
	`excitement` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offer_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`weight` integer DEFAULT 3 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offer_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`offer_id` text NOT NULL,
	`criterion_id` text NOT NULL,
	`score` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`criterion_id`) REFERENCES `offer_criteria`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offer_scores_offer_criterion_idx` ON `offer_scores` (`offer_id`,`criterion_id`);--> statement-breakpoint
CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`job_application_id` text,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`base_comp` text,
	`other_comp` text,
	`location` text,
	`start_date` text,
	`end_date` text,
	`respond_by` text,
	`status` text DEFAULT 'open' NOT NULL,
	`gut_check` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`job_application_id`) REFERENCES `job_applications`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `engagements` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'client' NOT NULL,
	`hours_target_weekly` real,
	`hourly_rate` real,
	`color_token` text DEFAULT 'iris' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`engagement_id` text NOT NULL,
	`session_date` text NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`minutes` integer DEFAULT 0 NOT NULL,
	`category` text,
	`description` text,
	`is_billable` integer DEFAULT false NOT NULL,
	`invoiced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`engagement_id`) REFERENCES `engagements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`google_event_id` text,
	`google_calendar_id` text,
	`title` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`is_all_day` integer DEFAULT false NOT NULL,
	`all_day_date` text,
	`location` text,
	`notes` text,
	`energy_cost` integer,
	`origin` text DEFAULT 'google' NOT NULL,
	`etag` text,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_events_google_id_idx` ON `calendar_events` (`google_event_id`);--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`granola_note_id` text NOT NULL,
	`title` text NOT NULL,
	`summary_markdown` text,
	`web_url` text,
	`started_at` integer,
	`attendees` text DEFAULT '[]' NOT NULL,
	`folder_id` text,
	`folder_name` text,
	`google_event_id` text,
	`category` text,
	`engagement_id` text,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`engagement_id`) REFERENCES `engagements`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meetings_granola_id_idx` ON `meetings` (`granola_note_id`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`sync_token` text,
	`last_success_at` integer,
	`last_error` text,
	`last_error_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_state_provider_idx` ON `sync_state` (`provider`);
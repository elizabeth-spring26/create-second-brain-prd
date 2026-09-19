DROP INDEX "daily_checkins_date_idx";--> statement-breakpoint
DROP INDEX "habit_logs_habit_date_idx";--> statement-breakpoint
DROP INDEX "weekly_reviews_week_idx";--> statement-breakpoint
DROP INDEX "assignments_canvas_id_idx";--> statement-breakpoint
DROP INDEX "courses_canvas_id_idx";--> statement-breakpoint
DROP INDEX "offer_scores_offer_criterion_idx";--> statement-breakpoint
DROP INDEX "calendar_events_google_id_idx";--> statement-breakpoint
DROP INDEX "meetings_granola_id_idx";--> statement-breakpoint
DROP INDEX "sync_state_provider_idx";--> statement-breakpoint
DROP INDEX "tasks_source_key_idx";--> statement-breakpoint
ALTER TABLE `settings` ALTER COLUMN "show_canvas" TO "show_canvas" integer NOT NULL DEFAULT true;--> statement-breakpoint
CREATE UNIQUE INDEX `daily_checkins_date_idx` ON `daily_checkins` (`log_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `habit_logs_habit_date_idx` ON `habit_logs` (`habit_id`,`log_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_reviews_week_idx` ON `weekly_reviews` (`week_start`);--> statement-breakpoint
CREATE UNIQUE INDEX `assignments_canvas_id_idx` ON `assignments` (`canvas_assignment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `courses_canvas_id_idx` ON `courses` (`canvas_course_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `offer_scores_offer_criterion_idx` ON `offer_scores` (`offer_id`,`criterion_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_events_google_id_idx` ON `calendar_events` (`google_event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `meetings_granola_id_idx` ON `meetings` (`granola_note_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sync_state_provider_idx` ON `sync_state` (`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_source_key_idx` ON `tasks` (`source`,`source_key`);--> statement-breakpoint
UPDATE `settings` SET `show_canvas` = 1;

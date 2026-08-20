ALTER TABLE `tasks` ADD `scope` text DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `period_key` text;
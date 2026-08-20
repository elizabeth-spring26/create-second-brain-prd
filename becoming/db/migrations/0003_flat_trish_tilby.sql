CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_key` text,
	`due_date` text,
	`done` integer DEFAULT false NOT NULL,
	`done_at` integer,
	`notes` text,
	`url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_source_key_idx` ON `tasks` (`source`,`source_key`);--> statement-breakpoint
ALTER TABLE `settings` ADD `show_canvas` integer DEFAULT false NOT NULL;
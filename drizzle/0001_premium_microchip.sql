CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`contact` text,
	`area` text NOT NULL,
	`source` text,
	`stage` text NOT NULL,
	`estimated_value_cents` integer DEFAULT 0 NOT NULL,
	`next_action` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_leads_owner_stage` ON `leads` (`owner_id`,`stage`);
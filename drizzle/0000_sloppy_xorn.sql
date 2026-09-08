CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`details` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_owner_created` ON `audit_logs` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`email` text,
	`phone` text,
	`city` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_clients_owner_name` ON `clients` (`owner_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_clients_owner_document` ON `clients` (`owner_id`,`document`);--> statement-breakpoint
CREATE TABLE `import_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`file_name` text NOT NULL,
	`entity` text NOT NULL,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`rejected_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_import_jobs_owner_created` ON `import_jobs` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `matters` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`client_id` text,
	`title` text NOT NULL,
	`number` text,
	`area` text NOT NULL,
	`court` text,
	`side` text,
	`stage` text NOT NULL,
	`status` text NOT NULL,
	`value_cents` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_matters_owner_status` ON `matters` (`owner_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_matters_client_id` ON `matters` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_matters_owner_number` ON `matters` (`owner_id`,`number`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`matter_id` text,
	`title` text NOT NULL,
	`description` text,
	`due_date` text NOT NULL,
	`due_time` text,
	`type` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`assignee` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_owner_status` ON `tasks` (`owner_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_owner_due_date` ON `tasks` (`owner_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_matter_id` ON `tasks` (`matter_id`);
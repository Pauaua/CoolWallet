CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`initial_balance` integer DEFAULT 0 NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`monthly_limit` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_category_idx` ON `budgets` (`category_id`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`kind` text NOT NULL,
	`budget_group` text,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `debt_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`debt_id` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`account_id` text,
	`transaction_id` text,
	`is_installment` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `debt_payments_debt_idx` ON `debt_payments` (`debt_id`);--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`creditor` text,
	`principal` integer NOT NULL,
	`installments_total` integer,
	`installments_paid_initial` integer DEFAULT 0 NOT NULL,
	`installment_amount` integer,
	`monthly_rate` real,
	`first_payment_date` text,
	`due_date` text,
	`account_id` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fixed_expense_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`fixed_expense_id` text NOT NULL,
	`due_date` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_id` text,
	`paid_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`fixed_expense_id`) REFERENCES `fixed_expenses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fixed_expense_occurrences_unique_idx` ON `fixed_expense_occurrences` (`fixed_expense_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `fixed_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`category_id` text,
	`account_id` text,
	`due_day` integer NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`active` integer DEFAULT true NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`photo_uri` text,
	`gross_salary` integer DEFAULT 0 NOT NULL,
	`pay_day` integer DEFAULT 1 NOT NULL,
	`contract_type` text DEFAULT 'dependiente' NOT NULL,
	`contract_term` text DEFAULT 'indefinite' NOT NULL,
	`afp_name` text,
	`afp_commission_rate` real DEFAULT 0 NOT NULL,
	`health_system` text DEFAULT 'fonasa' NOT NULL,
	`isapre_uf` real,
	`has_unemployment_insurance` integer DEFAULT true NOT NULL,
	`other_income` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `savings_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_amount` integer NOT NULL,
	`saved_amount` integer DEFAULT 0 NOT NULL,
	`target_date` text,
	`icon` text DEFAULT 'target' NOT NULL,
	`color` text DEFAULT 'forest' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`currency` text DEFAULT 'CLP' NOT NULL,
	`period_mode` text DEFAULT 'payday' NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`notifications_enabled` integer DEFAULT false NOT NULL,
	`biometrics_enabled` integer DEFAULT false NOT NULL,
	`lock_timeout_minutes` integer DEFAULT 1 NOT NULL,
	`backup_reminder_days` integer DEFAULT 14 NOT NULL,
	`last_backup_at` text,
	`uf_value` integer,
	`utm_value` integer,
	`indicators_as_of` text,
	`onboarding_completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`account_id` text,
	`category_id` text,
	`note` text,
	`fixed_expense_id` text,
	`debt_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fixed_expense_id`) REFERENCES `fixed_expenses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_type_date_idx` ON `transactions` (`type`,`date`);
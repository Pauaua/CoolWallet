ALTER TABLE `transactions` ADD `is_salary` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`);
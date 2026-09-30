-- "Gasto hormiga" pasa a llamarse "gasto variable" (decisión de producto).
UPDATE `transactions` SET `type` = 'variable_expense' WHERE `type` = 'ant_expense';--> statement-breakpoint
UPDATE `categories` SET `kind` = 'variable' WHERE `kind` = 'ant';

ALTER TYPE "delivery_mode" ADD VALUE 'deposito';--> statement-breakpoint
ALTER TABLE "operations" ADD COLUMN "banco" varchar(150);
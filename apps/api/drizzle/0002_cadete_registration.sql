ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apellido" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "celular" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_approval" boolean DEFAULT false NOT NULL;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_nombre_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "usuario" varchar(100);--> statement-breakpoint
UPDATE "users" SET "usuario" = "nombre" WHERE "usuario" IS NULL;--> statement-breakpoint
UPDATE "users" SET "nombre" = INITCAP("nombre");--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "usuario" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_usuario_unique" UNIQUE("usuario");

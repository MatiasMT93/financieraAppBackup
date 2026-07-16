DO $$ BEGIN
 CREATE TYPE "public"."cadete_status" AS ENUM('disponible', 'asignada', 'en_camino', 'en_destino', 'volviendo', 'incidencia');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."currency" AS ENUM('ARS', 'USD', 'EUR', 'BRL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."operation_status" AS ENUM('pendiente', 'asignada', 'en_camino', 'en_destino', 'volviendo', 'cerrada', 'cancelada', 'incidencia');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."operation_type" AS ENUM('entrega', 'retiro');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('cadete', 'coordinador', 'administrativo', 'dueno');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amount_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"cadete_id" uuid NOT NULL,
	"monto_anterior" numeric(15, 2) NOT NULL,
	"monto_nuevo" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cadet_locations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cadete_id" uuid NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"accuracy" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"cadete_id" uuid NOT NULL,
	"descripcion" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operation_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"from_status" "operation_status",
	"to_status" "operation_status" NOT NULL,
	"changed_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "operation_type" NOT NULL,
	"moneda" "currency" NOT NULL,
	"monto" numeric(15, 2) NOT NULL,
	"direccion" text NOT NULL,
	"contacto" varchar(200) NOT NULL,
	"telefono" varchar(50),
	"notas" text,
	"status" "operation_status" DEFAULT 'pendiente' NOT NULL,
	"administrativo_id" uuid NOT NULL,
	"cadete_id" uuid,
	"coordinador_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"cadete_status" "cadete_status" DEFAULT 'disponible',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "amount_corrections" ADD CONSTRAINT "amount_corrections_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "amount_corrections" ADD CONSTRAINT "amount_corrections_cadete_id_users_id_fk" FOREIGN KEY ("cadete_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cadet_locations" ADD CONSTRAINT "cadet_locations_cadete_id_users_id_fk" FOREIGN KEY ("cadete_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incidents" ADD CONSTRAINT "incidents_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incidents" ADD CONSTRAINT "incidents_cadete_id_users_id_fk" FOREIGN KEY ("cadete_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incidents" ADD CONSTRAINT "incidents_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operation_status_history" ADD CONSTRAINT "operation_status_history_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operation_status_history" ADD CONSTRAINT "operation_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operations" ADD CONSTRAINT "operations_administrativo_id_users_id_fk" FOREIGN KEY ("administrativo_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operations" ADD CONSTRAINT "operations_cadete_id_users_id_fk" FOREIGN KEY ("cadete_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operations" ADD CONSTRAINT "operations_coordinador_id_users_id_fk" FOREIGN KEY ("coordinador_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cadet_locations_cadete_time_idx" ON "cadet_locations" USING btree ("cadete_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incidents_resolved_idx" ON "incidents" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_status_idx" ON "operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operations_cadete_idx" ON "operations" USING btree ("cadete_id");
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"telefono" varchar(50),
	"direccion" text NOT NULL,
	"direccion_normalizada" text DEFAULT '' NOT NULL,
	"usos_count" integer DEFAULT 1 NOT NULL,
	"email" varchar(100),
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operation_contacts" (
	"operation_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	CONSTRAINT "operation_contacts_operation_id_contact_id_pk" PRIMARY KEY("operation_id","contact_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operation_contacts" ADD CONSTRAINT "operation_contacts_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operation_contacts" ADD CONSTRAINT "operation_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_direccion_norm_idx" ON "contacts" USING btree ("direccion_normalizada");
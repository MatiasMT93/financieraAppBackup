CREATE TABLE IF NOT EXISTS "contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "address" varchar(512),
  "phone" varchar(50),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

ALTER TABLE "contacts"
ADD COLUMN IF NOT EXISTS "address" varchar(512);

--> statement-breakpoint

DO $$
BEGIN
  -- Si la tabla anterior tenía la columna en español,
  -- conserva sus valores copiándolos a "address".
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contacts'
      AND column_name = 'direccion'
  ) THEN
    EXECUTE '
      UPDATE "contacts"
      SET "address" = COALESCE("address", "direccion"::text)
      WHERE "address" IS NULL
    ';
  END IF;
END $$;

--> statement-breakpoint

UPDATE "contacts"
SET "address" = 'Sin dirección'
WHERE "address" IS NULL;

--> statement-breakpoint

ALTER TABLE "contacts"
ALTER COLUMN "address" SET NOT NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "contacts_address_idx"
ON "contacts" USING btree ("address");

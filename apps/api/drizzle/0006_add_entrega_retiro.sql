ALTER TYPE "operation_type" ADD VALUE 'entrega_retiro';--> statement-breakpoint
ALTER TABLE "operations" ADD COLUMN "moneda2" "currency";--> statement-breakpoint
ALTER TABLE "operations" ADD COLUMN "monto2" numeric(15, 2);
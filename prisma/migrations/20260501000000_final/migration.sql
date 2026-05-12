-- Add is_private to gifts
ALTER TABLE "gifts" ADD COLUMN IF NOT EXISTS "is_private" BOOLEAN NOT NULL DEFAULT false;

-- Create logistics_orders table
CREATE TABLE IF NOT EXISTS "logistics_orders" (
  "id" SERIAL PRIMARY KEY,
  "gift_id" INTEGER NOT NULL REFERENCES "gifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "registry_id" INTEGER NOT NULL REFERENCES "registries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "courier_provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "is_fragile" BOOLEAN NOT NULL DEFAULT false,
  "white_glove" BOOLEAN NOT NULL DEFAULT false,
  "pickup_address" TEXT NOT NULL,
  "delivery_address" TEXT NOT NULL,
  "provider_order_id" TEXT,
  "estimated_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "logistics_orders_registry_id_idx" ON "logistics_orders"("registry_id");

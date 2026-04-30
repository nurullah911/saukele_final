CREATE TYPE "Role" AS ENUM ('COUPLE', 'GUEST', 'ADMIN');
CREATE TYPE "RegistryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "GiftType" AS ENUM ('SINGLE', 'POOL');
CREATE TYPE "GiftStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'PURCHASED', 'DELIVERED');
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'FUNDED', 'REFUNDED');
CREATE TYPE "KinshipType" AS ENUM ('ATA_ANA', 'TUYS', 'ZHIEN_ZHARAN', 'DOSY');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "password_hash" TEXT,
  "role" "Role" NOT NULL DEFAULT 'GUEST',
  "provider" TEXT NOT NULL DEFAULT 'local',
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "is_suspended" BOOLEAN NOT NULL DEFAULT false,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "user_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "avatar_url" TEXT,
  "bio" TEXT,
  "phone_number" TEXT,
  "city" TEXT,
  "instagram_handle" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "registries" (
  "id" SERIAL PRIMARY KEY,
  "couple_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "event_date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "cover_image_url" TEXT,
  "status" "RegistryStatus" NOT NULL DEFAULT 'DRAFT',
  "share_token" TEXT NOT NULL UNIQUE,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "registries_couple_id_idx" ON "registries"("couple_id");

CREATE TABLE "gifts" (
  "id" SERIAL PRIMARY KEY,
  "registry_id" INTEGER NOT NULL REFERENCES "registries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "price_kzt" DECIMAL(65,30) NOT NULL,
  "category" TEXT,
  "gift_type" "GiftType" NOT NULL DEFAULT 'SINGLE',
  "status" "GiftStatus" NOT NULL DEFAULT 'AVAILABLE',
  "reserved_by_user_id" INTEGER,
  "reserved_until" TIMESTAMP(3),
  "purchased_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "gifts_registry_id_idx" ON "gifts"("registry_id");

CREATE TABLE "gift_images" (
  "id" SERIAL PRIMARY KEY,
  "gift_id" INTEGER NOT NULL REFERENCES "gifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "url" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "gift_images_gift_id_idx" ON "gift_images"("gift_id");

CREATE TABLE "contributions" (
  "id" SERIAL PRIMARY KEY,
  "gift_id" INTEGER NOT NULL REFERENCES "gifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "guest_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "amount_kzt" DECIMAL(65,30) NOT NULL,
  "amount_original" DECIMAL(65,30) NOT NULL,
  "original_currency" TEXT NOT NULL,
  "exchange_rate_at_time" DECIMAL(65,30) NOT NULL,
  "locked_at" TIMESTAMP(3) NOT NULL,
  "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
  "payment_ref" TEXT,
  "message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "contributions_gift_id_status_idx" ON "contributions"("gift_id", "status");
CREATE INDEX "contributions_guest_id_idx" ON "contributions"("guest_id");

CREATE TABLE "payment_logs" (
  "id" SERIAL PRIMARY KEY,
  "contribution_id" INTEGER NOT NULL REFERENCES "contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "event" TEXT NOT NULL,
  "provider_ref" TEXT,
  "raw_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "payment_logs_contribution_id_idx" ON "payment_logs"("contribution_id");

CREATE TABLE "guest_invites" (
  "id" SERIAL PRIMARY KEY,
  "registry_id" INTEGER NOT NULL REFERENCES "registries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "guest_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "invited_by_user_id" INTEGER NOT NULL,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "responded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("registry_id", "guest_id")
);
CREATE INDEX "guest_invites_registry_id_idx" ON "guest_invites"("registry_id");

CREATE TABLE "family_relations" (
  "id" SERIAL PRIMARY KEY,
  "from_user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "to_user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "kinship_type" "KinshipType" NOT NULL,
  "tier" INTEGER NOT NULL,
  UNIQUE ("from_user_id", "to_user_id")
);

CREATE TABLE "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "target_type" TEXT,
  "target_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

CREATE TABLE "refresh_tokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" INTEGER NOT NULL,
  "metadata" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

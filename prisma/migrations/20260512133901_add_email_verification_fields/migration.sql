/*
  Warnings:

  - You are about to alter the column `amount_kzt` on the `contributions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to alter the column `amount_original` on the `contributions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,4)`.
  - You are about to alter the column `exchange_rate_at_time` on the `contributions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,6)`.
  - You are about to alter the column `price_kzt` on the `gifts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.

*/
-- DropForeignKey
ALTER TABLE "gift_images" DROP CONSTRAINT "gift_images_gift_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_user_id_fkey";

-- AlterTable
ALTER TABLE "contributions" ALTER COLUMN "amount_kzt" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "amount_original" SET DATA TYPE DECIMAL(12,4),
ALTER COLUMN "original_currency" SET DEFAULT 'KZT',
ALTER COLUMN "exchange_rate_at_time" SET DATA TYPE DECIMAL(12,6);

-- AlterTable
ALTER TABLE "gifts" ALTER COLUMN "price_kzt" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "user_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_expiry" TIMESTAMP(3),
ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "verification_expiry" TIMESTAMP(3),
ADD COLUMN     "verification_token" TEXT;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_reserved_by_user_id_fkey" FOREIGN KEY ("reserved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_images" ADD CONSTRAINT "gift_images_gift_id_fkey" FOREIGN KEY ("gift_id") REFERENCES "gifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

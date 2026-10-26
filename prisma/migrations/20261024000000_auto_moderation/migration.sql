-- AlterTable
ALTER TABLE `vehicles` ADD COLUMN `moderation_flags` JSON NULL;

-- AlterTable
ALTER TABLE `photo_jobs` ADD COLUMN `flags` JSON NULL;

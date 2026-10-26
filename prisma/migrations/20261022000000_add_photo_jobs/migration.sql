-- CreateTable
CREATE TABLE `photo_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `url_key` VARCHAR(64) NOT NULL,
    `original_url` VARCHAR(500) NOT NULL,
    `processed_url` VARCHAR(500) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `plate_found` BOOLEAN NOT NULL DEFAULT false,
    `removed_items` JSON NULL,
    `replaced_pct` DOUBLE NULL,
    `cost_usd` DECIMAL(10, 5) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `photo_jobs_url_key_key`(`url_key`),
    INDEX `photo_jobs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

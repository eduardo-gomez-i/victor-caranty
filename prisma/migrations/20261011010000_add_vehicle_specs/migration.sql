-- CreateTable
CREATE TABLE `vehicle_specs` (
    `id` VARCHAR(191) NOT NULL,
    `spec_key` VARCHAR(190) NOT NULL,
    `make` VARCHAR(60) NOT NULL,
    `model` VARCHAR(80) NOT NULL,
    `version` VARCHAR(100) NOT NULL,
    `year` INTEGER NOT NULL,
    `features` JSON NOT NULL,
    `sources` JSON NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_specs_spec_key_key`(`spec_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

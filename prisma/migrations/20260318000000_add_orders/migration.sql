-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `buyer_name` VARCHAR(191) NOT NULL,
    `buyer_email` VARCHAR(191) NULL,
    `buyer_phone` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `status` ENUM('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'NEW',
    `admin_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_vehicle_id_idx` ON `orders`(`vehicle_id`);

-- CreateIndex
CREATE INDEX `orders_status_idx` ON `orders`(`status`);

-- CreateIndex
CREATE INDEX `orders_created_at_idx` ON `orders`(`created_at`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


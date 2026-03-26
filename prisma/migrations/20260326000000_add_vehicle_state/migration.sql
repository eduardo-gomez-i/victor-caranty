-- AlterTable
ALTER TABLE `vehicles` ADD COLUMN `state` VARCHAR(50) NULL;

-- CreateIndex
CREATE INDEX `vehicles_state_idx` ON `vehicles`(`state`);

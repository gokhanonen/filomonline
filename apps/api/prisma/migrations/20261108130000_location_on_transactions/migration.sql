-- AlterTable
ALTER TABLE `FinanceMovement` ADD COLUMN `locationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Vehicle` ADD COLUMN `currentLocationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `RentalContract` ADD COLUMN `locationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `locationId` VARCHAR(191) NULL;


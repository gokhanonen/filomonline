-- AlterTable
ALTER TABLE `Company` ADD COLUMN `mersisNo` VARCHAR(191) NULL,
    ADD COLUMN `tradeRegistryNo` VARCHAR(191) NULL,
    ADD COLUMN `website` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SalesContract` ADD COLUMN `deliveryDate` DATETIME(3) NULL;


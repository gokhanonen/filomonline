-- AlterTable
ALTER TABLE `CashRegister` ADD COLUMN `accountNumber` VARCHAR(191) NULL,
    ADD COLUMN `bankName` VARCHAR(191) NULL,
    ADD COLUMN `branchName` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
    ADD COLUMN `iban` VARCHAR(191) NULL,
    ADD COLUMN `openingBalance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `type` ENUM('CASH', 'BANK', 'POS') NOT NULL DEFAULT 'CASH',
    MODIFY `locationId` VARCHAR(191) NULL,
    MODIFY `erpCode` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CashTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `cashRegisterId` VARCHAR(191) NOT NULL,
    `type` ENUM('COLLECTION', 'PAYMENT', 'TRANSFER') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NULL,
    `documentNo` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NULL,
    `invoiceType` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NULL,
    `targetRegisterId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CashTransaction_companyId_idx`(`companyId`),
    INDEX `CashTransaction_cashRegisterId_idx`(`cashRegisterId`),
    INDEX `CashTransaction_accountId_idx`(`accountId`),
    INDEX `CashTransaction_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CashTransaction` ADD CONSTRAINT `CashTransaction_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `CashRegister`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashTransaction` ADD CONSTRAINT `CashTransaction_targetRegisterId_fkey` FOREIGN KEY (`targetRegisterId`) REFERENCES `CashRegister`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


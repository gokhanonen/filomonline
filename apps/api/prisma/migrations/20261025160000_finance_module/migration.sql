-- DropForeignKey
ALTER TABLE `CashTransaction` DROP FOREIGN KEY `CashTransaction_cashRegisterId_fkey`;

-- DropForeignKey
ALTER TABLE `CashTransaction` DROP FOREIGN KEY `CashTransaction_targetRegisterId_fkey`;

-- AlterTable
ALTER TABLE `CashRegister` ADD COLUMN `cardLastFour` VARCHAR(191) NULL,
    ADD COLUMN `commissionRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `creditLimit` DECIMAL(15, 2) NULL,
    ADD COLUMN `linkedBankId` VARCHAR(191) NULL,
    ADD COLUMN `paymentDueDay` INTEGER NULL,
    ADD COLUMN `statementDay` INTEGER NULL,
    ADD COLUMN `valorDays` INTEGER NULL,
    MODIFY `type` ENUM('CASH', 'BANK', 'POS', 'CREDIT_CARD') NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE `Account` ADD COLUMN `ledgerCode` ENUM('L120', 'L320', 'L329') NULL;

-- AlterTable
ALTER TABLE `PurchaseInvoice` ADD COLUMN `dueDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `SalesInvoice` ADD COLUMN `dueDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `RentalInvoice` ADD COLUMN `dueDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Expense` ADD COLUMN `dueDate` DATETIME(3) NULL;

-- DropTable
DROP TABLE `CashTransaction`;

-- CreateTable
CREATE TABLE `FinanceMovement` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `type` ENUM('COLLECTION', 'PAYMENT', 'TRANSFER', 'POS_COLLECTION', 'POS_SETTLEMENT', 'COMMISSION', 'CARD_EXPENSE', 'CARD_PAYMENT', 'CHEQUE_RECEIVED', 'CHEQUE_ENDORSED', 'CHEQUE_COLLECTED', 'CHEQUE_BOUNCED', 'CHEQUE_ISSUED', 'CHEQUE_PAID') NOT NULL,
    `module` ENUM('CASH', 'BANK', 'POS', 'CREDIT_CARD', 'CHEQUE') NOT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `cashRegisterId` VARCHAR(191) NULL,
    `chequeId` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `amountTry` DECIMAL(15, 2) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NULL,
    `valueDate` DATETIME(3) NULL,
    `settled` BOOLEAN NOT NULL DEFAULT true,
    `settlementId` VARCHAR(191) NULL,
    `documentNo` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinanceMovement_companyId_date_idx`(`companyId`, `date`),
    INDEX `FinanceMovement_companyId_groupId_idx`(`companyId`, `groupId`),
    INDEX `FinanceMovement_cashRegisterId_idx`(`cashRegisterId`),
    INDEX `FinanceMovement_chequeId_idx`(`chequeId`),
    INDEX `FinanceMovement_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cheque` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `kind` ENUM('CHEQUE', 'NOTE') NOT NULL DEFAULT 'CHEQUE',
    `direction` ENUM('RECEIVED', 'ISSUED') NOT NULL,
    `status` ENUM('PORTFOLIO', 'IN_COLLECTION', 'ENDORSED', 'COLLECTED', 'BOUNCED', 'RETURNED', 'ISSUED', 'PAID') NOT NULL,
    `serialNo` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NULL,
    `branchName` VARCHAR(191) NULL,
    `drawer` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'TRY',
    `accountId` VARCHAR(191) NULL,
    `holderAccountId` VARCHAR(191) NULL,
    `bankRegisterId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Cheque_companyId_status_idx`(`companyId`, `status`),
    INDEX `Cheque_companyId_dueDate_idx`(`companyId`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `movementId` VARCHAR(191) NOT NULL,
    `invoiceType` ENUM('SALES', 'PURCHASE', 'RENTAL', 'EXPENSE') NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentAllocation_companyId_invoiceType_invoiceId_idx`(`companyId`, `invoiceType`, `invoiceId`),
    INDEX `PaymentAllocation_movementId_idx`(`movementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CashRegister` ADD CONSTRAINT `CashRegister_linkedBankId_fkey` FOREIGN KEY (`linkedBankId`) REFERENCES `CashRegister`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceMovement` ADD CONSTRAINT `FinanceMovement_cashRegisterId_fkey` FOREIGN KEY (`cashRegisterId`) REFERENCES `CashRegister`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceMovement` ADD CONSTRAINT `FinanceMovement_chequeId_fkey` FOREIGN KEY (`chequeId`) REFERENCES `Cheque`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentAllocation` ADD CONSTRAINT `PaymentAllocation_movementId_fkey` FOREIGN KEY (`movementId`) REFERENCES `FinanceMovement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


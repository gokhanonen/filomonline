-- AlterTable
ALTER TABLE `LeadQuote` ADD COLUMN `createdById` VARCHAR(191) NULL,
    ADD COLUMN `customerRespondedAt` DATETIME(3) NULL,
    ADD COLUMN `customerResponse` ENUM('ACCEPTED', 'CALLBACK') NULL,
    ADD COLUMN `lastViewedAt` DATETIME(3) NULL,
    ADD COLUMN `shareRevokedAt` DATETIME(3) NULL,
    ADD COLUMN `shareToken` VARCHAR(191) NULL,
    ADD COLUMN `viewCount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `LeadQuoteOption` (
    `id` VARCHAR(191) NOT NULL,
    `quoteId` VARCHAR(191) NOT NULL,
    `type` ENUM('CASH', 'LOAN', 'TRADE_IN', 'INSTALLMENT') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `price` DECIMAL(15, 2) NOT NULL,
    `downPayment` DECIMAL(15, 2) NULL,
    `tradeInValue` DECIMAL(15, 2) NULL,
    `tradeInNote` VARCHAR(191) NULL,
    `installmentCount` INTEGER NULL,
    `monthlyPayment` DECIMAL(15, 2) NULL,
    `interestRate` DECIMAL(5, 2) NULL,
    `note` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `LeadQuoteOption_quoteId_idx`(`quoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `LeadQuote_shareToken_key` ON `LeadQuote`(`shareToken`);

-- AddForeignKey
ALTER TABLE `LeadQuoteOption` ADD CONSTRAINT `LeadQuoteOption_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `LeadQuote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


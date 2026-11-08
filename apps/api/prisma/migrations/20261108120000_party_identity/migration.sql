-- AlterTable
ALTER TABLE `Account` ADD COLUMN `partyId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Lead` ADD COLUMN `partyId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Party` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `entityType` ENUM('INDIVIDUAL', 'CORPORATE') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `taxNumber` VARCHAR(191) NULL,
    `tckn` VARCHAR(191) NULL,
    `taxOffice` VARCHAR(191) NULL,
    `contactPerson` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Party_tenantId_idx`(`tenantId`),
    INDEX `Party_tenantId_phone_idx`(`tenantId`, `phone`),
    INDEX `Party_tenantId_email_idx`(`tenantId`, `email`),
    INDEX `Party_tenantId_taxNumber_idx`(`tenantId`, `taxNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Account_partyId_idx` ON `Account`(`partyId`);

-- CreateIndex
CREATE INDEX `Lead_partyId_idx` ON `Lead`(`partyId`);

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_partyId_fkey` FOREIGN KEY (`partyId`) REFERENCES `Party`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_partyId_fkey` FOREIGN KEY (`partyId`) REFERENCES `Party`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Party` ADD CONSTRAINT `Party_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


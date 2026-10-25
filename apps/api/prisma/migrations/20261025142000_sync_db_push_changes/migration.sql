-- DropForeignKey
ALTER TABLE `Brand` DROP FOREIGN KEY `Brand_tenantId_fkey`;

-- DropIndex
DROP INDEX `Brand_tenantId_name_key` ON `Brand`;

-- AlterTable
ALTER TABLE `SalesInvoice` ADD COLUMN `matrah` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `profitMargin` DECIMAL(15, 2) NULL,
    ADD COLUMN `purchaseRegime` VARCHAR(191) NULL,
    ADD COLUMN `saleAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `serviceFeeVat` DECIMAL(15, 2) NULL,
    ADD COLUMN `vatAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    MODIFY `entityType` ENUM('INDIVIDUAL', 'CORPORATE') NOT NULL DEFAULT 'CORPORATE';

-- AlterTable
ALTER TABLE `Vehicle` DROP COLUMN `salePrice`,
    ADD COLUMN `purchaseNotaryPrice` DECIMAL(15, 2) NULL,
    ADD COLUMN `purchaseRegime` VARCHAR(191) NOT NULL DEFAULT 'sahis',
    ADD COLUMN `saleAmount` DECIMAL(15, 2) NULL,
    ADD COLUMN `shareToken` VARCHAR(191) NULL,
    ADD COLUMN `tensf` DECIMAL(15, 2) NULL;

-- AlterTable
ALTER TABLE `VehicleCategory` ADD COLUMN `code` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `VehicleShareLink` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `hidePlate` BOOLEAN NOT NULL DEFAULT false,
    `customPrice` DECIMAL(15, 2) NULL,
    `customNote` TEXT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `lastViewedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VehicleShareLink_token_key`(`token`),
    INDEX `VehicleShareLink_vehicleId_idx`(`vehicleId`),
    INDEX `VehicleShareLink_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `source` ENUM('SAHIBINDEN', 'ARABAM', 'WEBSITE', 'WALK_IN', 'REFERRAL', 'SOCIAL_MEDIA', 'PHONE', 'OTHER') NOT NULL DEFAULT 'WALK_IN',
    `status` ENUM('NEW', 'CONTACTED', 'TEST_DRIVE', 'QUOTE_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST') NOT NULL DEFAULT 'NEW',
    `budget` DECIMAL(15, 2) NULL,
    `notes` TEXT NULL,
    `lostReason` VARCHAR(191) NULL,
    `assignedUserId` VARCHAR(191) NULL,
    `convertedAccountId` VARCHAR(191) NULL,
    `convertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lead_companyId_idx`(`companyId`),
    INDEX `Lead_companyId_status_idx`(`companyId`, `status`),
    INDEX `Lead_companyId_createdAt_idx`(`companyId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadInterestedVehicle` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadInterestedVehicle_leadId_idx`(`leadId`),
    INDEX `LeadInterestedVehicle_vehicleId_idx`(`vehicleId`),
    UNIQUE INDEX `LeadInterestedVehicle_leadId_vehicleId_key`(`leadId`, `vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadTestDrive` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 30,
    `driverLicenseNo` VARCHAR(191) NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    `assignedUserId` VARCHAR(191) NULL,
    `feedbackRating` INTEGER NULL,
    `feedbackNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeadTestDrive_companyId_idx`(`companyId`),
    INDEX `LeadTestDrive_leadId_idx`(`leadId`),
    INDEX `LeadTestDrive_vehicleId_idx`(`vehicleId`),
    INDEX `LeadTestDrive_companyId_scheduledAt_idx`(`companyId`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadQuote` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `quoteNumber` VARCHAR(191) NOT NULL,
    `vehiclePrice` DECIMAL(15, 2) NOT NULL,
    `offeredPrice` DECIMAL(15, 2) NOT NULL,
    `discountAmount` DECIMAL(15, 2) NULL DEFAULT 0,
    `paymentType` VARCHAR(191) NULL,
    `validUntil` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `terms` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeadQuote_companyId_idx`(`companyId`),
    INDEX `LeadQuote_leadId_idx`(`leadId`),
    INDEX `LeadQuote_vehicleId_idx`(`vehicleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadActivity` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `userName` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadActivity_leadId_idx`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Brand_tenantId_categoryId_idx` ON `Brand`(`tenantId`, `categoryId`);

-- CreateIndex
CREATE UNIQUE INDEX `Brand_tenantId_categoryId_name_key` ON `Brand`(`tenantId`, `categoryId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `Vehicle_shareToken_key` ON `Vehicle`(`shareToken`);

-- CreateIndex
CREATE INDEX `VehicleCategory_tenantId_code_idx` ON `VehicleCategory`(`tenantId`, `code`);

-- AddForeignKey
ALTER TABLE `Brand` ADD CONSTRAINT `Brand_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Brand` ADD CONSTRAINT `Brand_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `VehicleCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleShareLink` ADD CONSTRAINT `VehicleShareLink_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadInterestedVehicle` ADD CONSTRAINT `LeadInterestedVehicle_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadInterestedVehicle` ADD CONSTRAINT `LeadInterestedVehicle_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadTestDrive` ADD CONSTRAINT `LeadTestDrive_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadTestDrive` ADD CONSTRAINT `LeadTestDrive_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQuote` ADD CONSTRAINT `LeadQuote_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQuote` ADD CONSTRAINT `LeadQuote_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadActivity` ADD CONSTRAINT `LeadActivity_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


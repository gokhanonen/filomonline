-- AlterTable
ALTER TABLE `SubscriptionPlan` ADD COLUMN `annualCampaignPrice` DECIMAL(15, 2) NULL,
    ADD COLUMN `annualListPrice` DECIMAL(15, 2) NULL,
    ADD COLUMN `annualMonthsCharged` INTEGER NULL,
    ADD COLUMN `campaignEndsAt` DATETIME(3) NULL,
    ADD COLUMN `freeTransactionLimit` INTEGER NULL,
    ADD COLUMN `graceOveragePct` INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN `includedLocations` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `includedUsers` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `includedVehicles` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `monthlyCampaignPrice` DECIMAL(15, 2) NULL,
    ADD COLUMN `monthlyListPrice` DECIMAL(15, 2) NULL,
    ADD COLUMN `trialDays` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'TRIAL',
    `period` ENUM('MONTHLY', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
    `currentPeriodStart` DATETIME(3) NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `trialEndsAt` DATETIME(3) NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `canceledAt` DATETIME(3) NULL,
    `priceSnapshot` DECIMAL(15, 2) NULL,
    `customPrice` DECIMAL(15, 2) NULL,
    `couponId` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_tenantId_key`(`tenantId`),
    INDEX `Subscription_status_idx`(`status`),
    INDEX `Subscription_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Coupon` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('PERCENT', 'FIXED', 'MONTHS_FREE') NOT NULL,
    `value` DECIMAL(15, 2) NOT NULL,
    `description` VARCHAR(191) NULL,
    `appliesToPlanCodes` VARCHAR(191) NULL,
    `maxRedemptions` INTEGER NULL,
    `redeemedCount` INTEGER NOT NULL DEFAULT 0,
    `validFrom` DATETIME(3) NULL,
    `validUntil` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Coupon_code_key`(`code`),
    INDEX `Coupon_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


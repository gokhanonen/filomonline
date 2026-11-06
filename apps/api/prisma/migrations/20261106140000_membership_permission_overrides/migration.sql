-- AlterTable
ALTER TABLE `CompanyMembership` ADD COLUMN `permissionsDeny` JSON NULL,
    ADD COLUMN `permissionsGrant` JSON NULL;


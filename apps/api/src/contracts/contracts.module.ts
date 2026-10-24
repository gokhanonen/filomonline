import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SalesContractsService } from "./sales-contracts.service";
import { SalesContractsController } from "./sales-contracts.controller";
import { ContractTemplatesService } from "./contract-templates.service";
import { ContractTemplatesController } from "./contract-templates.controller";

@Module({
  imports: [PrismaModule],
  controllers: [SalesContractsController, ContractTemplatesController],
  providers: [SalesContractsService, ContractTemplatesService],
  exports: [SalesContractsService, ContractTemplatesService],
})
export class ContractsModule {}

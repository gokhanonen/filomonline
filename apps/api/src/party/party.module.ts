import { Global, Module } from "@nestjs/common";
import { PartyService } from "./party.service";
import { PartyController } from "./party.controller";

/**
 * Party (holding-global kimlik) modülü. Global: accounts/crm oluştururken
 * PartyService.forCompany ile kişiyi tenant genelinde tekilleştirir.
 */
@Global()
@Module({
  controllers: [PartyController],
  providers: [PartyService],
  exports: [PartyService],
})
export class PartyModule {}

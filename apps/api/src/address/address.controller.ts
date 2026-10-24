import { Controller, Get, ParseIntPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AddressService } from "./address.service";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("address")
@ApiBearerAuth()
@Public()
@SkipCompany()
@Controller("address")
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /** GET /address/cities — tüm iller */
  @Get("cities")
  getCities() {
    return this.addressService.getCities();
  }

  /** GET /address/districts?cityId=34 — ilçeler */
  @ApiQuery({ name: "cityId", required: true, type: Number })
  @Get("districts")
  getDistricts(@Query("cityId", ParseIntPipe) cityId: number) {
    return this.addressService.getDistricts(cityId);
  }

  /** GET /address/neighborhoods?districtId=123&q=Bağ — mahalleler (autocomplete) */
  @ApiQuery({ name: "districtId", required: true, type: Number })
  @ApiQuery({ name: "q", required: false, type: String })
  @Get("neighborhoods")
  getNeighborhoods(
    @Query("districtId", ParseIntPipe) districtId: number,
    @Query("q") q?: string,
  ) {
    return this.addressService.getNeighborhoods(districtId, q);
  }
}

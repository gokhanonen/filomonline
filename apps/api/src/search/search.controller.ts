import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { SearchService } from "./search.service";

@ApiTags("search")
@ApiBearerAuth()
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @CompanyId() companyId: string,
    @Query("q") q: string,
  ) {
    return this.searchService.search(companyId, q);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { ProductsService } from "./products.service";
import {
  CreateProductDto,
  QueryProductsDto,
  UpdateProductDto,
} from "./dto/product.dto";

@ApiTags("products")
@ApiBearerAuth()
@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @RequirePermissions("products.write")
  @Post()
  create(@CompanyId() companyId: string, @Body() dto: CreateProductDto) {
    return this.products.create(companyId, dto);
  }

  @RequirePermissions("products.read")
  @Get()
  findAll(@CompanyId() companyId: string, @Query() q: QueryProductsDto) {
    return this.products.findAll(companyId, q);
  }

  @RequirePermissions("products.read")
  @Get(":id")
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.products.findOne(companyId, id);
  }

  @RequirePermissions("products.write")
  @Patch(":id")
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(companyId, id, dto);
  }

  @RequirePermissions("products.delete")
  @Delete(":id")
  remove(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.products.remove(companyId, id);
  }
}

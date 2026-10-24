import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { CompanyId } from "../tenancy/company-id.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { ActivityService } from "./activity.service";

class QueryActivityDto extends PaginationDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() unreadOnly?: boolean;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() entityId?: string;
}

@ApiTags("activity")
@ApiBearerAuth()
@Controller("activity")
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  list(@CompanyId() companyId: string, @Query() q: QueryActivityDto) {
    return this.activity.list(companyId, q);
  }

  @Get("unread-count")
  unread(@CompanyId() companyId: string) {
    return this.activity.unreadCount(companyId);
  }

  @Patch("read-all")
  readAll(@CompanyId() companyId: string) {
    return this.activity.markAllRead(companyId);
  }

  @Patch(":id/read")
  read(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.activity.markRead(companyId, id);
  }
}

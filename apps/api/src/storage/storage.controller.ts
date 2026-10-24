import {
  Body,
  Controller,
  ForbiddenException,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { StorageService } from "./storage.service";
import { PresignDownloadDto, PresignUploadDto } from "./dto/presign.dto";

@ApiTags("storage")
@ApiBearerAuth()
@Controller("storage")
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Doğrudan yükleme için imzalı URL. Anahtar companyId ile klasörlenir. */
  @Post("presign-upload")
  presignUpload(@CompanyId() companyId: string, @Body() dto: PresignUploadDto) {
    const key = this.storage.buildKey(companyId, dto.scope, dto.fileName);
    return this.storage.presignUpload(key, dto.contentType);
  }

  /** Nesneyi okumak için imzalı URL. Yalnızca kendi şirketinin anahtarı. */
  @Post("presign-download")
  async presignDownload(
    @CompanyId() companyId: string,
    @Body() dto: PresignDownloadDto,
  ) {
    if (!dto.key.startsWith(`${companyId}/`)) {
      throw new ForbiddenException("Bu dosyaya erişim yetkiniz yok");
    }
    const url = await this.storage.presignDownload(dto.key);
    return { url };
  }
}

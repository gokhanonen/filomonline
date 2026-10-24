import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class StartConversationDto {
  @IsString() @MinLength(1) userId: string;
  @IsOptional() @IsString() vehicleId?: string;
}

export class SendMessageDto {
  @IsString() @MinLength(1, { message: "Mesaj boş olamaz" }) @MaxLength(4000) content: string;
}

export class QueryMessagesDto {
  /** Bu mesaj id'sinden önceki (daha eski) mesajlar — cursor */
  @IsOptional() @IsString() before?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 50;
}

import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { ChatService } from "./chat.service";
import { QueryMessagesDto, SendMessageDto, StartConversationDto } from "./dto/chat.dto";

@ApiTags("chat")
@ApiBearerAuth()
@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get("users")
  users(@CompanyId() companyId: string, @CurrentUser() user: AuthUser) {
    return this.chat.users(companyId, user.id);
  }

  @Get("unread-count")
  unread(@CompanyId() companyId: string, @CurrentUser() user: AuthUser) {
    return this.chat.unreadCount(companyId, user.id);
  }

  @Get("conversations")
  conversations(@CompanyId() companyId: string, @CurrentUser() user: AuthUser) {
    return this.chat.conversations(companyId, user.id);
  }

  @Post("conversations")
  start(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: StartConversationDto,
  ) {
    return this.chat.startConversation(companyId, user.id, dto);
  }

  @Get("conversations/:id/messages")
  messages(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query() q: QueryMessagesDto,
  ) {
    return this.chat.messages(companyId, user.id, id, q);
  }

  @Post("conversations/:id/messages")
  send(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.send(companyId, user.id, id, dto);
  }

  @Patch("conversations/:id/read")
  read(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.chat.markRead(companyId, user.id, id);
  }
}

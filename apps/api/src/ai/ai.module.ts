import { Global, Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { ClaudeService } from "./claude.service";

@Global()
@Module({
  controllers: [AiController],
  providers: [ClaudeService],
  exports: [ClaudeService],
})
export class AiModule {}

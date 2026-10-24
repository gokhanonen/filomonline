import { Test, TestingModule } from "@nestjs/testing";
import { ClaudeService } from "./claude.service";
import { SettingsService } from "../settings/settings.service";
import { BadRequestException } from "@nestjs/common";

describe("ClaudeService", () => {
  let service: ClaudeService;

  const mockSettings = {
    getRaw: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaudeService,
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compile();

    service = module.get<ClaudeService>(ClaudeService);
  });

  describe("getActiveConfig", () => {
    it("should return default config if none in DB", async () => {
      mockSettings.getRaw.mockResolvedValue(null);
      const conf = await service.getActiveConfig();
      expect(conf.model).toBe("claude-3-5-haiku-20241022");
      expect(conf.maxTokens).toBe(1024);
    });

    it("should return custom config from DB", async () => {
      mockSettings.getRaw.mockResolvedValue({
        apiKey: "sk-ant-testkey",
        model: "claude-3-5-sonnet-20241022",
        maxTokens: 2048,
        temperature: 0.2,
      });
      const conf = await service.getActiveConfig();
      expect(conf.apiKey).toBe("sk-ant-testkey");
      expect(conf.model).toBe("claude-3-5-sonnet-20241022");
      expect(conf.maxTokens).toBe(2048);
      expect(conf.temperature).toBe(0.2);
    });
  });

  describe("sendMessage", () => {
    it("should throw if no apiKey configured", async () => {
      mockSettings.getRaw.mockResolvedValue(null);
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY;

      await expect(
        service.sendMessage({ prompt: "Merhaba" }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

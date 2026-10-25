import { Test, TestingModule } from "@nestjs/testing";
import { CrmService } from "./crm.service";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../activity/activity.service";
import { ClaudeService } from "../ai/claude.service";
import { LeadSource, LeadStatus } from "@prisma/client";

describe("CrmService", () => {
  let service: CrmService;

  const mockPrisma = {
    lead: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    leadInterestedVehicle: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    leadTestDrive: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    leadQuote: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    leadActivity: {
      create: jest.fn(),
    },
    vehicle: {
      findFirst: jest.fn(),
    },
    account: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockActivity = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockClaude = {
    sendMessage: jest.fn().mockResolvedValue({
      text: "Merhaba Ahmet Bey! 34 ABC 123 plakalı BMW 320i aracımız sizi bekliyor.",
      model: "claude-haiku-5-5",
      latencyMs: 320,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ActivityService, useValue: mockActivity },
        { provide: ClaudeService, useValue: mockClaude },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createLead", () => {
    it("creates a new lead and logs activity", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ name: "Satış Danışmanı" });
      mockPrisma.lead.create.mockResolvedValue({
        id: "lead-1",
        fullName: "Ahmet Yılmaz",
        companyId: "comp-1",
        status: LeadStatus.NEW,
        source: LeadSource.WALK_IN,
      });

      const res = await service.createLead("comp-1", "user-1", {
        fullName: "Ahmet Yılmaz",
        phone: "05321112233",
        source: LeadSource.WALK_IN,
      });

      expect(res.id).toBe("lead-1");
      expect(mockPrisma.lead.create).toHaveBeenCalled();
      expect(mockActivity.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "LEAD_NEW",
          companyId: "comp-1",
        }),
      );
    });
  });

  describe("convertToCustomer", () => {
    it("creates an Account and marks lead as CONVERTED", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ name: "Satış Danışmanı" });
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: "lead-1",
        companyId: "comp-1",
        fullName: "Ahmet Yılmaz",
        phone: "05321112233",
        email: "ahmet@example.com",
        status: LeadStatus.QUOTE_SENT,
        convertedAccountId: null,
      });

      mockPrisma.account.create.mockResolvedValue({
        id: "acc-1",
        name: "Ahmet Yılmaz",
        type: "CUSTOMER",
      });

      mockPrisma.lead.update.mockResolvedValue({
        id: "lead-1",
        status: LeadStatus.CONVERTED,
        convertedAccountId: "acc-1",
      });

      const result = await service.convertToCustomer("comp-1", "lead-1", "user-1", {
        entityType: "INDIVIDUAL",
        city: "İstanbul",
      });

      expect(result.account.id).toBe("acc-1");
      expect(result.lead.status).toBe(LeadStatus.CONVERTED);
      expect(mockPrisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: "comp-1",
            name: "Ahmet Yılmaz",
            type: "CUSTOMER",
          }),
        }),
      );
      expect(mockActivity.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "LEAD_CONVERTED",
        }),
      );
    });
  });

  describe("generateAiMessage", () => {
    it("generates a WhatsApp proposal draft using Claude", async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: "lead-1",
        companyId: "comp-1",
        fullName: "Ahmet Yılmaz",
        phone: "05321112233",
      });

      mockPrisma.vehicle.findFirst.mockResolvedValue({
        id: "veh-1",
        companyId: "comp-1",
        plate: "34 ABC 123",
        brandName: "BMW",
        modelName: "320i",
        year: 2022,
        saleAmount: 1850000,
      });

      const res = await service.generateAiMessage("comp-1", {
        leadId: "lead-1",
        vehicleId: "veh-1",
      });

      expect(res.message).toContain("Ahmet Bey");
      expect(mockClaude.sendMessage).toHaveBeenCalled();
    });
  });
});

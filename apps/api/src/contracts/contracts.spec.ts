import { ContractKind, SalesContractStatus } from "@prisma/client";
import { ContractTemplatesService } from "./contract-templates.service";
import { SalesContractsService } from "./sales-contracts.service";
import { DEFAULT_RENTAL_CONTRACT_HTML, DEFAULT_SALES_CONTRACT_HTML } from "./default-templates";

describe("Contracts & Templates Engine", () => {
  let templatesService: ContractTemplatesService;
  let salesService: SalesContractsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      contractTemplate: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      salesContract: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      salesContractInstallment: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      rentalContract: {
        findFirst: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
      vehicle: {
        findUnique: jest.fn(),
      },
      account: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb) => {
        if (typeof cb === "function") {
          return cb(mockPrisma);
        }
        return Promise.all(cb);
      }),
    };

    const mockActivity = { log: jest.fn().mockResolvedValue({}) };
    templatesService = new ContractTemplatesService(mockPrisma as any);
    salesService = new SalesContractsService(mockPrisma as any, mockActivity as any);
  });

  describe("ContractTemplatesService", () => {
    it("should auto-seed default templates if none exist for tenant", async () => {
      mockPrisma.contractTemplate.findMany
        .mockResolvedValueOnce([]) // First call empty
        .mockResolvedValueOnce([
          { id: "tmpl-1", type: ContractKind.SALES, name: "Satış Şablonu", isDefault: true },
          { id: "tmpl-2", type: ContractKind.RENTAL, name: "Kira Şablonu", isDefault: true },
        ]); // Second call after seed

      const templates = await templatesService.findAll("tenant-1");
      expect(mockPrisma.contractTemplate.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ type: ContractKind.SALES }),
          expect.objectContaining({ type: ContractKind.RENTAL }),
        ]),
      });
      expect(templates.length).toBe(2);
    });

    it("should render sales contract with customer, vehicle and installment table", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "comp-1",
        name: "Test Otomotiv A.Ş.",
        taxNumber: "1234567890",
        taxOffice: "Kadıköy",
        address: "İstanbul",
        phone: "0216 111 22 33",
      });

      mockPrisma.salesContract.findFirst.mockResolvedValue({
        id: "sale-1",
        companyId: "comp-1",
        vehicleId: "veh-1",
        documentNo: "SOZ-2026-001",
        contractDate: new Date("2026-10-24"),
        customerName: "Ahmet Yılmaz",
        customerIdentityNumber: "11111111110",
        customerPhone: "0555 444 33 22",
        customerAddress: "Kadıköy / İstanbul",
        price: 1500000,
        grandTotal: 1500000,
        installments: [
          { date: new Date("2026-11-24"), amount: 500000, type: "SENET" },
          { date: new Date("2026-12-24"), amount: 500000, type: "SENET" },
        ],
      });

      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: "veh-1",
        plate: "34ABC789",
        brandName: "BMW",
        modelName: "320i",
        year: 2023,
        chassisNo: "WBA123456789",
        engineNo: "ENG98765",
        colorName: "Siyah",
      });

      const result = await templatesService.render("tenant-1", "comp-1", {
        contractType: ContractKind.SALES,
        contractId: "sale-1",
      });

      expect(result.title).toContain("SOZ-2026-001");
      expect(result.html).toContain("Test Otomotiv A.Ş.");
      expect(result.html).toContain("34ABC789");
      expect(result.html).toContain("Ahmet Yılmaz");
      expect(result.html).toContain("1.500.000,00 ₺");
      expect(result.html).toContain("1. Taksit");
      expect(result.html).toContain("SENET");
      expect(result.html).not.toContain("{{plaka}}");
      expect(result.html).not.toContain("{{musteri_adi}}");
    });

    it("should render rental contract with drivers and duration", async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: "comp-1",
        name: "Test Filo A.Ş.",
      });

      mockPrisma.rentalContract.findFirst.mockResolvedValue({
        id: "rent-1",
        companyId: "comp-1",
        vehicleId: "veh-1",
        documentNo: "KIRA-2026-99",
        contractDate: new Date("2026-10-24"),
        customerName: "Mehmet Demir",
        customerTcTaxNo: "99999999999",
        durationMonths: 24,
        kmLimit: 30000,
        monthlyPrice: 45000,
        drivers: ["Ali Veli (TC: 12345)", "Ayşe Fatma (TC: 67890)"],
      });

      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: "veh-1",
        plate: "06DEF123",
        brandName: "Renault",
        modelName: "Megane",
        year: 2024,
      });

      const result = await templatesService.render("tenant-1", "comp-1", {
        contractType: ContractKind.RENTAL,
        contractId: "rent-1",
      });

      expect(result.title).toContain("KIRA-2026-99");
      expect(result.html).toContain("Test Filo A.Ş.");
      expect(result.html).toContain("06DEF123");
      expect(result.html).toContain("Mehmet Demir");
      expect(result.html).toContain("24 AY");
      expect(result.html).toContain("30.000 KM");
      expect(result.html).toContain("Ali Veli");
      expect(result.html).not.toContain("{{plaka}}");
    });
  });

  describe("SalesContractsService", () => {
    it("should create sales contract with installments in transaction", async () => {
      mockPrisma.salesContract.create.mockResolvedValue({
        id: "sc-1",
        companyId: "comp-1",
        vehicleId: "v-1",
        documentNo: "SOZ-001",
        customerName: "Veli Can",
        price: 800000,
        installments: [{ id: "inst-1", amount: 800000, type: "NAKİT" }],
      });
      mockPrisma.vehicle.findUnique.mockResolvedValue({ id: "v-1", plate: "34XYZ99" });
      mockPrisma.account.findUnique.mockResolvedValue(null);

      const created = await salesService.create("comp-1", "user-1", {
        vehicleId: "v-1",
        documentNo: "SOZ-001",
        contractDate: "2026-10-24",
        customerName: "Veli Can",
        price: 800000,
        installments: [{ date: "2026-10-24", amount: 800000, type: "NAKİT" }],
      });

      expect(created.id).toBe("sc-1");
      expect(created.vehicle.plate).toBe("34XYZ99");
    });
  });
});

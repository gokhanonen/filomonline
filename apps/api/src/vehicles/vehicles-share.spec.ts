import { Test, TestingModule } from "@nestjs/testing";
import { VehiclesService } from "./vehicles.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { NotFoundException } from "@nestjs/common";

describe("VehiclesService - Public Share Links", () => {
  let service: VehiclesService;

  const mockPrisma = {
    vehicle: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    vehicleShareLink: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
  };

  const mockStorage = {
    presignDownload: jest.fn().mockImplementation((key: string) => Promise.resolve(`https://s3.example.com/${key}`)),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  describe("getOrCreateShareLink", () => {
    it("should return existing active default link if no custom parameters provided", async () => {
      mockPrisma.vehicle.count.mockResolvedValue(1);
      const existingLink = {
        id: "link-1",
        vehicleId: "veh-1",
        companyId: "comp-1",
        token: "tok123456789",
        title: null,
        hidePlate: false,
        customPrice: null,
        isActive: true,
        viewCount: 3,
      };
      mockPrisma.vehicleShareLink.findFirst.mockResolvedValue(existingLink);

      const result = await service.getOrCreateShareLink("comp-1", "veh-1");
      expect(result).toBe(existingLink);
      expect(mockPrisma.vehicleShareLink.create).not.toHaveBeenCalled();
    });

    it("should create a new share link with custom price and hidePlate", async () => {
      mockPrisma.vehicle.count.mockResolvedValue(1);
      const createdLink = {
        id: "link-2",
        vehicleId: "veh-1",
        companyId: "comp-1",
        token: "customtoken1",
        title: "Müşteri Teklifi",
        hidePlate: true,
        customPrice: 750000,
        customNote: "Pazarlık payı yoktur",
        isActive: true,
        viewCount: 0,
      };
      mockPrisma.vehicleShareLink.create.mockResolvedValue(createdLink);
      mockPrisma.vehicle.update.mockResolvedValue({});

      const result = await service.getOrCreateShareLink("comp-1", "veh-1", {
        title: "Müşteri Teklifi",
        hidePlate: true,
        customPrice: 750000,
        customNote: "Pazarlık payı yoktur",
      });

      expect(result).toBe(createdLink);
      expect(mockPrisma.vehicleShareLink.create).toHaveBeenCalled();
    });
  });

  describe("getPublicVehicleByToken - Vehicle sold & active scenarios", () => {
    const mockCompany = {
      id: "comp-1",
      name: "Filo A.Ş.",
      legalName: "Filo Otomotiv Tic. A.Ş.",
      phone: "+90 555 111 2233",
      email: "info@filo.com",
      address: "İstanbul Kadıköy",
      logoUrl: "logos/comp1.png",
    };

    it("should return active vehicle details with photos and company when status is STOKTA", async () => {
      const shareLink = {
        id: "link-1",
        vehicleId: "veh-1",
        companyId: "comp-1",
        token: "act123456789",
        hidePlate: false,
        customPrice: null,
        customNote: "Temiz aile aracı",
        isActive: true,
      };
      mockPrisma.vehicleShareLink.findUnique.mockResolvedValue(shareLink);
      mockPrisma.vehicleShareLink.update.mockResolvedValue({});

      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: "veh-1",
        companyId: "comp-1",
        status: "STOKTA",
        plate: "34 ABC 789",
        brandName: "Renault",
        modelName: "Megane",
        year: 2021,
        km: 65000,
        listPrice: 850000,
        fuelType: "DIZEL",
        transmission: "OTOMATIK",
        colorName: "Gri",
        warranty: true,
        spareKey: true,
        photos: [
          { id: "p1", category: "COVER", fileKey: "veh/1/cover.jpg", url: null, thumbUrl: null, sortOrder: 0 },
        ],
        tramerSet: [],
        options: [],
      });

      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);

      const res = await service.getPublicVehicleByToken("act123456789");

      expect(res.status).toBe("active");
      expect((res as any).vehicle.plate).toBe("34 ABC 789");
      expect((res as any).vehicle.brandName).toBe("Renault");
      expect((res as any).vehicle.photos[0].url).toContain("https://s3.example.com/");
      expect((res as any).company.name).toBe("Filo A.Ş.");
    });

    it("CRITICAL RULE: should return disabled status with reason 'SOLD' when vehicle status is SATILDI", async () => {
      const shareLink = {
        id: "link-1",
        vehicleId: "veh-1",
        companyId: "comp-1",
        token: "act123456789",
        hidePlate: false,
        customPrice: null,
        isActive: true,
      };
      mockPrisma.vehicleShareLink.findUnique.mockResolvedValue(shareLink);

      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: "veh-1",
        companyId: "comp-1",
        status: "SATILDI", // Aracın satışı gerçekleşti!
        plate: "34 ABC 789",
        brandName: "Renault",
        modelName: "Megane",
        year: 2021,
        photos: [],
        tramerSet: [],
        options: [],
      });

      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);

      const res = await service.getPublicVehicleByToken("act123456789");

      expect(res.status).toBe("disabled");
      expect((res as any).reason).toBe("SOLD");
      expect((res as any).message).toContain("satışı tamamlandığı için");
      expect((res as any).vehicleSummary.brandName).toBe("Renault");
    });

    it("should return disabled status with reason 'INACTIVE' if link was manually deactivated", async () => {
      const shareLink = {
        id: "link-1",
        vehicleId: "veh-1",
        companyId: "comp-1",
        token: "deact123",
        hidePlate: false,
        customPrice: null,
        isActive: false, // Manuel pasife alınmış
      };
      mockPrisma.vehicleShareLink.findUnique.mockResolvedValue(shareLink);

      mockPrisma.vehicle.findUnique.mockResolvedValue({
        id: "veh-1",
        companyId: "comp-1",
        status: "STOKTA",
        plate: "34 ABC 789",
        brandName: "Renault",
        modelName: "Megane",
        photos: [],
        tramerSet: [],
        options: [],
      });

      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);

      const res = await service.getPublicVehicleByToken("deact123");

      expect(res.status).toBe("disabled");
      expect((res as any).reason).toBe("INACTIVE");
    });

    it("should throw NotFoundException if token does not exist", async () => {
      mockPrisma.vehicleShareLink.findUnique.mockResolvedValue(null);
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getPublicVehicleByToken("invalid-token")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

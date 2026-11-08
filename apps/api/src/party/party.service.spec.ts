import { Test } from "@nestjs/testing";
import { PartyService } from "./party.service";
import { PrismaService } from "../prisma/prisma.service";

describe("PartyService — dedup (findOrCreate)", () => {
  let service: PartyService;
  const prisma = {
    party: { findFirst: jest.fn(), create: jest.fn() },
    company: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [PartyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(PartyService);
  });

  it("telefon eşleşiyorsa mevcut Party döner (yeni oluşturmaz)", async () => {
    prisma.party.findFirst.mockResolvedValue({ id: "p1", name: "Ahmet" });
    const p = await service.findOrCreate("t1", {
      entityType: "INDIVIDUAL",
      name: "Ahmet Y.",
      phone: "+90 532 111 22 33",
    });
    expect(p.id).toBe("p1");
    expect(prisma.party.create).not.toHaveBeenCalled();
    // normalize: +90 ve boşluklar temizlenip son 10 hane ile aranır
    const where = prisma.party.findFirst.mock.calls[0][0].where;
    expect(where.OR).toEqual(expect.arrayContaining([{ phone: "5321112233" }]));
    expect(where.tenantId).toBe("t1");
  });

  it("eşleşme yoksa yeni Party oluşturur (normalize edilmiş alanlarla)", async () => {
    prisma.party.findFirst.mockResolvedValue(null);
    prisma.party.create.mockResolvedValue({ id: "p2" });
    const p = await service.findOrCreate("t1", {
      entityType: "CORPORATE",
      name: "Deniz A.Ş.",
      email: "  INFO@Deniz.COM ",
      taxNumber: "123-456-7890",
    });
    expect(p.id).toBe("p2");
    const data = prisma.party.create.mock.calls[0][0].data;
    expect(data.email).toBe("info@deniz.com");
    expect(data.taxNumber).toBe("1234567890");
    expect(data.tenantId).toBe("t1");
  });

  it("hiç anahtar yoksa doğrudan oluşturur (findFirst çağrılmaz)", async () => {
    prisma.party.create.mockResolvedValue({ id: "p3" });
    await service.findOrCreate("t1", { entityType: "INDIVIDUAL", name: "İsimsiz" });
    expect(prisma.party.findFirst).not.toHaveBeenCalled();
    expect(prisma.party.create).toHaveBeenCalled();
  });

  it("forCompany: tenant yoksa null döner", async () => {
    prisma.company.findUnique.mockResolvedValue(null);
    const p = await service.forCompany("cX", { entityType: "INDIVIDUAL", name: "X" });
    expect(p).toBeNull();
  });
});

import { PrismaService } from "./prisma.service";
import { SOFT_DELETE_MODELS } from "./soft-delete";

describe("soft delete (PrismaService)", () => {
  const prisma = new PrismaService();
  afterAll(() => prisma.$disconnect());

  it("silinebilir modellerde fiziksel delete/deleteMany yasak (sorgu DB'ye gitmeden)", async () => {
    await expect(prisma.lead.delete({ where: { id: "yok" } })).rejects.toThrow(/fiziksel silinmez/);
    await expect(prisma.vehicle.deleteMany({ where: { id: "yok" } })).rejects.toThrow(/fiziksel silinmez/);
    await expect(prisma.financeMovement.deleteMany({ where: { groupId: "yok" } })).rejects.toThrow(/fiziksel silinmez/);
  });

  it("iş kayıtları listede, yetki kayıtları listede değil", () => {
    for (const m of ["Lead", "Vehicle", "Expense", "SalesInvoice", "FinanceMovement", "Document", "Brand"] as const) {
      expect(SOFT_DELETE_MODELS.has(m)).toBe(true);
    }
    for (const m of ["User", "CompanyMembership", "Role", "RefreshToken"] as const) {
      expect(SOFT_DELETE_MODELS.has(m)).toBe(false);
    }
  });
});

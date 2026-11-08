import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated, PaginationDto } from "../common/dto/pagination.dto";
import {
  CreateCompanyDto,
  CreateCompanyForHoldingDto,
  UpdateCompanyDto,
} from "./dto/company.dto";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    const tenant = await this.prisma.tenant.count({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException("Holding bulunamadı");
    return this.prisma.company.create({ data: dto });
  }

  /**
   * Holding yöneticisinin kendi holding'i (tenant) altında firma açması.
   * tenantId guard'dan gelir. Oluşturan kullanıcı otomatik firma yöneticisi (isAdmin)
   * yapılır ve firmaya 2 varsayılan lokasyon (Merkez + Şube) kurulur — sistem lokasyon
   * bazlı çalıştığı için firma hemen kullanılabilir olsun.
   */
  async createForHolding(
    tenantId: string,
    userId: string,
    dto: CreateCompanyForHoldingDto,
  ) {
    const tenant = await this.prisma.tenant.count({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Holding bulunamadı");

    const code = this.slugCode(dto.name);
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { ...dto, tenantId },
      });
      // Oluşturan kullanıcı firma yöneticisi
      await tx.companyMembership.create({
        data: { userId, companyId: company.id, isAdmin: true },
      });
      // Varsayılan lokasyonlar (lokasyon bazlı çalışma: firmasız/lokasyonsuz kalmasın)
      await tx.location.createMany({
        data: [
          { companyId: company.id, name: `${dto.name} - Merkez`, code: `${code}-MRK`, city: "İstanbul", isActive: true },
          { companyId: company.id, name: `${dto.name} - Şube`, code: `${code}-SB1`, city: "İstanbul", isActive: true },
        ],
      });
      return company;
    });
  }

  /** Firma adından kısa kod türet (TR karakterleri sadeleştir). */
  private slugCode(name: string): string {
    const map: Record<string, string> = { Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U" };
    return (
      name
        .toLocaleUpperCase("tr")
        .replace(/[ÇĞİÖŞÜ]/g, (m) => map[m] ?? m)
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6) || "FRM"
    );
  }

  /** Holding (tenant) içindeki firmaları listeler — firma yöneticisi self-servis. */
  async findAllForTenant(tenantId: string, q: PaginationDto): Promise<Paginated<unknown>> {
    return this.findAll(q, tenantId);
  }

  async findAll(q: PaginationDto, tenantId?: string): Promise<Paginated<unknown>> {
    const where: Prisma.CompanyWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(q.search ? { name: { contains: q.search } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          tenant: { select: { id: true, name: true } },
          _count: { select: { memberships: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!company) throw new NotFoundException("Şirket bulunamadı");
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.ensureExists(id);
    const updated = await this.prisma.company.update({ where: { id }, data: dto });

    try {
      const existingSetting = await this.prisma.setting.findUnique({
        where: { companyId_key: { companyId: id, key: "company.info" } },
      });
      const currentVal = (existingSetting?.value as Record<string, unknown>) ?? {};
      const nextVal = {
        ...currentVal,
        ...(dto.name !== undefined ? { title: dto.name } : {}),
        ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
        ...(dto.taxOffice !== undefined ? { taxOffice: dto.taxOffice } : {}),
        ...(dto.taxNumber !== undefined ? { taxNumber: dto.taxNumber } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.logoUrl !== undefined ? { logoKey: dto.logoUrl, logoUrl: dto.logoUrl } : {}),
      };
      await this.prisma.setting.upsert({
        where: { companyId_key: { companyId: id, key: "company.info" } },
        create: { companyId: id, key: "company.info", value: nextVal as Prisma.InputJsonValue },
        update: { value: nextVal as Prisma.InputJsonValue },
      });
    } catch {
      // Opsiyonel senkronizasyon
    }

    return updated;
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.company.count({ where: { id } });
    if (!exists) throw new NotFoundException("Şirket bulunamadı");
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated, PaginationDto } from "../common/dto/pagination.dto";
import { CreateCompanyDto, UpdateCompanyDto } from "./dto/company.dto";

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
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.company.count({ where: { id } });
    if (!exists) throw new NotFoundException("Şirket bulunamadı");
  }
}

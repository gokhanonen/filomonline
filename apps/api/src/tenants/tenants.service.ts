import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated, PaginationDto } from "../common/dto/pagination.dto";
import { slugify } from "../common/slug";
import { CreateTenantDto, UpdateTenantDto } from "./dto/tenant.dto";
import { CatalogService } from "../catalog/catalog.service";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async create(dto: CreateTenantDto) {
    const slug = await this.uniqueSlug(dto.slug ?? slugify(dto.name));
    try {
      const tenant = await this.prisma.tenant.create({
        data: { name: dto.name, slug, plan: dto.plan },
      });

      // Yeni holding için varsayılan araç kataloğunu ve yönetici rolünü otomatik yükle
      await this.catalog.seedDefaultsForTenant(tenant.id);

      return tenant;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ConflictException("Bu slug zaten kullanılıyor");
      }
      throw e;
    }
  }

  async findAll(q: PaginationDto): Promise<Paginated<unknown>> {
    const where: Prisma.TenantWhereInput = q.search
      ? {
          OR: [
            { name: { contains: q.search } },
            { slug: { contains: q.search } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { _count: { select: { companies: true, users: true } } },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        companies: { select: { id: true, name: true, isActive: true } },
        _count: { select: { users: true, roles: true } },
      },
    });
    if (!tenant) throw new NotFoundException("Holding bulunamadı");
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.ensureExists(id);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.tenant.count({ where: { id } });
    if (!exists) throw new NotFoundException("Holding bulunamadı");
  }

  private async uniqueSlug(base: string): Promise<string> {
    const root = base || "tenant";
    let candidate = root;
    let i = 1;
    while (await this.prisma.tenant.count({ where: { slug: candidate } })) {
      candidate = `${root}-${++i}`;
    }
    return candidate;
  }
}

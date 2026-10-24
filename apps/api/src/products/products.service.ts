import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import {
  CreateProductDto,
  QueryProductsDto,
  UpdateProductDto,
} from "./dto/product.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: { ...dto, companyId },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ConflictException("Bu kod zaten kullanılıyor");
      }
      throw e;
    }
  }

  async findAll(
    companyId: string,
    q: QueryProductsDto,
  ): Promise<Paginated<unknown>> {
    const where: Prisma.ProductWhereInput = {
      companyId,
      ...(q.type ? { type: q.type } : {}),
      ...(q.onlyActive ? { isActive: true } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { code: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });
    if (!product) throw new NotFoundException("Ürün bulunamadı");
    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(companyId, id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}

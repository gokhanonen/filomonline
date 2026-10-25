import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SalesContractStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Paginated } from "../common/dto/pagination.dto";
import { ActivityService } from "../activity/activity.service";
import {
  CreateSalesContractDto,
  QuerySalesContractsDto,
  UpdateSalesContractDto,
} from "./dto/sales-contract.dto";

@Injectable()
export class SalesContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateSalesContractDto) {
    const { installments, ...contractData } = dto;

    const res = await this.prisma.$transaction(async (tx) => {
      const contract = await tx.salesContract.create({
        data: {
          companyId,
          createdById: userId,
          ...contractData,
          price: contractData.price,
          contractDate: new Date(contractData.contractDate),
          validUntil: contractData.validUntil ? new Date(contractData.validUntil) : null,
          deliveryDate: contractData.deliveryDate ? new Date(contractData.deliveryDate) : null,
          grandTotal: contractData.grandTotal ?? contractData.price,
          status: contractData.status ?? SalesContractStatus.DRAFT,
          installments: installments && installments.length > 0 ? {
            create: installments.map((inst, idx) => ({
              date: new Date(inst.date),
              amount: inst.amount,
              type: inst.type || "NAKİT",
              sortOrder: inst.sortOrder ?? idx,
            })),
          } : undefined,
        },
        include: {
          installments: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return this.enrichContract(contract);
    });

    void this.activity.log({
      companyId,
      userId,
      type: "CONTRACT_NEW",
      title: `Sözleşme: ${res.documentNo || "Yeni Satış Sözleşmesi"}`,
      description: `${res.customerName || "Müşteri"} için satış sözleşmesi düzenlendi`,
      entityType: "contract",
      entityId: res.id,
      link: "/contracts",
    });

    return res;
  }

  async findAll(
    companyId: string,
    q: QuerySalesContractsDto,
  ): Promise<Paginated<any>> {
    const where: Prisma.SalesContractWhereInput = {
      companyId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.vehicleId ? { vehicleId: q.vehicleId } : {}),
      ...(q.search
        ? {
            OR: [
              { customerName: { contains: q.search } },
              { documentNo: { contains: q.search } },
              { customerIdentityNumber: { contains: q.search } },
              { customerTaxNumber: { contains: q.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salesContract.findMany({
        where,
        include: {
          installments: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { contractDate: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.salesContract.count({ where }),
    ]);

    const enrichedItems = await Promise.all(items.map((item) => this.enrichContract(item)));

    return { items: enrichedItems, total, page: q.page, pageSize: q.pageSize };
  }

  async findOne(companyId: string, id: string) {
    const contract = await this.prisma.salesContract.findFirst({
      where: { id, companyId },
      include: {
        installments: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException("Satış sözleşmesi bulunamadı");
    }

    return this.enrichContract(contract);
  }

  async findByVehicle(companyId: string, vehicleId: string) {
    const contracts = await this.prisma.salesContract.findMany({
      where: { companyId, vehicleId },
      include: {
        installments: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { contractDate: "desc" },
    });

    return Promise.all(contracts.map((c) => this.enrichContract(c)));
  }

  async update(companyId: string, id: string, dto: UpdateSalesContractDto) {
    await this.ensureExists(companyId, id);
    const { installments, ...updateData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (installments !== undefined) {
        // Eski taksitleri silip yenilerini oluştur
        await tx.salesContractInstallment.deleteMany({
          where: { salesContractId: id },
        });

        if (installments.length > 0) {
          await tx.salesContractInstallment.createMany({
            data: installments.map((inst, idx) => ({
              salesContractId: id,
              date: new Date(inst.date),
              amount: inst.amount,
              type: inst.type || "NAKİT",
              sortOrder: inst.sortOrder ?? idx,
            })),
          });
        }
      }

      const updated = await tx.salesContract.update({
        where: { id },
        data: {
          ...updateData,
          contractDate: updateData.contractDate ? new Date(updateData.contractDate) : undefined,
          validUntil: updateData.validUntil !== undefined ? (updateData.validUntil ? new Date(updateData.validUntil) : null) : undefined,
          deliveryDate: updateData.deliveryDate !== undefined ? (updateData.deliveryDate ? new Date(updateData.deliveryDate) : null) : undefined,
        },
        include: {
          installments: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return this.enrichContract(updated);
    });
  }

  async remove(companyId: string, id: string) {
    await this.ensureExists(companyId, id);
    await this.prisma.salesContract.update({
      where: { id },
      data: { status: SalesContractStatus.CANCELLED },
    });
    return { success: true };
  }

  private async ensureExists(companyId: string, id: string) {
    const exists = await this.prisma.salesContract.count({
      where: { id, companyId },
    });
    if (!exists) throw new NotFoundException("Satış sözleşmesi bulunamadı");
  }

  private async enrichContract(contract: any) {
    const [vehicle, customer] = await Promise.all([
      contract.vehicleId
        ? this.prisma.vehicle.findUnique({
            where: { id: contract.vehicleId },
            select: {
              id: true,
              plate: true,
              brandName: true,
              modelName: true,
              year: true,
              chassisNo: true,
              engineNo: true,
              colorName: true,
              status: true,
              purchasePrice: true,
              purchaseNotaryPrice: true,
            },
          })
        : null,
      contract.customerId
        ? this.prisma.account.findUnique({
            where: { id: contract.customerId },
            select: {
              id: true,
              name: true,
              taxNumber: true,
              tckn: true,
              taxOffice: true,
              phone: true,
              email: true,
              address: true,
            },
          })
        : null,
    ]);

    return {
      ...contract,
      vehicle,
      customer,
    };
  }
}

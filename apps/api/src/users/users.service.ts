import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateUserDto,
  MembershipDto,
  SetMembershipsDto,
  UpdateUserDto,
} from "./dto/user.dto";

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  extension: true,
  avatarUrl: true,
  isActive: true,
  isSuperAdmin: true,
  createdAt: true,
  memberships: {
    select: {
      id: true,
      isAdmin: true,
      isDefault: true,
      company: { select: { id: true, name: true } },
      roles: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateUserDto) {
    await this.validateMemberships(tenantId, dto.memberships);
    const passwordHash = await argon2.hash(dto.password);
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          phone: dto.phone,
          extension: dto.extension,
          avatarUrl: dto.avatarUrl,
          tenantId,
          memberships: dto.memberships?.length
            ? { create: dto.memberships.map((m) => this.membershipCreate(m)) }
            : undefined,
        },
        select: userSelect,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ConflictException("Bu e-posta zaten kayıtlı");
      }
      throw e;
    }
  }

  findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: userSelect,
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: userSelect,
    });
    if (!user) throw new NotFoundException("Kullanıcı bulunamadı");
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.ensureInTenant(tenantId, id);
    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      phone: dto.phone,
      extension: dto.extension,
      avatarUrl: dto.avatarUrl,
      isActive: dto.isActive,
    };
    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  /** Kullanıcının şirket üyeliklerini (ve rollerini) tümüyle değiştirir. */
  async setMemberships(tenantId: string, id: string, dto: SetMembershipsDto) {
    await this.ensureInTenant(tenantId, id);
    await this.validateMemberships(tenantId, dto.memberships);
    await this.prisma.$transaction([
      this.prisma.companyMembership.deleteMany({ where: { userId: id } }),
      ...dto.memberships.map((m) =>
        this.prisma.companyMembership.create({
          data: { userId: id, ...this.membershipCreate(m) },
        }),
      ),
    ]);
    return this.findOne(tenantId, id);
  }

  // --- yardımcılar ---

  private membershipCreate(m: MembershipDto) {
    return {
      companyId: m.companyId,
      isAdmin: m.isAdmin ?? false,
      isDefault: m.isDefault ?? false,
      roles: m.roleIds?.length
        ? { connect: m.roleIds.map((rid) => ({ id: rid })) }
        : undefined,
    };
  }

  private async ensureInTenant(tenantId: string, id: string) {
    const exists = await this.prisma.user.count({ where: { id, tenantId } });
    if (!exists) throw new NotFoundException("Kullanıcı bulunamadı");
  }

  /** Verilen şirket ve rollerin hepsinin bu tenant'a ait olduğunu doğrular. */
  private async validateMemberships(
    tenantId: string,
    memberships?: MembershipDto[],
  ) {
    if (!memberships?.length) return;
    const companyIds = [...new Set(memberships.map((m) => m.companyId))];
    const roleIds = [
      ...new Set(memberships.flatMap((m) => m.roleIds ?? [])),
    ];

    const companyCount = await this.prisma.company.count({
      where: { id: { in: companyIds }, tenantId },
    });
    if (companyCount !== companyIds.length) {
      throw new BadRequestException("Geçersiz şirket seçimi");
    }
    if (roleIds.length) {
      const roleCount = await this.prisma.role.count({
        where: { id: { in: roleIds }, tenantId },
      });
      if (roleCount !== roleIds.length) {
        throw new BadRequestException("Geçersiz rol seçimi");
      }
    }
  }
}

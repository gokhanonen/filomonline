import { Injectable } from "@nestjs/common";
import { EntityType, Party, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface PartyInput {
  entityType: EntityType;
  name: string;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  tckn?: string | null;
  taxOffice?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  district?: string | null;
  postalCode?: string | null;
}

/** Sadece rakam (telefon/VKN/TCKN dedup için). */
function digits(v?: string | null): string | null {
  if (!v) return null;
  const d = v.replace(/\D/g, "");
  return d.length ? d : null;
}
/** TR telefonunu normalize et: rakamlar, 90 ülke kodu/0 baştan at → son 10 hane. */
function normPhone(v?: string | null): string | null {
  let d = digits(v);
  if (!d) return null;
  if (d.length > 10) d = d.slice(-10);
  return d;
}
function normEmail(v?: string | null): string | null {
  const e = v?.trim().toLowerCase();
  return e || null;
}

/**
 * Party (holding-global kimlik) yönetimi. Aynı kişi/kurum tenant içinde TEKİL;
 * VKN > TCKN > telefon > email sırasıyla eşleştirilir, yoksa yeni oluşturulur.
 */
@Injectable()
export class PartyService {
  constructor(private readonly prisma: PrismaService) {}

  private async tenantOf(companyId: string): Promise<string | null> {
    const c = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { tenantId: true },
    });
    return c?.tenantId ?? null;
  }

  /** Tenant içinde eşleşen Party'yi bulur; yoksa oluşturur. */
  async findOrCreate(
    tenantId: string,
    input: PartyInput,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Party> {
    const phone = normPhone(input.phone);
    const email = normEmail(input.email);
    const taxNumber = digits(input.taxNumber);
    const tckn = digits(input.tckn);

    const or: Prisma.PartyWhereInput[] = [];
    if (taxNumber) or.push({ taxNumber });
    if (tckn) or.push({ tckn });
    if (phone) or.push({ phone });
    if (email) or.push({ email });

    if (or.length) {
      const existing = await tx.party.findFirst({
        where: { tenantId, deletedAt: null, OR: or },
        orderBy: { createdAt: "asc" },
      });
      if (existing) return existing;
    }

    return tx.party.create({
      data: {
        tenantId,
        entityType: input.entityType,
        name: input.name,
        phone,
        email,
        taxNumber,
        tckn,
        taxOffice: input.taxOffice ?? undefined,
        contactPerson: input.contactPerson ?? undefined,
        address: input.address ?? undefined,
        neighborhood: input.neighborhood ?? undefined,
        city: input.city ?? undefined,
        district: input.district ?? undefined,
        postalCode: input.postalCode ?? undefined,
      },
    });
  }

  /** companyId'den tenant'ı çözüp findOrCreate çağırır. Tenant yoksa null döner (bağlanmaz). */
  async forCompany(companyId: string, input: PartyInput): Promise<Party | null> {
    const tenantId = await this.tenantOf(companyId);
    if (!tenantId) return null;
    return this.findOrCreate(tenantId, input);
  }

  /**
   * Holding-geneli kimlik görünümü: kişinin tenant içindeki TÜM firmalardaki
   * cari ilişkileri (bakiye) + lead'leri. Tenant doğrulaması yapılır.
   */
  async overview(partyId: string, tenantId: string) {
    const party = await this.prisma.party.findFirst({
      where: { id: partyId, tenantId, deletedAt: null },
    });
    if (!party) return null;

    const [accounts, leads] = await Promise.all([
      this.prisma.account.findMany({
        where: { partyId },
        select: {
          id: true,
          companyId: true,
          type: true,
          balance: true,
          isPotential: true,
        },
      }),
      this.prisma.lead.findMany({
        where: { partyId, deletedAt: null },
        select: { id: true, companyId: true, status: true, createdAt: true },
      }),
    ]);

    // Firma adlarını tek sorguda çöz
    const companyIds = [
      ...new Set([...accounts.map((a) => a.companyId), ...leads.map((l) => l.companyId)]),
    ];
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds.length ? companyIds : ["__none__"] } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(companies.map((c) => [c.id, c.name]));

    return {
      party: {
        id: party.id,
        name: party.name,
        entityType: party.entityType,
        phone: party.phone,
        email: party.email,
        taxNumber: party.taxNumber,
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        companyId: a.companyId,
        companyName: nameOf.get(a.companyId) ?? "—",
        type: a.type,
        balance: Number(a.balance),
        isPotential: a.isPotential,
      })),
      leads: leads.map((l) => ({
        id: l.id,
        companyId: l.companyId,
        companyName: nameOf.get(l.companyId) ?? "—",
        status: l.status,
        createdAt: l.createdAt,
      })),
    };
  }
}

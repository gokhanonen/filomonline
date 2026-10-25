import { Prisma } from "@prisma/client";

/**
 * Veri asla fiziksel silinmez (CLAUDE.md). Bu modellerde "sil" = `deletedAt` yazmak.
 * PrismaService üzerinden yapılan okuma sorgularına otomatik `deletedAt: null` eklenir;
 * gizli kayıtlara bilerek erişmek için where'e `deletedAt` yazın (ör. geri getirme).
 * Seed betikleri düz PrismaClient kullandığı için etkilenmez.
 */
export const SOFT_DELETE_MODELS = new Set<Prisma.ModelName>([
  "Lead",
  "LeadQuote",
  "LeadTestDrive",
  "Expense",
  "PurchaseInvoice",
  "SalesInvoice",
  "RentalInvoice",
  "FinanceMovement",
  "Cheque",
  "Document",
  "CashRegister",
  "Vehicle",
  "VehiclePhoto",
  "VehicleListingUrl",
  "VehicleTramerRecord",
  "VehicleShareLink",
  "Brand",
  "VehicleModel",
  "ListingSource",
  "ContractTemplate",
  "DocumentCategory",
  "DocumentType",
  "Color",
  "BodyType",
  "VehicleType",
  "VehicleCategory",
]);

const FILTERED_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
]);

/** where'de deletedAt açıkça yazılmışsa (geri getirme, gizlileri listeleme) dokunulmaz */
const mentionsDeletedAt = (where: unknown) => Boolean(where && typeof where === "object" && "deletedAt" in where);

export const softDeleteExtension = Prisma.defineExtension({
  name: "soft-delete",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model as Prisma.ModelName)) return query(args);
        if (operation === "delete" || operation === "deleteMany") {
          throw new Error(
            `${model}.${operation} yasak: veri fiziksel silinmez. update({ data: { deletedAt: new Date() } }) kullanın (CLAUDE.md).`,
          );
        }
        if (FILTERED_OPS.has(operation)) {
          const a = (args ?? {}) as { where?: Record<string, unknown> };
          if (!mentionsDeletedAt(a.where)) a.where = { ...(a.where ?? {}), deletedAt: null };
          return query(a as typeof args);
        }
        return query(args);
      },
    },
  },
});

/** Gizleme verisi: tek yerden, tutarlı */
export const softDeleteData = () => ({ deletedAt: new Date() });

type Delegate = {
  findFirst(args: unknown): Promise<{ id: string } | null>;
  update(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
};

/**
 * Benzersiz alanlı tanımlar (marka, renk, evrak tipi…): aynı anahtarla gizlenmiş kayıt varsa
 * geri getirilir, yoksa oluşturulur. Silinmiş kayıt benzersiz anahtarı işgal etmeye devam ettiği için.
 */
export async function createOrRestore<T>(delegate: unknown, uniqueWhere: Record<string, unknown>, data: Record<string, unknown>): Promise<T> {
  const d = delegate as Delegate;
  const hidden = await d.findFirst({ where: { ...uniqueWhere, deletedAt: { not: null } } });
  if (hidden) return (await d.update({ where: { id: hidden.id, deletedAt: { not: null } }, data: { ...data, deletedAt: null } })) as T;
  return (await d.create({ data })) as T;
}

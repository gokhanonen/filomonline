import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  CreditLotType,
  CreditTxnType,
  Payment,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentsService } from "../payments/payments.service";

export const CREDITS_PRODUCT_TYPE = "CREDITS";

/** "YYYY-MM" dönem anahtarı (sunucu/Türkiye yerel ayı). */
function periodKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
/** İçinde bulunulan ayın son anı (ücretsiz lot son kullanma). */
function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

interface BalanceSplit {
  total: number;
  free: number; // süreli (expiry'li) kalan
  paid: number; // süresiz kalan
}

@Injectable()
export class CreditsService implements OnModuleInit {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  /** Satın alınan kontörün teslimatını ödeme modülüne kaydet. */
  onModuleInit() {
    this.payments.registerFulfillment(CREDITS_PRODUCT_TYPE, (payment, tx) =>
      this.fulfillPurchase(payment, tx),
    );
  }

  // --- Yardımcılar -----------------------------------------------------------

  private async ensureWallet(tx: Prisma.TransactionClient, companyId: string) {
    const existing = await tx.creditWallet.findUnique({ where: { companyId } });
    if (existing) return existing;
    return tx.creditWallet.create({ data: { companyId } });
  }

  /** Geçerli (süresi geçmemiş) lotların kalanını toplar; free/paid ayırır. */
  private async validBalance(
    tx: Prisma.TransactionClient,
    walletId: string,
    now = new Date(),
  ): Promise<BalanceSplit> {
    const lots = await tx.creditLot.findMany({
      where: {
        walletId,
        remaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { remaining: true, expiresAt: true },
    });
    let free = 0;
    let paid = 0;
    for (const l of lots) {
      if (l.expiresAt) free += l.remaining;
      else paid += l.remaining;
    }
    return { total: free + paid, free, paid };
  }

  private async recomputeCache(tx: Prisma.TransactionClient, walletId: string) {
    const b = await this.validBalance(tx, walletId);
    await tx.creditWallet.update({
      where: { id: walletId },
      data: { balance: b.total, freeBalance: b.free, paidBalance: b.paid },
    });
    return b;
  }

  /** Firmanın planındaki aylık hediye kontörü (plan yoksa varsayılan plan / 0). */
  private async planMonthlyFreeCredits(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<number> {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: {
        tenant: {
          select: {
            subscriptionPlan: {
              select: { monthlyFreeCredits: true, isActive: true },
            },
          },
        },
      },
    });
    const plan = company?.tenant?.subscriptionPlan;
    if (plan && plan.isActive) return plan.monthlyFreeCredits;
    const def = await tx.subscriptionPlan.findFirst({
      where: { isDefault: true, isActive: true },
    });
    return def?.monthlyFreeCredits ?? 0;
  }

  /**
   * Bu ay için hediye kontör verilmemişse verir; geçmiş aydan kalan ücretsiz
   * lotları süre dolmuş sayıp düşer. Satın alınan (süresiz) lotlara dokunmaz.
   */
  private async ensureMonthlyGrant(
    tx: Prisma.TransactionClient,
    companyId: string,
  ) {
    const wallet = await this.ensureWallet(tx, companyId);
    const period = periodKey();
    if (wallet.lastGrantPeriod === period) return wallet;

    const now = new Date();
    // Geçmiş dönemden kalan / süresi dolmuş ücretsiz lotları kapat.
    const stale = await tx.creditLot.findMany({
      where: {
        walletId: wallet.id,
        type: CreditLotType.FREE_MONTHLY,
        remaining: { gt: 0 },
        OR: [{ periodKey: { not: period } }, { expiresAt: { lt: now } }],
      },
    });
    for (const lot of stale) {
      await tx.creditLot.update({
        where: { id: lot.id },
        data: { remaining: 0 },
      });
      const after = await this.validBalance(tx, wallet.id);
      await tx.creditTransaction.create({
        data: {
          companyId,
          walletId: wallet.id,
          type: CreditTxnType.EXPIRE,
          amount: -lot.remaining,
          balanceAfter: after.total,
          operation: "monthly_expire",
          lotId: lot.id,
          note: `${lot.periodKey ?? ""} ücretsiz kontör süresi doldu`,
        },
      });
    }

    const freeCredits = await this.planMonthlyFreeCredits(tx, companyId);
    if (freeCredits > 0) {
      const lot = await tx.creditLot.create({
        data: {
          companyId,
          walletId: wallet.id,
          type: CreditLotType.FREE_MONTHLY,
          amount: freeCredits,
          remaining: freeCredits,
          periodKey: period,
          expiresAt: endOfMonth(now),
          note: `${period} aylık hediye kontör`,
        },
      });
      const after = await this.validBalance(tx, wallet.id);
      await tx.creditTransaction.create({
        data: {
          companyId,
          walletId: wallet.id,
          type: CreditTxnType.GRANT,
          amount: freeCredits,
          balanceAfter: after.total,
          operation: "monthly_grant",
          lotId: lot.id,
          note: `${period} aylık hediye`,
        },
      });
    }

    const updated = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: { lastGrantPeriod: period },
    });
    await this.recomputeCache(tx, wallet.id);
    return updated;
  }

  // --- Dışa açık API ---------------------------------------------------------

  /** Cüzdan + güncel bakiye (aylık hediyeyi tembel olarak garanti eder). */
  async getWallet(companyId: string) {
    const b = await this.prisma.$transaction(async (tx) => {
      await this.ensureMonthlyGrant(tx, companyId);
      return this.recomputeCache(tx, (await this.ensureWallet(tx, companyId)).id);
    });
    return {
      balance: b.total,
      freeBalance: b.free,
      paidBalance: b.paid,
    };
  }

  async listTransactions(companyId: string, take = 50) {
    return this.prisma.creditTransaction.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  /**
   * AI işlemi için kontör harcar. Önce bu ayki ÜCRETSİZ lotlar, biterse ÜCRETLİ
   * (süresiz) lotlar düşer (FIFO). Bakiye yetmezse 402 (PAYMENT_REQUIRED) fırlatır.
   */
  async spend(
    companyId: string,
    userId: string | undefined,
    opts: {
      operation: string;
      amount?: number;
      referenceType?: string;
      referenceId?: string;
      note?: string;
    },
  ) {
    const amount = opts.amount ?? 1;
    if (amount <= 0) throw new BadRequestException("Harcama miktarı geçersiz.");

    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.ensureMonthlyGrant(tx, companyId);
      const now = new Date();
      const before = await this.validBalance(tx, wallet.id, now);
      if (before.total < amount) {
        throw new HttpException(
          {
            message:
              "Yeterli kontörünüz yok. Lütfen kontör satın alın ya da aylık hediyenizi bekleyin.",
            code: "CREDITS_INSUFFICIENT",
            balance: before.total,
            required: amount,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      // FIFO: süreli (ücretsiz) lotlar önce — expiry'ye göre artan, sonra süresizler.
      const lots = await tx.creditLot.findMany({
        where: {
          walletId: wallet.id,
          remaining: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });
      lots.sort((a, b) => {
        if (a.expiresAt && b.expiresAt)
          return a.expiresAt.getTime() - b.expiresAt.getTime();
        if (a.expiresAt && !b.expiresAt) return -1; // süreli önce
        if (!a.expiresAt && b.expiresAt) return 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      let left = amount;
      let lastLotId: string | undefined;
      for (const lot of lots) {
        if (left <= 0) break;
        const take = Math.min(left, lot.remaining);
        await tx.creditLot.update({
          where: { id: lot.id },
          data: { remaining: lot.remaining - take },
        });
        left -= take;
        lastLotId = lot.id;
      }

      const after = await this.validBalance(tx, wallet.id, now);
      const txn = await tx.creditTransaction.create({
        data: {
          companyId,
          walletId: wallet.id,
          type: CreditTxnType.SPEND,
          amount: -amount,
          balanceAfter: after.total,
          operation: opts.operation,
          referenceType: opts.referenceType,
          referenceId: opts.referenceId,
          lotId: lastLotId,
          userId,
          note: opts.note,
        },
      });
      await this.recomputeCache(tx, wallet.id);
      return { transactionId: txn.id, balanceAfter: after.total };
    });
  }

  /**
   * Harcamayı geri yükler (AI çağrısı başarısız olursa). Süresiz bir düzeltme
   * lotu olarak ekler; böylece iade edilen kontör yanmaz.
   */
  async refund(
    companyId: string,
    userId: string | undefined,
    opts: {
      amount?: number;
      operation: string;
      referenceType?: string;
      referenceId?: string;
      note?: string;
    },
  ) {
    const amount = opts.amount ?? 1;
    if (amount <= 0) return;
    await this.prisma.$transaction(async (tx) => {
      const wallet = await this.ensureWallet(tx, companyId);
      const lot = await tx.creditLot.create({
        data: {
          companyId,
          walletId: wallet.id,
          type: CreditLotType.ADJUSTMENT,
          amount,
          remaining: amount,
          note: opts.note ?? "İşlem başarısız — kontör iadesi",
        },
      });
      const after = await this.validBalance(tx, wallet.id);
      await tx.creditTransaction.create({
        data: {
          companyId,
          walletId: wallet.id,
          type: CreditTxnType.REFUND,
          amount,
          balanceAfter: after.total,
          operation: opts.operation,
          referenceType: opts.referenceType,
          referenceId: opts.referenceId,
          lotId: lot.id,
          userId,
          note: opts.note,
        },
      });
      await this.recomputeCache(tx, wallet.id);
    });
  }

  /** Teslimat kancası: başarılı ödeme → süresiz PURCHASE lotu (idempotent). */
  private async fulfillPurchase(payment: Payment, tx: Prisma.TransactionClient) {
    if (payment.productType !== CREDITS_PRODUCT_TYPE) return;
    const qty = payment.quantity ?? 0;
    if (qty <= 0) {
      this.logger.warn(`Kontör ödemesi ${payment.id} miktarsız — teslimat atlandı.`);
      return;
    }
    const existing = await tx.creditLot.findFirst({
      where: { paymentId: payment.id, type: CreditLotType.PURCHASE },
    });
    if (existing) return; // zaten teslim edilmiş

    const wallet = await this.ensureWallet(tx, payment.companyId);
    const lot = await tx.creditLot.create({
      data: {
        companyId: payment.companyId,
        walletId: wallet.id,
        type: CreditLotType.PURCHASE,
        amount: qty,
        remaining: qty,
        expiresAt: null, // süresiz
        paymentId: payment.id,
        note: `Satın alınan kontör`,
      },
    });
    const after = await this.validBalance(tx, wallet.id);
    await tx.creditTransaction.create({
      data: {
        companyId: payment.companyId,
        walletId: wallet.id,
        type: CreditTxnType.PURCHASE,
        amount: qty,
        balanceAfter: after.total,
        operation: "purchase",
        referenceType: "payment",
        referenceId: payment.id,
        lotId: lot.id,
        userId: payment.userId ?? undefined,
        note: `Kontör satın alındı`,
      },
    });
    await this.recomputeCache(tx, wallet.id);
  }

  // --- Satın alma ------------------------------------------------------------

  async listPackages() {
    return this.prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  /** Paket satın alma başlatır → ödeme intent'i (yönlendirme/mock) döner. */
  async purchase(
    companyId: string,
    userId: string | undefined,
    packageId: string,
    returnUrl?: string,
  ) {
    const pkg = await this.prisma.creditPackage.findFirst({
      where: { id: packageId, isActive: true },
    });
    if (!pkg) throw new NotFoundException("Kontör paketi bulunamadı.");

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, tenantId: true },
    });

    return this.payments.createIntent({
      companyId,
      tenantId: company?.tenantId,
      userId,
      amount: Number(pkg.price),
      currency: pkg.currency,
      productType: CREDITS_PRODUCT_TYPE,
      productRef: pkg.id,
      quantity: pkg.credits,
      description: `${pkg.name} — ${pkg.credits} kontör`,
      companyName: company?.name,
      returnUrl,
    });
  }
}

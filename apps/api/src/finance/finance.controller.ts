import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { FinanceService } from "./finance.service";
import { LedgerService } from "./ledger.service";
import { ChequesService } from "./cheques.service";
import { FxService } from "./fx.service";
import { OverviewService } from "./overview.service";
import {
  ChequeBounceDto,
  ChequeCollectDto,
  ChequeDepositDto,
  CollectionDto,
  CreateFinanceAccountDto,
  PaymentDto,
  PosSettlementDto,
  QueryChequesDto,
  QueryLedgerDto,
  QueryMovementsDto,
  QueryOpenInvoicesDto,
  QueryStatementDto,
  TransferDto,
  UpdateFinanceAccountDto,
} from "./dto/finance.dto";

@ApiTags("finance")
@ApiBearerAuth()
@Controller("finance")
export class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly ledger: LedgerService,
    private readonly cheques: ChequesService,
    private readonly fx: FxService,
    private readonly overview: OverviewService,
  ) {}

  // ---- Panel / birleşik akış / özet / kur ----

  @RequirePermissions("finance.read")
  @Get("dashboard")
  dashboard(@CompanyId() companyId: string, @CurrentUser() user: AuthUser) {
    return this.overview.dashboard(companyId, user);
  }

  /** Hareketler + satış/alış/kira faturaları + masraflar tek akışta */
  @RequirePermissions("finance.read")
  @Get("ledger")
  ledgerFeed(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Query() q: QueryLedgerDto) {
    return this.overview.feed(companyId, user, q);
  }

  @RequirePermissions("finance.read")
  @Get("summary")
  summary(@CompanyId() companyId: string) {
    return this.finance.summary(companyId);
  }

  @RequirePermissions("finance.read")
  @Get("fx-rates")
  fxRates() {
    return this.fx.today();
  }

  // ---- Finans hesapları ----

  @RequirePermissions("finance.read")
  @Get("accounts")
  listAccounts(@CompanyId() companyId: string) {
    return this.finance.listAccounts(companyId);
  }

  @RequirePermissions("finance.read")
  @Get("accounts/:id")
  getAccount(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.finance.getAccount(companyId, id);
  }

  @RequirePermissions("finance.write")
  @Post("accounts")
  createAccount(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Body() dto: CreateFinanceAccountDto) {
    return this.finance.createAccount(companyId, user.id, dto);
  }

  @RequirePermissions("finance.write")
  @Patch("accounts/:id")
  updateAccount(@CompanyId() companyId: string, @Param("id") id: string, @Body() dto: UpdateFinanceAccountDto) {
    return this.finance.updateAccount(companyId, id, dto);
  }

  @RequirePermissions("finance.delete")
  @Delete("accounts/:id")
  deleteAccount(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.finance.deleteAccount(companyId, id);
  }

  // ---- İşlemler ----

  @RequirePermissions("finance.write")
  @Post("collections")
  collection(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Body() dto: CollectionDto) {
    return this.finance.collection(companyId, user.id, dto);
  }

  @RequirePermissions("finance.write")
  @Post("payments")
  payment(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Body() dto: PaymentDto) {
    return this.finance.payment(companyId, user.id, dto);
  }

  @RequirePermissions("finance.write")
  @Post("transfers")
  transfer(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Body() dto: TransferDto) {
    return this.finance.transfer(companyId, user.id, dto);
  }

  @RequirePermissions("finance.write")
  @Post("pos-settlements")
  posSettle(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Body() dto: PosSettlementDto) {
    return this.finance.posSettle(companyId, user.id, dto);
  }

  // ---- Hareketler ----

  @RequirePermissions("finance.read")
  @Get("movements")
  movements(@CompanyId() companyId: string, @Query() q: QueryMovementsDto) {
    return this.finance.movements(companyId, q);
  }

  @RequirePermissions("finance.read")
  @Get("movements/group/:groupId")
  group(@CompanyId() companyId: string, @Param("groupId") groupId: string) {
    return this.finance.group(companyId, groupId);
  }

  @RequirePermissions("finance.delete")
  @Delete("movements/group/:groupId")
  deleteGroup(@CompanyId() companyId: string, @Param("groupId") groupId: string) {
    return this.finance.deleteGroup(companyId, groupId);
  }

  // ---- Çek / senet ----

  @RequirePermissions("finance.read")
  @Get("cheques")
  listCheques(@CompanyId() companyId: string, @Query() q: QueryChequesDto) {
    return this.cheques.list(companyId, q);
  }

  @RequirePermissions("finance.read")
  @Get("cheques/:id/history")
  chequeHistory(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.cheques.history(companyId, id);
  }

  @RequirePermissions("finance.write")
  @Post("cheques/:id/deposit")
  depositCheque(@CompanyId() companyId: string, @Param("id") id: string, @Body() dto: ChequeDepositDto) {
    return this.cheques.deposit(companyId, id, dto);
  }

  @RequirePermissions("finance.write")
  @Post("cheques/:id/withdraw")
  withdrawCheque(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.cheques.withdraw(companyId, id);
  }

  @RequirePermissions("finance.write")
  @Post("cheques/:id/collect")
  collectCheque(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ChequeCollectDto) {
    return this.cheques.collect(companyId, user.id, id, dto);
  }

  @RequirePermissions("finance.write")
  @Post("cheques/:id/pay")
  payCheque(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ChequeCollectDto) {
    return this.cheques.pay(companyId, user.id, id, dto);
  }

  @RequirePermissions("finance.write")
  @Post("cheques/:id/bounce")
  bounceCheque(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ChequeBounceDto) {
    return this.cheques.bounce(companyId, user.id, id, dto);
  }

  // ---- Cari: ekstre, açık faturalar, yaşlandırma ----

  @RequirePermissions("finance.read")
  @Get("statement/:accountId")
  statement(@CompanyId() companyId: string, @Param("accountId") accountId: string, @Query() q: QueryStatementDto) {
    return this.ledger.statement(companyId, accountId, q.from, q.to);
  }

  @RequirePermissions("finance.read")
  @Get("open-invoices")
  openInvoices(@CompanyId() companyId: string, @Query() q: QueryOpenInvoicesDto) {
    return this.ledger
      .invoices(companyId, { accountId: q.accountId, side: q.side, onlyOpen: true })
      .then((rows) => (q.overdue === "true" ? rows.filter((r) => r.bucket !== "NOT_DUE") : rows));
  }

  @RequirePermissions("finance.read")
  @Get("aging")
  aging(@CompanyId() companyId: string, @Query() q: QueryOpenInvoicesDto) {
    return this.ledger.aging(companyId, q.side ?? "RECEIVABLE");
  }
}

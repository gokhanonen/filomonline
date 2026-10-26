import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { CompanyGuard } from "./tenancy/company.guard";
import { HealthController } from "./health.controller";
import { TenantsModule } from "./tenants/tenants.module";
import { CompaniesModule } from "./companies/companies.module";
import { RolesModule } from "./roles/roles.module";
import { UsersModule } from "./users/users.module";
import { AccountsModule } from "./accounts/accounts.module";
import { ProductsModule } from "./products/products.module";
import { LocationsModule } from "./locations/locations.module";
import { StorageModule } from "./storage/storage.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { RentalsModule } from "./rentals/rentals.module";
import { ContractsModule } from "./contracts/contracts.module";
import { ReportsModule } from "./reports/reports.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { DocumentsModule } from "./documents/documents.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { ActivityModule } from "./activity/activity.module";
import { SettingsModule } from "./settings/settings.module";
import { AiModule } from "./ai/ai.module";
import { ChatModule } from "./chat/chat.module";
import { AddressModule } from "./address/address.module";
import { SearchModule } from "./search/search.module";
import { CrmModule } from "./crm/crm.module";
import { FinanceModule } from "./finance/finance.module";
import { MailModule } from "./mail/mail.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RealtimeModule,
    ActivityModule,
    SettingsModule,
    MailModule,
    AiModule,
    ChatModule,
    AuthModule,
    TenantsModule,
    CompaniesModule,
    RolesModule,
    UsersModule,
    StorageModule,
    AccountsModule,
    ProductsModule,
    LocationsModule,
    VehiclesModule,
    CatalogModule,
    ExpensesModule,
    RentalsModule,
    ContractsModule,
    ReportsModule,
    InvoicesModule,
    DocumentsModule,
    AddressModule,
    SearchModule,
    CrmModule,
    FinanceModule,
  ],
  controllers: [HealthController],
  providers: [
    // Varsayılan: tüm endpoint'ler JWT korumalı (@Public ile açılır),
    // ardından şirket bağlamı doğrulanır (@SkipCompany ile atlanır).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CompanyGuard },
  ],
})
export class AppModule {}

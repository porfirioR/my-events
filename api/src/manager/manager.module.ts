import { Module } from '@nestjs/common';
import { EventManagerService, MailManagerService, PaymentManagerService, SavingsManagerService, ConfigurationManagerService, UserManagerService, CollaboratorManagerService } from './services';
import { MailModule } from '../access/mail/mail.module';
import { AuthModule } from '../access/auth/auth.module';
import { DataModule } from '../access/data/data.module';
import { TransactionManagerService } from './services/transaction.manager.service';
import { TRANSACTION_TOKENS } from '../utility/constants';
import { DASHBOARD_TOKENS, LOAN_TOKENS, SAVINGS_TOKENS, TRAVEL_TOKENS } from '../utility/constants/injection-tokens.const';
import { TravelManagerService } from './services/travel-manager.service';
import { LoanManagerService } from './services/loan-manager.service';
import { DashboardManagerService } from './services/dashboard-manager.service';
import { BlobModule } from '../access/blob/blob.module';

@Module({
  imports: [
    MailModule,
    AuthModule,
    DataModule,
    BlobModule
  ],
  controllers: [],
  providers: [
    EventManagerService,
    UserManagerService,
    MailManagerService,
    PaymentManagerService,
    SavingsManagerService,
    ConfigurationManagerService,
    CollaboratorManagerService,
    TransactionManagerService,
    TravelManagerService,
    LoanManagerService,
    DashboardManagerService,
    {
      provide: DASHBOARD_TOKENS.MANAGER_SERVICE,
      useExisting: DashboardManagerService,
    },
    {
      provide: TRANSACTION_TOKENS.MANAGER_SERVICE,
      useExisting: TransactionManagerService,
    },
    {
      provide: SAVINGS_TOKENS.MANAGER_SERVICE,
      useExisting: SavingsManagerService,
    },
    {
      provide: TRAVEL_TOKENS.MANAGER_SERVICE,
      useExisting: TravelManagerService,
    },
    {
      provide: LOAN_TOKENS.MANAGER_SERVICE,
      useExisting: LoanManagerService,
    },
  ],
  exports: [
    EventManagerService,
    UserManagerService,
    MailManagerService,
    PaymentManagerService,
    ConfigurationManagerService,
    CollaboratorManagerService,
    TRANSACTION_TOKENS.MANAGER_SERVICE,
    SAVINGS_TOKENS.MANAGER_SERVICE,
    TRAVEL_TOKENS.MANAGER_SERVICE,
    LOAN_TOKENS.MANAGER_SERVICE,
    DASHBOARD_TOKENS.MANAGER_SERVICE,
  ]
})
export class ManagerModule {}

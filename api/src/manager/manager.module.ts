import { Module } from '@nestjs/common';
import { EventManagerService, MailManagerService, PaymentManagerService, SavingsManagerService, ConfigurationManagerService, UserManagerService, CollaboratorManagerService } from './services';
import { MailModule } from '../access/mail/mail.module';
import { AuthModule } from '../access/auth/auth.module';
import { DataModule } from '../access/data/data.module';
import { TransactionManagerService } from './services/transaction.manager.service';
import { TRANSACTION_TOKENS } from '../utility/constants';
import { SAVINGS_TOKENS, TRAVEL_TOKENS } from '../utility/constants/injection-tokens.const';
import { TravelManagerService } from './services/travel-manager.service';
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
  ]
})
export class ManagerModule {}

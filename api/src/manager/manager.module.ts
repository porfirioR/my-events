import { Module } from '@nestjs/common';
import { EventManagerService, MailManagerService, PaymentManagerService, SavingsManagerService, ConfigurationManagerService, UserManagerService, CollaboratorManagerService } from './services';
import { MailModule } from '../access/mail/mail.module';
import { AuthModule } from '../access/auth/auth.module';
import { DataModule } from '../access/data/data.module';
import { TransactionManagerService } from './services/transaction.manager.service';
import { TRANSACTION_TOKENS } from '../utility/constants';
import { SAVINGS_TOKENS } from '../utility/constants/injection-tokens.const';

@Module({
  imports: [
    MailModule,
    AuthModule,
    DataModule
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
    {
      provide: TRANSACTION_TOKENS.MANAGER_SERVICE,
      useExisting: TransactionManagerService,
    },
    {
      provide: SAVINGS_TOKENS.MANAGER_SERVICE,
      useExisting: SavingsManagerService,
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
  ]
})
export class ManagerModule {}

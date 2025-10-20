import { Module } from '@nestjs/common';
import { EventManagerService, MailManagerService, PaymentManagerService, SavingsManagerService, ConfigurationManagerService, UserManagerService, CollaboratorManagerService } from './services';
import { MailModule } from '../access/mail/mail.module';
import { AuthModule } from '../access/auth/auth.module';
import { DataModule } from '../access/data/data.module';
import { TransactionManagerService } from './services/transaction.manager.service';
import { TRANSACTION_TOKENS } from 'src/utility/constants';

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
  ],
  exports: [
    EventManagerService,
    UserManagerService,
    MailManagerService,
    PaymentManagerService,
    SavingsManagerService,
    ConfigurationManagerService,
    CollaboratorManagerService,
    TRANSACTION_TOKENS.MANAGER_SERVICE,
  ]
})
export class ManagerModule {}

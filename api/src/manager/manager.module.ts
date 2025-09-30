import { Module } from '@nestjs/common';
import { EventManagerService, MailManagerService, PaymentManagerService, SavingsManagerService, ConfigurationManagerService, UserManagerService, CollaboratorManagerService } from './services';
import { MailModule } from '../access/mail/mail.module';
import { AuthModule } from '../access/auth/auth.module';
import { DataModule } from '../access/data/data.module';

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
  ],
  exports: [
    EventManagerService,
    UserManagerService,
    MailManagerService,
    PaymentManagerService,
    SavingsManagerService,
    ConfigurationManagerService,
    CollaboratorManagerService,
  ]
})
export class ManagerModule {}

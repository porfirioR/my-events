import { Module } from '@nestjs/common';
import { EventAccessService } from './services/event-access.service';
import { EventFollowAccessService } from './services/event-follow-access.service';
import { UserAccessService } from './services/user-access.service';
import { CollaboratorAccessService } from './services/collaborator-access.service';
import { PaymentAccessService } from './services/payment-access.service';
import { SavingAccessService } from './services/saving-access.service';
import { DbContextService } from './services/db-context.service';
import { ConfigurationAccessService } from './services/configuration-access.service';
import { COLLABORATOR_TOKENS } from '../../utility/constants';
import { UtilityModule } from '../../utility/utility.module';

@Module({
  imports: [
    UtilityModule
  ],
  controllers: [],
  providers: [
    DbContextService,
    EventAccessService,
    EventFollowAccessService,
    UserAccessService,
    PaymentAccessService,
    SavingAccessService,
    ConfigurationAccessService,
    CollaboratorAccessService,
    {
      provide: COLLABORATOR_TOKENS.ACCESS_SERVICE,
      useClass: CollaboratorAccessService,
    }
  ],
  exports: [
    EventAccessService,
    EventFollowAccessService,
    UserAccessService,
    PaymentAccessService,
    SavingAccessService,
    ConfigurationAccessService,
    COLLABORATOR_TOKENS.ACCESS_SERVICE
  ],
})
export class DataModule {}

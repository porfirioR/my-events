import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { COLLABORATOR_TOKENS } from '../../utility/constants';
import { UtilityModule } from '../../utility/utility.module';
import { DbContextService } from './services/db-context.service';
import { EventAccessService } from './services/event-access.service';
import { EventFollowAccessService } from './services/event-follow-access.service';
import { CollaboratorMatchAccessService } from './services';
import { CollaboratorAccessService } from './services/collaborator-access.service';
import { CollaboratorMatchRequestAccessService } from './services/collaborator-match-request-access.service';
import { ConfigurationAccessService } from './services/configuration-access.service';
import { PaymentAccessService } from './services/payment-access.service';
import { SavingAccessService } from './services/saving-access.service';
import { UserAccessService } from './services/user-access.service';

@Module({
  imports: [
    ConfigModule,
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
    CollaboratorMatchAccessService,
    CollaboratorMatchRequestAccessService,
    {
      provide: COLLABORATOR_TOKENS.ACCESS_SERVICE,
      useExisting: CollaboratorAccessService,
    },
    {
      provide: COLLABORATOR_TOKENS.MATCH_ACCESS_SERVICE,
      useExisting: CollaboratorMatchAccessService,
    },
    {
      provide: COLLABORATOR_TOKENS.MATCH_REQUEST_ACCESS_SERVICE,
      useExisting: CollaboratorMatchRequestAccessService,
    },
  ],
  exports: [
    EventAccessService,
    EventFollowAccessService,
    UserAccessService,
    PaymentAccessService,
    SavingAccessService,
    ConfigurationAccessService,
    COLLABORATOR_TOKENS.ACCESS_SERVICE,
    COLLABORATOR_TOKENS.MATCH_ACCESS_SERVICE,
    COLLABORATOR_TOKENS.MATCH_REQUEST_ACCESS_SERVICE,
  ],
})
export class DataModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { COLLABORATOR_TOKENS, TRANSACTION_TOKENS } from '../../utility/constants';
import { UtilityModule } from '../../utility/utility.module';
import { DbContextService } from './services/db-context.service';
import { EventAccessService } from './services/event-access.service';
import { EventFollowAccessService } from './services/event-follow-access.service';
import { CollaboratorMatchAccessService, ConfigurationAccessService, EmailVerificationTokenAccessService, OperationAttachmentAccessService, OperationCategoryAccessService, PasswordResetTokenAccessService, PaymentMethodAccessService, SavingsGoalAccessService, TransactionAccessService, TransactionReimbursementAccessService, TransactionSplitAccessService, TravelAccessService, TravelMemberAccessService, TravelOperationAccessService, TravelOperationApprovalAccessService, TravelOperationParticipantAccessService } from './services';
import { CollaboratorAccessService } from './services/collaborator-access.service';
import { CollaboratorMatchRequestAccessService } from './services/collaborator-match-request-access.service';
import { PaymentAccessService } from './services/payment-access.service';
import { UserAccessService } from './services/user-access.service';
import { SAVINGS_TOKENS, TRAVEL_TOKENS } from '../../utility/constants/injection-tokens.const';
import { SavingsInstallmentAccessService } from './services/savings-installment-access.service';
import { SavingsDepositAccessService } from './services/savings-deposit-access.service';

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
    ConfigurationAccessService,
    CollaboratorAccessService,
    CollaboratorMatchAccessService,
    CollaboratorMatchRequestAccessService,
    TransactionAccessService,
    TransactionReimbursementAccessService,
    TransactionSplitAccessService,
    PasswordResetTokenAccessService,
    EmailVerificationTokenAccessService,
    PaymentAccessService,
    SavingsGoalAccessService,
    SavingsInstallmentAccessService,
    SavingsDepositAccessService,
    PaymentMethodAccessService,
    TravelAccessService,
    TravelMemberAccessService,
    TravelOperationAccessService,
    TravelOperationParticipantAccessService,
    TravelOperationApprovalAccessService,
    OperationCategoryAccessService,
    OperationAttachmentAccessService,
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
    {
      provide: TRANSACTION_TOKENS.ACCESS_SERVICE,
      useExisting: TransactionAccessService,
    },
    {
      provide: TRANSACTION_TOKENS.REIMBURSEMENT_ACCESS_SERVICE,
      useExisting: TransactionReimbursementAccessService,
    },
    {
      provide: TRANSACTION_TOKENS.SPLIT_ACCESS_SERVICE,
      useExisting: TransactionSplitAccessService,
    },
    {
      provide: SAVINGS_TOKENS.GOAL_ACCESS_SERVICE,
      useExisting: SavingsGoalAccessService,
    },
    {
      provide: SAVINGS_TOKENS.INSTALLMENT_ACCESS_SERVICE,
      useExisting: SavingsInstallmentAccessService,
    },
    {
      provide: SAVINGS_TOKENS.DEPOSIT_ACCESS_SERVICE,
      useExisting: SavingsDepositAccessService,
    },
    {
      provide: SAVINGS_TOKENS.CONFIGURATION_ACCESS_SERVICE,
      useExisting: ConfigurationAccessService,
    },
    {
      provide: TRAVEL_TOKENS.ACCESS_SERVICE,
      useExisting: TravelAccessService,
    },
    {
      provide: TRAVEL_TOKENS.MEMBER_ACCESS_SERVICE,
      useExisting: TravelMemberAccessService,
    },
    {
      provide: TRAVEL_TOKENS.OPERATION_ACCESS_SERVICE,
      useExisting: TravelOperationAccessService,
    },
    {
      provide: TRAVEL_TOKENS.OPERATION_PARTICIPANT_ACCESS_SERVICE,
      useExisting: TravelOperationParticipantAccessService,
    },
    {
      provide: TRAVEL_TOKENS.OPERATION_APPROVAL_ACCESS_SERVICE,
      useExisting: TravelOperationApprovalAccessService,
    },
    {
      provide: TRAVEL_TOKENS.PAYMENT_METHOD_ACCESS_SERVICE,
      useExisting: PaymentMethodAccessService,
    },
    {
      provide: TRAVEL_TOKENS.OPERATION_CATEGORY_ACCESS_SERVICE,
      useExisting: OperationCategoryAccessService,
    },
    {
      provide: TRAVEL_TOKENS.OPERATION_ATTACHMENT_ACCESS_SERVICE,
      useExisting: OperationAttachmentAccessService,
    },
  ],
  exports: [
    EventAccessService,
    EventFollowAccessService,
    UserAccessService,
    PaymentAccessService,
    PasswordResetTokenAccessService,
    EmailVerificationTokenAccessService,
    COLLABORATOR_TOKENS.ACCESS_SERVICE,
    COLLABORATOR_TOKENS.MATCH_ACCESS_SERVICE,
    COLLABORATOR_TOKENS.MATCH_REQUEST_ACCESS_SERVICE,
    TRANSACTION_TOKENS.ACCESS_SERVICE,
    TRANSACTION_TOKENS.REIMBURSEMENT_ACCESS_SERVICE,
    TRANSACTION_TOKENS.SPLIT_ACCESS_SERVICE,
    SAVINGS_TOKENS.GOAL_ACCESS_SERVICE,
    SAVINGS_TOKENS.INSTALLMENT_ACCESS_SERVICE,
    SAVINGS_TOKENS.DEPOSIT_ACCESS_SERVICE,
    SAVINGS_TOKENS.CONFIGURATION_ACCESS_SERVICE,
    TRAVEL_TOKENS.ACCESS_SERVICE,
    TRAVEL_TOKENS.MEMBER_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_PARTICIPANT_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_APPROVAL_ACCESS_SERVICE,
    TRAVEL_TOKENS.PAYMENT_METHOD_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_CATEGORY_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_ATTACHMENT_ACCESS_SERVICE,
  ],
})
export class DataModule {}

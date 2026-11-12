import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { COLLABORATOR_TOKENS, TRANSACTION_TOKENS } from '../../utility/constants';
import { UtilityModule } from '../../utility/utility.module';
import { DbContextService } from './services/db-context.service';
import { EventAccessService } from './services/event-access.service';
import { EventFollowAccessService } from './services/event-follow-access.service';
import { CollaboratorMatchAccessService, ConfigurationAccessService, EmailVerificationTokenAccessService, OperationAttachmentAccessService, OperationCategoryAccessService, PasswordResetTokenAccessService, PaymentMethodAccessService, SavingsGoalAccessService, SavingsProgrammedTermAccessService, TransactionAccessService, TransactionReimbursementAccessService, TransactionSplitAccessService, TravelAccessService, TravelMemberAccessService, TravelOperationAccessService, TravelOperationApprovalAccessService, TravelOperationParticipantAccessService } from './services';
import { CollaboratorAccessService } from './services/collaborator-access.service';
import { CollaboratorMatchRequestAccessService } from './services/collaborator-match-request-access.service';
import { PaymentAccessService } from './services/payment-access.service';
import { UserAccessService } from './services/user-access.service';
import { ACCOUNT_TOKENS, DASHBOARD_TOKENS, FINANCIAL_INSTITUTION_TOKENS, IMPORT_TOKENS, LOAN_TOKENS, SAVINGS_TOKENS, TRAVEL_TOKENS } from '../../utility/constants/injection-tokens.const';
import { SavingsInstallmentAccessService } from './services/savings-installment-access.service';
import { SavingsDepositAccessService } from './services/savings-deposit-access.service';
import { LoanAccessService } from './services/loan-access.service';
import { LoanInstallmentAccessService } from './services/loan-installment-access.service';
import { LoanPaymentAccessService } from './services/loan-payment-access.service';
import { LoanEntityTermAccessService } from './services/loan-entity-term-access.service';
import { DashboardAccessService } from './services/dashboard-access.service';
import { UserFinancialSettingsAccessService } from './services/user-financial-settings-access.service';
import { FinancialInstitutionAccessService } from './services/financial-institution-access.service';
import { AccountAccessService } from './services/account-access.service';
import { AccountBalanceSnapshotAccessService } from './services/account-balance-snapshot-access.service';
import { MyMoneyCategoryMappingAccessService } from './services/mymoney-category-mapping-access.service';
import { MyMoneyDescriptionRuleAccessService } from './services/mymoney-description-rule-access.service';

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
    SavingsProgrammedTermAccessService,
    PaymentMethodAccessService,
    TravelAccessService,
    TravelMemberAccessService,
    TravelOperationAccessService,
    TravelOperationParticipantAccessService,
    TravelOperationApprovalAccessService,
    OperationCategoryAccessService,
    OperationAttachmentAccessService,
    LoanAccessService,
    LoanInstallmentAccessService,
    LoanPaymentAccessService,
    LoanEntityTermAccessService,
    DashboardAccessService,
    FinancialInstitutionAccessService,
    {
      provide: FINANCIAL_INSTITUTION_TOKENS.ACCESS_SERVICE,
      useExisting: FinancialInstitutionAccessService,
    },
    AccountAccessService,
    {
      provide: ACCOUNT_TOKENS.ACCOUNT_ACCESS_SERVICE,
      useExisting: AccountAccessService,
    },
    AccountBalanceSnapshotAccessService,
    {
      provide: ACCOUNT_TOKENS.BALANCE_SNAPSHOT_ACCESS_SERVICE,
      useExisting: AccountBalanceSnapshotAccessService,
    },
    {
      provide: DASHBOARD_TOKENS.ACCESS_SERVICE,
      useExisting: DashboardAccessService,
    },
    MyMoneyCategoryMappingAccessService,
    {
      provide: IMPORT_TOKENS.CATEGORY_MAPPING_ACCESS_SERVICE,
      useExisting: MyMoneyCategoryMappingAccessService,
    },
    MyMoneyDescriptionRuleAccessService,
    {
      provide: IMPORT_TOKENS.DESCRIPTION_RULE_ACCESS_SERVICE,
      useExisting: MyMoneyDescriptionRuleAccessService,
    },
    UserFinancialSettingsAccessService,
    {
      provide: DASHBOARD_TOKENS.FINANCIAL_SETTINGS_ACCESS_SERVICE,
      useExisting: UserFinancialSettingsAccessService,
    },
    {
      provide: LOAN_TOKENS.ENTITY_TERM_ACCESS_SERVICE,
      useExisting: LoanEntityTermAccessService,
    },
    {
      provide: SAVINGS_TOKENS.PROGRAMMED_TERM_ACCESS_SERVICE,
      useExisting: SavingsProgrammedTermAccessService,
    },
    {
      provide: LOAN_TOKENS.LOAN_ACCESS_SERVICE,
      useExisting: LoanAccessService,
    },
    {
      provide: LOAN_TOKENS.INSTALLMENT_ACCESS_SERVICE,
      useExisting: LoanInstallmentAccessService,
    },
    {
      provide: LOAN_TOKENS.PAYMENT_ACCESS_SERVICE,
      useExisting: LoanPaymentAccessService,
    },
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
    SAVINGS_TOKENS.PROGRAMMED_TERM_ACCESS_SERVICE,
    TRAVEL_TOKENS.ACCESS_SERVICE,
    TRAVEL_TOKENS.MEMBER_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_PARTICIPANT_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_APPROVAL_ACCESS_SERVICE,
    TRAVEL_TOKENS.PAYMENT_METHOD_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_CATEGORY_ACCESS_SERVICE,
    TRAVEL_TOKENS.OPERATION_ATTACHMENT_ACCESS_SERVICE,
    LOAN_TOKENS.LOAN_ACCESS_SERVICE,
    LOAN_TOKENS.INSTALLMENT_ACCESS_SERVICE,
    LOAN_TOKENS.PAYMENT_ACCESS_SERVICE,
    LOAN_TOKENS.ENTITY_TERM_ACCESS_SERVICE,
    DASHBOARD_TOKENS.ACCESS_SERVICE,
    DASHBOARD_TOKENS.FINANCIAL_SETTINGS_ACCESS_SERVICE,
    FINANCIAL_INSTITUTION_TOKENS.ACCESS_SERVICE,
    ACCOUNT_TOKENS.ACCOUNT_ACCESS_SERVICE,
    ACCOUNT_TOKENS.BALANCE_SNAPSHOT_ACCESS_SERVICE,
    IMPORT_TOKENS.CATEGORY_MAPPING_ACCESS_SERVICE,
    IMPORT_TOKENS.DESCRIPTION_RULE_ACCESS_SERVICE,
  ],
})
export class DataModule {}

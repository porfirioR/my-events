export const COLLABORATOR_TOKENS = {
  ACCESS_SERVICE: Symbol('ICollaboratorAccessService'),
  MATCH_ACCESS_SERVICE: Symbol('ICollaboratorMatchAccessService'),
  MATCH_REQUEST_ACCESS_SERVICE: Symbol('ICollaboratorMatchRequestAccessService'),
  MANAGER_SERVICE: Symbol('ICollaboratorManagerService')
} as const;

export const TRANSACTION_TOKENS = {
  ACCESS_SERVICE: Symbol('ITransactionAccessService'),
  REIMBURSEMENT_ACCESS_SERVICE: Symbol('ITransactionReimbursementAccessService'),
  SPLIT_ACCESS_SERVICE: Symbol('ITransactionSplitAccessService'),
  MANAGER_SERVICE: Symbol('ITransactionManagerService')
} as const;

export const SAVINGS_TOKENS = {
  GOAL_ACCESS_SERVICE: Symbol('ISavingsGoalAccessService'),
  INSTALLMENT_ACCESS_SERVICE: Symbol('ISavingsInstallmentAccessService'),
  DEPOSIT_ACCESS_SERVICE: Symbol('ISavingsDepositAccessService'),
  CONFIGURATION_ACCESS_SERVICE: Symbol('IConfigurationAccessService'),
  PROGRAMMED_TERM_ACCESS_SERVICE: Symbol('ISavingsProgrammedTermAccessService'),
  MANAGER_SERVICE: Symbol('ISavingsManagerService')
} as const;

export const LOAN_TOKENS = {
  LOAN_ACCESS_SERVICE: Symbol('ILoanAccessService'),
  INSTALLMENT_ACCESS_SERVICE: Symbol('ILoanInstallmentAccessService'),
  PAYMENT_ACCESS_SERVICE: Symbol('ILoanPaymentAccessService'),
  ENTITY_TERM_ACCESS_SERVICE: Symbol('ILoanEntityTermAccessService'),
  MANAGER_SERVICE: Symbol('ILoanManagerService'),
} as const;

export const DASHBOARD_TOKENS = {
  ACCESS_SERVICE: Symbol('IDashboardAccessService'),
  MANAGER_SERVICE: Symbol('IDashboardManagerService'),
} as const;

export const TRAVEL_TOKENS = {
  ACCESS_SERVICE: Symbol('ITravelAccessService'),
  MEMBER_ACCESS_SERVICE: Symbol('ITravelMemberAccessService'),
  OPERATION_ACCESS_SERVICE: Symbol('ITravelOperationAccessService'),
  OPERATION_PARTICIPANT_ACCESS_SERVICE: Symbol('ITravelOperationParticipantAccessService'),
  OPERATION_APPROVAL_ACCESS_SERVICE: Symbol('ITravelOperationApprovalAccessService'),
  OPERATION_CATEGORY_ACCESS_SERVICE: Symbol('IOperationCategoryAccessService'), // ✅ NUEVO
  OPERATION_ATTACHMENT_ACCESS_SERVICE: Symbol('IOperationAttachmentAccessService'),
  PAYMENT_METHOD_ACCESS_SERVICE: Symbol('IPaymentMethodAccessService'),
  MANAGER_SERVICE: Symbol('ITravelManagerService')
} as const;
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


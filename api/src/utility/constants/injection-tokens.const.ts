export const COLLABORATOR_TOKENS = {
  ACCESS_SERVICE: Symbol('ICollaboratorAccessService'),
  MATCH_ACCESS_SERVICE: Symbol('ICollaboratorMatchAccessService'),
  MATCH_REQUEST_ACCESS_SERVICE: Symbol('ICollaboratorMatchRequestAccessService'),
  MANAGER_SERVICE: Symbol('ICollaboratorManagerService')
} as const;


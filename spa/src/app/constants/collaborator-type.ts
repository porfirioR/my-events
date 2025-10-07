export type CollaboratorType = 'UNLINKED' | 'LINKED'

export const CollaboratorTypeLabels = {
  UNLINKED: 'Unlinked',
  LINKED: 'Linked'
} as const;

export const CollaboratorTypeIcons = {
  UNLINKED: 'fa-unlink',
  LINKED: 'fa-link'
} as const;
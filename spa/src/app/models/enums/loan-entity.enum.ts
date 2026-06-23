export enum LoanEntity {
  Ueno = 1,
  Itau = 2,
  Personal = 3,
  Otros = 4,
}

export const LoanEntityLabels: Record<LoanEntity, string> = {
  [LoanEntity.Ueno]: 'Ueno',
  [LoanEntity.Itau]: 'Itaú',
  [LoanEntity.Personal]: 'Personal',
  [LoanEntity.Otros]: 'loans.entityOtros',
};

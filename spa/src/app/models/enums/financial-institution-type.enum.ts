export enum FinancialInstitutionType {
  Bank = 1,
  Cooperative = 2,
  Cash = 3,
  Person = 4,
  Other = 5,
}

export const FinancialInstitutionTypeLabels: Record<FinancialInstitutionType, string> = {
  [FinancialInstitutionType.Bank]: 'financialInstitutions.typeBank',
  [FinancialInstitutionType.Cooperative]: 'financialInstitutions.typeCooperative',
  [FinancialInstitutionType.Cash]: 'financialInstitutions.typeCash',
  [FinancialInstitutionType.Person]: 'financialInstitutions.typePerson',
  [FinancialInstitutionType.Other]: 'financialInstitutions.typeOther',
};

export const FinancialInstitutionTypeIcons: Record<FinancialInstitutionType, string> = {
  [FinancialInstitutionType.Bank]: 'fa-building-columns',
  [FinancialInstitutionType.Cooperative]: 'fa-people-group',
  [FinancialInstitutionType.Cash]: 'fa-money-bill-wave',
  [FinancialInstitutionType.Person]: 'fa-user',
  [FinancialInstitutionType.Other]: 'fa-circle-question',
};

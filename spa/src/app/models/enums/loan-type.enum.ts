export enum LoanType {
  Personal = 1,
  Hipoteca = 2,
  Auto = 3,
  Tarjeta = 4,
  Informal = 5,
}

export const LoanTypeLabels: Record<LoanType, string> = {
  [LoanType.Personal]: 'loans.typePersonal',
  [LoanType.Hipoteca]: 'loans.typeHipoteca',
  [LoanType.Auto]: 'loans.typeAuto',
  [LoanType.Tarjeta]: 'loans.typeTarjeta',
  [LoanType.Informal]: 'loans.typeInformal',
};

export const LoanTypeBadgeColors: Record<LoanType, string> = {
  [LoanType.Personal]: 'badge-primary',
  [LoanType.Hipoteca]: 'badge-secondary',
  [LoanType.Auto]: 'badge-accent',
  [LoanType.Tarjeta]: 'badge-warning',
  [LoanType.Informal]: 'badge-neutral',
};

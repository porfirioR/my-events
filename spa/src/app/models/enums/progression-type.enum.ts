export enum ProgressionType {
  Fixed = 1,
  Ascending = 2,
  Descending = 3,
  Random = 4,
  FreeForm = 5,
  Scheduled = 6,
  FixedDeposit = 7,
  CDA = 8,
  MutualFund = 9,
}

export const ProgressionTypeLabels: Record<ProgressionType, string> = {
  [ProgressionType.Fixed]: 'Fixed Amount',
  [ProgressionType.Ascending]: 'Ascending',
  [ProgressionType.Descending]: 'Descending',
  [ProgressionType.Random]: 'Random',
  [ProgressionType.FreeForm]: 'Free Form',
  [ProgressionType.Scheduled]: 'Scheduled Savings',
  [ProgressionType.FixedDeposit]: 'Fixed Deposit',
  [ProgressionType.CDA]: 'CDA',
  [ProgressionType.MutualFund]: 'Mutual Fund',
};

export const ProgressionTypeDescriptions: Record<ProgressionType, string> = {
  [ProgressionType.Fixed]: 'Same amount for each installment',
  [ProgressionType.Ascending]: 'Amounts increase by a fixed increment',
  [ProgressionType.Descending]: 'Amounts decrease by a fixed increment',
  [ProgressionType.Random]: 'Amounts are shuffled randomly',
  [ProgressionType.FreeForm]: 'No predefined installments, deposit freely',
  [ProgressionType.Scheduled]: 'Fixed monthly deposits with interest yield at maturity',
  [ProgressionType.FixedDeposit]: 'Single lump-sum deposit locked for a fixed term with simple interest',
  [ProgressionType.CDA]: 'Certificado de Depósito de Ahorro - single lump-sum with higher interest rate at maturity',
  [ProgressionType.MutualFund]: 'Free deposits and withdrawals at any time, no fixed target or term',
};

export const ProgressionTypeIcons: Record<ProgressionType, string> = {
  [ProgressionType.Fixed]: 'fa-equals',
  [ProgressionType.Ascending]: 'fa-arrow-trend-up',
  [ProgressionType.Descending]: 'fa-arrow-trend-down',
  [ProgressionType.Random]: 'fa-shuffle',
  [ProgressionType.FreeForm]: 'fa-hand-holding-dollar',
  [ProgressionType.Scheduled]: 'fa-calendar-check',
  [ProgressionType.FixedDeposit]: 'fa-vault',
  [ProgressionType.CDA]: 'fa-certificate',
  [ProgressionType.MutualFund]: 'fa-chart-line',
};

export const ProgressionTypeBadgeColors: Record<ProgressionType, string> = {
  [ProgressionType.Fixed]: 'badge-primary',
  [ProgressionType.Ascending]: 'badge-success',
  [ProgressionType.Descending]: 'badge-error',
  [ProgressionType.Random]: 'badge-secondary',
  [ProgressionType.FreeForm]: 'badge-accent',
  [ProgressionType.Scheduled]: 'badge-info',
  [ProgressionType.FixedDeposit]: 'badge-warning',
  [ProgressionType.CDA]: 'badge-neutral',
  [ProgressionType.MutualFund]: 'badge-success',
};

















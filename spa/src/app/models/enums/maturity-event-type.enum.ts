export enum MaturityEventType {
  SavingsMaturity = 1,
  RotatingPayout = 2,
  LentCollection = 3,
  LoanEnd = 4,
}

export const MaturityEventTypeLabels: Record<MaturityEventType, string> = {
  [MaturityEventType.SavingsMaturity]: 'maturities.typeSavingsMaturity',
  [MaturityEventType.RotatingPayout]: 'maturities.typeRotatingPayout',
  [MaturityEventType.LentCollection]: 'maturities.typeLentCollection',
  [MaturityEventType.LoanEnd]: 'maturities.typeLoanEnd',
};

export const MaturityEventTypeIcons: Record<MaturityEventType, string> = {
  [MaturityEventType.SavingsMaturity]: 'fa-piggy-bank',
  [MaturityEventType.RotatingPayout]: 'fa-rotate',
  [MaturityEventType.LentCollection]: 'fa-hand-holding-dollar',
  [MaturityEventType.LoanEnd]: 'fa-flag-checkered',
};

// Mismo color que el módulo de origen (ahorros esmeralda, préstamos ámbar); clases literales para Tailwind
export const MaturityEventTypeColors: Record<MaturityEventType, string> = {
  [MaturityEventType.SavingsMaturity]: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  [MaturityEventType.RotatingPayout]: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  [MaturityEventType.LentCollection]: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  [MaturityEventType.LoanEnd]: 'bg-base-content/10 text-base-content/70',
};

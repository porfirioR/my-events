export enum LoanDirection {
  Borrowed = 1,
  Lent = 2,
}

export const LoanDirectionLabels: Record<LoanDirection, string> = {
  [LoanDirection.Borrowed]: 'loans.directionBorrowed',
  [LoanDirection.Lent]: 'loans.directionLent',
};

export const LoanDirectionBadgeColors: Record<LoanDirection, string> = {
  [LoanDirection.Borrowed]: 'badge-error',
  [LoanDirection.Lent]: 'badge-success',
};

export const LoanDirectionIcons: Record<LoanDirection, string> = {
  [LoanDirection.Borrowed]: 'fa-arrow-down',
  [LoanDirection.Lent]: 'fa-arrow-up',
};

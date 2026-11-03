export interface DebtsLoanApiModel {
  loanId: number;
  name: string;
  institutionId: number;
  institutionName: string | null;
  counterpartName: string | null;
  currencyId: number;
  currentBalance: number;
  remainingInstallments: number;
  nextDueDate: string | null;
  nextAmount: number;
  expectedEndDate: string | null;
  overdueCount: number;
  overdueAmount: number;
}

export interface DebtsOverviewApiModel {
  borrowed: DebtsLoanApiModel[];
  lent: DebtsLoanApiModel[];
  totals: { currencyId: number; borrowed: number; lent: number; monthlyCommitted: number }[];
}

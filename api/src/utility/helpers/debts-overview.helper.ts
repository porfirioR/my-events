import { LoanDirection } from '../enums';

// Préstamos en curso (Active, Paused)
const LOAN_STATUSES_ACTIVE = [1, 3];

export interface DebtsLoanInput {
  id: number;
  name: string;
  institutionId: number;
  lenderCustomName: string | null;
  currencyId: number;
  direction: number;
  statusId: number;
  currentBalance: number;
  expectedEndDate: string | null;
  installmentAmount: number; // cuota pactada, si no quedan cuotas con monto
}

export interface DebtsInstallmentInput {
  loanId: number;
  dueDate: string | null;
  totalAmount: number;
}

export interface DebtsInput {
  loans: DebtsLoanInput[];
  // Cuotas pendientes de los préstamos
  installments: DebtsInstallmentInput[];
}

export interface DebtsLoanResult {
  loanId: number;
  name: string;
  institutionId: number;
  lenderCustomName: string | null;
  currencyId: number;
  currentBalance: number;
  remainingInstallments: number;
  nextDueDate: string | null;
  nextAmount: number;
  expectedEndDate: string | null;
  // Cuotas vencidas sin pagar / cobrar
  overdueCount: number;
  overdueAmount: number;
}

export interface DebtsOverviewResult {
  borrowed: DebtsLoanResult[];
  lent: DebtsLoanResult[];
  // Por moneda: lo que debo, lo que me deben y la suma de las próximas cuotas de lo que debo
  totals: { currencyId: number; borrowed: number; lent: number; monthlyCommitted: number }[];
}

export class DebtsOverviewHelper {
  static build(input: DebtsInput, today: string): DebtsOverviewResult {
    const pendingByLoan = new Map<number, DebtsInstallmentInput[]>();
    input.installments.forEach(i => pendingByLoan.set(i.loanId, [...(pendingByLoan.get(i.loanId) ?? []), i]));

    const loans = input.loans
      .filter(l => LOAN_STATUSES_ACTIVE.includes(l.statusId) && Number(l.currentBalance) > 0)
      .map(l => ({ direction: l.direction, result: DebtsOverviewHelper.toResult(l, pendingByLoan.get(l.id) ?? [], today) }));

    const borrowed = loans
      .filter(l => l.direction !== LoanDirection.Lent)
      .map(l => l.result)
      .sort(DebtsOverviewHelper.byNextDueDate);
    // Primero los que tienen cobros atrasados
    const lent = loans
      .filter(l => l.direction === LoanDirection.Lent)
      .map(l => l.result)
      .sort((a, b) => b.overdueCount - a.overdueCount || DebtsOverviewHelper.byNextDueDate(a, b));

    return { borrowed, lent, totals: DebtsOverviewHelper.totals(borrowed, lent) };
  }

  private static toResult(loan: DebtsLoanInput, pending: DebtsInstallmentInput[], today: string): DebtsLoanResult {
    const sorted = [...pending].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
    const overdue = sorted.filter(i => i.dueDate && i.dueDate < today);
    const next = sorted[0] ?? null;
    return {
      loanId: loan.id,
      name: loan.name,
      institutionId: loan.institutionId,
      lenderCustomName: loan.lenderCustomName,
      currencyId: loan.currencyId,
      currentBalance: Number(loan.currentBalance),
      remainingInstallments: sorted.length,
      nextDueDate: next?.dueDate ?? null,
      nextAmount: next ? Number(next.totalAmount) : Number(loan.installmentAmount) || 0,
      expectedEndDate: loan.expectedEndDate,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((sum, i) => sum + Number(i.totalAmount), 0),
    };
  }

  private static totals(borrowed: DebtsLoanResult[], lent: DebtsLoanResult[]) {
    const totals = new Map<number, { currencyId: number; borrowed: number; lent: number; monthlyCommitted: number }>();
    const get = (currencyId: number) => {
      if (!totals.has(currencyId)) totals.set(currencyId, { currencyId, borrowed: 0, lent: 0, monthlyCommitted: 0 });
      return totals.get(currencyId);
    };
    borrowed.forEach(l => {
      const total = get(l.currencyId);
      total.borrowed += l.currentBalance;
      // Un préstamo sin cuotas pendientes (ej. informal sin cronograma) no compromete una cuota mensual
      if (l.remainingInstallments > 0) total.monthlyCommitted += l.nextAmount;
    });
    lent.forEach(l => { get(l.currencyId).lent += l.currentBalance; });
    return [...totals.values()].sort((a, b) => a.currencyId - b.currencyId);
  }

  private static byNextDueDate(a: DebtsLoanResult, b: DebtsLoanResult): number {
    return (a.nextDueDate ?? '9999').localeCompare(b.nextDueDate ?? '9999');
  }
}

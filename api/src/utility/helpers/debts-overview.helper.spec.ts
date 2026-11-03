import { DebtsInstallmentInput, DebtsLoanInput, DebtsOverviewHelper } from './debts-overview.helper';
import { LoanDirection } from '../enums';

const GUARANI = 4;
const DOLLAR = 1;
const TODAY = '2026-11-02';

const loan = (overrides: Partial<DebtsLoanInput>): DebtsLoanInput => ({
  id: 1,
  name: 'Préstamo',
  institutionId: 1,
  lenderCustomName: null,
  currencyId: GUARANI,
  direction: LoanDirection.Borrowed,
  statusId: 1,
  currentBalance: 1_000,
  expectedEndDate: '2027-08-10',
  installmentAmount: 100,
  ...overrides,
});

const installment = (loanId: number, dueDate: string, totalAmount = 100): DebtsInstallmentInput => ({ loanId, dueDate, totalAmount });

describe('DebtsOverviewHelper', () => {
  it('splits borrowed and lent loans with remaining installments and next due date', () => {
    const result = DebtsOverviewHelper.build({
      loans: [loan({ id: 1, name: 'Ueno' }), loan({ id: 2, name: 'Juan', direction: LoanDirection.Lent, lenderCustomName: 'Juan' })],
      installments: [
        // 10 cuotas mensuales desde noviembre 2026
        ...Array.from({ length: 10 }, (_, i) => {
          const date = new Date(Date.UTC(2026, 10 + i, 10));
          return installment(1, date.toISOString().slice(0, 10), 120);
        }),
        installment(2, '2026-11-20', 50),
      ],
    }, TODAY);

    expect(result.borrowed).toHaveLength(1);
    expect(result.borrowed[0]).toMatchObject({ name: 'Ueno', remainingInstallments: 10, nextDueDate: '2026-11-10', nextAmount: 120 });
    expect(result.lent[0]).toMatchObject({ name: 'Juan', lenderCustomName: 'Juan', nextDueDate: '2026-11-20', nextAmount: 50 });
  });

  it('flags overdue installments with their amount', () => {
    const result = DebtsOverviewHelper.build({
      loans: [loan({ id: 2, direction: LoanDirection.Lent })],
      installments: [installment(2, '2026-09-20', 50), installment(2, '2026-10-20', 50), installment(2, '2026-11-20', 50)],
    }, TODAY);

    expect(result.lent[0]).toMatchObject({ overdueCount: 2, overdueAmount: 100, nextDueDate: '2026-09-20' });
  });

  it('puts lent loans with overdue collections first', () => {
    const result = DebtsOverviewHelper.build({
      loans: [
        loan({ id: 2, name: 'Al día', direction: LoanDirection.Lent }),
        loan({ id: 3, name: 'Atrasado', direction: LoanDirection.Lent }),
      ],
      installments: [installment(2, '2026-11-05'), installment(3, '2026-10-01'), installment(3, '2026-12-01')],
    }, TODAY);

    expect(result.lent.map(l => l.name)).toEqual(['Atrasado', 'Al día']);
  });

  it('sums balances and the monthly committed installments per currency', () => {
    const result = DebtsOverviewHelper.build({
      loans: [
        loan({ id: 1, currentBalance: 1_000 }),
        loan({ id: 2, currentBalance: 500 }),
        loan({ id: 3, currentBalance: 300, currencyId: DOLLAR }),
        loan({ id: 4, currentBalance: 700, direction: LoanDirection.Lent }),
      ],
      installments: [installment(1, '2026-11-10', 120), installment(2, '2026-11-15', 80), installment(3, '2026-11-15', 30)],
    }, TODAY);

    expect(result.totals).toEqual([
      { currencyId: DOLLAR, borrowed: 300, lent: 0, monthlyCommitted: 30 },
      { currencyId: GUARANI, borrowed: 1_500, lent: 700, monthlyCommitted: 200 },
    ]);
  });

  it('ignores paid off, cancelled and zero balance loans', () => {
    const result = DebtsOverviewHelper.build({
      loans: [loan({ id: 1, statusId: 2 }), loan({ id: 2, statusId: 4 }), loan({ id: 3, currentBalance: 0 })],
      installments: [],
    }, TODAY);

    expect(result.borrowed).toEqual([]);
    expect(result.totals).toEqual([]);
  });

  it('uses the agreed installment when there is no schedule and does not commit it monthly', () => {
    const result = DebtsOverviewHelper.build({
      loans: [loan({ id: 1, installmentAmount: 250 })],
      installments: [],
    }, TODAY);

    expect(result.borrowed[0]).toMatchObject({ remainingInstallments: 0, nextDueDate: null, nextAmount: 250 });
    expect(result.totals[0].monthlyCommitted).toBe(0);
  });
});

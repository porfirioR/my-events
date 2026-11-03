import { LoanDirection, MaturityEventType, ProgressionType } from '../enums';

// Ahorros que todavía no se cobraron (Active, Completed, Paused); Cancelled y Withdrawn no vencen
const SAVINGS_STATUSES_PENDING = [1, 2, 3];
// Préstamos en curso (Active, Paused)
const LOAN_STATUSES_ACTIVE = [1, 3];

export interface MaturitySavingsInput {
  id: number;
  name: string;
  institutionId: number | null;
  currencyId: number;
  progressionTypeId: number;
  statusId: number;
  targetAmount: number;
  currentAmount: number;
  expectedEndDate: string | null; // 'YYYY-MM-DD'
  payoutDate: string | null;      // cobro estimado de la rueda
  plannedDestination: string | null;
}

export interface MaturityLoanInput {
  id: number;
  name: string;
  institutionId: number;
  lenderCustomName: string | null;
  currencyId: number;
  direction: number;
  statusId: number;
  expectedEndDate: string | null;
  installmentAmount: number;
}

export interface MaturityInstallmentInput {
  loanId: number;
  dueDate: string | null;
  totalAmount: number;
}

export interface MaturityCalendarInput {
  savings: MaturitySavingsInput[];
  loans: MaturityLoanInput[];
  // Cuotas pendientes de los préstamos (de ambas direcciones; acá solo se usan las de los otorgados)
  installments: MaturityInstallmentInput[];
}

export interface MaturityEventResult {
  type: MaturityEventType;
  date: string;
  currencyId: number;
  amount: number;
  sourceId: number; // id del ahorro o del préstamo
  name: string;
  institutionId: number | null;
  lenderCustomName: string | null;
  plannedDestination: string | null;
}

export interface MaturityMonthResult {
  month: string; // 'YYYY-MM'
  // Plata que entra en el mes, por moneda (el fin de un préstamo no suma: libera la cuota, no trae plata)
  totals: { currencyId: number; amount: number }[];
  events: MaturityEventResult[];
}

export interface MaturityCalendarResult {
  months: MaturityMonthResult[];
  // Ya vencidos y sin cobrar: ahorros con fecha pasada y cuotas atrasadas de préstamos otorgados
  overdue: MaturityEventResult[];
}

export class MaturityCalendarHelper {
  // Calendario desde el mes de `today` hasta `monthCount` meses adelante
  static build(input: MaturityCalendarInput, today: string, monthCount: number): MaturityCalendarResult {
    const monthKeys = MaturityCalendarHelper.monthKeys(today, monthCount);
    const lastMonth = monthKeys[monthKeys.length - 1];

    const events = [
      ...MaturityCalendarHelper.fromSavings(input.savings),
      ...MaturityCalendarHelper.fromLentInstallments(input.loans, input.installments),
      ...MaturityCalendarHelper.fromLoanEnds(input.loans, today),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

    const overdue = events.filter(e => e.date < today && e.type !== MaturityEventType.LoanEnd);
    const upcoming = events.filter(e => e.date >= today && e.date.slice(0, 7) <= lastMonth);

    const months = monthKeys.map(month => {
      const monthEvents = upcoming.filter(e => e.date.startsWith(month));
      return { month, totals: MaturityCalendarHelper.totals(monthEvents), events: monthEvents };
    });

    return { months, overdue };
  }

  private static fromSavings(savings: MaturitySavingsInput[]): MaturityEventResult[] {
    return savings
      .filter(s => SAVINGS_STATUSES_PENDING.includes(s.statusId) && s.progressionTypeId !== ProgressionType.MutualFund)
      .map(s => {
        const isRotating = s.progressionTypeId === ProgressionType.Rotating;
        const date = isRotating ? (s.payoutDate ?? s.expectedEndDate) : s.expectedEndDate;
        if (!date) return null;
        return {
          type: isRotating ? MaturityEventType.RotatingPayout : MaturityEventType.SavingsMaturity,
          date,
          currencyId: s.currencyId,
          // Monto al vencimiento (con interés o pozo de la rueda); en metas sin objetivo, lo ahorrado
          amount: Math.max(Number(s.targetAmount) || 0, Number(s.currentAmount) || 0),
          sourceId: s.id,
          name: s.name,
          institutionId: s.institutionId,
          lenderCustomName: null,
          plannedDestination: s.plannedDestination,
        };
      })
      .filter((e): e is MaturityEventResult => e !== null);
  }

  private static fromLentInstallments(loans: MaturityLoanInput[], installments: MaturityInstallmentInput[]): MaturityEventResult[] {
    const lentById = new Map(
      loans
        .filter(l => l.direction === LoanDirection.Lent && LOAN_STATUSES_ACTIVE.includes(l.statusId))
        .map(l => [l.id, l])
    );
    return installments
      .filter(i => i.dueDate && lentById.has(i.loanId))
      .map(i => {
        const loan = lentById.get(i.loanId);
        return {
          type: MaturityEventType.LentCollection,
          date: i.dueDate,
          currencyId: loan.currencyId,
          amount: Number(i.totalAmount) || 0,
          sourceId: loan.id,
          name: loan.name,
          institutionId: loan.institutionId,
          lenderCustomName: loan.lenderCustomName,
          plannedDestination: null,
        };
      });
  }

  // Solo los préstamos que todavía no terminaron: un fin ya pasado no es un evento futuro
  private static fromLoanEnds(loans: MaturityLoanInput[], today: string): MaturityEventResult[] {
    return loans
      .filter(l => l.direction === LoanDirection.Borrowed && LOAN_STATUSES_ACTIVE.includes(l.statusId))
      .filter(l => l.expectedEndDate && l.expectedEndDate >= today)
      .map(l => ({
        type: MaturityEventType.LoanEnd,
        date: l.expectedEndDate,
        currencyId: l.currencyId,
        amount: Number(l.installmentAmount) || 0,
        sourceId: l.id,
        name: l.name,
        institutionId: l.institutionId,
        lenderCustomName: l.lenderCustomName,
        plannedDestination: null,
      }));
  }

  private static totals(events: MaturityEventResult[]): { currencyId: number; amount: number }[] {
    const totals = new Map<number, number>();
    events
      .filter(e => e.type !== MaturityEventType.LoanEnd)
      .forEach(e => totals.set(e.currencyId, (totals.get(e.currencyId) ?? 0) + e.amount));
    return [...totals.entries()].sort((a, b) => a[0] - b[0]).map(([currencyId, amount]) => ({ currencyId, amount }));
  }

  private static monthKeys(today: string, monthCount: number): string[] {
    const [year, month] = today.split('-').map(Number);
    return Array.from({ length: monthCount }, (_, i) => {
      const date = new Date(Date.UTC(year, month - 1 + i, 1));
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  }
}

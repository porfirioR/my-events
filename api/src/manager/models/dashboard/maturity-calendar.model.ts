import { MaturityEventType } from '../../../utility/enums';

export class MaturityEventModel {
  constructor(
    public type: MaturityEventType,
    public date: string,
    public currencyId: number,
    public amount: number,
    public sourceId: number, // id del ahorro o del préstamo
    public name: string,
    public institutionId: number | null,
    public institutionName: string | null,
    // Préstamos: a quién le debo / quién me debe (nombre libre o la entidad)
    public counterpartName: string | null,
    public plannedDestination: string | null,
  ) {}
}

export class MaturityMonthModel {
  constructor(
    public month: string, // 'YYYY-MM'
    public totals: { currencyId: number; amount: number }[],
    public events: MaturityEventModel[],
  ) {}
}

export class MaturityCalendarModel {
  constructor(
    public months: MaturityMonthModel[],
    public overdue: MaturityEventModel[],
  ) {}
}

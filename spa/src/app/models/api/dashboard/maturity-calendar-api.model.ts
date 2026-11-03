import { MaturityEventType } from '../../enums';

export interface MaturityEventApiModel {
  type: MaturityEventType;
  date: string; // 'YYYY-MM-DD'
  currencyId: number;
  amount: number;
  sourceId: number; // id del ahorro o del préstamo
  name: string;
  institutionId: number | null;
  institutionName: string | null;
  counterpartName: string | null;
  plannedDestination: string | null;
}

export interface MaturityMonthApiModel {
  month: string; // 'YYYY-MM'
  totals: { currencyId: number; amount: number }[];
  events: MaturityEventApiModel[];
}

export interface MaturityCalendarApiModel {
  months: MaturityMonthApiModel[];
  // Vencidos sin cobrar
  overdue: MaturityEventApiModel[];
}

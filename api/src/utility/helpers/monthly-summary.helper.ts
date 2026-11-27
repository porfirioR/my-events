import { MaturityEventType } from '../enums';
import { EMAIL_COLORS, EmailTemplateHelper } from './email-template.helper';

// Resumen mensual por email (#263): arma el contenido y el HTML sin base de datos ni envío, para
// poder probarlo. El manager junta los datos (los mismos que muestran las pantallas) y lo envía.
// Por ahora todo en guaraníes, como los indicadores de salud.

export type SummaryLanguage = 'es' | 'en';
export type SummaryHealthStatus = 'good' | 'warning' | 'bad';

export interface SummaryMaturity {
  // 'YYYY-MM-DD'
  date: string;
  type: MaturityEventType;
  name: string;
  amount: number;
}

export interface SummaryLoan {
  name: string;
  counterpartName: string | null;
  // Próxima cuota del mes ('YYYY-MM-DD'); null si solo tiene atrasadas
  dueDate: string | null;
  amount: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface SummaryNetWorth {
  total: number;
  immediate: number;
  days: number;
  locked: number;
  receivable: number;
  liabilities: number;
}

export interface SummaryIndicator {
  value: number | null;
  status: SummaryHealthStatus | null;
}

export interface SummaryHealth {
  cushionMonths: SummaryIndicator;
  savingsRate: SummaryIndicator;
  debtRate: SummaryIndicator;
  source: 'imported' | 'manual';
}

export interface SummaryChecklist {
  // Todavía no se cargó el saldo de las cuentas de este mes
  updateBalances: boolean;
  // My Money no está importado hasta el final del mes anterior
  importMyMoney: boolean;
  // Transferencias del mes anterior que faltan conciliar
  reconcileCount: number;
}

export interface MonthlySummaryInput {
  // Mes del resumen ('YYYY-MM') y el anterior, para la conciliación
  month: string;
  previousMonth: string;
  language: SummaryLanguage;
  userName: string;
  appUrl: string;
  // Vencimientos y cobros de ahorros del mes (sin cobros de préstamos: van en collections)
  maturities: SummaryMaturity[];
  // Ahorros vencidos sin cobrar
  overdueMaturities: SummaryMaturity[];
  // Préstamos que debo con cuota en el mes o atrasadas
  installments: SummaryLoan[];
  // Préstamos que otorgué con cobro en el mes o atrasados
  collections: SummaryLoan[];
  netWorth: SummaryNetWorth | null;
  health: SummaryHealth | null;
  checklist: SummaryChecklist;
}

export interface MonthlySummaryEmail {
  subject: string;
  html: string;
}

const TEXTS: Record<SummaryLanguage, Record<string, string>> = {
  es: {
    subject: 'Lo que viene en {month}',
    greeting: 'Hola {name}, esto es lo que viene en {month}.',
    maturitiesTitle: 'Vencimientos y cobros de ahorros',
    overdueMaturitiesTitle: 'Vencidos sin cobrar',
    installmentsTitle: 'Cuotas a pagar',
    collectionsTitle: 'Cobros de préstamos',
    netWorthTitle: 'Patrimonio',
    healthTitle: 'Salud financiera',
    checklistTitle: 'Pendientes del mes',
    total: 'Total',
    overdue: '{count} atrasadas ({amount})',
    releases: 'libera {amount}/mes',
    netWorthTotal: 'Patrimonio neto',
    immediate: 'Inmediata',
    days: 'En días',
    locked: 'Bloqueada',
    receivable: 'Por cobrar',
    debts: 'Deudas',
    cushion: 'Meses de colchón',
    savingsRate: '% de ahorro',
    debtRate: '% de cuotas',
    months: '{value} meses',
    good: 'Bien',
    warning: 'Atención',
    bad: 'Mal',
    sourceImported: 'Ingreso, gasto esencial y aportes: promedio de My Money de los últimos 6 meses.',
    sourceManual: 'Ingreso y gasto: parámetros manuales.',
    updateBalances: 'Cargar los saldos de las cuentas de {month}.',
    importMyMoney: 'Exportar de My Money e importarlo hasta el final de {month}.',
    reconcile: 'Conciliar {count} transferencias de {month}.',
    open: 'Abrir Mis Eventos',
    footer: 'Recibís este email el día 1 de cada mes. Podés desactivarlo en Parámetros financieros.',
    savingsMaturity: 'Vence ahorro',
    rotatingPayout: 'Cobro de rueda (estimado)',
    lentCollection: 'Cobro de préstamo',
    loanEnd: 'Termina préstamo',
  },
  en: {
    subject: 'Coming up in {month}',
    greeting: 'Hi {name}, this is what is coming up in {month}.',
    maturitiesTitle: 'Savings maturities and payouts',
    overdueMaturitiesTitle: 'Overdue, not collected',
    installmentsTitle: 'Installments to pay',
    collectionsTitle: 'Loan collections',
    netWorthTitle: 'Net worth',
    healthTitle: 'Financial health',
    checklistTitle: 'To do this month',
    total: 'Total',
    overdue: '{count} overdue ({amount})',
    releases: 'frees {amount}/month',
    netWorthTotal: 'Net worth',
    immediate: 'Immediate',
    days: 'Within days',
    locked: 'Locked',
    receivable: 'Receivable',
    debts: 'Debts',
    cushion: 'Cushion months',
    savingsRate: 'Savings rate',
    debtRate: 'Debt rate',
    months: '{value} months',
    good: 'Good',
    warning: 'Watch',
    bad: 'Bad',
    sourceImported: 'Income, essential expense and contributions: My Money average of the last 6 months.',
    sourceManual: 'Income and expense: manual settings.',
    updateBalances: 'Update the account balances for {month}.',
    importMyMoney: 'Export from My Money and import it up to the end of {month}.',
    reconcile: 'Reconcile {count} transfers from {month}.',
    open: 'Open My Events',
    footer: 'You get this email on the 1st of every month. You can turn it off in Financial settings.',
    savingsMaturity: 'Savings matures',
    rotatingPayout: 'Rotating payout (estimated)',
    lentCollection: 'Loan collection',
    loanEnd: 'Loan ends',
  },
};

const LOCALES: Record<SummaryLanguage, string> = { es: 'es-PY', en: 'en-US' };

const MATURITY_TYPE_KEYS: Record<MaturityEventType, string> = {
  [MaturityEventType.SavingsMaturity]: 'savingsMaturity',
  [MaturityEventType.RotatingPayout]: 'rotatingPayout',
  [MaturityEventType.LentCollection]: 'lentCollection',
  [MaturityEventType.LoanEnd]: 'loanEnd',
};

const STATUS_COLORS: Record<SummaryHealthStatus, string> = { good: '#16a34a', warning: '#d97706', bad: '#dc2626' };
const PRIMARY = EMAIL_COLORS.primary;

export class MonthlySummaryHelper {
  // Sin nada para contar ni nada pendiente no se manda el email
  static isEmpty(input: MonthlySummaryInput): boolean {
    return input.maturities.length === 0
      && input.overdueMaturities.length === 0
      && input.installments.length === 0
      && input.collections.length === 0
      && input.netWorth === null
      && !MonthlySummaryHelper.hasHealth(input.health)
      && !MonthlySummaryHelper.hasChecklist(input.checklist);
  }

  static render(input: MonthlySummaryInput): MonthlySummaryEmail {
    const t = TEXTS[input.language];
    const fmt = new Formatter(input.language);
    const month = fmt.month(input.month);
    const previousMonth = fmt.month(input.previousMonth);
    const sections: string[] = [];

    if (input.maturities.length > 0) {
      sections.push(section(t.maturitiesTitle, input.maturities.map(m => row(
        `${escape(m.name)}<br>${muted(`${fmt.day(m.date)} · ${t[MATURITY_TYPE_KEYS[m.type]]}`)}`,
        m.type === MaturityEventType.LoanEnd ? muted(format(t.releases, { amount: fmt.money(m.amount) })) : fmt.money(m.amount),
      ))));
    }
    if (input.overdueMaturities.length > 0) {
      sections.push(section(t.overdueMaturitiesTitle, input.overdueMaturities.map(m => row(
        `${escape(m.name)}<br>${muted(`${fmt.day(m.date)} · ${t[MATURITY_TYPE_KEYS[m.type]]}`)}`,
        fmt.money(m.amount),
      ))));
    }
    if (input.installments.length > 0) {
      sections.push(section(t.installmentsTitle, [
        ...input.installments.map(loan => loanRow(loan, t, fmt)),
        totalRow(t.total, fmt.money(MonthlySummaryHelper.loansTotal(input.installments))),
      ]));
    }
    if (input.collections.length > 0) {
      sections.push(section(t.collectionsTitle, [
        ...input.collections.map(loan => loanRow(loan, t, fmt)),
        totalRow(t.total, fmt.money(MonthlySummaryHelper.loansTotal(input.collections))),
      ]));
    }
    if (input.netWorth) {
      const n = input.netWorth;
      sections.push(section(t.netWorthTitle, [
        totalRow(t.netWorthTotal, fmt.money(n.total)),
        row(t.immediate, fmt.money(n.immediate)),
        ...(n.days !== 0 ? [row(t.days, fmt.money(n.days))] : []),
        ...(n.locked !== 0 ? [row(t.locked, fmt.money(n.locked))] : []),
        ...(n.receivable !== 0 ? [row(t.receivable, fmt.money(n.receivable))] : []),
        ...(n.liabilities !== 0 ? [row(t.debts, `<span style="color:${STATUS_COLORS.bad};">−${fmt.money(n.liabilities)}</span>`)] : []),
      ]));
    }
    if (input.health && MonthlySummaryHelper.hasHealth(input.health)) {
      const h = input.health;
      sections.push(section(t.healthTitle, [
        healthRow(t.cushion, h.cushionMonths, value => format(t.months, { value: fmt.number(value) }), t),
        healthRow(t.savingsRate, h.savingsRate, value => `${fmt.number(value)} %`, t),
        healthRow(t.debtRate, h.debtRate, value => `${fmt.number(value)} %`, t),
        `<tr><td colspan="2" style="padding-top:6px;">${muted(h.source === 'imported' ? t.sourceImported : t.sourceManual)}</td></tr>`,
      ]));
    }
    if (MonthlySummaryHelper.hasChecklist(input.checklist)) {
      const c = input.checklist;
      const items = [
        ...(c.updateBalances ? [format(t.updateBalances, { month })] : []),
        ...(c.importMyMoney ? [format(t.importMyMoney, { month: previousMonth })] : []),
        ...(c.reconcileCount > 0 ? [format(t.reconcile, { count: String(c.reconcileCount), month: previousMonth })] : []),
      ];
      sections.push(section(t.checklistTitle, items.map(item => `<tr><td colspan="2" style="padding:4px 0;">☐ ${item}</td></tr>`)));
    }

    const subject = format(t.subject, { month });
    const body = `
        <h2 style="color: ${PRIMARY}; margin: 0 0 4px; font-size: 22px;">${escape(capitalize(month))}</h2>
        <p style="margin-top: 0;">${format(t.greeting, { name: escape(input.userName), month })}</p>
        ${sections.join('\n')}
        ${EmailTemplateHelper.button(input.appUrl, t.open)}`;
    const html = EmailTemplateHelper.layout(input.language, subject, body, t.footer);

    return { subject, html };
  }

  // Cuota del mes más lo atrasado de cada préstamo
  static loansTotal(loans: SummaryLoan[]): number {
    return loans.reduce((sum, loan) => sum + (loan.dueDate ? loan.amount : 0) + loan.overdueAmount, 0);
  }

  private static hasHealth(health: SummaryHealth | null): boolean {
    return !!health && [health.cushionMonths, health.savingsRate, health.debtRate].some(i => i.value !== null);
  }

  private static hasChecklist(checklist: SummaryChecklist): boolean {
    return checklist.updateBalances || checklist.importMyMoney || checklist.reconcileCount > 0;
  }
}

class Formatter {
  private readonly locale: string;
  private readonly currency: Intl.NumberFormat;

  constructor(language: SummaryLanguage) {
    this.locale = LOCALES[language];
    this.currency = new Intl.NumberFormat(this.locale, { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 });
  }

  money = (amount: number): string => this.currency.format(Math.round(Number(amount)));

  number = (value: number): string => value.toLocaleString(this.locale, { maximumFractionDigits: 1 });

  // 'YYYY-MM' → "diciembre de 2026" / "December 2026"
  month = (month: string): string => {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString(this.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  // 'YYYY-MM-DD' → "2 dic" / "Dec 2"
  day = (date: string): string => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(this.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
}

const format = (text: string, values: Record<string, string>): string =>
  Object.entries(values).reduce((result, [key, value]) => result.split(`{${key}}`).join(value), text);

// Los nombres los escribe el usuario: se escapan antes de ir al HTML
const escape = (text: string): string => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const muted = (text: string): string => `<span style="color: #888; font-size: 13px;">${text}</span>`;

const section = (title: string, rows: string[]): string => `
        <h3 style="color: ${PRIMARY}; font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">${title}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">${rows.join('')}</table>`;

const row = (label: string, value: string): string =>
  `<tr><td style="padding: 4px 0;">${label}</td><td style="padding: 4px 0; text-align: right; white-space: nowrap;">${value}</td></tr>`;

const totalRow = (label: string, value: string): string =>
  `<tr><td style="padding: 6px 0; font-weight: bold;">${label}</td><td style="padding: 6px 0; text-align: right; font-weight: bold; white-space: nowrap;">${value}</td></tr>`;

const loanRow = (loan: SummaryLoan, t: Record<string, string>, fmt: Formatter): string => {
  const details = [
    ...(loan.counterpartName ? [escape(loan.counterpartName)] : []),
    ...(loan.dueDate ? [fmt.day(loan.dueDate)] : []),
    ...(loan.overdueCount > 0 ? [`<span style="color: ${STATUS_COLORS.bad};">${format(t.overdue, { count: String(loan.overdueCount), amount: fmt.money(loan.overdueAmount) })}</span>`] : []),
  ];
  return row(`${escape(loan.name)}<br>${muted(details.join(' · '))}`, loan.dueDate ? fmt.money(loan.amount) : '');
};

const healthRow = (
  label: string,
  indicator: SummaryIndicator,
  display: (value: number) => string,
  t: Record<string, string>,
): string => {
  if (indicator.value === null) return '';
  const color = indicator.status ? STATUS_COLORS[indicator.status] : '#333';
  const status = indicator.status ? ` <span style="color: ${color}; font-size: 12px;">● ${t[indicator.status]}</span>` : '';
  return row(label, `<strong style="color: ${color};">${display(indicator.value)}</strong>${status}`);
};

import { MonthlySummaryHelper, MonthlySummaryInput } from './monthly-summary.helper';
import { MaturityEventType } from '../enums';

// Intl separa la moneda del monto con un espacio duro
const render = (input: MonthlySummaryInput) => {
  const email = MonthlySummaryHelper.render(input);
  return { subject: email.subject, html: email.html.replace(/ /g, ' ') };
};

const empty = (overrides: Partial<MonthlySummaryInput> = {}): MonthlySummaryInput => ({
  month: '2026-12',
  previousMonth: '2026-11',
  language: 'es',
  userName: 'Porfirio',
  appUrl: 'https://my-events.example',
  maturities: [],
  overdueMaturities: [],
  installments: [],
  collections: [],
  netWorth: null,
  health: null,
  checklist: { updateBalances: false, importMyMoney: false, reconcileCount: 0 },
  ...overrides,
});

const full = (): MonthlySummaryInput => empty({
  maturities: [
    { date: '2026-12-01', type: MaturityEventType.SavingsMaturity, name: 'Ña 9', amount: 1_859_358 },
    { date: '2026-12-07', type: MaturityEventType.LoanEnd, name: 'Mbarete Porã', amount: 240_000 },
  ],
  installments: [
    { name: 'Préstamo Ueno', counterpartName: 'Ueno', dueDate: '2026-12-05', amount: 646_071, overdueCount: 1, overdueAmount: 646_071 },
    { name: 'Mbarete Porã ju', counterpartName: null, dueDate: '2026-12-06', amount: 240_000, overdueCount: 0, overdueAmount: 0 },
  ],
  collections: [
    { name: 'Préstamo Kati', counterpartName: 'Kati Gauto', dueDate: '2026-12-02', amount: 262_500, overdueCount: 0, overdueAmount: 0 },
  ],
  netWorth: { total: 34_452_994, immediate: 25_444_893, days: 1_000_000, locked: 14_500_000, receivable: 250_000, liabilities: 6_741_899 },
  health: {
    cushionMonths: { value: 6.6, status: 'good' },
    savingsRate: { value: 19.2, status: 'good' },
    debtRate: { value: 12.2, status: 'good' },
    source: 'imported',
  },
  checklist: { updateBalances: true, importMyMoney: false, reconcileCount: 3 },
});

describe('MonthlySummaryHelper', () => {
  it('is empty only when there is nothing to show and nothing pending', () => {
    expect(MonthlySummaryHelper.isEmpty(empty())).toBe(true);
    expect(MonthlySummaryHelper.isEmpty(empty({ checklist: { updateBalances: true, importMyMoney: false, reconcileCount: 0 } }))).toBe(false);
    expect(MonthlySummaryHelper.isEmpty(empty({ netWorth: full().netWorth }))).toBe(false);
    // Indicadores sin ningún valor no cuentan
    expect(MonthlySummaryHelper.isEmpty(empty({
      health: { cushionMonths: { value: null, status: null }, savingsRate: { value: null, status: null }, debtRate: { value: null, status: null }, source: 'manual' },
    }))).toBe(true);
  });

  it('adds the month installment and what is overdue to the total', () => {
    expect(MonthlySummaryHelper.loansTotal(full().installments)).toBe(646_071 + 646_071 + 240_000);
    expect(MonthlySummaryHelper.loansTotal([
      { name: 'Solo atrasada', counterpartName: null, dueDate: null, amount: 100, overdueCount: 2, overdueAmount: 500 },
    ])).toBe(500);
  });

  it('renders every section with data, in Spanish', () => {
    const { subject, html } = render(full());
    expect(subject).toBe('Tu resumen de diciembre de 2026');
    expect(html).toContain('Diciembre de 2026');
    expect(html).toContain('Vencimientos y cobros de ahorros');
    expect(html).toContain('Gs. 1.859.358');
    expect(html).toContain('libera Gs. 240.000/mes');
    expect(html).toContain('1 atrasadas (Gs. 646.071)');
    expect(html).toContain('Gs. 1.532.142'); // total de cuotas: 646.071 + 646.071 atrasada + 240.000
    expect(html).toContain('Cobros de préstamos');
    expect(html).toContain('Gs. 34.452.994');
    expect(html).toContain('6,6 meses');
    expect(html).toContain('promedio de My Money');
    expect(html).toContain('Cargar los saldos de las cuentas de diciembre de 2026.');
    expect(html).toContain('Conciliar 3 transferencias de noviembre de 2026.');
    expect(html).not.toContain('Exportar de My Money');
    expect(html).not.toContain('Vencidos sin cobrar');
  });

  it('omits the sections without data', () => {
    const { html } = render(empty({ netWorth: full().netWorth }));
    expect(html).toContain('Patrimonio');
    expect(html).not.toContain('Cuotas a pagar');
    expect(html).not.toContain('Salud financiera');
    expect(html).not.toContain('Pendientes del mes');
  });

  it('renders in English with the language of the user', () => {
    const { subject, html } = render({ ...full(), language: 'en' });
    expect(subject).toBe('Your summary for December 2026');
    expect(html).toContain('Installments to pay');
    expect(html).toContain('PYG 646,071');
    expect(html).toContain('6.6 months');
  });

  it('escapes the names written by the user', () => {
    const { html } = render(empty({
      userName: '<b>Ana</b>',
      collections: [{ name: '<script>x</script>', counterpartName: 'A & B', dueDate: '2026-12-02', amount: 1, overdueCount: 0, overdueAmount: 0 }],
    }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(html).toContain('A &amp; B');
  });
});

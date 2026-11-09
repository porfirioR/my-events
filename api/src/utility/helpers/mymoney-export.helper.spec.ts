import { MYMONEY_MAX_ISSUES, MyMoneyExportHelper } from './mymoney-export.helper';

const validExport = () => ({
  format: 'mymoney-export',
  version: 1,
  exportedAt: '2026-11-07T19:44:00.000Z',
  timezone: 'America/Asuncion',
  currency: 'PYG',
  from: '2026-01-01',
  to: '2026-03-31',
  categories: [
    { id: 'cat-salary', name: 'Salario', type: 'income', active: true },
    { id: 'cat-food', name: 'Comida', type: 'expense', active: true },
    { id: 'cat-old', name: 'Vieja', type: 'expense', active: false },
  ],
  movements: [
    { id: 'm1', date: '2026-01-05', type: 'income', categoryId: 'cat-salary', amount: 5000000, memorandum: 'Enero' },
    { id: 'm2', date: '2026-01-31', type: 'expense', categoryId: 'cat-food', amount: 150000, memorandum: ' super ' },
    { id: 'm3', date: '2026-03-01', type: 'expense', categoryId: 'cat-old', amount: 50000, memorandum: '' },
    { id: 'm4', date: '2026-03-31', type: 'expense', categoryId: 'cat-food', amount: 20000, memorandum: '' },
  ],
  relatedGroups: [
    { id: 'g1', name: 'Viaje', progressType: 'expense', totalAmount: 170000, movementIds: ['m2', 'm4'] },
  ],
});

const codes = (raw: unknown) => {
  const result = MyMoneyExportHelper.parse(raw);
  return result.errors.map(e => `${e.code}@${e.path}`);
};

describe('MyMoneyExportHelper', () => {
  describe('parse', () => {
    it('acepta un export válido y normaliza los textos', () => {
      const result = MyMoneyExportHelper.parse(validExport());
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.data!.movements).toHaveLength(4);
      expect(result.data!.movements[1].memorandum).toBe('super');
      expect(result.data!.categories[2].active).toBe(false);
      expect(result.data!.relatedGroups[0].movementIds).toEqual(['m2', 'm4']);
    });

    it('parseText acepta BOM y rechaza JSON inválido', () => {
      expect(MyMoneyExportHelper.parseText('﻿' + JSON.stringify(validExport())).valid).toBe(true);
      const result = MyMoneyExportHelper.parseText('{ no es json');
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([{ code: 'invalidJson', path: '' }]);
    });

    it('rechaza algo que no es un objeto', () => {
      expect(codes([1, 2])).toEqual(['notAnObject@']);
      expect(codes(null)).toEqual(['notAnObject@']);
    });

    it('rechaza otro formato sin validar el resto', () => {
      const result = MyMoneyExportHelper.parse({ ...validExport(), format: 'otro', currency: 'USD' });
      expect(result.errors).toEqual([{ code: 'invalidFormat', path: 'format', params: { value: '"otro"', expected: 'mymoney-export' } }]);
    });

    it('rechaza otra versión', () => {
      const result = MyMoneyExportHelper.parse({ ...validExport(), version: 2 });
      expect(result.errors).toEqual([{ code: 'unsupportedVersion', path: 'version', params: { value: '2', expected: 1 } }]);
    });

    it('rechaza otra moneda y campos obligatorios faltantes', () => {
      const raw: any = { ...validExport(), currency: 'USD' };
      delete raw.timezone;
      delete raw.movements;
      expect(codes(raw)).toEqual(['invalidCurrency@currency', 'required@timezone', 'required@movements', 'unknownMovement@relatedGroups[0].movementIds[0]', 'unknownMovement@relatedGroups[0].movementIds[1]']);
    });

    it('valida fechas y rango', () => {
      expect(codes({ ...validExport(), from: '2026-02-30' })).toContain('invalidDate@from');
      expect(codes({ ...validExport(), to: '31/03/2026' })).toContain('invalidDate@to');
      expect(codes({ ...validExport(), from: '2026-04-01' })).toEqual(['invalidRange@from']);
    });

    it('valida cada movimiento', () => {
      const raw = validExport();
      raw.movements = [
        { id: 'a', date: '2026-01-10', type: 'expense', categoryId: 'cat-food', amount: 1500.5, memorandum: '' },
        { id: 'b', date: '2026-01-10', type: 'expense', categoryId: 'cat-food', amount: -10, memorandum: '' },
        { id: 'c', date: '2026-01-10', type: 'expense', categoryId: 'cat-food', amount: '100' as any, memorandum: '' },
        { id: 'd', date: '2026-04-01', type: 'expense', categoryId: 'cat-food', amount: 100, memorandum: '' },
        { id: 'e', date: '2026-01-10', type: 'transfer' as any, categoryId: 'cat-food', amount: 100, memorandum: '' },
        { id: 'f', date: '2026-01-10', type: 'expense', categoryId: 'no-existe', amount: 100, memorandum: '' },
        { id: 'a', date: '2026-01-10', type: 'expense', categoryId: 'cat-food', amount: 100, memorandum: '' },
        { id: '', date: '2026-1-10', type: 'expense', categoryId: 'cat-food', amount: 0, memorandum: '' },
      ];
      raw.relatedGroups = [];
      expect(codes(raw)).toEqual([
        'invalidAmount@movements[0].amount',
        'invalidAmount@movements[1].amount',
        'invalidAmount@movements[2].amount',
        'dateOutOfRange@movements[3].date',
        'invalidType@movements[4].type',
        'unknownCategory@movements[5].categoryId',
        'duplicateId@movements[6].id',
        'required@movements[7].id',
        'invalidDate@movements[7].date',
        'invalidAmount@movements[7].amount',
      ]);
    });

    it('valida categorías y grupos', () => {
      const raw = validExport();
      raw.categories.push({ id: 'cat-food', name: '', type: 'gasto' as any, active: true });
      raw.relatedGroups.push({ id: 'g1', name: 'Repetido', progressType: 'expense', totalAmount: -1, movementIds: ['zzz'] });
      expect(codes(raw)).toEqual([
        'duplicateId@categories[3].id',
        'required@categories[3].name',
        'invalidType@categories[3].type',
        'duplicateId@relatedGroups[1].id',
        'invalidTotal@relatedGroups[1].totalAmount',
        'unknownMovement@relatedGroups[1].movementIds[0]',
      ]);
    });

    it('avisa sin rechazar si el tipo del movimiento no coincide con el de la categoría', () => {
      const raw = validExport();
      raw.movements[1].type = 'income';
      const result = MyMoneyExportHelper.parse(raw);
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([
        { code: 'categoryTypeMismatch', path: 'movements[1].categoryId', params: { value: 'Comida', type: 'income', categoryType: 'expense' } },
      ]);
    });

    it('corta la lista de errores y dice cuántos quedaron afuera', () => {
      const raw = validExport();
      raw.relatedGroups = [];
      raw.movements = Array.from({ length: MYMONEY_MAX_ISSUES + 5 }, (_, i) =>
        ({ id: `x${i}`, date: '2026-01-10', type: 'expense', categoryId: 'cat-food', amount: 0, memorandum: '' }));
      const result = MyMoneyExportHelper.parse(raw);
      expect(result.errors).toHaveLength(MYMONEY_MAX_ISSUES + 1);
      expect(result.errors[MYMONEY_MAX_ISSUES]).toEqual({ code: 'tooManyIssues', path: '', params: { count: 5 } });
    });
  });

  describe('summarize', () => {
    it('totaliza por mes (incluye meses vacíos) y por categoría', () => {
      const result = MyMoneyExportHelper.parse(validExport());
      const summary = MyMoneyExportHelper.summarize(result.data!);

      expect(summary.totals).toEqual({ movementCount: 4, incomeCount: 1, expenseCount: 3, income: 5000000, expense: 220000, net: 4780000 });
      expect(summary.months).toEqual([
        { month: '2026-01', movementCount: 2, incomeCount: 1, expenseCount: 1, income: 5000000, expense: 150000, net: 4850000 },
        { month: '2026-02', movementCount: 0, incomeCount: 0, expenseCount: 0, income: 0, expense: 0, net: 0 },
        { month: '2026-03', movementCount: 2, incomeCount: 0, expenseCount: 2, income: 0, expense: 70000, net: -70000 },
      ]);
      expect(summary.categories.map(c => [c.id, c.movementCount, c.total])).toEqual([
        ['cat-food', 2, 170000],
        ['cat-old', 1, 50000],
        ['cat-salary', 1, 5000000],
      ]);
      expect(summary.relatedGroupCount).toBe(1);
    });

    it('un export sin movimientos da todos los meses en cero', () => {
      const raw = { ...validExport(), movements: [], relatedGroups: [] };
      const summary = MyMoneyExportHelper.summarize(MyMoneyExportHelper.parse(raw).data!);
      expect(summary.months.map(m => m.month)).toEqual(['2026-01', '2026-02', '2026-03']);
      expect(summary.totals.movementCount).toBe(0);
    });
  });

  describe('monthsBetween', () => {
    it('cruza años', () => {
      expect(MyMoneyExportHelper.monthsBetween('2025-11-15', '2026-02-01')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
      expect(MyMoneyExportHelper.monthsBetween('2026-05-01', '2026-05-31')).toEqual(['2026-05']);
    });
  });
});

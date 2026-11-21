import { MyMoneyMovementTypeEnum } from '../enums';
import {
  InstallmentRef,
  MyMoneyReconciliationHelper,
  ReconciliationInstallment,
  ReconciliationMovement,
  ReconciliationTarget,
} from './mymoney-reconciliation.helper';

const { Expense, Income } = MyMoneyMovementTypeEnum;

const aho3: ReconciliationTarget = { kind: 'savings', id: 48, name: 'Aho 3', installmentMovementType: Expense };
const na10: ReconciliationTarget = { kind: 'savings', id: 39, name: 'Ña 10', installmentMovementType: Expense };
const rueda: ReconciliationTarget = { kind: 'savings', id: 71, name: 'Rueda CU', installmentMovementType: Expense };
const fondo: ReconciliationTarget = { kind: 'savings', id: 68, name: 'Fondo mutuo', installmentMovementType: Expense };
const kati: ReconciliationTarget = { kind: 'loan', id: 21, name: 'Préstamo Kati', installmentMovementType: Income };

const installment = (
  id: number,
  target: ReconciliationTarget,
  number: number,
  dueDate: string | null,
  amount: number,
  statusId = 1,
  paidDate: string | null = null,
): ReconciliationInstallment => ({ id, targetKind: target.kind, targetId: target.id, number, amount, dueDate, statusId, paidDate });

const movement = (
  id: number,
  date: string,
  amount: number,
  note: string,
  target: ReconciliationTarget | null,
  movementType = Expense,
  linkedInstallments: InstallmentRef[] = [],
): ReconciliationMovement => ({ id, date, movementType, amount, note, target, linkedInstallments });

const period = { from: '2026-09-01', to: '2026-09-30' };
const reconcile = (movements: ReconciliationMovement[], targets: ReconciliationTarget[], installments: ReconciliationInstallment[], linked: string[] = []) =>
  MyMoneyReconciliationHelper.reconcile({ ...period, movements, targets, installments, linkedInstallmentKeys: new Set(linked) });

describe('MyMoneyReconciliationHelper', () => {
  describe('installmentNumberFromNote', () => {
    it('reads the installment number at the end of the description', () => {
      expect(MyMoneyReconciliationHelper.installmentNumberFromNote('Aho3 4/12')).toBe(4);
      expect(MyMoneyReconciliationHelper.installmentNumberFromNote('Ña 5 14/15')).toBe(14);
      expect(MyMoneyReconciliationHelper.installmentNumberFromNote('Ueno 6M 2/12')).toBe(2);
      expect(MyMoneyReconciliationHelper.installmentNumberFromNote('Mbarete Porã ju 6 / 15 ')).toBe(6);
    });

    it('ignores descriptions without a valid number', () => {
      expect(MyMoneyReconciliationHelper.installmentNumberFromNote('Ña 10 septiembre')).toBeNull();
      expect(MyMoneyReconciliationHelper.installmentNumberFromNote('Ueno 6M')).toBeNull();
      expect(MyMoneyReconciliationHelper.installmentNumberFromNote('Aho3 13/12')).toBeNull();
    });
  });

  describe('reconcile', () => {
    it('matches by installment number and tells whether my-events already has it paid', () => {
      const report = reconcile(
        [movement(1, '2026-09-02', 350000, 'Aho3 4/12', aho3)],
        [aho3],
        [installment(10, aho3, 3, '2026-08-09', 350000, 2, '2026-08-03'), installment(11, aho3, 4, '2026-09-09', 350000)],
      );
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].installments.map(i => i.id)).toEqual([11]);
      expect(report.rows[0].status).toBe('paidOnlyInMyMoney');
      expect(report.rows[0].amountDiffers).toBe(false);
      expect(report.rows[0].dateDiffers).toBe(false);
    });

    it('flags a numbered installment that is due far from the movement (different numbering)', () => {
      const report = reconcile(
        [movement(1, '2026-09-14', 220000, 'Rueda 58/60', rueda)],
        [rueda],
        [installment(56, rueda, 56, '2026-09-01', 220000, 2, '2026-09-01'), installment(58, rueda, 58, '2026-11-01', 220000, 2, '2026-11-01')],
      );
      expect(report.rows[0].installments.map(i => i.id)).toEqual([58]);
      expect(report.rows[0].dateDiffers).toBe(true);
      expect(report.paidOnlyInMyEvents.map(i => i.id)).toEqual([56]);
    });

    it('without a number, takes the closest installment with the same amount', () => {
      const report = reconcile(
        [movement(1, '2026-09-02', 522000, 'Ña 10 septiembre', na10)],
        [na10],
        [
          installment(20, na10, 8, '2026-08-04', 522000, 2, '2026-08-04'),
          installment(21, na10, 9, '2026-09-04', 522000),
          installment(22, na10, 10, '2026-10-04', 522000),
        ],
      );
      expect(report.rows[0].installments.map(i => i.id)).toEqual([21]);
      expect(report.rows[0].status).toBe('paidOnlyInMyMoney');
    });

    it('groups consecutive installments that add up to a monthly contribution', () => {
      const report = reconcile(
        [movement(1, '2026-09-02', 522000, 'Ña 10 septiembre', na10)],
        [na10],
        [
          installment(7, na10, 7, null, 138000, 2, '2026-08-04'),
          installment(8, na10, 8, null, 135000, 2, '2026-09-02'),
          installment(9, na10, 9, null, 132000, 2, '2026-09-02'),
          installment(10, na10, 10, null, 129000, 2, '2026-09-02'),
          installment(11, na10, 11, null, 126000, 2, '2026-09-02'),
          installment(12, na10, 12, null, 123000),
        ],
      );
      expect(report.rows[0].installments.map(i => i.id)).toEqual([8, 9, 10, 11]);
      expect(report.rows[0].status).toBe('matched');
      expect(report.rows[0].amountDiffers).toBe(false);
      expect(report.paidOnlyInMyEvents).toEqual([]);
    });

    it('prefers installments already paid on that date over pending ones with the same total', () => {
      const report = reconcile(
        [movement(1, '2026-09-01', 150000, 'Ña 10 septiembre', na10)],
        [na10],
        [
          installment(39, na10, 39, null, 42000),
          installment(40, na10, 40, null, 39000),
          installment(41, na10, 41, null, 36000, 2, '2026-09-01'),
          installment(42, na10, 42, null, 33000, 2, '2026-09-01'),
          installment(43, na10, 43, null, 30000, 2, '2026-09-01'),
          installment(44, na10, 44, null, 27000, 2, '2026-09-01'),
          installment(45, na10, 45, null, 24000, 2, '2026-09-01'),
        ],
      );
      expect(report.rows[0].installments.map(i => i.id)).toEqual([41, 42, 43, 44, 45]);
      expect(report.rows[0].status).toBe('matched');
    });

    it('uses the due date to decide the month of an installment paid only in my-events', () => {
      const report = reconcile([], [aho3], [installment(11, aho3, 4, '2026-08-09', 350000, 2, '2026-09-20')]);
      expect(report.paidOnlyInMyEvents).toEqual([]);
    });

    it('does not report installments paid by a movement of a neighbor month, nor list that movement', () => {
      const report = reconcile(
        [movement(1, '2026-08-03', 350000, 'Aho3 3/12', aho3)],
        [aho3],
        [installment(10, aho3, 3, '2026-09-09', 350000, 2, '2026-08-04')],
      );
      expect(report.rows).toEqual([]);
      expect(report.paidOnlyInMyEvents).toEqual([]);
    });

    it('marks contributions to a goal without installments', () => {
      const report = reconcile([movement(1, '2026-09-08', 243416, 'Fondo mutuo', fondo)], [fondo], []);
      expect(report.rows[0].status).toBe('noInstallments');
    });

    it('keeps reconciled rows and does not propose an installment twice', () => {
      const report = reconcile(
        [
          movement(1, '2026-09-02', 350000, 'Aho3 4/12', aho3, Expense, [{ kind: 'savings', id: 11 }]),
          movement(2, '2026-09-20', 350000, 'Aho3 4/12', aho3),
        ],
        [aho3],
        [installment(11, aho3, 4, '2026-09-05', 350000, 2, '2026-09-02')],
        ['savings:11'],
      );
      expect(report.rows.map(r => r.status)).toEqual(['reconciled', 'unmatched']);
      expect(report.rows[0].installments.map(i => i.id)).toEqual([11]);
    });

    it('only uses the movement direction that pays an installment', () => {
      const report = reconcile(
        [
          movement(1, '2026-09-06', 262500, 'Kati Gauto 1/2', kati, Income),
          movement(2, '2026-09-03', 500000, 'Kati', kati, Expense),
          movement(3, '2026-09-03', 50000, 'Cena', null),
        ],
        [kati],
        [installment(30, kati, 1, '2026-09-05', 262500)],
      );
      expect(report.rows.map(r => r.movement.id)).toEqual([1]);
      expect(report.rows[0].status).toBe('paidOnlyInMyMoney');
    });

    it('reports installments paid only in my-events and the ones pending in both', () => {
      const report = reconcile(
        [],
        [aho3],
        [
          installment(11, aho3, 4, '2026-09-05', 350000, 2, '2026-09-04'),
          installment(12, aho3, 5, '2026-09-28', 350000),
          installment(13, aho3, 6, '2026-10-05', 350000),
        ],
      );
      expect(report.paidOnlyInMyEvents.map(i => i.id)).toEqual([11]);
      expect(report.pendingInBoth.map(i => i.id)).toEqual([12]);
    });
  });
});

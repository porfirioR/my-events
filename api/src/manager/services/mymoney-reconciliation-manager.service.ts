import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IMPORT_TOKENS, LOAN_TOKENS, SAVINGS_TOKENS } from '../../utility/constants/injection-tokens.const';
import { LoanDirection, MyMoneyCategoryKind, MyMoneyMovementTypeEnum } from '../../utility/enums';
import { MyMoneyCategoryMappingHelper } from '../../utility/helpers/mymoney-category-mapping.helper';
import {
  installmentKey,
  InstallmentRef,
  MyMoneyReconciliationHelper,
  ReconciliationInstallment,
  ReconciliationMovement,
  ReconciliationReport,
  ReconciliationRow,
  ReconciliationTarget,
} from '../../utility/helpers/mymoney-reconciliation.helper';
import {
  IImportedMovementAccessService,
  IImportedMovementLinkAccessService,
  IMyMoneyCategoryMappingAccessService,
  IMyMoneyDescriptionRuleAccessService,
  MyMoneyLinkTarget,
} from '../../access/contract/mymoney';
import { ISavingsGoalAccessService, ISavingsInstallmentAccessService } from '../../access/contract/savings';
import { ILoanAccessService, ILoanInstallmentAccessService } from '../../access/contract/loans';
import {
  ApplyMyMoneyReconciliationItem,
  MyMoneyReconciliationApplyResultModel,
  MyMoneyReconciliationFailureModel,
  MyMoneyReconciliationInstallmentModel,
  MyMoneyReconciliationModel,
} from '../models/imports';
import { PayInstallmentRequest } from '../models/savings/pay-installment-request';
import { PayLoanInstallmentRequest } from '../models/loans/pay-loan-installment-request';
import { SavingsManagerService } from './saving-manager.service';
import { LoanManagerService } from './loan-manager.service';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const PENDING = 1;
const NEIGHBOR_DAYS = 31;

interface LoadedReconciliation {
  report: ReconciliationReport;
  names: Map<string, string>;
  from: string;
  to: string;
}

// Conciliación de las transferencias importadas de MyMoney con las cuotas de ahorros y préstamos (#233).
// El destino de cada movimiento sale del patrón de descripción (#231) o, si no hay, de su categoría.
@Injectable()
export class MyMoneyReconciliationManagerService {
  constructor(
    @Inject(IMPORT_TOKENS.CATEGORY_MAPPING_ACCESS_SERVICE)
    private readonly categoryMappingAccessService: IMyMoneyCategoryMappingAccessService,
    @Inject(IMPORT_TOKENS.DESCRIPTION_RULE_ACCESS_SERVICE)
    private readonly descriptionRuleAccessService: IMyMoneyDescriptionRuleAccessService,
    @Inject(IMPORT_TOKENS.IMPORTED_MOVEMENT_ACCESS_SERVICE)
    private readonly importedMovementAccessService: IImportedMovementAccessService,
    @Inject(IMPORT_TOKENS.IMPORTED_MOVEMENT_LINK_ACCESS_SERVICE)
    private readonly linkAccessService: IImportedMovementLinkAccessService,
    @Inject(SAVINGS_TOKENS.GOAL_ACCESS_SERVICE)
    private readonly savingsGoalAccessService: ISavingsGoalAccessService,
    @Inject(SAVINGS_TOKENS.INSTALLMENT_ACCESS_SERVICE)
    private readonly savingsInstallmentAccessService: ISavingsInstallmentAccessService,
    @Inject(LOAN_TOKENS.LOAN_ACCESS_SERVICE)
    private readonly loanAccessService: ILoanAccessService,
    @Inject(LOAN_TOKENS.INSTALLMENT_ACCESS_SERVICE)
    private readonly loanInstallmentAccessService: ILoanInstallmentAccessService,
    private readonly savingsManagerService: SavingsManagerService,
    private readonly loanManagerService: LoanManagerService,
  ) {}

  public getReconciliation = async (userId: number, month: string): Promise<MyMoneyReconciliationModel> => {
    const loaded = await this.load(userId, month);
    return this.toModel(month, loaded);
  };

  // Concilia lo que el usuario confirmó. Solo se aceptan las cuotas que propone el servidor para ese
  // movimiento; con markAsPaid, las cuotas pendientes se pagan con la fecha de MyMoney (sin cuenta:
  // MyMoney no dice de qué cuenta salió). Cada movimiento se procesa por separado: si uno falla
  // (p. ej. el ahorro ya no está activo) el resto sigue y el error vuelve en failed.
  public apply = async (userId: number, month: string, items: ApplyMyMoneyReconciliationItem[]): Promise<MyMoneyReconciliationApplyResultModel> => {
    const loaded = await this.load(userId, month);
    const rowsByMovement = new Map(loaded.report.rows.map(row => [row.movement.id, row]));
    const failed: MyMoneyReconciliationFailureModel[] = [];
    let reconciled = 0;
    let paid = 0;

    for (const item of items) {
      const row = rowsByMovement.get(item.importedMovementId);
      if (!row || !row.installments.length || (row.status !== 'matched' && row.status !== 'paidOnlyInMyMoney')) {
        failed.push({ importedMovementId: item.importedMovementId, message: 'notReconcilable' });
        continue;
      }
      const proposed = row.installments.map(i => i.id).sort((a, b) => a - b).join(',');
      if ([...item.installmentIds].sort((a, b) => a - b).join(',') !== proposed) {
        failed.push({ importedMovementId: item.importedMovementId, message: 'installmentChanged' });
        continue;
      }

      try {
        if (item.markAsPaid && row.status === 'paidOnlyInMyMoney') {
          paid += await this.payPending(userId, row);
        }
        await this.linkAccessService.replaceForMovement(userId, row.movement.id, row.installments.map(i => ({
          savingsInstallmentId: i.targetKind === 'savings' ? i.id : null,
          loanInstallmentId: i.targetKind === 'loan' ? i.id : null,
        })));
        reconciled++;
      } catch (error) {
        failed.push({ importedMovementId: item.importedMovementId, message: error instanceof Error ? error.message : 'error' });
      }
    }

    return {
      reconciled,
      paid,
      failed,
      reconciliation: await this.getReconciliation(userId, month),
    };
  };

  // Deshace solo el vínculo: si las cuotas se pagaron al conciliar, el pago queda (se borra desde el
  // ahorro o el préstamo, como cualquier otro)
  public unreconcile = async (userId: number, importedMovementId: number): Promise<void> => {
    await this.linkAccessService.replaceForMovement(userId, importedMovementId, []);
  };

  // Paga las cuotas pendientes de la fila. Una sola cuota se paga con el monto de MyMoney (un ahorro no
  // acepta más que la cuota); varias, cada una con su monto, que suman el del movimiento.
  private payPending = async (userId: number, row: ReconciliationRow): Promise<number> => {
    // Mediodía local: la fecha no cambia de día al guardarse como timestamp
    const paymentDate = new Date(`${row.movement.date}T12:00:00`);
    const description = row.movement.note || null;
    const single = row.installments.length === 1;
    let paid = 0;

    for (const installment of row.installments.filter(i => i.statusId === PENDING)) {
      const amount = single ? row.movement.amount : installment.amount;
      if (installment.targetKind === 'savings') {
        await this.savingsManagerService.payInstallment(new PayInstallmentRequest(
          userId,
          installment.targetId,
          installment.id,
          Math.min(amount, installment.amount),
          description,
          null,
          paymentDate,
        ));
      } else {
        await this.loanManagerService.payInstallment(new PayLoanInstallmentRequest(
          userId,
          installment.targetId,
          installment.id,
          amount,
          description,
          paymentDate,
          null,
        ));
      }
      paid++;
    }
    return paid;
  };

  private load = async (userId: number, month: string): Promise<LoadedReconciliation> => {
    if (!MONTH_PATTERN.test(month)) throw new BadRequestException('month must be YYYY-MM');
    const from = `${month}-01`;
    const [year, monthNumber] = month.split('-').map(Number);
    const to = `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, '0')}`;

    const [rules, mappings, goals, loans, movements, links] = await Promise.all([
      this.descriptionRuleAccessService.getAll(userId),
      this.categoryMappingAccessService.getAll(userId),
      this.savingsGoalAccessService.getAll(userId),
      this.loanAccessService.getAll(userId),
      // Con el mes anterior y el siguiente, para no marcar como diferencia lo que pagan ellos
      this.importedMovementAccessService.getBetween(userId, this.shiftDays(from, -NEIGHBOR_DAYS), this.shiftDays(to, NEIGHBOR_DAYS)),
      this.linkAccessService.getAll(userId),
    ]);

    // Todos los ahorros y préstamos a los que apunta un patrón o una categoría de transferencia
    const targetsByKey = new Map<string, ReconciliationTarget>();
    const names = new Map<string, string>();
    goals.forEach(goal => names.set(installmentKey('savings', goal.id), goal.name));
    loans.forEach(loan => names.set(installmentKey('loan', loan.id), loan.name));
    const loanById = new Map(loans.map(loan => [loan.id, loan]));

    const toTarget = (link: MyMoneyLinkTarget): ReconciliationTarget | null => {
      let target: ReconciliationTarget | null = null;
      if (link.savingsGoalId !== null && names.has(installmentKey('savings', link.savingsGoalId))) {
        target = {
          kind: 'savings',
          id: link.savingsGoalId,
          name: names.get(installmentKey('savings', link.savingsGoalId))!,
          installmentMovementType: MyMoneyMovementTypeEnum.Expense,
        };
      } else {
        const loan = link.loanId !== null ? loanById.get(link.loanId) : undefined;
        if (loan) {
          target = {
            kind: 'loan',
            id: loan.id,
            name: loan.name,
            installmentMovementType: loan.direction === LoanDirection.Lent ? MyMoneyMovementTypeEnum.Income : MyMoneyMovementTypeEnum.Expense,
          };
        }
      }
      if (!target) return null;
      const key = installmentKey(target.kind, target.id);
      if (!targetsByKey.has(key)) targetsByKey.set(key, target);
      return targetsByKey.get(key)!;
    };

    const ruleTargets = rules.map(rule => ({ pattern: rule.pattern, target: toTarget(rule.target) }));
    const mappingTargets = new Map(mappings
      .filter(mapping => mapping.kind === MyMoneyCategoryKind.Transfer)
      .map(mapping => [mapping.categoryExternalId, toTarget(mapping.target)]));

    const linksByMovement = new Map<number, InstallmentRef[]>();
    const linkedInstallmentKeys = new Set<string>();
    links.forEach(link => {
      const ref: InstallmentRef = link.savingsInstallmentId !== null
        ? { kind: 'savings', id: link.savingsInstallmentId }
        : { kind: 'loan', id: link.loanInstallmentId! };
      linksByMovement.set(link.importedMovementId, [...(linksByMovement.get(link.importedMovementId) ?? []), ref]);
      linkedInstallmentKeys.add(installmentKey(ref.kind, ref.id));
    });

    const reconciliationMovements: ReconciliationMovement[] = movements.map(movement => {
      const rule = MyMoneyCategoryMappingHelper.findDescriptionRule(ruleTargets, movement.note);
      return {
        id: movement.id,
        date: movement.date,
        movementType: movement.movementType as MyMoneyMovementTypeEnum,
        amount: movement.amount,
        note: movement.note,
        // Un patrón que apunta a una cuenta deja el movimiento sin ahorro ni préstamo
        target: rule ? rule.target : mappingTargets.get(movement.categoryExternalId) ?? null,
        linkedInstallments: linksByMovement.get(movement.id) ?? [],
      };
    });

    const targets = [...targetsByKey.values()];
    const installments = (await Promise.all(targets.map(this.loadInstallments))).flat();

    const report = MyMoneyReconciliationHelper.reconcile({
      from,
      to,
      movements: reconciliationMovements,
      targets,
      installments,
      linkedInstallmentKeys,
    });
    return { report, names, from, to };
  };

  private loadInstallments = async (target: ReconciliationTarget): Promise<ReconciliationInstallment[]> => {
    if (target.kind === 'savings') {
      const installments = await this.savingsInstallmentAccessService.getBySavingsGoalId(target.id);
      return installments.map(i => ({
        id: i.id,
        targetKind: 'savings' as const,
        targetId: target.id,
        number: i.installmentNumber,
        amount: i.amount,
        dueDate: this.toDate(i.dueDate),
        statusId: i.statusId,
        paidDate: this.toDate(i.paidDate),
      }));
    }
    const installments = await this.loanInstallmentAccessService.getByLoanId(target.id);
    return installments.map(i => ({
      id: i.id,
      targetKind: 'loan' as const,
      targetId: target.id,
      number: i.installmentNumber,
      amount: i.totalAmount,
      dueDate: this.toDate(i.dueDate),
      statusId: i.statusId,
      paidDate: this.toDate(i.paidDate),
    }));
  };

  private toModel = (month: string, loaded: LoadedReconciliation): MyMoneyReconciliationModel => {
    const toInstallment = (i: ReconciliationInstallment): MyMoneyReconciliationInstallmentModel => ({
      id: i.id,
      targetKind: i.targetKind,
      targetId: i.targetId,
      targetName: loaded.names.get(installmentKey(i.targetKind, i.targetId)) ?? '',
      number: i.number,
      amount: i.amount,
      dueDate: i.dueDate,
      statusId: i.statusId,
      paidDate: i.paidDate,
    });

    return {
      month,
      from: loaded.from,
      to: loaded.to,
      rows: loaded.report.rows.map(row => ({
        importedMovementId: row.movement.id,
        date: row.movement.date,
        amount: row.movement.amount,
        note: row.movement.note,
        targetKind: row.target.kind,
        targetId: row.target.id,
        targetName: row.target.name,
        status: row.status,
        noteNumber: row.noteNumber,
        amountDiffers: row.amountDiffers,
        dateDiffers: row.dateDiffers,
        installments: row.installments.map(toInstallment),
      })),
      paidOnlyInMyEvents: loaded.report.paidOnlyInMyEvents.map(toInstallment),
      pendingInBoth: loaded.report.pendingInBoth.map(toInstallment),
    };
  };

  private shiftDays = (date: string, days: number): string => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  };

  // Las fechas de la base llegan como Date (medianoche UTC para DATE) o como texto; se pasan a 'YYYY-MM-DD'
  private toDate = (value: Date | string | null): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);
    return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  };
}

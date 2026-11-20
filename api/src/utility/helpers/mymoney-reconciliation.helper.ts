import { MyMoneyMovementTypeEnum } from '../enums';

// Conciliación de las transferencias importadas de MyMoney con las cuotas de my-events (#233).
// Sin base de datos, para poder probarlo: el manager carga los datos y aplica lo que se decide acá.

export type ReconciliationTargetKind = 'savings' | 'loan';

// Ahorro o préstamo al que apunta un movimiento (por patrón de descripción o por su categoría)
export interface ReconciliationTarget {
  kind: ReconciliationTargetKind;
  id: number;
  name: string;
  // Tipo de movimiento que paga una cuota: aporte a un ahorro o cuota de un préstamo recibido son
  // gastos; el cobro de un préstamo otorgado es un ingreso. El otro sentido (cobro de un ahorro,
  // desembolso) no es una cuota y no se concilia.
  installmentMovementType: MyMoneyMovementTypeEnum;
}

export interface ReconciliationInstallment {
  id: number;
  targetKind: ReconciliationTargetKind;
  targetId: number;
  number: number;
  amount: number;
  // 'YYYY-MM-DD'
  dueDate: string | null;
  // 1 Pending, 2 Paid, 3 Skipped
  statusId: number;
  paidDate: string | null;
}

export interface InstallmentRef {
  kind: ReconciliationTargetKind;
  id: number;
}

export interface ReconciliationMovement {
  id: number;
  date: string;
  movementType: MyMoneyMovementTypeEnum;
  amount: number;
  note: string;
  target: ReconciliationTarget | null;
  // Cuotas con las que ya está conciliado (vacío = sin conciliar)
  linkedInstallments: InstallmentRef[];
}

export type ReconciliationStatus =
  // Ya conciliado
  | 'reconciled'
  // Cuota(s) encontrada(s) y pagada(s) en los dos lados: falta solo conciliar
  | 'matched'
  // Cuota(s) encontrada(s) pero pendiente(s) en my-events: pagado en MyMoney y no en my-events
  | 'paidOnlyInMyMoney'
  // Va a un ahorro o préstamo pero no se encontró la cuota
  | 'unmatched'
  // El ahorro no tiene cuotas (aportes libres, p. ej. un fondo mutuo): no hay nada que conciliar
  | 'noInstallments';

export interface ReconciliationRow {
  movement: ReconciliationMovement;
  target: ReconciliationTarget;
  // Casi siempre una; un aporte mensual puede pagar varias (Ña 10 septiembre = cuotas 8 a 11)
  installments: ReconciliationInstallment[];
  status: ReconciliationStatus;
  // Número de cuota leído de la descripción ("Aho3 4/12" → 4)
  noteNumber: number | null;
  // La suma de las cuotas no es el monto del movimiento
  amountDiffers: boolean;
  // La cuota del número de la descripción vence muy lejos del movimiento: la numeración de MyMoney y
  // la de my-events no coinciden (p. ej. el ahorro se cargó con otra fecha de inicio)
  dateDiffers: boolean;
}

export interface ReconciliationReport {
  rows: ReconciliationRow[];
  // Pagadas en my-events dentro del período sin movimiento de MyMoney que las pague
  paidOnlyInMyEvents: ReconciliationInstallment[];
  // Vencen en el período y no están pagadas en ningún lado
  pendingInBoth: ReconciliationInstallment[];
}

export interface ReconciliationInput {
  from: string;
  to: string;
  movements: ReconciliationMovement[];
  // Todos los ahorros y préstamos a los que apunta algún patrón o categoría
  targets: ReconciliationTarget[];
  // Todas las cuotas de esos destinos
  installments: ReconciliationInstallment[];
  // Cuotas ya conciliadas con algún movimiento (también de fuera del período)
  linkedInstallmentKeys: Set<string>;
}

const PAID = 2;
const SKIPPED = 3;
// Sin número en la descripción, la cuota se busca por fecha: hasta 25 días entre el vencimiento
// (o el pago, si ya está pagada) y el movimiento
const MAX_DAYS_APART = 25;
// Con número, más de 40 días entre el vencimiento y el movimiento se marca como diferencia de fecha
const MAX_DAYS_FOR_NUMBER = 40;
// Un aporte agrupa a lo sumo estas cuotas seguidas
const MAX_GROUP_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export const installmentKey = (kind: ReconciliationTargetKind, id: number): string => `${kind}:${id}`;

export class MyMoneyReconciliationHelper {
  // "Aho3 4/12" → 4; "Ña 10 septiembre" → null. El número tiene que estar al final.
  static installmentNumberFromNote(note: string): number | null {
    const match = /(\d+)\s*\/\s*(\d+)\s*$/.exec(note.trim());
    if (!match) return null;
    const number = +match[1];
    return number > 0 && number <= +match[2] ? number : null;
  }

  static reconcile(input: ReconciliationInput): ReconciliationReport {
    const installmentsByTarget = new Map<string, ReconciliationInstallment[]>();
    const installmentByKey = new Map<string, ReconciliationInstallment>();
    input.installments.forEach(installment => {
      const targetKey = installmentKey(installment.targetKind, installment.targetId);
      installmentsByTarget.set(targetKey, [...(installmentsByTarget.get(targetKey) ?? []), installment]);
      installmentByKey.set(installmentKey(installment.targetKind, installment.id), installment);
    });
    installmentsByTarget.forEach(list => list.sort((a, b) => a.number - b.number));

    // Las cuotas ya conciliadas no se vuelven a proponer; las propuestas tampoco se repiten
    const taken = new Set(input.linkedInstallmentKeys);
    const isFree = (i: ReconciliationInstallment): boolean => i.statusId !== SKIPPED && !taken.has(installmentKey(i.targetKind, i.id));
    const rows = new Map<number, ReconciliationRow>();
    const targetInstallments = (m: ReconciliationMovement): ReconciliationInstallment[] =>
      installmentsByTarget.get(installmentKey(m.target!.kind, m.target!.id)) ?? [];

    const candidates = input.movements
      .filter(m => m.target && m.movementType === m.target.installmentMovementType)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

    // 1. Lo ya conciliado
    candidates.filter(m => m.linkedInstallments.length > 0).forEach(movement => {
      const installments = movement.linkedInstallments
        .map(ref => installmentByKey.get(installmentKey(ref.kind, ref.id)))
        .filter((i): i is ReconciliationInstallment => !!i);
      rows.set(movement.id, this.row(movement, installments, 'reconciled'));
    });

    const pending = candidates.filter(m => m.linkedInstallments.length === 0);

    // 2. Ahorros sin cuotas: aportes libres
    pending.filter(m => targetInstallments(m).length === 0).forEach(movement => {
      rows.set(movement.id, this.row(movement, [], 'noInstallments'));
    });

    // 3. Con número de cuota en la descripción: esa cuota y ninguna otra
    pending.filter(m => !rows.has(m.id)).forEach(movement => {
      const number = this.installmentNumberFromNote(movement.note);
      if (number === null) return;
      const installment = targetInstallments(movement).find(i => i.number === number && isFree(i));
      this.propose(rows, taken, movement, installment ? [installment] : []);
    });

    // 4. Sin número: por fecha y monto
    pending.filter(m => !rows.has(m.id)).forEach(movement => {
      const free = targetInstallments(movement).filter(isFree);
      const near = (i: ReconciliationInstallment): number | null => {
        const date = i.statusId === PAID ? (i.paidDate ?? i.dueDate) : i.dueDate;
        if (!date) return null;
        const days = this.daysApart(date, movement.date);
        return days <= MAX_DAYS_APART ? days : null;
      };
      const byDistance = (list: ReconciliationInstallment[]): ReconciliationInstallment[] =>
        list.filter(i => near(i) !== null).sort((a, b) => near(a)! - near(b)! || a.number - b.number);

      // a. Una cuota del mismo monto cerca de la fecha
      const exact = byDistance(free.filter(i => i.amount === movement.amount))[0];
      // b. Varias cuotas seguidas que suman el monto (un aporte mensual que paga varias cuotas): primero
      //    las ya pagadas cerca de la fecha; si no alcanza, también pendientes sin vencimiento
      const group = exact
        ? null
        : this.findGroup(free, movement.amount, i => i.statusId === PAID && near(i) !== null)
          ?? this.findGroup(free, movement.amount, i => near(i) !== null || (i.statusId !== PAID && !i.dueDate));
      // c. La cuota más cercana aunque el monto no coincida
      const closest = exact || group ? null : byDistance(free)[0];

      this.propose(rows, taken, movement, exact ? [exact] : group ?? (closest ? [closest] : []));
    });

    const inPeriod = (date: string | null): boolean => !!date && date >= input.from && date <= input.to;
    const targetKeys = new Set(input.targets.map(t => installmentKey(t.kind, t.id)));
    const ownInstallments = input.installments.filter(i => targetKeys.has(installmentKey(i.targetKind, i.targetId)));

    return {
      rows: [...rows.values()].sort((a, b) => a.movement.date.localeCompare(b.movement.date) || a.movement.id - b.movement.id),
      // Por vencimiento (si tiene): una cuota marcada pagada tarde o de a varias juntas pertenece al mes
      // en que vence, que es donde está su movimiento de MyMoney
      paidOnlyInMyEvents: ownInstallments
        .filter(i => i.statusId === PAID && inPeriod(i.dueDate ?? i.paidDate) && !taken.has(installmentKey(i.targetKind, i.id)))
        .sort(this.byDate),
      pendingInBoth: ownInstallments
        .filter(i => i.statusId !== PAID && i.statusId !== SKIPPED && inPeriod(i.dueDate) && !taken.has(installmentKey(i.targetKind, i.id)))
        .sort(this.byDate),
    };
  }

  // Primer tramo de cuotas con números seguidos que cumplen la condición y suman exactamente el monto
  private static findGroup(
    free: ReconciliationInstallment[],
    amount: number,
    eligible: (i: ReconciliationInstallment) => boolean,
  ): ReconciliationInstallment[] | null {
    const list = free.filter(eligible);
    for (let start = 0; start < list.length; start++) {
      let sum = 0;
      for (let end = start; end < list.length && end - start < MAX_GROUP_SIZE; end++) {
        if (end > start && list[end].number !== list[end - 1].number + 1) break;
        sum += list[end].amount;
        if (sum === amount && end > start) return list.slice(start, end + 1);
        if (sum >= amount) break;
      }
    }
    return null;
  }

  private static propose(
    rows: Map<number, ReconciliationRow>,
    taken: Set<string>,
    movement: ReconciliationMovement,
    installments: ReconciliationInstallment[],
  ): void {
    if (!installments.length) {
      rows.set(movement.id, this.row(movement, [], 'unmatched'));
      return;
    }
    installments.forEach(i => taken.add(installmentKey(i.targetKind, i.id)));
    const allPaid = installments.every(i => i.statusId === PAID);
    rows.set(movement.id, this.row(movement, installments, allPaid ? 'matched' : 'paidOnlyInMyMoney'));
  }

  private static row(
    movement: ReconciliationMovement,
    installments: ReconciliationInstallment[],
    status: ReconciliationStatus,
  ): ReconciliationRow {
    const noteNumber = this.installmentNumberFromNote(movement.note);
    const single = installments.length === 1 ? installments[0] : null;
    return {
      movement,
      target: movement.target!,
      installments,
      status,
      noteNumber,
      amountDiffers: installments.length > 0 && installments.reduce((sum, i) => sum + i.amount, 0) !== movement.amount,
      dateDiffers: noteNumber !== null && !!single?.dueDate && this.daysApart(single.dueDate, movement.date) > MAX_DAYS_FOR_NUMBER,
    };
  }

  private static byDate = (a: ReconciliationInstallment, b: ReconciliationInstallment): number =>
    (a.dueDate ?? a.paidDate ?? '').localeCompare(b.dueDate ?? b.paidDate ?? '') || a.targetId - b.targetId || a.number - b.number;

  private static daysApart(a: string, b: string): number {
    return Math.abs(this.time(a) - this.time(b)) / DAY_MS;
  }

  private static time(date: string): number {
    const [year, month, day] = date.slice(0, 10).split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }
}

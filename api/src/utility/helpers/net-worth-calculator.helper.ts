import { LoanDirection, NetWorthItemType, NetWorthLiquidity, ProgressionType } from '../enums';

// Estados de savingsstatus / loanstatus que todavía tienen plata en juego
const SAVINGS_STATUSES_WITH_MONEY = [1, 2, 3]; // Active, Completed, Paused (Cancelled y Withdrawn no cuentan)
const LOAN_STATUSES_WITH_BALANCE = [1, 3];     // Active, Paused

// Liquidez de cada tipo de ahorro:
// - metas por cuotas o libres: se retiran en cualquier momento
// - fondo mutuo: el rescate se acredita al día siguiente
// - ahorro programado, plazo fijo, CDA y rueda: bloqueados hasta el vencimiento / el final de las cuotas
// Un tipo nuevo que no esté acá cuenta como bloqueado (lo más conservador)
const SAVINGS_LIQUIDITY: Partial<Record<ProgressionType, NetWorthLiquidity>> = {
  [ProgressionType.Fixed]: NetWorthLiquidity.Immediate,
  [ProgressionType.Ascending]: NetWorthLiquidity.Immediate,
  [ProgressionType.Descending]: NetWorthLiquidity.Immediate,
  [ProgressionType.Random]: NetWorthLiquidity.Immediate,
  [ProgressionType.FreeForm]: NetWorthLiquidity.Immediate,
  [ProgressionType.MutualFund]: NetWorthLiquidity.Days,
  [ProgressionType.Scheduled]: NetWorthLiquidity.Locked,
  [ProgressionType.FixedDeposit]: NetWorthLiquidity.Locked,
  [ProgressionType.CDA]: NetWorthLiquidity.Locked,
  [ProgressionType.Rotating]: NetWorthLiquidity.Locked,
};

export interface NetWorthAccountInput {
  id: number;
  name: string;
  institutionId: number;
  currencyId: number;
  balance: number; // último snapshot; puede ser negativo (sobregiro)
}

export interface NetWorthSavingsInput {
  id: number;
  name: string;
  institutionId: number | null;
  currencyId: number;
  progressionTypeId: number;
  statusId: number;
  currentAmount: number;
  expectedEndDate: string | null; // 'YYYY-MM-DD'
  payoutDate: string | null;      // cobro estimado de la rueda
}

export interface NetWorthLoanInput {
  id: number;
  name: string;
  institutionId: number;
  currencyId: number;
  direction: number;
  statusId: number;
  currentBalance: number;
  expectedEndDate: string | null;
}

export interface NetWorthInput {
  accounts: NetWorthAccountInput[];
  savings: NetWorthSavingsInput[];
  loans: NetWorthLoanInput[];
}

export interface NetWorthLiquidityResult {
  liquidity: NetWorthLiquidity;
  amount: number;
}

// Lo que compone el saldo de una entidad (cuenta, meta de ahorro o préstamo)
export interface NetWorthItemResult {
  type: NetWorthItemType;
  sourceId: number;
  name: string;
  liquidity: NetWorthLiquidity | null; // null = deuda
  amount: number;
  // Cuándo se libera lo bloqueado o se termina de cobrar lo prestado, si se sabe ('YYYY-MM-DD')
  availableDate: string | null;
}

export interface NetWorthInstitutionResult {
  institutionId: number | null;
  assets: number;
  liabilities: number;
  total: number;
  byLiquidity: NetWorthLiquidityResult[];
  items: NetWorthItemResult[];
}

export interface NetWorthTypeResult {
  type: NetWorthItemType;
  amount: number;
}

export interface NetWorthCurrencyResult {
  currencyId: number;
  total: number;
  assets: number;
  liabilities: number;
  byInstitution: NetWorthInstitutionResult[];
  byLiquidity: NetWorthLiquidityResult[];
  byType: NetWorthTypeResult[];
}

interface NetWorthItem extends NetWorthItemResult {
  currencyId: number;
  institutionId: number | null;
}

const LIQUIDITY_ORDER = [NetWorthLiquidity.Immediate, NetWorthLiquidity.Days, NetWorthLiquidity.Locked, NetWorthLiquidity.Receivable];

export class NetWorthCalculatorHelper {
  // El patrimonio sale siempre de saldos (snapshot, monto actual, saldo pendiente), nunca sumando movimientos.
  // Cada moneda se calcula por separado: no se suman guaraníes con dólares.
  static calculate(input: NetWorthInput): NetWorthCurrencyResult[] {
    const items = [
      ...input.accounts.map(a => NetWorthCalculatorHelper.fromAccount(a)),
      ...input.savings
        .filter(s => SAVINGS_STATUSES_WITH_MONEY.includes(s.statusId) && s.currentAmount > 0)
        .map(s => NetWorthCalculatorHelper.fromSavings(s)),
      ...input.loans
        .filter(l => LOAN_STATUSES_WITH_BALANCE.includes(l.statusId) && l.currentBalance > 0)
        .map(l => NetWorthCalculatorHelper.fromLoan(l)),
    ];

    const currencyIds = [...new Set(items.map(i => i.currencyId))].sort((a, b) => a - b);
    return currencyIds.map(currencyId =>
      NetWorthCalculatorHelper.summarize(currencyId, items.filter(i => i.currencyId === currencyId))
    );
  }

  static getSavingsLiquidity(progressionTypeId: number): NetWorthLiquidity {
    return SAVINGS_LIQUIDITY[progressionTypeId as ProgressionType] ?? NetWorthLiquidity.Locked;
  }

  private static fromAccount(account: NetWorthAccountInput): NetWorthItem {
    return {
      currencyId: account.currencyId,
      institutionId: account.institutionId,
      type: NetWorthItemType.Account,
      sourceId: account.id,
      name: account.name,
      liquidity: NetWorthLiquidity.Immediate,
      amount: Number(account.balance),
      availableDate: null,
    };
  }

  private static fromSavings(goal: NetWorthSavingsInput): NetWorthItem {
    const liquidity = NetWorthCalculatorHelper.getSavingsLiquidity(goal.progressionTypeId);
    // Solo lo bloqueado tiene fecha de liberación. La rueda se libera cuando la cooperativa paga:
    // sin fecha de cobro cargada no se sabe (el fin de las cuotas no lo dice) → sin fecha estimada
    const releaseDate = goal.progressionTypeId === ProgressionType.Rotating
      ? goal.payoutDate
      : goal.expectedEndDate;
    return {
      currencyId: goal.currencyId,
      institutionId: goal.institutionId,
      type: NetWorthItemType.Savings,
      sourceId: goal.id,
      name: goal.name,
      liquidity,
      amount: Number(goal.currentAmount),
      availableDate: liquidity === NetWorthLiquidity.Locked ? releaseDate : null,
    };
  }

  private static fromLoan(loan: NetWorthLoanInput): NetWorthItem {
    const isLent = loan.direction === LoanDirection.Lent;
    return {
      currencyId: loan.currencyId,
      institutionId: loan.institutionId,
      type: isLent ? NetWorthItemType.LentLoan : NetWorthItemType.BorrowedLoan,
      sourceId: loan.id,
      name: loan.name,
      liquidity: isLent ? NetWorthLiquidity.Receivable : null,
      amount: Number(loan.currentBalance),
      availableDate: isLent ? loan.expectedEndDate : null,
    };
  }

  private static summarize(currencyId: number, items: NetWorthItem[]): NetWorthCurrencyResult {
    const assetItems = items.filter(i => i.liquidity !== null);
    const liabilityItems = items.filter(i => i.liquidity === null);
    const assets = NetWorthCalculatorHelper.sum(assetItems);
    const liabilities = NetWorthCalculatorHelper.sum(liabilityItems);

    const institutionIds = [...new Set(items.map(i => i.institutionId))];
    const byInstitution = institutionIds
      .map(institutionId => {
        const instItems = items.filter(i => i.institutionId === institutionId);
        const instAssets = NetWorthCalculatorHelper.sum(instItems.filter(i => i.liquidity !== null));
        const instLiabilities = NetWorthCalculatorHelper.sum(instItems.filter(i => i.liquidity === null));
        return {
          institutionId,
          assets: instAssets,
          liabilities: instLiabilities,
          total: instAssets - instLiabilities,
          byLiquidity: NetWorthCalculatorHelper.byLiquidity(instItems),
          items: NetWorthCalculatorHelper.sortItems(instItems).map(NetWorthCalculatorHelper.toItemResult),
        };
      })
      .sort((a, b) => b.assets - a.assets || a.liabilities - b.liabilities);

    // Siempre las 4 liquideces y los 4 tipos, en orden fijo (más simple de graficar)
    const byLiquidity = NetWorthCalculatorHelper.byLiquidity(assetItems);

    const byType = [NetWorthItemType.Account, NetWorthItemType.Savings, NetWorthItemType.LentLoan, NetWorthItemType.BorrowedLoan]
      .map(type => ({ type, amount: NetWorthCalculatorHelper.sum(items.filter(i => i.type === type)) }));

    return { currencyId, total: assets - liabilities, assets, liabilities, byInstitution, byLiquidity, byType };
  }

  private static byLiquidity(items: NetWorthItem[]): NetWorthLiquidityResult[] {
    return LIQUIDITY_ORDER.map(liquidity => ({
      liquidity,
      amount: NetWorthCalculatorHelper.sum(items.filter(i => i.liquidity === liquidity)),
    }));
  }

  // Por liquidez (de lo más disponible a lo menos, las deudas al final) y de mayor a menor monto
  private static sortItems(items: NetWorthItem[]): NetWorthItem[] {
    const rank = (i: NetWorthItem) => i.liquidity === null ? LIQUIDITY_ORDER.length : LIQUIDITY_ORDER.indexOf(i.liquidity);
    return [...items].sort((a, b) => rank(a) - rank(b) || b.amount - a.amount);
  }

  private static toItemResult(item: NetWorthItem): NetWorthItemResult {
    const { type, sourceId, name, liquidity, amount, availableDate } = item;
    return { type, sourceId, name, liquidity, amount, availableDate };
  }

  private static sum(items: NetWorthItem[]): number {
    return items.reduce((total, item) => total + Number(item.amount), 0);
  }
}

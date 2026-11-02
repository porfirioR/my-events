export enum NetWorthLiquidity {
  Immediate = 1,
  Days = 2,
  Locked = 3,
  Receivable = 4,
}

export const NetWorthLiquidityLabels: Record<NetWorthLiquidity, string> = {
  [NetWorthLiquidity.Immediate]: 'netWorth.liquidityImmediate',
  [NetWorthLiquidity.Days]: 'netWorth.liquidityDays',
  [NetWorthLiquidity.Locked]: 'netWorth.liquidityLocked',
  [NetWorthLiquidity.Receivable]: 'netWorth.liquidityReceivable',
};

// Mismo color que el módulo de donde sale la plata (cuentas, ahorros, préstamos); clases literales para Tailwind
export const NetWorthLiquidityColors: Record<NetWorthLiquidity, string> = {
  [NetWorthLiquidity.Immediate]: 'bg-cyan-500',
  [NetWorthLiquidity.Days]: 'bg-emerald-300',
  [NetWorthLiquidity.Locked]: 'bg-emerald-600',
  [NetWorthLiquidity.Receivable]: 'bg-amber-500',
};

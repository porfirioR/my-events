export enum NetWorthItemType {
  Account = 1,
  Savings = 2,
  LentLoan = 3,
  BorrowedLoan = 4,
}

export const NetWorthItemTypeLabels: Record<NetWorthItemType, string> = {
  [NetWorthItemType.Account]: 'netWorth.itemAccount',
  [NetWorthItemType.Savings]: 'netWorth.itemSavings',
  [NetWorthItemType.LentLoan]: 'netWorth.itemLentLoan',
  [NetWorthItemType.BorrowedLoan]: 'netWorth.itemBorrowedLoan',
};

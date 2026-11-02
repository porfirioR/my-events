export enum AccountType {
  Checking = 1,
  SavingsAccount = 2,
  Cash = 3,
}

export const AccountTypeLabels: Record<AccountType, string> = {
  [AccountType.Checking]: 'accounts.typeChecking',
  [AccountType.SavingsAccount]: 'accounts.typeSavingsAccount',
  [AccountType.Cash]: 'accounts.typeCash',
};

export const AccountTypeIcons: Record<AccountType, string> = {
  [AccountType.Checking]: 'fa-building-columns',
  [AccountType.SavingsAccount]: 'fa-piggy-bank',
  [AccountType.Cash]: 'fa-money-bill-wave',
};

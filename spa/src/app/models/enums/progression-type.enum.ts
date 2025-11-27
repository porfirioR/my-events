export enum ProgressionType {
  Fixed = 1,
  Ascending = 2,
  Descending = 3,
  Random = 4,
  FreeForm = 5
}

export const ProgressionTypeLabels: Record<ProgressionType, string> = {
  [ProgressionType.Fixed]: 'Fixed Amount',
  [ProgressionType.Ascending]: 'Ascending',
  [ProgressionType.Descending]: 'Descending',
  [ProgressionType.Random]: 'Random',
  [ProgressionType.FreeForm]: 'Free Form'
};

export const ProgressionTypeDescriptions: Record<ProgressionType, string> = {
  [ProgressionType.Fixed]: 'Same amount for each installment',
  [ProgressionType.Ascending]: 'Amounts increase by a fixed increment',
  [ProgressionType.Descending]: 'Amounts decrease by a fixed increment',
  [ProgressionType.Random]: 'Amounts are shuffled randomly',
  [ProgressionType.FreeForm]: 'No predefined installments, deposit freely'
};

export const ProgressionTypeIcons: Record<ProgressionType, string> = {
  [ProgressionType.Fixed]: 'fa-equals',
  [ProgressionType.Ascending]: 'fa-arrow-trend-up',
  [ProgressionType.Descending]: 'fa-arrow-trend-down',
  [ProgressionType.Random]: 'fa-shuffle',
  [ProgressionType.FreeForm]: 'fa-hand-holding-dollar'
};

















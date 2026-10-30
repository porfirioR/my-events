export enum AmortizationType {
  French = 'french',
  Simple = 'simple',
  Flat = 'flat',
}

export const AmortizationTypeLabels: Record<AmortizationType, string> = {
  [AmortizationType.French]: 'loans.amortFrench',
  [AmortizationType.Simple]: 'loans.amortSimple',
  [AmortizationType.Flat]: 'loans.amortFlat',
};

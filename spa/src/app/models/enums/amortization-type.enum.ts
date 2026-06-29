export enum AmortizationType {
  French = 'french',
  Simple = 'simple',
}

export const AmortizationTypeLabels: Record<AmortizationType, string> = {
  [AmortizationType.French]: 'loans.amortFrench',
  [AmortizationType.Simple]: 'loans.amortSimple',
};

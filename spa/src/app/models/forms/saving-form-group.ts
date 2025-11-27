import { FormControl } from "@angular/forms"

export interface SavingsGoalFormGroup {
  id: FormControl<number | null>;
  name: FormControl<string | null>;
  description: FormControl<string | null>;
  startDate: FormControl<Date | string | null>;
  currencyId: FormControl<number | null>;
  progressionTypeId: FormControl<number | null>;
  targetAmount: FormControl<number | null>;
  numberOfInstallments: FormControl<number | null>;
  baseAmount: FormControl<number | null>;
  incrementAmount: FormControl<number | null>;
  expectedEndDate: FormControl<Date | string | null>;
  statusId: FormControl<number | null>;
}

import { FormControl } from "@angular/forms"

export interface SavingFormGroup {
  id: FormControl<number | null | undefined>
  name: FormControl<string | null | undefined>
  description: FormControl<string | null | undefined>
  date: FormControl<Date | null | undefined>
  savingTypeId: FormControl<number | null | undefined>
  savingTypeDescription: FormControl<string | null | undefined>
  currencyDescription: FormControl<string | null | undefined>
  isActive: FormControl<boolean | null | undefined>
  currencyId: FormControl<number | null | undefined>
  periodId: FormControl<number | null | undefined>
  totalAmount: FormControl<number | null | undefined>
  numberOfPayment: FormControl<number | null | undefined>
}

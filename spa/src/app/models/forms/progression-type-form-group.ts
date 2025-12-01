import { FormControl } from "@angular/forms"

export interface ProgressionTypeFormGroup {
  amount: FormControl<null | number>
  description: FormControl<null | string>
}

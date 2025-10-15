import { FormControl } from "@angular/forms";

export interface ReimbursementFormGroup {
  amount: FormControl<number | null>;
  description: FormControl<string | null>;
}
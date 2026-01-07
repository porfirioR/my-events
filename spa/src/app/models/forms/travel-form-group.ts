import { FormControl } from '@angular/forms';

export interface TravelFormGroup {
  id: FormControl<number | null>;
  name: FormControl<string | null>;
  description: FormControl<string | null>;
  startDate: FormControl<string | null>;
  endDate: FormControl<string | null>;
  defaultCurrencyId: FormControl<number | null>;
}
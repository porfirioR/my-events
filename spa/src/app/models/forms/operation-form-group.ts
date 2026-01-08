import { FormControl } from '@angular/forms';

export interface OperationFormGroup {
  id: FormControl<number | null>;
  currencyId: FormControl<number | null>;
  paymentMethodId: FormControl<number | null>;
  whoPaidMemberId: FormControl<number | null>;
  amount: FormControl<number | null>;
  description: FormControl<string | null>;
  splitType: FormControl<string | null>;
  transactionDate: FormControl<string | null>;
  participantMemberIds: FormControl<number[] | null>;
}
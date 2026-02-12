import { FormControl } from '@angular/forms';
import { SplitType } from '../enums';

export interface OperationFormGroup {
  id: FormControl<number | null>;
  currencyId: FormControl<number | null>;
  paymentMethodId: FormControl<number | null>;
  whoPaidMemberId: FormControl<number | null>;
  amount: FormControl<number | null>;
  description: FormControl<string | null>;
  participantType: FormControl<string | null>;
  splitType: FormControl<SplitType | null>;
  transactionDate: FormControl<string | null>;
  participantMemberIds: FormControl<number[] | null>;
  customAmounts: FormControl<number[] | null>;
  customPercentages: FormControl<number[] | null>;
  categoryId: FormControl<number | null>;
}
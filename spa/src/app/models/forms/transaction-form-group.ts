import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { SplitType, WhoPaid } from '../enums';
import { ReimbursementFormGroup, TransactionSplitFormGroup } from '.';

export interface TransactionFormGroup {
  collaboratorId: FormControl<number | null>;
  totalAmount: FormControl<number | null>;
  description: FormControl<string | null>;
  splitType: FormControl<SplitType | null>;
  whoPaid: FormControl<WhoPaid | null>;
  splits: FormArray<FormGroup<TransactionSplitFormGroup>>;
  hasReimbursement: FormControl<boolean | null>;
  reimbursement: FormGroup<ReimbursementFormGroup>;
}

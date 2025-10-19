import { FormControl } from '@angular/forms';
import { ParticipantType } from '../enums';

export interface TransactionSplitFormGroup {
  participantType: FormControl<ParticipantType | null>;
  amount: FormControl<number | null>;
  sharePercentage: FormControl<number | null>;
}

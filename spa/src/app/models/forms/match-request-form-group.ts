import { FormControl } from "@angular/forms";

export interface MatchRequestFormGroup {
  collaboratorId: FormControl<null | number>
  targetEmail: FormControl<null | string>
}

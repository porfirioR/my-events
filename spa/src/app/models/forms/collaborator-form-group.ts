import { FormControl } from "@angular/forms"

export interface CollaboratorFormGroup {
  name: FormControl<string | null>
  surname: FormControl<string | null>
  email: FormControl<string | null>
  isActive: FormControl<boolean | null>
}

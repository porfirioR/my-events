import { FormControl } from "@angular/forms"
import { LoginFormGroup } from "./login-form-group"

export interface SignupFormGroup extends LoginFormGroup {
  repeatPassword: FormControl<null | string>
  name: FormControl<null | string>
  surname: FormControl<null | string>
}

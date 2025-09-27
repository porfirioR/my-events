import { FormControl } from "@angular/forms"
import { LoginFormGroup } from "./login-form-group"

export interface SignupFormGroup extends LoginFormGroup {
  repeatPassword: FormControl<null | string>
}

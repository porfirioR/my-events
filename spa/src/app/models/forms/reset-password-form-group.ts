import { FormControl } from "@angular/forms"

export interface ResetPasswordFormGroup {
  email: FormControl<null | string>
  token: FormControl<null | string>
  newPassword: FormControl<null | string>
  repeatPassword: FormControl<null | string>
}

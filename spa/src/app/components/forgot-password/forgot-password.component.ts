import { Component, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { ForgotPasswordFormGroup } from '../../models/forms'
import { AlertService, UserApiService } from '../../services'
import { ForgotPasswordApiRequest } from '../../models/api'
import { TextComponent } from '../inputs/text/text.component'

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  imports: [
    RouterModule,
    ReactiveFormsModule,
    TextComponent
  ]
})
export class ForgotPasswordComponent {
  protected formGroup: FormGroup<ForgotPasswordFormGroup>
  protected showMessage: boolean = false
  protected isSubmitting = signal<boolean>(false);
  
  constructor(
    private readonly userApiService: UserApiService,
    private readonly alertService: AlertService
  ) {
    this.formGroup = new FormGroup<ForgotPasswordFormGroup>({
      email: new FormControl(null, [Validators.required, Validators.email])
    })
  }

  protected sendCode = (event?: Event): void => {
    event?.preventDefault();
    if (this.formGroup.invalid) {
      return;
    }
    this.isSubmitting.set(true);
    const email = this.formGroup.value.email!;
    this.showMessage = false;
    this.userApiService.forgotPassword(new ForgotPasswordApiRequest(email)).subscribe({
      next: (response) => {
        this.alertService.showSuccess(response.message);
        this.showMessage = true;
        this.isSubmitting.set(false);
      },
      error: (e) => {
        this.showMessage = false;
        this.isSubmitting.set(false);
        this.alertService.showError('An error occurred. Please try again.');
      },
    });
  };

}

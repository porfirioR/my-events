import { Component, inject } from '@angular/core'
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import { debounceTime, tap } from 'rxjs'
import { TranslateModule, TranslateService } from '@ngx-translate/core'  // ← Agregar TranslateService
import { CreateUserApiRequest } from '../../models/api'
import { SignupFormGroup } from '../../models/forms/sign-up-form-group'
import { AlertService, UserApiService } from '../../services'
import { TextComponent } from '../inputs/text/text.component'
import { useAuthStore } from '../../store'
import { LanguageSelectorComponent } from "../language-selector/language-selector.component";

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  imports: [
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    TextComponent,
    LanguageSelectorComponent
  ]
})
export class SignupComponent {
  private router = inject(Router);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  private authStore = useAuthStore();
  private translate = inject(TranslateService);
  
  protected isLoading = this.authStore.loginLoading;
  protected signupError = this.authStore.error;
  protected formGroup: FormGroup<SignupFormGroup>

  constructor() {
    this.formGroup = new FormGroup<SignupFormGroup>({
      email: new FormControl(null, [Validators.required, Validators.email]),
      password: new FormControl(null, [Validators.required, Validators.minLength(5), Validators.maxLength(10)]),
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(25)]),
      surname: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(25)]),
      repeatPassword: new FormControl(null, [Validators.required, Validators.minLength(5), Validators.maxLength(10), this.checkRepeatPassword()])
    })
    this.formGroup.controls.password.valueChanges.pipe(
      debounceTime(100),
      tap(() => this.formGroup.controls.repeatPassword.updateValueAndValidity())
    ).subscribe()
  }

  protected save = (event: Event): void => {
    event.preventDefault();
    if (this.formGroup.invalid) {
      return;
    }
    this.authStore.loginStart();
    const request: CreateUserApiRequest = new CreateUserApiRequest(
      this.formGroup.value.email!,
      this.formGroup.value.password!,
      this.formGroup.value.name!,
      this.formGroup.value.surname!
    );
    this.userApiService.signUpUser(request).subscribe({
      next: (user) => {
        this.authStore.loginSuccess(user.id, user.token, user.email, user.name, user.surname, user.isEmailVerified);
        this.alertService.showSuccess(
          this.translate.instant('messages.accountCreated')
        );
        this.router.navigate(['/verify-email-pending']);
      },
      error: (error) => {
        this.authStore.loginFailure(
          this.translate.instant('messages.signupFailed')
        );
      },
    });
  };

  private checkRepeatPassword = (): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors | null => {
      const repeatPassword = (control as FormControl<string | null>).value
      if (!repeatPassword) { return null }
      const isInvalid = !repeatPassword || this.formGroup.controls.password.value !== repeatPassword
      return isInvalid ? { invalidRepeatPassword: isInvalid } : null
    }
  }
}
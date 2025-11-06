import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService, UserApiService } from '../../services';
import { ResetPasswordFormGroup } from '../../models/forms';
import { TextComponent } from '../inputs/text/text.component';
import { useAuthStore } from '../../store';
import { ResetPasswordApiRequest } from '../../models/api/auth';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TextComponent],
})
export class ResetPasswordComponent {
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  protected authStore = useAuthStore();
  protected isLoading = this.authStore.loginLoading;
  protected formGroup: FormGroup<ResetPasswordFormGroup>;

  constructor() {
    const token = this.activeRoute.snapshot.queryParams['token'];
    const email = this.activeRoute.snapshot.queryParams['email'];

    this.formGroup = new FormGroup<ResetPasswordFormGroup>({
      email: new FormControl(email ? email : null, [Validators.required, Validators.email]),
      newPassword: new FormControl(null, [Validators.required, Validators.minLength(5), Validators.maxLength(10)]),
      repeatPassword: new FormControl(null, [Validators.required, this.repeatPasswordValidator()]),
      token: new FormControl(token ? token : null, [Validators.required]),
    });
    
    this.formGroup.controls.newPassword.valueChanges.subscribe({
      next: () => {
        this.formGroup.controls.repeatPassword.updateValueAndValidity();
      },
    });
  }

  protected changePassword = (event: Event): void => {
    event.preventDefault();
    if (this.formGroup.invalid) {
      return;
    }

    this.authStore.loginStart();
    const request = new ResetPasswordApiRequest(
      this.formGroup.value.email!,
      this.formGroup.value.token!,
      this.formGroup.value.newPassword!
    );

    this.userApiService.resetPassword(request).subscribe({
      next: (user) => {
        this.authStore.loginSuccess(user.id, user.token, user.email, user.isEmailVerified);
        this.alertService.showSuccess('Password reset successfully! You are now logged in.');
        this.router.navigate(['']);
      },
      error: (e) => {
        this.authStore.loginFailure('Invalid or expired reset token. Please try again.');
        this.alertService.showError('Invalid or expired reset token. Please request a new one.');
      },
    });
  };

  private repeatPasswordValidator = (): ValidatorFn => {
    return (control: AbstractControl): { [key: string]: unknown } | null => {
      const password = this.formGroup?.controls?.newPassword.value;
      const repeatPassword = control.value;
      if (repeatPassword && password?.localeCompare(repeatPassword)) {
        return { invalidRepeatPassword: true };
      }
      return null;
    };
  };
}
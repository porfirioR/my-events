// src/app/components/verify-email-pending/verify-email-pending.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AlertService, LocalService, UserApiService } from '../../services';
import { TextComponent } from '../inputs/text/text.component';
import { ResendVerificationEmailApiRequest } from '../../models/api/auth';
import { ResendFormGroup } from '../../models/forms';

@Component({
  selector: 'app-verify-email-pending',
  templateUrl: './verify-email-pending.component.html',
  styleUrls: ['./verify-email-pending.component.css'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TextComponent],
})
export class VerifyEmailPendingComponent {
  private router = inject(Router);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  private localService = inject(LocalService);

  protected formGroup: FormGroup<ResendFormGroup>;
  protected isLoading = false;
  protected cooldownSeconds = 0;
  private cooldownInterval: any;

  constructor() {
    const userEmail = this.localService.getEmail() || '';

    this.formGroup = new FormGroup<ResendFormGroup>({
      email: new FormControl(userEmail, [Validators.required, Validators.email]),
    });
  }

  protected resendVerificationEmail = (event: Event): void => {
    event.preventDefault();

    if (this.formGroup.invalid || this.isLoading || this.cooldownSeconds > 0) {
      return;
    }

    this.isLoading = true;
    const request = new ResendVerificationEmailApiRequest(this.formGroup.value.email!);

    this.userApiService.resendVerificationEmail(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.alertService.showSuccess(response.message);
        this.startCooldown(60); // 60 segundos de cooldown
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error.error?.message || 'Failed to resend verification email. Please try again.';
        this.alertService.showError(errorMessage);
      },
    });
  };

  private startCooldown(seconds: number): void {
    this.cooldownSeconds = seconds;

    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds--;

      if (this.cooldownSeconds <= 0) {
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }

  protected logout(): void {
    this.localService.cleanCredentials();
    this.alertService.showSuccess('Good bye.')
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }
}
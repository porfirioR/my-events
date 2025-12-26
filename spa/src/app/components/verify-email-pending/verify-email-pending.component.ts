import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AlertService, LocalService, UserApiService } from '../../services';
import { TextComponent } from '../inputs/text/text.component';
import { ResendVerificationEmailApiRequest } from '../../models/api/auth';
import { ResendFormGroup } from '../../models/forms';
import { useAuthStore } from '../../store';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  selector: 'app-verify-email-pending',
  templateUrl: './verify-email-pending.component.html',
  styleUrls: ['./verify-email-pending.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    TextComponent,
    LanguageSelectorComponent
  ],
})
export class VerifyEmailPendingComponent {
  private router = inject(Router);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  private localService = inject(LocalService);
  private authStore = useAuthStore();

  protected formGroup: FormGroup<ResendFormGroup>;
  protected isLoading = signal(false);
  protected coolDownSeconds = signal(0);
  private coolDownInterval: any;

  constructor() {
    const userEmail = this.localService.getEmail() || '';

    this.formGroup = new FormGroup<ResendFormGroup>({
      email: new FormControl(userEmail, [Validators.required, Validators.email]),
    });
  }

  ngOnDestroy(): void {
    if (this.coolDownInterval) {
      clearInterval(this.coolDownInterval);
    }
  }

  protected resendVerificationEmail = (event: Event): void => {
    event.preventDefault();

    if (this.formGroup.invalid || this.isLoading() || this.coolDownSeconds() > 0) {
      return;
    }

    this.isLoading.set(true);
    const request = new ResendVerificationEmailApiRequest(this.formGroup.value.email!);

    this.userApiService.resendVerificationEmail(request).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.alertService.showSuccess(response.message);
        this.startCooldown(60); // 60 segundos de cooldown
      },
      error: (error) => {
        this.isLoading.set(false);
        const errorMessage = error.error?.message || 'Failed to resend verification email. Please try again.';
        this.alertService.showError(errorMessage);
      },
    });
  };

  private startCooldown(seconds: number): void {
    this.coolDownSeconds.set(seconds);

    this.coolDownInterval = setInterval(() => {
      const coolDownSeconds = this.coolDownSeconds()
      this.coolDownSeconds.set(coolDownSeconds-1);

      if (this.coolDownSeconds() <= 0) {
        clearInterval(this.coolDownInterval);
      }
    }, 1000);
  }

  protected logout(): void {
    this.localService.cleanCredentials();
    this.authStore.logout()
    this.alertService.showSuccess('Good bye.')
    this.router.navigate(['/login']);
  }

}
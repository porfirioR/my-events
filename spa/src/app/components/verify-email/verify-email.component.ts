// src/app/components/verify-email/verify-email.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService, UserApiService } from '../../services';
import { useAuthStore } from '../../store';
import { VerifyEmailApiRequest } from '../../models/api/auth';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css'],
  imports: [CommonModule, RouterModule],
})
export class VerifyEmailComponent implements OnInit {
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  private authStore = useAuthStore();

  protected isVerifying = true;
  protected verificationSuccess = false;
  protected errorMessage: string | null = null;

  ngOnInit(): void {
    const token = this.activeRoute.snapshot.queryParams['token'];

    if (!token) {
      this.isVerifying = false;
      this.errorMessage = 'Invalid verification link. No token provided.';
      return;
    }

    this.verifyEmail(token);
  }

  private verifyEmail(token: string): void {
    const request = new VerifyEmailApiRequest(token);

    this.userApiService.verifyEmail(request).subscribe({
      next: (user) => {
        this.isVerifying = false;
        this.verificationSuccess = true;
        this.authStore.loginSuccess(
          user.id,
          user.token,
          user.email,
          user.isEmailVerified
        );
        this.alertService.showSuccess('Email verified successfully!');

        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['']);
        }, 2000);
      },
      error: (error) => {
        this.isVerifying = false;
        this.verificationSuccess = false;
        this.errorMessage = 'Invalid or expired verification token. Please request a new one.';
        this.alertService.showError(this.errorMessage);
      },
    });
  }

  protected goToResend(): void {
    this.router.navigate(['/verify-email-pending']);
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }
}

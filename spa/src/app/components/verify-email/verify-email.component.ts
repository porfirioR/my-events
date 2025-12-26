import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertService, LocalService, UserApiService } from '../../services';
import { useAuthStore } from '../../store';
import { VerifyEmailApiRequest } from '../../models/api/auth';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    LanguageSelectorComponent
  ],
})
export class VerifyEmailComponent implements OnInit {
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  private authStore = useAuthStore();
  private localService = inject(LocalService);
  private translate = inject(TranslateService);

  protected isVerifying = signal(true);
  protected verificationSuccess = signal(false);
  protected errorMessage: string | null = null;

  ngOnInit(): void {
    const token = this.activeRoute.snapshot.queryParams['token'];

    if (!token) {
      this.isVerifying.set(false);
      this.errorMessage = this.translate.instant('auth.invalidVerificationLink');
      return;
    }

    this.verifyEmail(token);
  }

  private verifyEmail(token: string): void {
    const request = new VerifyEmailApiRequest(token);

    this.userApiService.verifyEmail(request).subscribe({
      next: (user) => {
        this.isVerifying.set(false);
        this.verificationSuccess.set(true);
        this.authStore.logout();
        this.localService.cleanCredentials();
        this.alertService.showSuccess(
          this.translate.instant('auth.emailVerifiedSuccessMessage')
        );

        setTimeout(() => {
          this.router.navigate(['']);
        }, 2000);
      },
      error: (error) => {
        this.isVerifying.set(false);
        this.verificationSuccess.set(false);
        this.errorMessage = this.translate.instant('auth.invalidOrExpiredToken');
        this.alertService.showError(this.errorMessage || undefined);
      },
    });
  }
}
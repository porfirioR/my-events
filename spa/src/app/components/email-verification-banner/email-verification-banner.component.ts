import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { useAuthStore } from '../../store';

@Component({
  selector: 'app-email-verification-banner',
  templateUrl: './email-verification-banner.component.html',
  styleUrls: ['./email-verification-banner.component.css']
})
export class EmailVerificationBannerComponent {
  private router = inject(Router);
  protected authStore = useAuthStore();

  protected goToVerification(): void {
    this.router.navigate(['/verify-email-pending']);
  }

}

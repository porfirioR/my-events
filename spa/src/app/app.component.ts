import { Component, inject } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
import { LocalService, ThemeService } from './services'
import { useAuthStore } from './store'
import { HeaderComponent } from "./components/header/header.component";
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    CommonModule
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  protected authStore = useAuthStore();
  private localService = inject(LocalService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.localService.getJwtToken();
    const userString = this.localService.getUserId();
    const email = this.localService.getEmail();
    const name = this.localService.getName();
    const surname = this.localService.getSurname();
    const isEmailVerified = this.localService.getEmailVerified();
    const collaboratorId = this.localService.getCollaboratorId();

    if (token && userString) {
      try {
        this.authStore.restoreSession(userString, token, email!, name!, surname!, isEmailVerified, collaboratorId);
      } catch (error) {
        this.localService.cleanCredentials();
        this.authStore.logout();
      }
    }
  }

  
  protected goToVerification(): void {
    this.router.navigate(['/verify-email-pending']);
  }
}

import { Component, inject } from '@angular/core'
import { Router, RouterOutlet } from '@angular/router'
// import { SwPush } from '@angular/service-worker'
// import { environment } from '../environments/environment'
import { LocalService, ThemeService, 
  // UserApiService 
} from './services'
// import { PushTokenApiRequest } from './models/api'
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
  // private key: string
  protected authStore = useAuthStore();
  private localService = inject(LocalService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  constructor(
    // private swPush: SwPush,
    // private readonly userApiService: UserApiService,
  ) {
    this.initializeAuth();

    // this.key = environment.webPush.publicKey
    // this.subscribeToNotification()
  }

  // private subscribeToNotification = (): void => {
  //   const email = this.localService.getEmail()
  //   if (email && environment.production) {
  //     this.swPush.requestSubscription({ serverPublicKey: this.key }).then(sub =>{
  //       const token: PushTokenApiRequest = JSON.parse(JSON.stringify(sub))
  //       token.email = email
  //       this.userApiService.saveToken(token).subscribe()
  //     }).catch(reason => {
  //       console.error(reason)
  //     })
  //   }
  // }
  private initializeAuth(): void {
    const token = this.localService.getJwtToken();
    const userString = this.localService.getUserId();
    const email = this.localService.getEmail();
    const isEmailVerified = this.localService.getEmailVerified();

    if (token && userString) {
      try {
        this.authStore.restoreSession(userString, token, email!, isEmailVerified);
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

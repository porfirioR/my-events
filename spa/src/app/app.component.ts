import { Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { SwPush } from '@angular/service-worker'
import { environment } from '../environments/environment'
import { LocalService, UserApiService } from './services'
import { PushTokenApiRequest } from './models/api'
import { useAuthStore } from './store'
import { HeaderComponent } from "./components/header/header.component";

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  // private key: string
  private authStore = useAuthStore();
  private localService = inject(LocalService);

  constructor(
    private swPush: SwPush,
    private readonly userApiService: UserApiService,
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

    if (token && userString) {
      try {
        this.authStore.restoreSession(userString, token, email!);
      } catch (error) {
        this.localService.cleanCredentials();
        this.authStore.logout();
      }
    }
  }
}

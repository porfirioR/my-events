import { Component, inject, ViewChild } from '@angular/core'
import { Router, RouterModule } from '@angular/router'
import { ProfileComponent } from "../profile/profile.component"
import { AlertService, LocalService } from '../../services'
import { ModeType } from '../../constants'
import { useAuthStore } from '../../store'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  imports: [
    RouterModule,
    ProfileComponent,
  ]
})
export class HeaderComponent {
  @ViewChild(ProfileComponent) profile: ProfileComponent | undefined
  authStore = useAuthStore()
  private router = inject(Router)
  private localService = inject(LocalService)
  private alertService = inject(AlertService)
  protected currentTheme: ModeType = 'light'
  protected currentUserEmail = this.authStore.currentUserEmail
  
  constructor() {
    this.loadSavedTheme()
  }

  protected openProfile = (): void => {
    this.profile?.openDialog()
  }

  protected logOut = (): void => {
    this.localService.cleanCredentials()
    this.alertService.showSuccess('Good bye.')
    this.authStore.logout()
    this.profile?.ngOnDestroy()
    this.router.navigate(['/login'])
  }

  protected toggleTheme = (): void => {
    const html = document.documentElement
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark'

    html.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)

    this.currentTheme = newTheme
  }

  private loadSavedTheme = (): void => {
    const savedTheme = localStorage.getItem('theme') as ModeType || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)
    this.currentTheme = savedTheme
  }
}

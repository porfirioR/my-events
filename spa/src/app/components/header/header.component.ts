import { Component, inject, ViewChild } from '@angular/core'
import { Router, RouterModule } from '@angular/router'
import { ProfileComponent } from "../profile/profile.component"
import { AlertService, LocalService } from '../../services'
import { ModeType } from '../../constants'
import { useAuthStore, useCollaboratorStore, useTransactionStore } from '../../store'

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
  transactionStore = useTransactionStore()
  collaboratorStore = useCollaboratorStore()
  private router = inject(Router)
  private localService = inject(LocalService)
  private alertService = inject(AlertService)
  protected currentTheme: ModeType = 'light'
  protected currentUserEmail = this.authStore.currentUserEmail
  protected isAuthenticated = this.authStore.isAuthenticated;

  constructor() {
    this.loadSavedTheme()
  }

  protected openProfile = (): void => {
    this.profile?.openDialog()
  }

  protected logOut = (): void => {
    this.localService.cleanCredentials()
    this.transactionStore.clearTransactions()
    this.collaboratorStore.clearCollaborators()
    this.alertService.showSuccess('Good bye.')
    this.authStore.logout()
    this.profile?.ngOnDestroy()
    setTimeout(() => {
      this.router.navigate(['/login'])
    }, 3000);
  }

  protected toggleTheme = (): void => {
    const html = document.documentElement
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark'

    html.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)

    this.currentTheme = newTheme
  }

  protected closeDropdown = (event: Event): void => {
    (document.activeElement as HTMLElement)?.blur();
  }

  private loadSavedTheme = (): void => {
    const savedTheme = localStorage.getItem('theme') as ModeType || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)
    this.currentTheme = savedTheme
  }
}

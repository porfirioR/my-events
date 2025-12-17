import { Component, inject, ViewChild } from '@angular/core'
import { Router, RouterModule } from '@angular/router'
import { ProfileComponent } from "../profile/profile.component"
import { AlertService, LocalService } from '../../services'
import { ThemeService } from '../../services/theme.service'
import { ModeType } from '../../constants'
import { useAuthStore, useCollaboratorStore, useTransactionStore } from '../../store'
import { LanguageSelectorComponent } from '../language-selector/language-selector.component'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  imports: [
    RouterModule,
    ProfileComponent,
    LanguageSelectorComponent,
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
  protected themeService = inject(ThemeService)
  protected currentUserName = this.authStore.currentUserName
  protected isAuthenticated = this.authStore.isAuthenticated

  // Computed property para obtener el tema actual
  protected get currentTheme(): ModeType {
    return this.themeService.isDarkMode() ? 'dark' : 'light'
  }

  constructor() {}

  protected openProfile = (): void => {
    this.profile?.openDialog()
  }

  protected logOut = (): void => {
    this.localService.cleanCredentials()
    this.transactionStore.clearTransactions()
    this.collaboratorStore.clearCollaborators()
    this.authStore.logout()
    this.alertService.showSuccess('Good bye.')
    this.profile?.ngOnDestroy()
    this.router.navigate(['login'])
  }

  protected toggleTheme = (): void => {
    const html = document.documentElement
    const newTheme: ModeType = this.currentTheme === 'dark' ? 'light' : 'dark'

    // Actualizar el tema usando ThemeService
    this.themeService.setTheme(newTheme === 'dark')

    // Mantener compatibilidad con DaisyUI data-theme
    html.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  protected closeDropdown = (event: Event): void => {
    (document.activeElement as HTMLElement)?.blur()
  }
}
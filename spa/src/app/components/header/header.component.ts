import { Component, ViewChild } from '@angular/core'
import { Router, RouterModule } from '@angular/router'
import { ProfileComponent } from "../profile/profile.component"
import { AlertService, LocalService } from '../../services'
import { ModeType } from '../../constants'

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
  protected currentTheme: ModeType = 'light';
  protected isLogin: boolean = false

  constructor(
    private readonly router: Router,
    private readonly localService: LocalService,
    private readonly alertService: AlertService,
  ) {
    this.checkLogin()
    this.loadSavedTheme();
  }

  protected openProfile = (): void => {
    this.isLogin = !!this.localService.getEmail()
    this.profile?.openDialog()
  }

  protected logOut = (): void => {
    this.localService.cleanCredentials()
    this.alertService.showSuccess('Good bye.')
    this.checkLogin()
    this.profile?.ngOnDestroy()
    this.router.navigate([''])
  }

  protected checkLogin = (): void => {
    this.isLogin = !!this.localService.getEmail()
  }

  protected toggleTheme = (): void => {
    const html = document.documentElement;
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    this.currentTheme = newTheme;
  }

  private getCurrentTheme = (): ModeType => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') as ModeType | null;
    return currentTheme ?? 'light';
  }

  private loadSavedTheme = (): void => {
    const savedTheme = localStorage.getItem('theme') as ModeType || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.currentTheme = savedTheme;
  }
}

import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import { TranslateModule, TranslateService } from '@ngx-translate/core'  // ← Agregar TranslateService
import { LoginFormGroup } from '../../models/forms'
import { LoginUserApiRequest } from '../../models/api'
import { AlertService, UserApiService } from '../../services'
import { useAuthStore } from '../../store'
import { TextComponent } from '../inputs/text/text.component'
import { LanguageSelectorComponent } from "../language-selector/language-selector.component";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    TextComponent,
    LanguageSelectorComponent
  ]
})
export class LoginComponent {
  private router = inject(Router);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  private authStore = useAuthStore();
  private translate = inject(TranslateService);
  
  protected isLoading = this.authStore.loginLoading;
  protected loginError = this.authStore.error;

  protected formGroup: FormGroup<LoginFormGroup>

  constructor() {
    this.formGroup = new FormGroup<LoginFormGroup>({
      email: new FormControl(null, [Validators.required, Validators.email]),
      password: new FormControl(null, [Validators.required, Validators.minLength(5), Validators.maxLength(10)])
    })
  }

  protected loginUser = (): void => {
    if (this.formGroup.invalid) {
      return;
    }
    this.authStore.loginStart();
    const request: LoginUserApiRequest = new LoginUserApiRequest(
      this.formGroup.value.email!,
      this.formGroup.value.password!
    );
    this.userApiService.loginUser(request).subscribe({
      next: (user) => {
        this.authStore.loginSuccess(user.id, user.token, user.email, user.name, user.surname, user.userCollaboratorId, user.isEmailVerified);

        if (!user.isEmailVerified) {
          this.alertService.showError(
            this.translate.instant('messages.verifyEmailToAccess')
          );
          this.router.navigate(['/verify-email-pending']);
        } else {
          this.alertService.showSuccess(
            this.translate.instant('messages.welcomeBack', { email: user.email })
          );
          this.router.navigate(['']);
        }
      },
      error: () => {
        this.authStore.loginFailure(
          this.translate.instant('messages.loginFailed')
        );
      },
    });
  };
}
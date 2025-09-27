import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import { LoginFormGroup } from '../../models/forms'
import { LoginUserApiRequest } from '../../models/api'
import { AlertService, UserApiService } from '../../services'
import { FormErrorsComponent } from '../form-errors/form-errors.component'
import { useAuthStore } from '../../store'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    RouterModule,
    ReactiveFormsModule,
    FormErrorsComponent,
  ]
})
export class LoginComponent {
  private router = inject(Router);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  private authStore = useAuthStore();
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
      return
    }
    const request: LoginUserApiRequest = new LoginUserApiRequest(this.formGroup.value.email!, this.formGroup.value.password!)
    this.userApiService.loginUser(request).subscribe({
      next: (user) => {
        this.authStore.loginSuccess(user.id, user.token, user.email);
        this.alertService.showSuccess(`Welcome ${user.email}`)
        this.router.navigate([''])
      },
      error: () => {
        this.authStore.loginFailure('Login failed. Please check your credentials.');
      },
    })
  }

}

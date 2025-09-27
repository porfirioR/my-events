import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import { LoginFormGroup } from '../../models/forms'
import { CreateUserApiRequest } from '../../models/api'
import { AlertService, UserApiService } from '../../services'
import { TextComponent } from '../inputs/text/text.component'
import { useAuthStore } from '../../store'

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  imports: [
    RouterModule,
    ReactiveFormsModule,
    TextComponent
  ]
})
export class SignupComponent {
  private router = inject(Router);
  private userApiService = inject(UserApiService);
  private alertService = inject(AlertService);
  private authStore = useAuthStore();
  protected isLoading = this.authStore.loginLoading;
  protected signupError  = this.authStore.error;
  protected formGroup: FormGroup<LoginFormGroup>

  constructor() {
    this.formGroup = new FormGroup<LoginFormGroup>({
      email: new FormControl(null, [Validators.required, Validators.email]),
      password: new FormControl(null, [Validators.required, Validators.minLength(5), Validators.maxLength(10)])
    })
  }

  protected save = (event: Event): void => {
    event.preventDefault()
    if (this.formGroup.invalid) {
      return
    }
    const request: CreateUserApiRequest = new CreateUserApiRequest(this.formGroup.value.email!, this.formGroup.value.password!)
    this.userApiService.signUpUser(request).subscribe({
      next: (user) => {
        this.authStore.loginSuccess(user.id, user.token);
        this.alertService.showSuccess(`Welcome ${user.email}`)
        this.router.navigate([''])
      },
      error: (error) => {
        this.authStore.loginFailure('Signup failed. Please try again.');
      }
    })
  }
}

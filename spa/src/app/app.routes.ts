import { Routes } from '@angular/router'
import { HomeComponent } from './components/home/home.component'
import { MyEventsComponent } from './components/my-events/my-events.component'
import { LoginComponent } from './components/login/login.component'
import { SignupComponent } from './components/signup/signup.component'
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component'
import { ResetPasswordComponent } from './components/reset-password/reset-password.component'
import { UpsertEventComponent } from './components/upsert-event/upsert-event.component'
import { eventResolver } from './resolvers/event.resolver'
import { UpsertSavingComponent } from './components/upsert-saving/upsert-saving.component'
import { CollaboratorsComponent } from './components/collaborators/collaborators.component'
import { UpsertCollaboratorComponent } from './components/upsert-collaborator/upsert-collaborator.component'

export const routes: Routes = [
  {
    path: '',
    title: 'Principal',
    children: [
      {
        path: '',
        title: 'Principal',
        loadComponent: () => HomeComponent
      },
      {
        path: 'my-events',
        title: 'My events',
        loadComponent: () => MyEventsComponent,
      },
      {
        path: 'login',
        title: 'Login',
        loadComponent: () => LoginComponent
      },
      {
        path: 'signup',
        title: 'Signup',
        loadComponent: () => SignupComponent
      },
      {
        path: 'forgot-password',
        title: 'Forgot password',
        loadComponent: () => ForgotPasswordComponent
      },
      {
        path: 'reset-password',
        title: 'Reset password',
        loadComponent: () => ResetPasswordComponent
      },
      {
        path: 'create-event',
        title: 'Create Event',
        loadComponent: () => UpsertEventComponent,
        resolve: { event: eventResolver }
      },
      {
        path: 'my-events/update-event/:id',
        title: 'Update Event',
        loadComponent: () => UpsertEventComponent,
        resolve: { event: eventResolver }
      },
      {
        path: 'update-saving/:id',
        title: 'Update Saving',
        loadComponent: () => UpsertSavingComponent,
        resolve: { saving: eventResolver }
      },
      {
        path: 'create-saving',
        title: 'Create Saving',
        loadComponent: () => UpsertSavingComponent,
        resolve: { saving: eventResolver }
      },
      {
        path: 'collaborators',
        title: 'Collaborators',
        loadComponent: () => CollaboratorsComponent,
      },
      {
        path: 'collaborators/create',
        title: 'Add Collaborator',
        loadComponent: () => UpsertCollaboratorComponent,
      },
    ]
  }
]

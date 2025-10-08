// app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { MyEventsComponent } from './components/my-events/my-events.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { UpsertEventComponent } from './components/upsert-event/upsert-event.component';
import { eventResolver } from './resolvers/event.resolver';
import { UpsertSavingComponent } from './components/upsert-saving/upsert-saving.component';
import { CollaboratorsComponent } from './components/collaborators/collaborators.component';
import { UpsertCollaboratorComponent } from './components/upsert-collaborator/upsert-collaborator.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { CollaboratorMatchRequestsComponent } from './components/collaborator-match-requests/collaborator-match-requests.component';
import { CollaboratorInvitationsComponent } from './components/collaborator-invitations/collaborator-invitations.component';

export const routes: Routes = [
  {
    path: '',
    title: 'Principal',
    children: [
      // ✅ Rutas protegidas (requieren login)
      {
        path: '',
        title: 'Principal',
        loadComponent: () => HomeComponent,
        canActivate: [authGuard]
      },
      {
        path: 'my-events',
        title: 'My events',
        loadComponent: () => MyEventsComponent,
        canActivate: [authGuard]
      },
      {
        path: 'create-event',
        title: 'Create Event',
        loadComponent: () => UpsertEventComponent,
        resolve: { event: eventResolver },
        canActivate: [authGuard]
      },
      {
        path: 'my-events/update-event/:id',
        title: 'Update Event',
        loadComponent: () => UpsertEventComponent,
        resolve: { event: eventResolver },
        canActivate: [authGuard]
      },
      {
        path: 'update-saving/:id',
        title: 'Update Saving',
        loadComponent: () => UpsertSavingComponent,
        resolve: { saving: eventResolver },
        canActivate: [authGuard]
      },
      {
        path: 'create-saving',
        title: 'Create Saving',
        loadComponent: () => UpsertSavingComponent,
        resolve: { saving: eventResolver },
        canActivate: [authGuard]
      },
      // 🆕 Rutas de Collaborators
      {
        path: 'collaborators',
        title: 'Collaborators',
        loadComponent: () => CollaboratorsComponent,
        canActivate: [authGuard]
      },
      {
        path: 'collaborators/create',
        title: 'Add Collaborator',
        loadComponent: () => UpsertCollaboratorComponent,
        canActivate: [authGuard]
      },
      {
        path: 'collaborators/edit/:id',
        title: 'Edit Collaborator',
        loadComponent: () => UpsertCollaboratorComponent,
        canActivate: [authGuard]
      },
      {
        path: 'collaborators/match-requests',
        title: 'Match Requests',
        loadComponent: () => CollaboratorMatchRequestsComponent,
        canActivate: [authGuard]
      },
      {
        path: 'collaborators/invitations',
        title: 'Invitations Summary',
        loadComponent: () => CollaboratorInvitationsComponent,
        canActivate: [authGuard]
      },
      {
        path: 'collaborators/:collaboratorId/invitations',
        title: 'Collaborator Invitations',
        loadComponent: () => CollaboratorInvitationsComponent,
        canActivate: [authGuard]
      },
      // Opcional: Si creas el componente de stats
      // {
      //   path: 'collaborators/:collaboratorId/stats',
      //   title: 'Collaborator Statistics',
      //   loadComponent: () => import('./components/collaborators/collaborator-stats.component').then(m => m.CollaboratorStatsComponent),
      //   canActivate: [authGuard]
      // },
      
      // Rutas de autenticación (guest)
      {
        path: 'login',
        title: 'Login',
        loadComponent: () => LoginComponent,
        canActivate: [guestGuard]
      },
      {
        path: 'signup',
        title: 'Signup',
        loadComponent: () => SignupComponent,
        canActivate: [guestGuard]
      },
      {
        path: 'forgot-password',
        title: 'Forgot password',
        loadComponent: () => ForgotPasswordComponent,
        canActivate: [guestGuard]
      },
      {
        path: 'reset-password',
        title: 'Reset password',
        loadComponent: () => ResetPasswordComponent,
        canActivate: [guestGuard]
      },
    ]
  }
];
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { CollaboratorsComponent } from './components/collaborators/collaborators.component';
import { UpsertCollaboratorComponent } from './components/upsert-collaborator/upsert-collaborator.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { CollaboratorMatchRequestsComponent } from './components/collaborator-match-requests/collaborator-match-requests.component';
import { CollaboratorInvitationsComponent } from './components/collaborator-invitations/collaborator-invitations.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { VerifyEmailPendingComponent } from './components/verify-email-pending/verify-email-pending.component';
import { WarningUnsavedChanges } from './guards';
import { UpsertSavingsGoalComponent } from './components/upsert-savings-goal/upsert-savings-goal.component';
import { SavingsGoalDetailComponent } from './components/savings-goal-detail/savings-goal-detail.component';
import { SavingsGoalsListComponent } from './components/savings-goals-list/savings-goals-list.component';

export const routes: Routes = [
  {
    path: '',
    title: 'Principal',
    children: [
      {
        path: '',
        title: 'Principal',
        loadComponent: () => HomeComponent,
        canActivate: [authGuard]
      },
      {
        path: 'savings',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            title: 'Savings Goals',
            loadComponent: () => SavingsGoalsListComponent
          },
          {
            path: 'create',
            title: 'Create Savings Goal',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => UpsertSavingsGoalComponent
          },
          {
            path: ':id',
            title: 'Savings Goal Detail',
            loadComponent: () => SavingsGoalDetailComponent
          },
          {
            path: ':id/edit',
            title: 'Edit Savings Goal',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => UpsertSavingsGoalComponent
          }
        ]
      },
      // Collaborators
      {
        path: 'collaborators',
        title: 'Collaborators',
        loadComponent: () => CollaboratorsComponent,
        canActivate: [authGuard]
      },
      {
        path: 'collaborators/create',
        title: 'Add Collaborator',
        canDeactivate: [WarningUnsavedChanges],
        loadComponent: () => UpsertCollaboratorComponent,
        canActivate: [authGuard]
      },
      {
        path: 'collaborators/edit/:id',
        title: 'Edit Collaborator',
        canDeactivate: [WarningUnsavedChanges],
        loadComponent: () => UpsertCollaboratorComponent,
        canActivate: [authGuard]
      },
      {
        path: 'collaborators/match-requests',
        title: 'Match Requests',
        canDeactivate: [WarningUnsavedChanges],
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
      {
        path: 'transactions',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            title: 'Transactions',
            loadComponent: () => import('./components/transactions/transactions.component').then(x => x.TransactionsComponent)
          },
          {
            path: 'new',
            title: 'New Transaction',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => import('./components/upsert-transaction/upsert-transaction.component').then(x => x.UpsertTransactionComponent)
          },
          {
            path: 'balances',
            title: 'Balances',
            loadComponent: () => import('./components/balances/balances.component').then(x => x.BalancesComponent)
          },
          {
            path: ':id',
            title: 'Transaction Details',
            loadComponent: () => import('./components/transaction-details/transaction-details.component').then(x => x.TransactionDetailsComponent)
          }
        ]
      },
      // Opcional: Si creas el componente de stats
      // {
      //   path: 'collaborators/:collaboratorId/stats',
      //   title: 'Collaborator Statistics',
      //   loadComponent: () => import('./components/collaborators/collaborator-stats.component').then(m => m.CollaboratorStatsComponent),
      //   canActivate: [authGuard]
      // },
      
      
    ]
  },
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
  { 
    path: 'verify-email',
    loadComponent: () => VerifyEmailComponent
  },
  { 
    path: 'verify-email-pending',
    loadComponent: () => VerifyEmailPendingComponent
  },
];
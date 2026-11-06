import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { WarningUnsavedChanges } from './guards';

export const routes: Routes = [
  {
    path: '',
    title: 'Principal',
    children: [
      {
        path: '',
        title: 'Principal',
        loadComponent: () => import('./components/home/home.component').then((x) => x.HomeComponent),
        canActivate: [authGuard],
      },
      {
        path: 'savings',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            title: 'Savings Goals',
            loadComponent: () => import('./components/savings-goals-list/savings-goals-list.component').then((x) => x.SavingsGoalsListComponent),
          },
          {
            path: 'create',
            title: 'Create Savings Goal',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => import('./components/upsert-savings-goal/upsert-savings-goal.component').then((x) => x.UpsertSavingsGoalComponent),
          },
          {
            path: ':id',
            title: 'Savings Goal Detail',
            loadComponent: () => import('./components/savings-goal-detail/savings-goal-detail.component').then((x) => x.SavingsGoalDetailComponent),
          },
          {
            path: ':id/edit',
            title: 'Edit Savings Goal',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => import('./components/upsert-savings-goal/upsert-savings-goal.component').then((x) => x.UpsertSavingsGoalComponent),
          },
        ],
      },
      // Loans
      {
        path: 'loans',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            title: 'Loans',
            loadComponent: () => import('./components/loans-list/loans-list.component').then((x) => x.LoansListComponent)
          },
          {
            path: 'create',
            title: 'New Loan',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => import('./components/upsert-loan/upsert-loan.component').then((x) => x.UpsertLoanComponent)
          },
          {
            path: ':id',
            title: 'Loan Detail',
            loadComponent: () => import('./components/loan-detail/loan-detail.component').then((x) => x.LoanDetailComponent)
          },
          {
            path: ':id/edit',
            title: 'Edit Loan',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => import('./components/upsert-loan/upsert-loan.component').then((x) => x.UpsertLoanComponent)
          },
        ],
      },
      // Vista completa de las secciones del dashboard
      {
        path: 'maturities',
        title: 'Maturities',
        canActivate: [authGuard],
        loadComponent: () => import('./components/maturities-calendar/maturities-calendar.component').then((x) => x.MaturitiesCalendarComponent),
      },
      {
        path: 'financial-settings',
        title: 'Financial Settings',
        canActivate: [authGuard],
        canDeactivate: [WarningUnsavedChanges],
        loadComponent: () => import('./components/financial-settings/financial-settings.component').then((x) => x.FinancialSettingsComponent),
      },
      {
        path: 'debts',
        title: 'Debts',
        canActivate: [authGuard],
        loadComponent: () => import('./components/debts-overview/debts-overview.component').then((x) => x.DebtsOverviewComponent),
      },
      // Accounts
      {
        path: 'accounts',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            title: 'Accounts',
            loadComponent: () => import('./components/accounts-list/accounts-list.component').then((x) => x.AccountsListComponent)
          },
          {
            path: 'create',
            title: 'New Account',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => import('./components/upsert-account/upsert-account.component').then((x) => x.UpsertAccountComponent)
          },
          {
            path: 'balances',
            title: 'Monthly Balances',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => import('./components/account-balances/account-balances.component').then((x) => x.AccountBalancesComponent)
          },
          {
            path: ':id/edit',
            title: 'Edit Account',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () => import('./components/upsert-account/upsert-account.component').then((x) => x.UpsertAccountComponent)
          },
        ],
      },
      // Collaborators
      {
        path: 'collaborators',
        title: 'Collaborators',
        loadComponent: () => import('./components/collaborators/collaborators.component').then((x) => x.CollaboratorsComponent),
        canActivate: [authGuard],
      },
      {
        path: 'collaborators/create',
        title: 'Add Collaborator',
        canDeactivate: [WarningUnsavedChanges],
        loadComponent: () => import('./components/upsert-collaborator/upsert-collaborator.component').then((x) => x.UpsertCollaboratorComponent),
        canActivate: [authGuard],
      },
      {
        path: 'collaborators/edit/:id',
        title: 'Edit Collaborator',
        canDeactivate: [WarningUnsavedChanges],
        loadComponent: () => import('./components/upsert-collaborator/upsert-collaborator.component').then((x) => x.UpsertCollaboratorComponent),
        canActivate: [authGuard],
      },
      {
        path: 'collaborators/match-requests',
        title: 'Match Requests',
        canDeactivate: [WarningUnsavedChanges],
        loadComponent: () => import('./components/collaborator-match-requests/collaborator-match-requests.component').then((x) => x.CollaboratorMatchRequestsComponent),
        canActivate: [authGuard],
      },
      {
        path: 'collaborators/invitations',
        title: 'Invitations Summary',
        loadComponent: () => import('./components/collaborator-invitations/collaborator-invitations.component').then((x) => x.CollaboratorInvitationsComponent),
        canActivate: [authGuard],
      },
      {
        path: 'collaborators/:collaboratorId/invitations',
        title: 'Collaborator Invitations',
        loadComponent: () => import('./components/collaborator-invitations/collaborator-invitations.component').then((x) => x.CollaboratorInvitationsComponent),
        canActivate: [authGuard],
      },
      {
        path: 'transactions',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            title: 'Transactions',
            loadComponent: () =>
              import('./components/transactions/transactions.component').then(
                (x) => x.TransactionsComponent
              ),
          },
          {
            path: 'new',
            title: 'New Transaction',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () =>
              import(
                './components/upsert-transaction/upsert-transaction.component'
              ).then((x) => x.UpsertTransactionComponent),
          },
          {
            path: 'balances',
            title: 'Balances',
            loadComponent: () =>
              import('./components/balances/balances.component').then(
                (x) => x.BalancesComponent
              ),
          },
          {
            path: ':id/edit',
            title: 'Edit Transaction',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () =>
              import(
                './components/upsert-transaction/upsert-transaction.component'
              ).then((x) => x.UpsertTransactionComponent),
          },
          {
            path: ':id',
            title: 'Transaction Details',
            loadComponent: () =>
              import(
                './components/transaction-details/transaction-details.component'
              ).then((x) => x.TransactionDetailsComponent),
          },
        ],
      },
      // Opcional: Si creas el componente de stats
      // {
      //   path: 'collaborators/:collaboratorId/stats',
      //   title: 'Collaborator Statistics',
      //   loadComponent: () => import('./components/collaborators/collaborator-stats.component').then((x) => x.CollaboratorStatsComponent),
      //   canActivate: [authGuard]
      // },
      {
        path: 'travels',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            title: 'Travels',
            loadComponent: () =>
              import('./components/travels-list/travels-list.component').then(
                (x) => x.TravelsListComponent
              ),
          },
          {
            path: 'create',
            title: 'Create Travel',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () =>
              import('./components/upsert-travel/upsert-travel.component').then(
                (x) => x.UpsertTravelComponent
              ),
          },
          {
            path: ':id',
            title: 'Travel Detail',
            loadComponent: () =>
              import('./components/travel-detail/travel-detail.component').then(
                (x) => x.TravelDetailComponent
              ),
          },
          {
            path: ':id/edit',
            title: 'Edit Travel',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () =>
              import('./components/upsert-travel/upsert-travel.component').then(
                (x) => x.UpsertTravelComponent
              ),
          },
          {
            path: ':travelId/operations/create',
            title: 'New Operation',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () =>
              import(
                './components/upsert-operation/upsert-operation.component'
              ).then((x) => x.UpsertOperationComponent),
          },
          {
            path: ':travelId/operations/:operationId',
            title: 'Operation Detail',
            loadComponent: () =>
              import(
                './components/operation-detail/operation-detail.component'
              ).then((x) => x.OperationDetailComponent),
          },
          {
            path: ':travelId/operations/:operationId/edit',
            title: 'Edit Operation',
            canDeactivate: [WarningUnsavedChanges],
            loadComponent: () =>
              import(
                './components/upsert-operation/upsert-operation.component'
              ).then((x) => x.UpsertOperationComponent),
          },
        ],
      },
    ],
  },
  // Rutas de autenticación (guest)
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./components/login/login.component').then((x) => x.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    title: 'Signup',
    loadComponent: () => import('./components/signup/signup.component').then((x) => x.SignupComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    title: 'Forgot password',
    loadComponent: () => import('./components/forgot-password/forgot-password.component').then((x) => x.ForgotPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password',
    title: 'Reset password',
    loadComponent: () => import('./components/reset-password/reset-password.component').then((x) => x.ResetPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./components/verify-email/verify-email.component').then((x) => x.VerifyEmailComponent),
  },
  {
    path: 'verify-email-pending',
    loadComponent: () => import('./components/verify-email-pending/verify-email-pending.component').then((x) => x.VerifyEmailPendingComponent),
  },
];

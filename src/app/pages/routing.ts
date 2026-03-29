import { Routes } from '@angular/router';
import { AuthGuard } from '../modules/auth/services/auth.guard';

const Routing: Routes = [
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/account/account.module').then((m) => m.AccountModule),
  },
  {
    path: 'organizationmanagement',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/organization-management/organization-management.module').then((m) => m.OrganizationManagementModule),
  },
  {
    path: 'usermanagement',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/user-management/user-management.module').then((m) => m.UserManagementModule),
  },
  {
    path: 'ordermanagement',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/order-management/order-management.module').then((m) => m.OrderManagementModule),
  },
  {
    path: 'ordercompletion',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/order-completion/order-completion.module').then((m) => m.OrderCompletionModule),
  },
  {
    path: 'incomingordermanagement',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/coming-order-management/coming-order-management.module').then((m) => m.ComingOrderManagementModule),
  },
  {
    path: 'landing',
    loadChildren: () =>
      import('../modules/landing/landing.module').then((m) => m.LandingModule),
  },
  {
    path: '',
    redirectTo: '/landing',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/error/404',
  },
];

export { Routing };

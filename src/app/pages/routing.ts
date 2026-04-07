import { Routes } from '@angular/router';
import { AuthGuard } from '../modules/auth/services/auth.guard';

const Routing: Routes = [
  {
    path: 'dashboard',
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
    path: 'mapmanagement',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/map-management/map-management.module').then((m) => m.MapManagementModule),
  },
  {
    path: 'organizationmanagement',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/organization-management/organization-management.module').then((m) => m.OrganizationManagementModule),
  },
  {
    path: 'supportmanagement',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/support-management/support-management.module').then((m) => m.SupportManagementModule),
  },
  {
    path: 'usermanagement',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('../modules/user-management/user-management.module').then((m) => m.UserManagementModule),
  },
  {
    path: 'landing',
    loadChildren: () =>
      import('../modules/landing/landing.module').then((m) => m.LandingModule),
  },
  {
    path: 'basketmanagement',
    loadChildren: () =>
      import('../modules/basket-management/basket-management.module').then((m) => m.BasketManagementModule),
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
    path: '',
    redirectTo: '/landing/marketplace',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'error/404',
  },
];

export { Routing };

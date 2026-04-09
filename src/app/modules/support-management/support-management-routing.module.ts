import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupportManagementComponent } from './support-management.component';
import { SupportManagementDetailComponent } from './detail/support-management-detail.component';

const routes: Routes = [
  {
      path: '',
      children: [
        {
          path: '',
          component: SupportManagementComponent
        },
        {
          path: ':id',
          component: SupportManagementDetailComponent,
        },
      ]
    },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SupportManagementRoutingModule {}
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupportManagementComponent } from './support-management.component';

const routes: Routes = [
  {
    path: '',
    component: SupportManagementComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SupportManagementRoutingModule {}
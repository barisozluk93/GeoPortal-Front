import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuditLogManagementComponent } from './audit-log-management.component';

const routes: Routes = [
  {
    path: '',
    component: AuditLogManagementComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuditLogManagementRoutingModule {}

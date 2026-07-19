import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataTableModule } from '../common/datatable/datatable.module';
import { TranslationModule } from '../i18n/translation.module';
import { AuditLogManagementRoutingModule } from './audit-log-management-routing.module';
import { AuditLogManagementComponent } from './audit-log-management.component';

@NgModule({
  declarations: [AuditLogManagementComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    TranslationModule,
    DataTableModule,
    AuditLogManagementRoutingModule,
  ],
})
export class AuditLogManagementModule {}

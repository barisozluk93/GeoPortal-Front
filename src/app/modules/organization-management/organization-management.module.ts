import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslationModule } from '../i18n/translation.module';
import { OrganizationManagementRoutingModule } from './organization-management-routing.module';
import { OrganizationEditSaveComponent } from './edit-save/edit-save.component';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { DataTableModule } from '../common/datatable/datatable.module';
import { OrganizationManagementComponent } from './organization-management.component';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';

@NgModule({
  declarations: [
    OrganizationManagementComponent,
    OrganizationEditSaveComponent
  ],
  imports: [
    DataTableModule,
    ConfirmationModule,
    CommonModule,
    TranslationModule,
    OrganizationManagementRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    CustomModalModule,
    NgxMaskDirective,
    NgxMaskPipe
  ],
  providers: [
    provideNgxMask()
  ]
})
export class OrganizationManagementModule {}

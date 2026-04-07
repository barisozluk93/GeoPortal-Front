import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslationModule } from '../i18n/translation.module';

import { SupportManagementComponent } from './support-management.component';
import { SupportManagementRoutingModule } from './support-management-routing.module';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';
import { DataTableModule } from '../common/datatable/datatable.module';
import { CustomSelectModule } from '../common/select/custom-select.module';

@NgModule({
  declarations: [
    SupportManagementComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    TranslationModule,
    SupportManagementRoutingModule,
    InlineSVGModule,
    NgbPaginationModule,
    DataTableModule,
    CustomSelectModule,
    CustomModalModule,
  ],
})
export class SupportManagementModule {}
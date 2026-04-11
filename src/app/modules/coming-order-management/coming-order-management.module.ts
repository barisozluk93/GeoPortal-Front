import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslationModule } from '../i18n/translation.module';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { ComingOrderManagementRoutingModule } from './coming-order-management-routing.module';
import { ComingOrderManagementComponent } from './coming-order-management.component';
import { ComingOrderDetailComponent } from './detail/coming-order-detail.component';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { DataTableModule } from '../common/datatable/datatable.module';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';
import { CustomSelectModule } from '../common/select/custom-select.module';

@NgModule({
  declarations: [
    ComingOrderManagementComponent,
    ComingOrderDetailComponent,
  ],
  imports: [
    DataTableModule,
    ConfirmationModule,
    CommonModule,
    TranslationModule,
    ComingOrderManagementRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    InlineSVGModule,
    NgbPaginationModule,
    PdfViewerModule,
    CustomModalModule,
    CustomSelectModule
  ]
})
export class ComingOrderManagementModule { }

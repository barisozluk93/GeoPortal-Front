import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslationModule } from '../i18n/translation.module';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { OrderManagementComponent } from './order-management.component';
import { OrderManagementRoutingModule } from './order-management-routing.module';
import { OrderDetailComponent } from './detail/order-detail.component';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { DataTableModule } from '../common/datatable/datatable.module';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';
import { InvoicePreviewModalComponent } from './detail/invoice-preview/invoice-preview-modal.component';

@NgModule({
  declarations: [
    OrderManagementComponent,
    OrderDetailComponent,
    InvoicePreviewModalComponent
  ],
  imports: [
    DataTableModule,
    ConfirmationModule,
    CommonModule,
    TranslationModule,
    OrderManagementRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    CustomModalModule,
    InlineSVGModule,
    NgbPaginationModule,
    PdfViewerModule
  ]
})
export class OrderManagementModule {}

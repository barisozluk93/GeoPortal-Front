import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslationModule } from '../i18n/translation.module';
import { ModalsModule } from 'src/app/_metronic/partials';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { OrderManagementComponent } from './order-management.component';
import { OrderManagementRoutingModule } from './order-management-routing.module';
import { OrderDetailComponent } from './detail/order-detail.component';
import { InvoiceComponent } from './detail/invoice/invoice.component';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { DataTableModule } from '../common/datatable/datatable.module';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';

@NgModule({
  declarations: [
    OrderManagementComponent,
    OrderDetailComponent,
    InvoiceComponent,
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

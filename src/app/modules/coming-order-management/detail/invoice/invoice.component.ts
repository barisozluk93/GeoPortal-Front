import { Component, EventEmitter, OnInit, Output, ViewChild } from "@angular/core";
import { ComingOrderManagementService } from "../../coming-order-management.service";
import { OrderProductModel } from "../../models/orderproduct.model";
import { ConfirmationComponent } from "src/app/modules/confirmation/confirmation.component";
import { TranslateService } from "@ngx-translate/core";
import { AlertService } from "src/app/_metronic/partials/layout/alert/alert.service";
import { forkJoin } from "rxjs";

@Component({
  selector: 'app-orderinvoice-edit',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss'],
})
export class InvoiceComponent implements OnInit {
  @ViewChild('deleteConfirmationComponent')
  private deleteConfirmationComponent: ConfirmationComponent;

  @Output() isSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();

  isModalOpen: boolean = false;
  modalTitle: string;

  fileName?: string;
  fileId: number;
  pdfSrc: any;

  orderProduct: OrderProductModel;

  constructor(
    private comingOrderManagementService: ComingOrderManagementService,
    private translate: TranslateService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void { }

  delete(event: number) {
    this.comingOrderManagementService.deleteInvoice(this.orderProduct.id).subscribe(result => {
      if (result.isSuccess) {
        this.fileName = undefined;
        this.pdfSrc = undefined;
        this.orderProduct = result.data;
        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        this.isSuccess.emit(true);
      } else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  onFileChange(event: any) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.fileName = file.name;
      this.pdfSrc = URL.createObjectURL(file);

      const formData = new FormData();
      formData.append("file", file);

      this.comingOrderManagementService.upload(formData).subscribe(result => {
        if (result.isSuccess) {
          this.orderProduct.fileId = result.data.id;
          this.orderProduct.product = undefined;

          this.comingOrderManagementService.addInvoice(this.orderProduct).subscribe(saveResult => {
            if (saveResult.isSuccess) {
              this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
              this.isSuccess.emit(true);
            } else {
              this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
            }
          });
        } else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      });
    }
  }

  openDeleteModal() {
    let deleteText = "";

    this.translate.get('DELETE').subscribe((translation) => {
      deleteText = translation;
    });

    this.deleteConfirmationComponent.openModal(deleteText, this.orderProduct.id);
  }

  openModal(orderProduct: OrderProductModel) {
    const keys = ['INVOICE'];

    const translations: any = {};
    const observables = keys.map(key => this.translate.get(key));

    forkJoin(observables).subscribe((results) => {
      keys.forEach((key, index) => {
        translations[key] = results[index];
      });

      this.modalTitle = translations['INVOICE'];
    });

    this.orderProduct = orderProduct;

    this.fileName = undefined;
    this.pdfSrc = undefined;

    if (this.orderProduct.fileResult) {
      if (
        !this.orderProduct.fileResult.fileContents.includes(
          "data:" + this.orderProduct.fileResult.contentType + ";base64,"
        )
      ) {
        this.orderProduct.fileResult.fileContents =
          "data:" +
          this.orderProduct.fileResult.contentType +
          ";base64," +
          this.orderProduct.fileResult.fileContents;
      }

      this.pdfSrc = this.orderProduct.fileResult.fileContents;
      this.fileName = this.orderProduct.fileName!;
    }

    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  submit() {
    this.closeModal();
  }
}
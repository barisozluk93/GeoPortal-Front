import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { OrderProductModel } from "../../models/orderproduct.model";
import { TranslateService } from "@ngx-translate/core";
import { forkJoin } from "rxjs";

@Component({
  selector: 'app-orderinvoice-edit',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss'],
})
export class InvoiceComponent implements OnInit {

  @Output() isSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();

  isModalOpen: boolean = false;
  modalTitle: string = '';

  fileName: string;
  pdfSrc: any;

  orderProduct: OrderProductModel;

  constructor(
    private translate: TranslateService
  ) {}

  ngOnInit(): void {}

  openModal(orderProduct: OrderProductModel) {

    const keys = ['INVOICE'];
    const translations: any = {};

    forkJoin(keys.map(k => this.translate.get(k))).subscribe(results => {
      keys.forEach((k, i) => translations[k] = results[i]);
      this.modalTitle = translations['INVOICE'];
    });

    this.orderProduct = orderProduct;

    if (!this.orderProduct.fileResult.fileContents.includes(
      "data:" + this.orderProduct.fileResult.contentType + ";base64,"
    )) {
      this.orderProduct.fileResult.fileContents =
        "data:" +
        this.orderProduct.fileResult.contentType +
        ";base64," +
        this.orderProduct.fileResult.fileContents;
    }

    this.pdfSrc = this.orderProduct.fileResult.fileContents;
    this.fileName = this.orderProduct.fileName!;

    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  downloadFile() {
    const link = document.createElement('a');
    link.href = this.pdfSrc;
    link.download = this.fileName;
    link.click();
  }
}
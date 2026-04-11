import { Component, EventEmitter, Inject, LOCALE_ID, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ComingOrderManagementService } from "../../coming-order-management.service";
import { OrderProductModel } from "../../models/orderproduct.model";
import { AlertService } from "src/app/_metronic/partials/layout/alert/alert.service";
import { forkJoin } from "rxjs";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-orderstatus-edit',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss'],
})
export class StatusComponent implements OnInit {

  @Output() isSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();

  isModalOpen: boolean = false;
  modalTitle: string;

  form: FormGroup;

  orderProduct: OrderProductModel;
  status: any[] = [];

  constructor(
    private fb: FormBuilder,
    private comingOrderManagementService: ComingOrderManagementService,
    @Inject(LOCALE_ID) public locale: string,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  get f() {
    return this.form.controls;
  }

  initForm() {
    this.form = this.fb.group({
      id: 0,
      productId: undefined,
      orderId: undefined,
      order: undefined,
      orderStatus: [
        undefined,
        Validators.required
      ],
    });
  }

  ngOnInit(): void {
    this.initForm();
  }

  private formatJSDate(date?: string) {
    const d = new Date(date!);

    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    let hour = '' + d.getHours();
    let minute = '' + d.getMinutes();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    if (hour.length < 2) hour = '0' + hour;
    if (minute.length < 2) minute = '0' + minute;

    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  updateTranslationsAndColumns(statusTr: any, statusEn: any): void {
    this.translate.onLangChange.subscribe(() => {
      this.updateCategoryList(statusTr, statusEn);
    });

    this.updateCategoryList(statusTr, statusEn);
  }

  updateCategoryList(statusTr: any, statusEn: any): void {
    this.translate.get('LANG').subscribe((translation: string) => {
      this.status = translation === 'tr' ? statusTr : statusEn;
    });
  }

  openModal(orderProduct: OrderProductModel) {

    const statusTR = [
      { id: 0, name: "Onay Bekliyor" },
      { id: 1, name: "Onaylandı" },
      { id: 2, name: "Reddedildi" },
      { id: 3, name: "Hazırlanıyor" },
      { id: 4, name: "Tamamlandı" }
    ];

    const statusEN = [
      { id: 0, name: "Pending Approval" },
      { id: 1, name: "Approved" },
      { id: 2, name: "Rejected" },
      { id: 3, name: "Preparing" },
      { id: 4, name: "Completed" }
    ];

    const keys = ['EDIT_STATUS'];
    const translations: any = {};
    const observables = keys.map(key => this.translate.get(key));

    forkJoin(observables).subscribe(results => {
      keys.forEach((key, index) => {
        translations[key] = results[index];
      });

      this.modalTitle = translations['EDIT_STATUS'];
    });

    this.updateTranslationsAndColumns(statusTR, statusEN);

    this.orderProduct = orderProduct;

    // status filtreleme
    if (this.orderProduct.orderStatus == 0) {
      this.status = this.status.filter(f =>
        f.id == this.orderProduct.orderStatus ||
        f.id == this.orderProduct.orderStatus! + 1 ||
        f.id == this.orderProduct.orderStatus! + 2
      );
    } else if (this.orderProduct.orderStatus == 1) {
      this.status = this.status.filter(f =>
        f.id == this.orderProduct.orderStatus ||
        f.id == this.orderProduct.orderStatus! + 2
      );
    } else {
      this.status = this.status.filter(f =>
        f.id == this.orderProduct.orderStatus ||
        f.id == this.orderProduct.orderStatus! + 1
      );
    }


    this.orderProduct.completionDate = this.orderProduct.completionDate
      ? this.formatJSDate(this.orderProduct.completionDate)
      : this.orderProduct.completionDate;

    this.form.patchValue(orderProduct);

    this.isModalOpen = true;
  }

  submit() {
    if (this.form.valid) {
      const data = this.form.getRawValue() as OrderProductModel;

      this.comingOrderManagementService.updateStatus(data).subscribe(result => {
        if (result.isSuccess) {
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
          this.isSuccess.emit(true);
          this.closeModal();
        } else {
this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));        }
      });
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }
}
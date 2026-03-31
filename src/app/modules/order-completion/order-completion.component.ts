import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { Router } from '@angular/router';
import { AuthService } from '../auth';
import { OrderManagementService } from '../order-management/order-management.service';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { OrderModel } from '../order-management/models/order.model';
import { UserManagementService } from '../user-management/user-management.service';
import { UserAddressModel } from '../user-management/models/user-address.model';
import { AddressEditSaveComponent } from '../account/addresses/forms/list/edit-save/edit-save.component';
import { BasketModel } from '../basket-management/models/basket.model';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

export type RegistrationTabsType =
  | 'address'
  | 'payment';

@Component({
  selector: 'app-order-completion',
  templateUrl: './order-completion.component.html',
  styleUrls: ['./order-completion.component.scss'],
})
export class OrderCompletionComponent implements OnInit, OnDestroy {
  @ViewChild('editSaveComponent') private editSaveComponent!: AddressEditSaveComponent;

  invoiceAddresses: UserAddressModel[] = [];
  selectedInvoiceAddress!: UserAddressModel;
  selectedInvoiceAddressId: number = 0;

  activeTabId: RegistrationTabsType = 'address';

  currentUserIsExist: boolean = false;
  currentUser: any;

  header: string = 'Sepetim';
  basket: BasketModel[] = [];
  basketFromStorage: BasketModel[] = [];
  numberOfItem: number = 0;
  totalPrice: number = 0;

  paymentForm: FormGroup;
  submitted: boolean = false;

  private basketSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private basketService: BasketService,
    private orderManagementService: OrderManagementService,
    private alertService: AlertService,
    private router: Router,
    public translate: TranslateService,
    private userManagementService: UserManagementService,
    private fb: FormBuilder
  ) {
    this.paymentForm = this.fb.group({
      cardHolderName: ['', [Validators.required, Validators.minLength(3)]],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expireMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      expireYear: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      agreement: [false, [Validators.requiredTrue]]
    });
  }

  get f(): { [key: string]: AbstractControl } {
    return this.paymentForm.controls;
  }

  get cardNumberPreview(): string {
    const value = this.f['cardNumber']?.value || '';
    return this.formatCardNumber(value);
  }

  get cardHolderPreview(): string {
    const value = this.f['cardHolderName']?.value || '';
    return value ? value.toUpperCase() : 'CARD HOLDER';
  }

  get expirePreview(): string {
    const month = this.f['expireMonth']?.value || 'MM';
    const year = this.f['expireYear']?.value || 'YY';
    return `${month}/${year}`;
  }

  ngOnInit(): void {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      this.currentUserIsExist = true;
      this.currentUser = currentUser;
      this.basketService.loadBasketFromDb();
      this.loadInvoiceAddresses();
    } else {
      this.currentUserIsExist = false;
    }

    this.basketSubscription = this.basketService.basket$.subscribe(result => {
      if (result) {
        this.numberOfItem = 0;
        this.totalPrice = 0;
        this.basket = [];
        this.basketFromStorage = result;

        result.forEach(item => {
          this.numberOfItem += 1;
          this.totalPrice += item.product?.price || 0;

          if (this.basket.length === 0) {
            this.basket.push({
              id: 0,
              userId: 0,
              productId: item.product?.id,
              product: item.product,
              numberOf: 1,
              isDeleted: item.isDeleted,
              totalPrice: item.product?.price
            });
          } else {
            const itemInBasket = this.basket.find(f => f.productId === item.productId);

            if (itemInBasket) {
              itemInBasket.numberOf = (itemInBasket.numberOf || 0) + 1;
              itemInBasket.totalPrice = (itemInBasket.totalPrice || 0) + (item.product?.price || 0);
            } else {
              this.basket.push({
                id: 0,
                userId: 0,
                productId: item.product?.id,
                product: item.product,
                numberOf: 1,
                isDeleted: item.isDeleted,
                totalPrice: item.product?.price
              });
            }
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.basketSubscription?.unsubscribe();
  }

  isSuccess(event: any): void {
    this.loadInvoiceAddresses();
  }

  loadInvoiceAddresses(): void {
    this.userManagementService.userAddressList(this.currentUser.id).subscribe(result => {
      if (result.isSuccess) {
        let i = 0;

        result.data.forEach((item: UserAddressModel) => {
          if (i === 0) {
            item.selected = true;
            this.selectedInvoiceAddressId = item.id;
            this.selectedInvoiceAddress = item;
          } else {
            item.selected = false;
          }
          i++;
        });

        this.invoiceAddresses = result.data;
      } else {
        this.invoiceAddresses = [];
      }
    });
  }

  openEditModal(id: number): void {
    this.editSaveComponent.openModal(this.currentUser.id, id);
  }

  openSaveModal(): void {
    this.editSaveComponent.openModal(this.currentUser.id, undefined);
  }

  selectInvoiceAddress(id: number): void {
    this.invoiceAddresses.forEach(item => {
      item.selected = item.id === id;

      if (item.id === id) {
        this.selectedInvoiceAddress = item;
      }
    });

    this.selectedInvoiceAddressId = id;
  }

  setActiveTabId(tabId: RegistrationTabsType): void {
    this.activeTabId = tabId;
  }

  confirmOrder(): void {
    this.submitted = true;

    if (!this.selectedInvoiceAddressId || this.selectedInvoiceAddressId <= 0) {
      this.alertService.createAlert(
        'warning',
        this.translate.instant('PLEASE_SELECT_INVOICE_ADDRESS')
      );
      this.setActiveTabId('address');
      return;
    }

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.alertService.createAlert(
        'warning',
        this.translate.instant('PLEASE_FILL_PAYMENT_FORM')
      );
      this.setActiveTabId('payment');
      return;
    }

    if (!this.basketFromStorage || this.basketFromStorage.length === 0) {
      this.alertService.createAlert(
        'warning',
        this.translate.instant('BASKET_IS_EMPTY')
      );
      return;
    }

    const data: OrderModel = {
      id: 0,
      basketId: this.basketFromStorage[0].id,
      userId: this.currentUser.id,
      price: this.totalPrice,
      invoiceAddressId: this.selectedInvoiceAddressId
    };

    this.orderManagementService.save(data).subscribe(result => {
      if (result.isSuccess) {
        this.basketService.loadBasketFromDb();
        this.alertService.createAlert('success', result.message);

        setTimeout(() => {
          this.router.navigate(['/ordermanagement/' + result.data.id]);
        }, 2500);
      } else {
        this.alertService.createAlert('danger', result.message);
      }
    });
  }

  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numericValue = (input.value || '').replace(/\D/g, '').slice(0, 16);
    this.paymentForm.patchValue({ cardNumber: numericValue }, { emitEvent: false });
    input.value = this.formatCardNumber(numericValue);
  }

  onCardHolderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = (input.value || '').replace(/\s+/g, ' ').trimStart();
    this.paymentForm.patchValue({ cardHolderName: value }, { emitEvent: false });
  }

  onExpireMonthInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let numericValue = (input.value || '').replace(/\D/g, '').slice(0, 2);

    if (numericValue.length === 1 && Number(numericValue) > 1) {
      numericValue = `0${numericValue}`;
    }

    this.paymentForm.patchValue({ expireMonth: numericValue }, { emitEvent: false });
    input.value = numericValue;
  }

  onExpireYearInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numericValue = (input.value || '').replace(/\D/g, '').slice(0, 2);
    this.paymentForm.patchValue({ expireYear: numericValue }, { emitEvent: false });
    input.value = numericValue;
  }

  onCvvInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numericValue = (input.value || '').replace(/\D/g, '').slice(0, 4);
    this.paymentForm.patchValue({ cvv: numericValue }, { emitEvent: false });
    input.value = numericValue;
  }

  private formatCardNumber(value: string): string {
    const cleaned = (value || '').replace(/\D/g, '').slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : '#### #### #### ####';
  }
}
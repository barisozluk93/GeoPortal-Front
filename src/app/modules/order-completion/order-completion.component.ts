import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { Router } from '@angular/router';
import { AuthService } from '../auth';
import { OrderManagementService } from '../order-management/order-management.service';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { UserManagementService } from '../user-management/user-management.service';
import { UserAddressModel } from '../user-management/models/user-address.model';
import { AddressEditSaveComponent } from '../account/addresses/forms/list/edit-save/edit-save.component';
import { BasketModel } from '../basket-management/models/basket.model';
import { TranslateService } from '@ngx-translate/core';
import { OrderModel } from '../coming-order-management/models/order.model';

export type RegistrationTabsType = 'address' | 'payment';

@Component({
  selector: 'app-order-completion',
  templateUrl: './order-completion.component.html',
  styleUrls: ['./order-completion.component.scss'],
})
export class OrderCompletionComponent implements OnInit, OnDestroy {
  @ViewChild('editSaveComponent') private editSaveComponent: AddressEditSaveComponent;

  addresses: UserAddressModel[] = [];
  selectedAddressId!: number;
  selectedAddress!: UserAddressModel;

  activeTabId: RegistrationTabsType = 'address';

  currentUserIsExist: boolean = false;
  currentUser: any;

  header: string = 'Sepetim';
  basket: BasketModel[] = [];
  basketFromStorage: BasketModel[] = [];
  numberOfItem: number = 0;
  totalPrice: number = 0;

  paymentForm!: FormGroup;
  submitted: boolean = false;

  constructor(
    private authService: AuthService,
    private basketService: BasketService,
    private orderManagementService: OrderManagementService,
    private alertService: AlertService,
    private router: Router,
    private userManagementService: UserManagementService,
    private fb: FormBuilder,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initPaymentForm();

    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.currentUserIsExist = true;
      this.currentUser = currentUser;
      this.basketService.loadBasketFromDb();
      this.loadAddresses();
    } else {
      this.currentUserIsExist = false;
    }

    this.basketService.basket$.subscribe(result => {
      if (result) {
        this.numberOfItem = 0;
        this.totalPrice = 0;
        this.basket = [];
        this.basketFromStorage = result;

        result.forEach(item => {
          this.numberOfItem += 1;
          this.totalPrice += item.product?.price!;

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
            const itemInBasket = this.basket.filter(f => f.productId == item.productId);
            if (itemInBasket.length > 0) {
              if (itemInBasket[0].numberOf) {
                itemInBasket[0].numberOf += 1;
              }
              if (itemInBasket[0].totalPrice) {
                itemInBasket[0].totalPrice += item.product?.price!;
              }
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

  ngOnDestroy(): void {}

  initPaymentForm(): void {
    this.paymentForm = this.fb.group({
      cardHolder: ['', [Validators.required, Validators.minLength(3)]],
      cardNumber: ['', [Validators.required, Validators.minLength(19)]],
      expiry: ['', [Validators.required, this.expiryValidator]],
      cvv: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]],
      agreement: [false, Validators.requiredTrue]
    });
  }

  expiryValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || '').trim();

    if (!value) {
      return null;
    }

    const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!regex.test(value)) {
      return { invalidExpiry: true };
    }

    const [monthStr, yearStr] = value.split('/');
    const month = Number(monthStr);
    const year = Number(`20${yearStr}`);

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return { expired: true };
    }

    return null;
  }

  onCardNumberInput(): void {
    const control = this.paymentForm.get('cardNumber');
    if (!control) return;

    let value = (control.value || '').replace(/\D/g, '').substring(0, 16);
    value = value.replace(/(.{4})/g, '$1 ').trim();

    control.setValue(value, { emitEvent: false });
  }

  onExpiryInput(): void {
    const control = this.paymentForm.get('expiry');
    if (!control) return;

    let value = (control.value || '').replace(/\D/g, '').substring(0, 4);

    if (value.length >= 3) {
      value = `${value.substring(0, 2)}/${value.substring(2)}`;
    }

    control.setValue(value, { emitEvent: false });
  }

  onCvvInput(): void {
    const control = this.paymentForm.get('cvv');
    if (!control) return;

    const value = (control.value || '').replace(/\D/g, '').substring(0, 4);
    control.setValue(value, { emitEvent: false });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!field && field.invalid && (field.touched || this.submitted);
  }

  get detectedCardType(): string {
    const rawValue = (this.paymentForm.get('cardNumber')?.value || '').replace(/\s/g, '');

    if (rawValue.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(rawValue)) return 'Mastercard';
    if (/^3[47]/.test(rawValue)) return 'Amex';

    return 'Card';
  }

  getFormattedCardNumber(): string {
    const value = this.paymentForm.get('cardNumber')?.value;
    return value && value.trim().length > 0 ? value : '•••• •••• •••• ••••';
  }

  getCardHolderPreview(): string {
    const value = this.paymentForm.get('cardHolder')?.value;
    return value && value.trim().length > 0 ? value.toUpperCase() : 'AD SOYAD';
  }

  getExpiryPreview(): string {
    const value = this.paymentForm.get('expiry')?.value;
    return value && value.trim().length > 0 ? value : 'AA/YY';
  }

  confirmOrder(): void {
    this.submitted = true;
    this.paymentForm.markAllAsTouched();

    if (!(this.selectedAddressId > 0)) {
      this.alertService.createAlert('warning', this.translate.instant("MESSAGES.SELECT_ADDRESS"));
      this.activeTabId = 'address';
      return;
    }

    if (this.paymentForm.invalid) {
      this.alertService.createAlert('warning', this.translate.instant("MESSAGES.PAYMENT"));
      this.activeTabId = 'payment';
      return;
    }

    const data: OrderModel = {
      id: 0,
      basketId: this.basketFromStorage[0].id,
      userId: Number(this.currentUser.id),
      price: this.totalPrice,
      invoiceAddressId: this.selectedAddressId
    };

    this.orderManagementService.save(data).subscribe(result => {
      if (result.isSuccess) {
        this.basketService.loadBasketFromDb();
        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));

        setTimeout(() => {
          this.router.navigate(['/landing/map']);
        }, 2500);
      } else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  isSuccess(event: boolean): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.userManagementService.userAddressList(this.currentUser.id).subscribe(result => {
      if (result.isSuccess) {
        let i = 0;
        result.data.forEach(item => {
          if (i === 0) {
            item.selected = true;
            this.selectedAddressId = item.id;
            this.selectedAddress = item;
          } else {
            item.selected = false;
          }
          i++;
        });

        this.addresses = result.data;
      } else {
        this.addresses = [];
      }
    });
  }

  openEditModal(id: number): void {
    this.editSaveComponent.openModal(this.currentUser.id, id);
  }

  openSaveModal(): void {
    this.editSaveComponent.openModal(this.currentUser.id, undefined);
  }

  selectAddress(id: number): void {
    this.addresses.forEach(item => {
      item.selected = item.id === id;

      if (item.id === id) {
        this.selectedAddress = item;
      }
    });

    this.selectedAddressId = id;
  }

  setActiveTabId(tabId: RegistrationTabsType): void {
    this.activeTabId = tabId;
  }
}
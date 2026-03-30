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

export type RegistrationTabsType =
  | 'address'
  | 'payment';

@Component({
  selector: 'app-order-completion',
  templateUrl: './order-completion.component.html',
  styleUrls: ['./order-completion.component.scss'],
})
export class OrderCompletionComponent implements OnInit, OnDestroy {
  @ViewChild('editSaveComponent') private editSaveComponent: AddressEditSaveComponent;

  invoiceAddresses: UserAddressModel[] = [];
  selectedInvoiceAddress: UserAddressModel;
  selectedInvoiceAddressId: number;

  activeTabId: RegistrationTabsType = "address";

  currentUserIsExist: boolean = false;
  currentUser: any;

  header: string = "Sepetim";
  basket: BasketModel[] = [];
  basketFromStorage: BasketModel[] = [];
  numberOfItem: number = 0;
  totalPrice: number = 0;

  
  constructor(
    private authService: AuthService, 
    private basketService: BasketService,
    private orderManagementService: OrderManagementService,
    private alertService: AlertService,
    private router: Router,
    private translate: TranslateService,
    private userManagementService: UserManagementService,) {
  }

  confirmOrder() {
    
    if(this.selectedInvoiceAddressId > 0) {
      let data: OrderModel = { id: 0, basketId: this.basketFromStorage[0].id, userId: this.currentUser.id, price: this.totalPrice, invoiceAddressId: this.selectedInvoiceAddressId};

      this.orderManagementService.save(data).subscribe(result => {
        if(result.isSuccess) {
          this.basketService.loadBasketFromDb();
          this.alertService.createAlert("success", result.message);

          setTimeout(() => {
            this.router.navigate(['/ordermanagement/' + result.data.id]);
          }, 2500);
        }
        else{
            this.alertService.createAlert("danger", result.message);
        }
      })
    }
    else{
      this.alertService.createAlert("warning", "Lütfen teslimat ve fatura adresi seçiniz!");
    }
  }

  isSuccess(event: any) {
    this.loadInvoiceAddresses();
  }


  loadInvoiceAddresses() {
    this.userManagementService.userAddressList(this.currentUser.id).subscribe(result => {
      if(result.isSuccess) {
        let i = 0;
        result.data.forEach(item => {
          if(i == 0) {
            item.selected = true;
            this.selectedInvoiceAddressId = item.id;
            this.selectedInvoiceAddress = item;
          }
          else{
            item.selected = false;
          }

          i++;
        })

        this.invoiceAddresses = result.data;
      }
      else{
        this.invoiceAddresses = [];
      }
    })
  }

  ngOnDestroy(): void {
  }

  ngOnInit(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.currentUserIsExist = true;
      this.currentUser = currentUser;
      this.basketService.loadBasketFromDb();
    }
    else{
      this.currentUserIsExist = false;
    }

    this.loadInvoiceAddresses();

    this.basketService.basket$.subscribe(result => {
      if(result) {
        this.numberOfItem = 0;
        this.totalPrice = 0;
        this.basket = [];

        this.basketFromStorage = result;

        result.forEach(item => {
          this.numberOfItem += 1;
          this.totalPrice += item.product?.price!;
          
          if(this.basket.length == 0) {
            this.basket.push({id: 0, userId: 0, productId: item.product?.id, product: item.product, numberOf: 1, isDeleted: item.isDeleted, totalPrice: item.product?.price});
          }
          else{
            let itemInBasket = this.basket.filter(f => f.productId == item.productId);
            if(itemInBasket.length > 0) {
              if(itemInBasket[0].numberOf) { itemInBasket[0].numberOf += 1; }
              if(itemInBasket[0].totalPrice) { itemInBasket[0].totalPrice += item.product?.price!; }
            }
            else{
              this.basket.push({id: 0, userId: 0, productId: item.product?.id, product: item.product, numberOf: 1, isDeleted: item.isDeleted, totalPrice: item.product?.price});
            }
          }
        })
      }
    });
  }

  openEditModal(id: number) {
    this.editSaveComponent.openModal(this.currentUser.id, id);
  }

  openSaveModal() {
    this.editSaveComponent.openModal(this.currentUser.id, undefined);
  }

  selectInvoiceAddress(id: number) {
    this.invoiceAddresses.forEach(item => {
      if(item.id == id) {
        item.selected = true;
        this.selectedInvoiceAddress = item;
      }

      if(item.id == this.selectedInvoiceAddressId) {
        item.selected = false;
      }
    })

    this.selectedInvoiceAddressId = id;

  }

  setActiveTabId(tabId: RegistrationTabsType) {
    this.activeTabId = tabId;
  }
}

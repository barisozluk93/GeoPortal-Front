import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ConfirmationComponent } from '../confirmation/confirmation.component';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { BasketManagementService } from './basket-management.service';
import { BasketModel } from './models/basket.model';
import { Router } from '@angular/router';
import { AuthService } from '../auth';
import { OrderManagementService } from '../order-management/order-management.service';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-basket-management',
  templateUrl: './basket-management.component.html',
  styleUrls: ['./basket-management.component.scss'],
})
export class BasketManagementComponent implements OnInit, OnDestroy {

  @ViewChild('deleteConfirmationComponent') private deleteConfirmationComponent: ConfirmationComponent;

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
    private basketManagementService: BasketManagementService,
    private orderManagementService: OrderManagementService,
    private alertService: AlertService,
    private router: Router,
    private translate: TranslateService) {
  }

  confirmBasket() {
    if (!this.currentUserIsExist) {
      this.router.navigate(['/auth/login']);
    }
    else {
      this.router.navigate(['/ordercompletion']);
    }
  }

  delete(event: number) {
    if (this.currentUserIsExist) {
      var id = this.basketFromStorage.filter(f => f.productId == event)[0].id;

      this.basketManagementService.deleteAll(id, event).subscribe(result => {
        if (result.isSuccess) {
          this.basketService.loadBasketFromDb();
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        }
        else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      })
    }
    else {
      let temp: BasketModel[] = [];
      this.basketFromStorage.forEach(item => {
        if (item.productId != event) {
          temp.push(item);
        }
      })

      this.basketService.setBasket(temp);
    }
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
    else {
      this.currentUserIsExist = false;
    }

    this.basketService.basket$.subscribe(result => {
      if (result) {
        this.numberOfItem = 0;
        this.totalPrice = 0;
        this.basket = [];

        this.basketFromStorage = result;

        result.forEach(item => {
          this.basket.push({ id: 0, userId: 0, productId: item.product?.id, product: item.product, numberOf: 1, isDeleted: item.isDeleted, totalPrice: item.product?.price });
        })
      }
    });
  }

  openDeleteModal(id: number | undefined) {
    var deleteText = "";
    this.translate.get('DELETE').subscribe((translation) => {
      deleteText = translation
    })
    this.deleteConfirmationComponent.openModal(deleteText, id);
  }

  routeToShopping() {
    this.router.navigate(['/landing/marketplace']);
  }
}

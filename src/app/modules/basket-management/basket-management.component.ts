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
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-basket-management',
  templateUrl: './basket-management.component.html',
  styleUrls: ['./basket-management.component.scss'],
})
export class BasketManagementComponent implements OnInit, OnDestroy {

  @ViewChild('deleteConfirmationComponent') private deleteConfirmationComponent!: ConfirmationComponent;

  currentUserIsExist: boolean = false;
  currentUser: any;

  header: string = "Sepetim";
  basket: BasketModel[] = [];
  basketFromStorage: BasketModel[] = [];
  numberOfItem: number = 0;
  totalPrice: number = 0;

  private sub!: Subscription;

  constructor(
    private authService: AuthService,
    private basketService: BasketService,
    private basketManagementService: BasketManagementService,
    private orderManagementService: OrderManagementService,
    private alertService: AlertService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      this.currentUserIsExist = true;
      this.currentUser = currentUser;
      this.basketService.loadBasketFromDb();
    } else {
      this.currentUserIsExist = false;
    }

    this.sub = this.basketService.basket$.subscribe(result => {
      if (!result) return;

      this.numberOfItem = 0;
      this.totalPrice = 0;
      this.basket = [];

      this.basketFromStorage = result;

      result.forEach(item => {
        const product = item.product;

        const price = Number(product?.price ?? item.totalPrice ?? 0);
        const count = Number(item.numberOf ?? 1);

        const basketItem: BasketModel = {
          id: item.id ?? 0,
          userId: item.userId ?? 0,
          productId: item.productId ?? product?.id,
          product: product,
          numberOf: count,
          isDeleted: item.isDeleted,
          totalPrice: price * count
        };

        this.basket.push(basketItem);

        // 🔥 FIX
        this.numberOfItem += count;
        this.totalPrice += basketItem.totalPrice ?? 0;
      });
    });
  }

  confirmBasket() {
    if (!this.currentUserIsExist) {
      this.router.navigate(['/auth/login']);
    } else {
      this.router.navigate(['/ordercompletion']);
    }
  }

  delete(event: number) {
    if (this.currentUserIsExist) {
      const item = this.basketFromStorage.find(f => f.productId == event);
      if (!item) return;

      this.basketManagementService.deleteAll(item.id, event).subscribe(result => {
        if (result.isSuccess) {
          this.basketService.loadBasketFromDb();
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        } else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      });
    } else {
      const temp = this.basketFromStorage.filter(item => item.productId != event);
      this.basketService.setBasket(temp);
    }
  }

  openDeleteModal(id: number | undefined) {
    let deleteText = "";
    this.translate.get('DELETE').subscribe((translation) => {
      deleteText = translation;
    });

    this.deleteConfirmationComponent.openModal(deleteText, id);
  }

  routeToShopping() {
    this.router.navigate(['/landing/marketplace']);
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
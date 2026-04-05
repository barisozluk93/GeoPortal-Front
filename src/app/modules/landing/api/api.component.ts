import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { AuthService } from '../../auth';
import { BasketManagementService } from '../../basket-management/basket-management.service';
import { BasketModel } from '../../basket-management/models/basket.model';
import { Router } from '@angular/router';
import { ProductModel } from '../marketplace/models/product.model';
import { environment } from 'src/environments/environment';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-api',
  templateUrl: './api.component.html',
  styleUrl: './api.component.scss'
})
export class ApiComponent {
  readonly basketManagementService = inject(BasketManagementService);
  readonly basketService = inject(BasketService);
  readonly authService = inject(AuthService);
  readonly alertService = inject(AlertService);
  readonly router = inject(Router)
  readonly translate = inject(TranslateService);

  baseUrl: string = environment.appUrl;

  routeToDoc() {
    this.router.navigate(['/landing/documentation']);
  }

  onBuyNow() {
    var currentUser = this.authService.currentUserValue;

    if (currentUser) {
      let data: BasketModel = { id: 0, userId: currentUser.id, productId: 1, isDeleted: false, product: undefined, totalPrice: undefined, numberOf: undefined };

      this.basketManagementService.save(data).subscribe(result => {
        if (result.isSuccess) {
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
          this.basketService.loadBasketFromDb();
        }
        else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      })
    }
    else {
      var product: ProductModel = { categoryId: 2, id: 1, name: "API Key", price: 1000, isDeleted: false, userId: 0 };
      var basket = JSON.parse(localStorage.getItem("basket") as string) as BasketModel[];

      if (basket) {
        if (basket.length < 15) {
          basket.push({ id: 0, userId: 0, product: product, productId: product.id, isDeleted: false, numberOf: 0, totalPrice: 0 });
        }
        else {
          this.alertService.createAlert("warning", this.translate.instant('MESSAGES.LOGIN_REQUIRED_FOR_MORE_PRODUCTS'));
        }
      }
      else {
        basket = [{ id: 0, userId: 0, product: product, productId: product.id, isDeleted: false, numberOf: 0, totalPrice: 0 }];
      }

      this.basketService.setBasket(basket);
    }
  }
}

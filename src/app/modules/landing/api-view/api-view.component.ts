import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslationService } from 'src/app/services/translation.service';
import { MapService } from '../map-view/map-view.service';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { AuthService } from '../../auth';
import { BasketManagementService } from '../../basket-management/basket-management.service';
import { BasketModel } from '../../basket-management/models/basket.model';
import { ProductModel } from '../../product-management/models/product.model';

@Component({
  selector: 'app-api-view',
  templateUrl: './api-view.component.html',
  styleUrl: './api-view.component.css'
})
export class ApiViewComponent {
  readonly mapViewService = inject(MapService);
  readonly basketManagementService = inject(BasketManagementService);
  readonly basketService = inject(BasketService);
  readonly authService = inject(AuthService);
  readonly alertService = inject(AlertService);
  readonly i18n = inject(TranslationService);

  t(key: any): string { return this.i18n.t(key); }

  onBuyNow() {
    // Implement the logic to redirect to the purchase page or open a modal
    console.log('Buy Now button clicked');

    var currentUser = this.authService.currentUserValue;

    if (currentUser) {
      let data: BasketModel = { id: 0, userId: currentUser.id, productId: 1, isDeleted: false, product: undefined, totalPrice: undefined, numberOf: undefined };

      this.basketManagementService.save(data).subscribe(result => {
        if (result.isSuccess) {
          this.alertService.createAlert("success", result.message);
          this.basketService.loadBasketFromDb();
        }
        else {
          this.alertService.createAlert("danger", result.message);
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
          this.alertService.createAlert("warning", "Daha fazla ürün eklemek için lütfen giriş yapınız!");
        }
      }
      else {
        basket = [{ id: 0, userId: 0, product: product, productId: product.id, isDeleted: false, numberOf: 0, totalPrice: 0 }];
      }

      this.basketService.setBasket(basket);
    }
  }
}

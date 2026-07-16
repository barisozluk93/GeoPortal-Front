import { AfterViewInit, Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { environment } from 'src/environments/environment';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';

import { AuthService } from '../../auth';
import { BasketManagementService } from '../../basket-management/basket-management.service';
import {
  BasketModel,
  BasketProcessingOption,
} from '../../basket-management/models/basket.model';
import { ProductModel } from '../marketplace/models/product.model';

@Component({
  selector: 'app-api',
  templateUrl: './api.component.html',
  styleUrl: './api.component.scss',
})
export class ApiComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroSection')
  heroSection!: ElementRef<HTMLElement>;

  hideScrollCue = false;

  private observer!: IntersectionObserver;

  readonly basketManagementService = inject(BasketManagementService);
  readonly basketService = inject(BasketService);
  readonly authService = inject(AuthService);
  readonly alertService = inject(AlertService);
  readonly router = inject(Router);
  readonly translate = inject(TranslateService);

  readonly baseUrl: string = environment.appUrl;

  private readonly apiProductId = 1;
  private readonly apiProductPrice = 1000;
  private readonly apiAoiId = 'api-services';
  private readonly apiAoiName = 'API Servisleri';

  routeToDoc(): void {
    this.router.navigate(['/landing/documentation']);
  }

  onBuyNow(): void {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      this.addToAuthenticatedBasket(Number(currentUser.id));
      return;
    }

    this.addToGuestBasket();
  }

  private addToAuthenticatedBasket(userId: number): void {
    const data = this.createApiBasketItem(userId);

    this.basketManagementService.save(data).subscribe({
      next: result => {
        if (!result.isSuccess) {
          this.showError();
          return;
        }

        this.alertService.createAlert(
          'success',
          this.translate.instant('MESSAGES.ADD_TO_CART_SUCCESS')
        );

        this.basketService.loadBasketFromDb();
      },
      error: error => {
        console.error('API ürünü sepete eklenemedi:', error);
        this.showError();
      },
    });
  }

  private addToGuestBasket(): void {
    const basket = this.readGuestBasket();

    if (basket.length >= 15) {
      this.alertService.createAlert(
        'warning',
        this.translate.instant('MESSAGES.LOGIN_REQUIRED_FOR_MORE_PRODUCTS')
      );
      return;
    }

    const existingItem = basket.find(
      item =>
        item.productId === this.apiProductId &&
        item.aoiId === this.apiAoiId &&
        item.itemType === 'processingService'
    );

    if (existingItem) {
      const currentCount = Math.max(1, Number(existingItem.numberOf ?? 1));
      const newCount = currentCount + 1;

      existingItem.numberOf = newCount;
      existingItem.baseTotalPrice = this.apiProductPrice;
      existingItem.processingTotalPrice = 0;
      existingItem.calculatedTotalPrice = this.apiProductPrice * newCount;
      existingItem.totalPrice = existingItem.calculatedTotalPrice;
    } else {
      basket.push(this.createApiBasketItem(0));
    }

    this.basketService.setBasket([...basket]);

    this.alertService.createAlert(
      'success',
      this.translate.instant('MESSAGES.ADD_TO_CART_WITHOUT_LOGIN_SUCCESS')
    );
  }

  private createApiBasketItem(userId: number): BasketModel {
    const product = this.createApiProduct(userId);
    const processingOptions: BasketProcessingOption[] = [];

    return {
      id: 0,
      userId,
      productId: product.id,
      product,
      isDeleted: false,
      numberOf: 1,
      totalPrice: this.apiProductPrice,

      aoiId: this.apiAoiId,
      aoiName: this.apiAoiName,
      aoiWkt: null,
      requestWkt: null,
      intersectionWkt: null,

      requestAreaKm2: 1,
      unitPrice: this.apiProductPrice,
      baseTotalPrice: this.apiProductPrice,

      processingOptions,
      processingTotalPrice: 0,
      calculatedTotalPrice: this.apiProductPrice,

      itemType: 'processingService',
    };
  }

  private createApiProduct(userId: number): ProductModel {
    return {
      id: this.apiProductId,
      categoryId: 2,
      name: 'API Key',
      price: this.apiProductPrice,
      priceStr: `₺${this.apiProductPrice}`,
      currency: 'TRY',
      isDeleted: false,
      isCustomArea: false,
      userId,
      sourceLabel: 'API Servisi',
      provider: 'API',
    };
  }

  private readGuestBasket(): BasketModel[] {
    try {
      const storedBasket = localStorage.getItem('basket');

      if (!storedBasket) {
        return [];
      }

      const parsedBasket = JSON.parse(storedBasket);

      return Array.isArray(parsedBasket)
        ? (parsedBasket as BasketModel[])
        : [];
    } catch (error) {
      console.error('Yerel sepet okunamadı:', error);
      return [];
    }
  }

  private showError(): void {
    this.alertService.createAlert(
      'danger',
      this.translate.instant('MESSAGES.ERROR')
    );
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        // Hero görünmeye devam ediyorsa buton görünür.
        this.hideScrollCue = entry.intersectionRatio < 0.8;
      },
      {
        threshold: [0, 0.8, 1]
      }
    );

    this.observer.observe(this.heroSection.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

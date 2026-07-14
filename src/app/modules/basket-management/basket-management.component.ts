import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ConfirmationComponent } from '../confirmation/confirmation.component';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { BasketManagementService } from './basket-management.service';
import { BasketModel, BasketProcessingOption } from './models/basket.model';
import { Router } from '@angular/router';
import { AuthService } from '../auth';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

interface AoiBasketItem extends BasketModel {
  isApiKey: boolean;
  requestAreaKm2: number;
  unitPrice: number;
  baseTotalPrice: number;
  processingOptions: BasketProcessingOption[];
  processingTotalPrice: number;
  displayTotalPrice: number;
  intersectionWkt: string | null;
}

interface AoiBasketGroup {
  aoiId: string;
  aoiName: string;
  aoiWkt: string | null;
  products: AoiBasketItem[];
  totalPrice: number;
}

@Component({
  selector: 'app-basket-management',
  templateUrl: './basket-management.component.html',
  styleUrls: ['./basket-management.component.scss'],
})
export class BasketManagementComponent implements OnInit, OnDestroy {
  @ViewChild('deleteConfirmationComponent')
  private deleteConfirmationComponent!: ConfirmationComponent;

  currentUserIsExist = false;
  currentUser: any;
  header = 'Sepetim';

  basket: BasketModel[] = [];
  basketFromStorage: BasketModel[] = [];
  aoiGroups: AoiBasketGroup[] = [];
  serviceItems: AoiBasketItem[] = [];
  serviceTotalPrice = 0;
  numberOfItem = 0;
  totalPrice = 0;

  private sub?: Subscription;
  private readonly numberFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  private readonly moneyFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  constructor(
    private authService: AuthService,
    private basketService: BasketService,
    private basketManagementService: BasketManagementService,
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
      this.currentUser = null;
    }

    this.sub = this.basketService.basket$.subscribe({
      next: result => this.buildAoiBasket(result ?? []),
      error: error => {
        console.error('Sepet bilgileri okunamadı:', error);
        this.resetBasket();
        this.alertService.createAlert(
          'danger',
          this.translate.instant('MESSAGES.ERROR')
        );
      },
    });
  }

  private buildAoiBasket(result: BasketModel[]): void {
    this.resetBasket();
    this.basketFromStorage = result;

    const groupMap = new Map<string, AoiBasketGroup>();

    result.forEach((item, index) => {
      const product = item.product as any;
      const itemData = item as any;
      const count = this.toPositiveNumber(item.numberOf, 1);
      const requestAreaKm2 = this.toNonNegativeNumber(
        itemData.requestAreaKm2 ?? product?.requestAreaKm2,
        0
      );
      const unitPrice = this.toNonNegativeNumber(
        itemData.unitPrice ?? product?.unitPrice ?? product?.price,
        0
      );
      const baseTotalPrice = this.toNonNegativeNumber(
        itemData.baseTotalPrice ?? product?.baseTotalPrice,
        requestAreaKm2 * unitPrice
      );
      const processingOptions = this.resolveProcessingOptions(
        itemData.processingOptions ?? product?.processingOptions,
        product,
        requestAreaKm2
      );
      const processingTotalPrice = this.toNonNegativeNumber(
        itemData.processingTotalPrice ?? product?.processingTotalPrice,
        processingOptions.reduce((sum, option) => sum + option.totalPrice, 0)
      );
      const displayTotalPrice = this.toNonNegativeNumber(
        itemData.calculatedTotalPrice ??
        product?.calculatedTotalPrice ??
        item.totalPrice,
        (baseTotalPrice + processingTotalPrice) * count
      );

      const isApiKey = this.isApiKeyProduct(item, product);

      const basketItem: AoiBasketItem = {
        ...item,
        isApiKey,
        id: item.id ?? 0,
        userId: item.userId ?? 0,
        productId: item.productId ?? product?.id,
        product,
        numberOf: count,
        totalPrice: displayTotalPrice,
        requestAreaKm2,
        unitPrice,
        baseTotalPrice,
        processingOptions,
        processingTotalPrice,
        displayTotalPrice,
        intersectionWkt:
          itemData.intersectionWkt ??
          itemData.requestWkt ??
          product?.intersectionWkt ??
          product?.requestWkt ??
          null,
      };

      this.basket.push(basketItem);
      this.numberOfItem += count;
      this.totalPrice += displayTotalPrice;

      if (isApiKey) {
        this.serviceItems.push(basketItem);
        this.serviceTotalPrice += displayTotalPrice;
        return;
      }

      const aoiId = this.resolveAoiId(item, product, index);
      let group = groupMap.get(aoiId);

      if (!group) {
        group = {
          aoiId,
          aoiName: this.resolveAoiName(item, product),
          aoiWkt: this.resolveAoiWkt(item, product),
          products: [],
          totalPrice: 0,
        };
        groupMap.set(aoiId, group);
      }

      group.products.push(basketItem);
      group.totalPrice += displayTotalPrice;
    });

    this.aoiGroups = Array.from(groupMap.values());
  }

  private isApiKeyProduct(item: BasketModel, product: any): boolean {
    const productName = String(product?.name ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR');

    return (
      Number(item.productId ?? product?.id) === 1 ||
      productName === 'api key' ||
      productName === 'apikey'
    );
  }

  get groupCount(): number {
    return this.aoiGroups.length + (this.serviceItems.length > 0 ? 1 : 0);
  }

  private resolveProcessingOptions(
    rawOptions: unknown,
    product: any,
    requestAreaKm2: number
  ): BasketProcessingOption[] {
    if (Array.isArray(rawOptions)) {
      return rawOptions
        .map((option: any): BasketProcessingOption | null => {
          const key = this.normalizeProcessingOptionKey(
            option?.key ?? option?.name
          );

          if (!key) {
            return null;
          }

          const unitPrice = this.toNonNegativeNumber(option?.unitPrice, 0);
          const areaKm2 = this.toNonNegativeNumber(
            option?.areaKm2,
            requestAreaKm2
          );

          return {
            key,
            name: String(
              option?.name ?? this.getProcessingOptionName(key)
            ),
            unitPrice,
            areaKm2,
            totalPrice: this.toNonNegativeNumber(
              option?.totalPrice,
              areaKm2 * unitPrice
            ),
          };
        })
        .filter(
          (option): option is BasketProcessingOption => option !== null
        );
    }

    const options: BasketProcessingOption[] = [];

    this.addProcessingOptionIfSelected(
      options,
      product?.isOrthorectified,
      'orthorectification',
      250,
      requestAreaKm2
    );

    this.addProcessingOptionIfSelected(
      options,
      product?.isPansharpened,
      'pansharpening',
      180,
      requestAreaKm2
    );

    this.addProcessingOptionIfSelected(
      options,
      product?.isNVDIAnalysis,
      'ndvi',
      120,
      requestAreaKm2
    );

    this.addProcessingOptionIfSelected(
      options,
      product?.isClassified,
      'classification',
      300,
      requestAreaKm2
    );

    return options;
  }

  private normalizeProcessingOptionKey(
    value: unknown
  ): BasketProcessingOption['key'] | null {
    const normalized = String(value ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[\s_-]+/g, '');

    switch (normalized) {
      case 'orthorectification':
      case 'ortorektifikasyon':
        return 'orthorectification';

      case 'pansharpening':
        return 'pansharpening';

      case 'ndvi':
      case 'ndvianalizi':
      case 'nvdi':
      case 'nvdianalizi':
        return 'ndvi';

      case 'classification':
      case 'siniflama':
        return 'classification';

      default:
        return null;
    }
  }

  private getProcessingOptionName(
    key: BasketProcessingOption['key']
  ): string {
    switch (key) {
      case 'orthorectification':
        return 'Ortorektifikasyon';
      case 'pansharpening':
        return 'Pansharpening';
      case 'ndvi':
        return 'NDVI Analizi';
      case 'classification':
        return 'Sınıflama';
    }
  }

  private addProcessingOptionIfSelected(
    options: BasketProcessingOption[],
    selected: unknown,
    key: BasketProcessingOption['key'],
    unitPrice: number,
    requestAreaKm2: number
  ): void {
    if (selected !== true) {
      return;
    }

    options.push({
      key,
      name: this.getProcessingOptionName(key),
      unitPrice,
      areaKm2: requestAreaKm2,
      totalPrice: requestAreaKm2 * unitPrice,
    });
  }

  formatArea(value: number): string {
    return this.numberFormatter.format(Number(value ?? 0));
  }

  formatMoney(value: number): string {
    return this.moneyFormatter.format(Number(value ?? 0));
  }

  private resolveAoiId(item: BasketModel, product: any, index: number): string {
    const value = (item as any)?.aoiId ?? product?.aoiId ?? product?.requestHash;
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }

    const wkt = this.resolveAoiWkt(item, product);
    return wkt ? `aoi-${this.createSimpleHash(wkt)}` : `legacy-${index}`;
  }

  private resolveAoiName(item: BasketModel, product: any): string {
    return String(
      (item as any)?.aoiName ?? product?.aoiName ?? product?.sourceLabel ?? 'İlgi Alanı'
    ).trim();
  }

  private resolveAoiWkt(item: BasketModel, product: any): string | null {
    const value = (item as any)?.aoiWkt ?? product?.aoiWkt ?? null;
    return value ? String(value).trim() : null;
  }

  private createSimpleHash(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  private toPositiveNumber(value: unknown, fallback: number): number {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
  }

  private toNonNegativeNumber(value: unknown, fallback: number): number {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
  }

  private resetBasket(): void {
    this.numberOfItem = 0;
    this.totalPrice = 0;
    this.basket = [];
    this.basketFromStorage = [];
    this.aoiGroups = [];
    this.serviceItems = [];
    this.serviceTotalPrice = 0;
  }

  confirmBasket(): void {
    this.router.navigate([
      this.currentUserIsExist ? '/ordercompletion' : '/auth/login',
    ]);
  }

  delete(productId: number): void {
    if (this.currentUserIsExist) {
      const item = this.basketFromStorage.find(x => x.productId === productId);
      if (!item) return;

      this.basketManagementService.deleteAll(item.id, productId).subscribe({
        next: result => {
          if (result.isSuccess) {
            this.basketService.loadBasketFromDb();
            this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
          } else {
            this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
          }
        },
        error: error => {
          console.error('Sepet ürünü silinemedi:', error);
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        },
      });
      return;
    }

    const index = this.basketFromStorage.findIndex(x => x.productId === productId);
    if (index < 0) return;
    const updated = [...this.basketFromStorage];
    updated.splice(index, 1);
    this.basketService.setBasket(updated);
  }

  openDeleteModal(id: number | undefined): void {
    if (id === undefined || id === null) return;
    this.deleteConfirmationComponent.openModal(this.translate.instant('DELETE'), id);
  }

  routeToShopping(): void {
    this.router.navigate(['/landing/map']);
  }

  trackByAoi(_: number, group: AoiBasketGroup): string {
    return group.aoiId;
  }

  trackByBasketItem(index: number, item: AoiBasketItem): string {
    return `${item.id ?? 0}-${item.productId ?? 0}-${index}`;
  }

  trackByProcessingOption(_: number, option: BasketProcessingOption): string {
    return option.key;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

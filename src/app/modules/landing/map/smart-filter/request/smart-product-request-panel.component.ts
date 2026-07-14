import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ProductModel } from '../../../marketplace/models/product.model';

export type SmartProductRequestProduct = ProductModel & {
};

@Component({
  selector: 'app-smart-product-request-panel',
  templateUrl: './smart-product-request-panel.component.html',
  styleUrls: ['./smart-product-request-panel.component.scss'],
})
export class SmartProductRequestPanelComponent implements OnChanges {
  @Input() areaM2 = 0;
  @Input() wkt: string | null = null;
  @Input() loading = false;

  @Output() closeClicked = new EventEmitter<void>();
  @Output() addToCartClicked = new EventEmitter<ProductModel>();

  /**
   * Panel *ngIf ile kapanıp tekrar oluşturulduğunda formun sıfırlanmaması için
   * taslak component instance'ından bağımsız olarak saklanır.
   */
  private static cachedProduct: SmartProductRequestProduct | null = null;
  private static cachedSubmitted = false;

  submitted = SmartProductRequestPanelComponent.cachedSubmitted;

  readonly imageTypes = [
    { label: 'Mono', value: 'mono' },
    { label: 'Stereo', value: 'stereo' },
  ];

  readonly platforms = [
    { label: 'MSP1', value: 'MSP1' },
    { label: 'MSP2', value: 'MSP2' },
    { label: 'MSP3', value: 'MSP3' },
    { label: 'MSP4', value: 'MSP4' },
    { label: 'MSP5', value: 'MSP5' }
  ];

  product: SmartProductRequestProduct = this.getOrCreateCachedProduct();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['areaM2']) {
      this.product.areaKm2 = this.getAreaKm2();
    }

    if (changes['wkt']) {
      this.product.wkt = this.wkt;
    }

    this.persistDraft();
  }

  get formattedArea(): string {
    if (!this.areaM2) return '-';

    return `${this.getAreaKm2().toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} km²`;
  }

  isFormValid(): boolean {
    return !!(
      this.product.imageType &&
      this.product.acquisitionStartDate &&
      this.product.acquisitionEndDate &&
      this.isDateRangeValid() &&
      this.product.cloudRate !== null &&
      this.product.cloudRate !== undefined &&
      this.product.offNadirAngle !== null &&
      this.product.offNadirAngle !== undefined &&
      (
        this.product.isPansharpened ||
        this.product.isOrthorectified ||
        this.product.isNVDIAnalysis ||
        this.product.isClassified
      )
    );
  }

  onStartDateChange(value: string | null): void {
    const startDate = this.toDateInputValue(value);
    const endDate = this.toDateInputValue(this.product.acquisitionEndDate);

    this.product.acquisitionStartDate = startDate;

    // Başlangıç tarihi bitişten sonra seçilirse bitişi aynı tarihe taşı.
    if (startDate && endDate && startDate > endDate) {
      this.product.acquisitionEndDate = startDate;
    }

    this.persistDraft();
  }

  onEndDateChange(value: string | null): void {
    const startDate = this.toDateInputValue(this.product.acquisitionStartDate);
    const endDate = this.toDateInputValue(value);

    this.product.acquisitionEndDate = endDate;

    // Bitiş tarihi başlangıçtan önce seçilirse başlangıcı aynı tarihe taşı.
    if (startDate && endDate && endDate < startDate) {
      this.product.acquisitionStartDate = endDate;
    }

    this.persistDraft();
  }

  isDateRangeValid(): boolean {
    const startDate = this.toDateInputValue(this.product.acquisitionStartDate);
    const endDate = this.toDateInputValue(this.product.acquisitionEndDate);

    return !startDate || !endDate || startDate <= endDate;
  }

  onDraftChanged(): void {
    this.persistDraft();
  }

  addToCart(): void {
    this.submitted = true;
    SmartProductRequestPanelComponent.cachedSubmitted = true;
    this.persistDraft();

    if (!this.isFormValid()) {
      return;
    }

    this.addToCartClicked.emit({
      ...this.product,
      name: this.product.name || 'Custom Satellite Image Request',
      wkt: this.wkt,
      areaKm2: this.getAreaKm2(),
      cloudRate: this.toNumberOrDefault(this.product.cloudRate, 15),
      offNadirAngle: this.toNumberOrDefault(this.product.offNadirAngle, 27),
      isOrthorectified: this.product.isOrthorectified ?? true,
      isPansharpened: this.product.isPansharpened ?? false,
      isClassified: this.product.isClassified ?? false,
      isCustomArea: true,
      isInMarket: false,
      isDeleted: false,
      price: this.product.price ?? 10000,
      currency: this.product.currency || 'TRY',
    } as SmartProductRequestProduct);
  }

  private getOrCreateCachedProduct(): SmartProductRequestProduct {
    if (!SmartProductRequestPanelComponent.cachedProduct) {
      SmartProductRequestPanelComponent.cachedProduct = this.createDefaultProduct();
    }

    return SmartProductRequestPanelComponent.cachedProduct;
  }

  private persistDraft(): void {
    SmartProductRequestPanelComponent.cachedProduct = this.product;
    SmartProductRequestPanelComponent.cachedSubmitted = this.submitted;
  }

  private createDefaultProduct(): SmartProductRequestProduct {
    const product = new ProductModel() as SmartProductRequestProduct;

    product.name = 'Custom Satellite Image Request';
    product.imageId = null;
    product.wkt = this.wkt;
    product.areaKm2 = this.getAreaKm2();

    product.imageType = null;
    product.satellite = null;
    product.acquisitionStartDate = null;
    product.acquisitionEndDate = null;

    product.cloudRate = 15;
    product.offNadirAngle = 27;

    product.isPansharpened = false;
    product.isOrthorectified = true;
    product.isNVDIAnalysis = false;
    product.isClassified = false;

    product.isCustomArea = true;
    product.isInMarket = false;
    product.isDeleted = false;

    product.price = 10000;
    product.currency = 'TRY';

    return product;
  }

  private toDateInputValue(
    value: string | Date | null | undefined
  ): string | null {
    if (!value) return null;

    if (typeof value === 'string') {
      const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      if (datePart) return datePart;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getAreaKm2(): number {
    return this.areaM2 ? this.areaM2 / 1_000_000 : 0;
  }

  private toNumberOrDefault(
    value: number | null | undefined,
    defaultValue: number
  ): number {
    if (value === null || value === undefined || value === ('' as any)) {
      return defaultValue;
    }

    return Number(value);
  }
}

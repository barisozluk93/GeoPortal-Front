import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ProductModel } from '../../../marketplace/models/product.model';

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

  submitted = false;

  imageTypes = [
    { label: 'Mono', value: 'mono' },
    { label: 'Stereo', value: 'stereo' },
  ];

  product: ProductModel = this.createDefaultProduct();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['areaM2']) {
      this.product.areaKm2 = this.getAreaKm2();
    }

    if (changes['wkt']) {
      this.product.wkt = this.wkt;
    }
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
      this.product.cloudRate !== null &&
      this.product.cloudRate !== undefined &&
      this.product.offNadirAngle !== null &&
      this.product.offNadirAngle !== undefined &&
      (this.product.isOrthorectified || this.product.isPansharpened)
    );
  }

  addToCart(): void {
    this.submitted = true;

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
      isCustomArea: true,
      isInMarket: false,
      isDeleted: false,
      price: this.product.price ?? 10000,
      currency: this.product.currency || 'TRY',
    });
  }

  private createDefaultProduct(): ProductModel {
    const product = new ProductModel();

    product.name = 'Custom Satellite Image Request';
    product.imageId = null;
    product.wkt = this.wkt;
    product.areaKm2 = this.getAreaKm2();

    product.imageType = null;
    product.acquisitionStartDate = null;
    product.acquisitionEndDate = null;

    product.cloudRate = 15;
    product.offNadirAngle = 27;

    product.isOrthorectified = true;
    product.isPansharpened = false;
    product.isClassified = false;

    product.isCustomArea = true;
    product.isInMarket = false;
    product.isDeleted = false;

    product.price = 10000;
    product.currency = 'TRY';

    return product;
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
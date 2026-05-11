import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

export type NewImageryOrderRequest = {
  imageType: 'mono' | 'stereo' | '';
  maxCloudRate: number | null;
  maxOffNadir: number | null;
  orthoRectified: boolean;
  panSharpen: boolean;
  classified: boolean;
  areaKm2: number;
  pricePerSquareKm: number;
  totalPrice: number;
};

@Component({
  selector: 'app-map-new-imagery-order-panel',
  templateUrl: './map-new-imagery-order-panel.component.html',
  styleUrls: ['./map-new-imagery-order-panel.component.scss']
})
export class MapNewImageryOrderPanelComponent implements OnChanges {
  @Input() open = false;
  @Input() hasGeometry = false;
  @Input() areaKm2 = 0;
  @Input() pricePerSquareKm = 100;
  @Input() currency = '₺';

  @Output() close = new EventEmitter<void>();
  @Output() addToCart = new EventEmitter<NewImageryOrderRequest>();

  imageType: 'mono' | 'stereo' | '' = 'mono';
  maxCloudRate: number | null = null;
  maxOffNadir: number | null = null;
  orthoRectified = false;
  panSharpen = false;
  classified = false;

  touched = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.touched = false;
    }
  }

  get normalizedAreaKm2(): number {
    const value = Number(this.areaKm2);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  get normalizedPricePerSquareKm(): number {
    const value = Number(this.pricePerSquareKm);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  get totalPrice(): number {
    const basePrice = this.normalizedAreaKm2 * this.normalizedPricePerSquareKm;
    return Number(basePrice.toFixed(2));
  }

  get formattedArea(): string {
    if (!this.normalizedAreaKm2) return '-';

    return `${this.normalizedAreaKm2.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} km²`;
  }

  get formattedUnitPrice(): string {
    return `${this.normalizedPricePerSquareKm.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${this.currency}/km²`;
  }

  get formattedTotalPrice(): string {
    return `${this.totalPrice.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${this.currency}`;
  }

  get canSubmit(): boolean {
    return !!this.imageType && this.hasGeometry && this.normalizedAreaKm2 > 0 &&
      this.isNumberValid(this.maxCloudRate, 0, 100) &&
      this.isNumberValid(this.maxOffNadir, 0, 90);
  }

  submit(): void {
    this.touched = true;

    if (!this.canSubmit) {
      return;
    }

    this.addToCart.emit({
      imageType: this.imageType,
      maxCloudRate: this.maxCloudRate,
      maxOffNadir: this.maxOffNadir,
      orthoRectified: this.orthoRectified,
      panSharpen: this.panSharpen,
      classified: this.classified,
      areaKm2: this.normalizedAreaKm2,
      pricePerSquareKm: this.normalizedPricePerSquareKm,
      totalPrice: this.totalPrice
    });
  }

  reset(): void {
    this.imageType = 'mono';
    this.maxCloudRate = null;
    this.maxOffNadir = null;
    this.orthoRectified = false;
    this.panSharpen = false;
    this.classified = false;
    this.touched = false;
  }

  private isNumberValid(value: number | null, min: number, max: number): boolean {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return true;
    return Number(value) >= min && Number(value) <= max;
  }
}

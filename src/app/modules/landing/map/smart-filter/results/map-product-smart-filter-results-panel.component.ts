import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductSmartFilterResult } from '../models/product-smart-filter.model';

@Component({
  selector: 'app-map-product-smart-filter-results-panel',
  templateUrl: './map-product-smart-filter-results-panel.component.html',
  styleUrls: ['./map-product-smart-filter-results-panel.component.scss']
})
export class MapProductSmartFilterResultsPanelComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() results: ProductSmartFilterResult[] = [];
  @Input() selectedProductId: number | null = null;
  @Input() cartItems: ProductSmartFilterResult[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() selectProduct = new EventEmitter<ProductSmartFilterResult>();
  @Output() addToCart = new EventEmitter<ProductSmartFilterResult>();

  @Input() canViewAddToCartFn: ((item: ProductSmartFilterResult) => boolean) | null = null;

  canViewAddToCart(item: ProductSmartFilterResult): boolean {
    return this.canViewAddToCartFn ? this.canViewAddToCartFn(item) : true;
  }

  trackByProduct(index: number, item: ProductSmartFilterResult): number | string {
    return item?.id ?? item?.imageId ?? item?.name ?? index;
  }

  isSelected(item: ProductSmartFilterResult): boolean {
    return this.selectedProductId === item?.id;
  }

  isInCart(item: ProductSmartFilterResult): boolean {
    return this.cartItems.some((product) => product?.id === item?.id);
  }

  getProductTitle(item: ProductSmartFilterResult): string {
    return item?.name || item?.imageId || '-';
  }

  getProductSubtitle(item: ProductSmartFilterResult): string {
    return [item?.provider, item?.sensorMode].filter(Boolean).join(' • ') || '-';
  }

  getProductPrice(item: ProductSmartFilterResult): string {
    const rawItem = item as ProductSmartFilterResult & {
      price?: number | string | null;
      unitPrice?: number | string | null;
      totalPrice?: number | string | null;
      currency?: string | null;
    };

    const price = rawItem.totalPrice ?? rawItem.price ?? rawItem.unitPrice;
    const currency = rawItem.currency || '₺';

    if (price === null || price === undefined || price === '') {
      return '-';
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice)) {
      return `${price} ${currency}`.trim();
    }

    return `${numericPrice.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${currency}`;
  }

  onAddToCart(event: MouseEvent, item: ProductSmartFilterResult): void {
    event.stopPropagation();
    this.addToCart.emit(item);
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductModel } from '../models/product.model';

@Component({
  selector: 'app-marketplace-detail-drawer',
  templateUrl: './marketplace-detail-drawer.component.html',
  styleUrls: ['./marketplace-detail-drawer.component.scss']
})
export class MarketplaceDetailDrawerComponent {
  @Input() selectedItem: ProductModel | null = null;
  @Input() detailLoading = false;
  @Input() detailErrorMessage = '';

  @Input() canViewAddToCartFn: (item: ProductModel) => boolean = () => true;
  @Input() getClassTagClassFn: (name: string | undefined | null) => string = () => 'class-tag--default';

  @Output() close = new EventEmitter<void>();
  @Output() addToCartClicked = new EventEmitter<ProductModel>();

  onClose(): void {
    this.close.emit();
  }

  onAddToCart(item: ProductModel): void {
    this.addToCartClicked.emit(item);
  }

  canViewAddToCart(item: ProductModel): boolean {
    return this.canViewAddToCartFn(item);
  }

  getClassTagClass(name: string | undefined | null): string {
    return this.getClassTagClassFn(name);
  }
}
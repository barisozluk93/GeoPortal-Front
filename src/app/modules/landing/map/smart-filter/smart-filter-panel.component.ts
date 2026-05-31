import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ProductSmartFilterRequest,
  ProductSmartFilterResult,
} from './models/product-smart-filter.model';

type AreaUnit = 'km2' | 'm2' | 'ha' | 'da';

@Component({
  selector: 'app-smart-filter-panel',
  templateUrl: './smart-filter-panel.component.html',
  styleUrls: ['./smart-filter-panel.component.scss'],
})
export class SmartFilterPanelComponent {
  @Input() results: ProductSmartFilterResult[] = [];
  @Input() request: ProductSmartFilterRequest = { pageNumber: 1, pageSize: 100 };
  @Input() loading = false;
  @Input() totalAreaM2 = 0;
  @Input() areaUnit: AreaUnit = 'km2';

  @Output() areaUnitChanged = new EventEmitter<AreaUnit>();
  @Output() filterClicked = new EventEmitter<void>();
  @Output() createRequest = new EventEmitter<void>();
  @Output() metadataClicked = new EventEmitter<ProductSmartFilterResult>();
  @Output() zoomToExtentClicked = new EventEmitter<ProductSmartFilterResult>();
  @Output() addToCartClicked = new EventEmitter<ProductSmartFilterResult>();
  @Output() selectedProductsChanged = new EventEmitter<ProductSmartFilterResult[]>();
  @Output() closeClicked = new EventEmitter<void>();

  selectedProductIds = new Set<number>();
  expandedProductIds = new Set<number>();
  openedDropdownId: number | null = null;

  areaUnits = [
    { label: 'km²', value: 'km2' as AreaUnit },
    { label: 'm²', value: 'm2' as AreaUnit },
    { label: 'ha', value: 'ha' as AreaUnit },
    { label: 'da', value: 'da' as AreaUnit },
  ];

  get selectedCount(): number {
    return this.selectedProductIds.size;
  }

  get formattedArea(): string {
    const value = this.convertArea(this.totalAreaM2, this.areaUnit);
    return `${this.formatNumber(value)}`;
  }

  onAreaUnitChange(unit: AreaUnit): void {
    this.areaUnit = unit;
    this.areaUnitChanged.emit(unit);
  }

  trackByProduct(_: number, product: ProductSmartFilterResult): number {
    return product.id;
  }

  toggleSelected(product: ProductSmartFilterResult): void {
    if (this.selectedProductIds.has(product.id)) {
      this.selectedProductIds.delete(product.id);
    } else {
      this.selectedProductIds.add(product.id);
    }

    this.selectedProductsChanged.emit(
      this.results.filter((item) => this.selectedProductIds.has(item.id))
    );
  }

  isSelected(product: ProductSmartFilterResult): boolean {
    return this.selectedProductIds.has(product.id);
  }

  toggleExpanded(product: ProductSmartFilterResult): void {
    if (this.expandedProductIds.has(product.id)) {
      this.expandedProductIds.delete(product.id);
      return;
    }

    this.expandedProductIds.add(product.id);
  }

  isExpanded(product: ProductSmartFilterResult): boolean {
    return this.expandedProductIds.has(product.id);
  }

  toggleProductDropdown(product: ProductSmartFilterResult): void {
    this.openedDropdownId = this.openedDropdownId === product.id ? null : product.id;
  }

  closeProductDropdown(): void {
    this.openedDropdownId = null;
  }

  onZoomToExtent(product: ProductSmartFilterResult): void {
    this.openedDropdownId = null;
    this.zoomToExtentClicked.emit(product);
  }

  onViewMetadata(product: ProductSmartFilterResult): void {
    this.openedDropdownId = null;
    this.metadataClicked.emit(product);
  }

  onAddToCart(product: ProductSmartFilterResult): void {
    this.openedDropdownId = null;
    this.addToCartClicked.emit(product);
  }

  getProductImage(product: ProductSmartFilterResult): string | null {
    return product.thumbnailUrl || product.previewUrl || null;
  }

  getPreviewUrl(product: ProductSmartFilterResult): string | null {
    return product.previewUrl || product.thumbnailUrl || null;
  }

  getDisplayDate(product: ProductSmartFilterResult): string {
    if (!product.acquisitionDate) return '-';

    const date = new Date(product.acquisitionDate);
    if (Number.isNaN(date.getTime())) return product.acquisitionDate;

    return date.toLocaleString();
  }

  formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return `%${this.formatNumber(value)}`;
  }

  formatDegree(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return `${this.formatNumber(value)}°`;
  }

  formatMeter(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return `${this.formatNumber(value)} m`;
  }

  private convertArea(valueM2: number, unit: AreaUnit): number {
    switch (unit) {
      case 'km2':
        return valueM2 / 1_000_000;
      case 'ha':
        return valueM2 / 10_000;
      case 'da':
        return valueM2 / 1_000;
      case 'm2':
      default:
        return valueM2;
    }
  }

  private getAreaUnitLabel(unit: AreaUnit): string {
    return this.areaUnits.find((item) => item.value === unit)?.label ?? unit;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: value >= 100 ? 0 : 2,
    }).format(value);
  }
}

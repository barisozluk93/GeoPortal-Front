import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ProductSmartFilterRequest,
  ProductSmartFilterResult,
} from './models/product-smart-filter.model';

type AreaUnit = 'km2' | 'm2' | 'ha' | 'da';
type SortField = 'date' | 'cloudRate' | 'nadirAngle';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'card' | 'table';

@Component({
  selector: 'app-smart-filter-panel',
  templateUrl: './smart-filter-panel.component.html',
  styleUrls: ['./smart-filter-panel.component.scss'],
})
export class SmartFilterPanelComponent {
  @Input() results: ProductSmartFilterResult[] = [];

  @Input() request: ProductSmartFilterRequest = {
    pageNumber: 1,
    pageSize: 100,
  };

  @Input() loading = false;
  @Input() totalAreaM2 = 0;
  @Input() areaUnit: AreaUnit = 'km2';

  @Output() areaUnitChanged = new EventEmitter<AreaUnit>();
  @Output() filterClicked = new EventEmitter<DOMRect>();
  @Output() createRequest = new EventEmitter<void>();

  @Output() metadataClicked = new EventEmitter<{
    product: ProductSmartFilterResult;
    anchorRect: DOMRect;
  }>();

  @Output() zoomToExtentClicked =
    new EventEmitter<ProductSmartFilterResult>();

  @Output() addToCartClicked =
    new EventEmitter<ProductSmartFilterResult>();

  @Output() selectedProductsChanged =
    new EventEmitter<ProductSmartFilterResult[]>();

  @Output() productHovered =
    new EventEmitter<ProductSmartFilterResult | null>();

  @Output() closeClicked = new EventEmitter<void>();

  selectedProductIds = new Set<number>();
  expandedProductIds = new Set<number>();

  openedDropdownId: number | null = null;
  isSortMenuOpen = false;

  sortField: SortField = 'date';
  sortDirection: SortDirection = 'desc';
  viewMode: ViewMode = 'card';

  sortOptions: Array<{
    labelKey: string;
    value: SortField;
  }> = [
    {
      labelKey: 'MAP.SMART_FILTER.SORT.DATE',
      value: 'date',
    },
    {
      labelKey: 'MAP.SMART_FILTER.SORT.AREA_CLOUD_COVER',
      value: 'cloudRate',
    },
    {
      labelKey: 'MAP.SMART_FILTER.SORT.AREA_OFF_NADIR_ANGLE',
      value: 'nadirAngle',
    },
  ];

  areaUnits = [
    {
      label: 'km²',
      value: 'km2' as AreaUnit,
    },
    {
      label: 'm²',
      value: 'm2' as AreaUnit,
    },
    {
      label: 'ha',
      value: 'ha' as AreaUnit,
    },
    {
      label: 'da',
      value: 'da' as AreaUnit,
    },
  ];

  get selectedCount(): number {
    return this.selectedProductIds.size;
  }

  get formattedArea(): string {
    const value = this.convertArea(
      this.totalAreaM2,
      this.areaUnit,
    );

    return `${this.formatNumber(value)}`;
  }

  get sortedResults(): ProductSmartFilterResult[] {
    const directionMultiplier =
      this.sortDirection === 'asc' ? 1 : -1;

    return [...(this.results ?? [])].sort(
      (first, second) => {
        const firstValue = this.getSortValue(
          first,
          this.sortField,
        );

        const secondValue = this.getSortValue(
          second,
          this.sortField,
        );

        if (firstValue === null && secondValue === null) {
          return 0;
        }

        if (firstValue === null) {
          return 1;
        }

        if (secondValue === null) {
          return -1;
        }

        if (firstValue === secondValue) {
          return 0;
        }

        return firstValue > secondValue
          ? directionMultiplier
          : -directionMultiplier;
      },
    );
  }

  get selectedSortLabelKey(): string {
    return (
      this.sortOptions.find(
        (item) => item.value === this.sortField,
      )?.labelKey ??
      'MAP.SMART_FILTER.SORT.DATE'
    );
  }

  setViewMode(
    mode: ViewMode,
    event?: MouseEvent,
  ): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.viewMode = mode;
    this.closeProductDropdown();
  }

  setSort(
    field: SortField,
    direction: SortDirection,
    event?: MouseEvent,
  ): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.sortField = field;
    this.sortDirection = direction;
  }

  onAreaUnitChange(unit: AreaUnit): void {
    this.areaUnit = unit;
    this.areaUnitChanged.emit(unit);
  }

  onProductMouseEnter(
    product: ProductSmartFilterResult,
  ): void {
    this.productHovered.emit(product);
  }

  onProductMouseLeave(): void {
    this.productHovered.emit(null);
  }

  onDetailFilterClick(
    event: MouseEvent,
    button: HTMLElement,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    this.filterClicked.emit(
      button.getBoundingClientRect(),
    );
  }

  toggleSortMenu(event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.isSortMenuOpen = !this.isSortMenuOpen;
  }

  closeSortMenu(): void {
    this.isSortMenuOpen = false;
  }

  setSortField(
    field: SortField,
    event?: MouseEvent,
  ): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.sortField === field) {
      this.toggleSortDirection(event);
      return;
    }

    this.sortField = field;
    this.sortDirection =
      field === 'date' ? 'desc' : 'asc';

    this.isSortMenuOpen = false;
  }

  toggleSortDirection(
    event?: MouseEvent,
  ): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.sortDirection =
      this.sortDirection === 'asc'
        ? 'desc'
        : 'asc';

    this.isSortMenuOpen = false;
  }

  trackByProduct(
    _: number,
    product: ProductSmartFilterResult,
  ): number {
    return product.id;
  }

  toggleSelected(
    product: ProductSmartFilterResult,
  ): void {
    if (this.selectedProductIds.has(product.id)) {
      this.selectedProductIds.delete(product.id);
    } else {
      this.selectedProductIds.add(product.id);
    }

    this.selectedProductsChanged.emit(
      this.results.filter((item) =>
        this.selectedProductIds.has(item.id),
      ),
    );
  }

  isSelected(
    product: ProductSmartFilterResult,
  ): boolean {
    return this.selectedProductIds.has(product.id);
  }

  toggleExpanded(
    product: ProductSmartFilterResult,
  ): void {
    if (this.expandedProductIds.has(product.id)) {
      this.expandedProductIds.delete(product.id);
      return;
    }

    this.expandedProductIds.add(product.id);
  }

  isExpanded(
    product: ProductSmartFilterResult,
  ): boolean {
    return this.expandedProductIds.has(product.id);
  }

  toggleProductDropdown(
    product: ProductSmartFilterResult,
  ): void {
    this.openedDropdownId =
      this.openedDropdownId === product.id
        ? null
        : product.id;
  }

  closeProductDropdown(): void {
    this.openedDropdownId = null;
  }

  onZoomToExtent(
    product: ProductSmartFilterResult,
  ): void {
    this.openedDropdownId = null;
    this.zoomToExtentClicked.emit(product);
  }

  onViewMetadata(
    product: ProductSmartFilterResult,
    event: MouseEvent,
    button: HTMLElement,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    const anchorRect = button.getBoundingClientRect();
    this.openedDropdownId = null;
    this.metadataClicked.emit({ product, anchorRect });
  }

  onAddToCart(
    product: ProductSmartFilterResult,
  ): void {
    this.openedDropdownId = null;
    this.addToCartClicked.emit(product);
  }

  getProductImage(
    product: ProductSmartFilterResult,
  ): string | null {
    return product.thumbnailUrl || null;
  }

  getPreviewUrl(
    product: ProductSmartFilterResult,
  ): string | null {
    return product.previewUrl || null;
  }

  getDisplayDate(
    product: ProductSmartFilterResult,
  ): string {
    if (!product.acquisitionDate) {
      return '-';
    }

    const date = new Date(
      product.acquisitionDate,
    );

    if (Number.isNaN(date.getTime())) {
      return product.acquisitionDate;
    }

    return date.toLocaleString();
  }

  getDisplayDateOnly(
    product: ProductSmartFilterResult,
  ): string {
    if (!product.acquisitionDate) {
      return '-';
    }

    const date = new Date(
      product.acquisitionDate,
    );

    if (Number.isNaN(date.getTime())) {
      return product.acquisitionDate;
    }

    return date.toLocaleDateString();
  }

  formatPercent(
    value: number | null | undefined,
  ): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return `%${this.formatNumber(value)}`;
  }

  formatDegree(
    value: number | null | undefined,
  ): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return `${this.formatNumber(value)}°`;
  }

  formatMeter(
    value: number | null | undefined,
  ): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return `${this.formatNumber(value)} m`;
  }

  private getSortValue(
    product: ProductSmartFilterResult,
    field: SortField,
  ): number | null {
    switch (field) {
      case 'date': {
        if (!product.acquisitionDate) {
          return null;
        }

        const time = new Date(
          product.acquisitionDate,
        ).getTime();

        return Number.isNaN(time)
          ? null
          : time;
      }

      case 'cloudRate':
        return this.toSortableNumber(
          product.cloudRate,
        );

      case 'nadirAngle':
        return this.toSortableNumber(
          product.nadirAngle,
        );

      default:
        return null;
    }
  }

  private toSortableNumber(
    value: number | string | null | undefined,
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numericValue =
      typeof value === 'number'
        ? value
        : Number(
            String(value).replace(',', '.'),
          );

    return Number.isFinite(numericValue)
      ? numericValue
      : null;
  }

  private convertArea(
    valueM2: number,
    unit: AreaUnit,
  ): number {
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

  private getAreaUnitLabel(
    unit: AreaUnit,
  ): string {
    return (
      this.areaUnits.find(
        (item) => item.value === unit,
      )?.label ?? unit
    );
  }

  private formatNumber(
    value: number,
  ): string {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits:
        value >= 100 ? 0 : 2,
    }).format(value);
  }
}
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductSmartFilterResult, ProductSmartFilterRequest } from './models/product-smart-filter.model';

@Component({
  selector: 'app-map-product-smart-filter',
  templateUrl: './map-product-smart-filter.component.html',
  styleUrls: ['./map-product-smart-filter.component.scss']
})
export class MapProductSmartFilterComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() results: ProductSmartFilterResult[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<ProductSmartFilterRequest>();
  @Output() clear = new EventEmitter<void>();
  @Output() toggleResults = new EventEmitter<void>();
  
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  model: ProductSmartFilterRequest = this.getDefaultModel();

  onFilterChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.emitFilter();
    }, 400);
  }

  clearFilter(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.model = this.getDefaultModel();
    this.clear.emit();
    this.emitFilter();
  }

  private emitFilter(): void {
    this.apply.emit({
      ...this.model,
      provider: '',
      minOffNadir: null,
      minResolution: null,
      acquisitionStartDate: this.model.acquisitionStartDate || null,
      acquisitionEndDate: this.model.acquisitionEndDate || null,
      pageNumber: 1,
      pageSize: this.model.pageSize || 50
    });
  }

  private getDefaultModel(): ProductSmartFilterRequest {
    return {
      imageType: '',
      provider: '',
      acquisitionStartDate: null,
      acquisitionEndDate: null,
      maxCloudRate: 100,
      minOffNadir: null,
      maxOffNadir: 100,
      minResolution: null,
      maxResolution: 30,
      spectralResolution: '',
      pageNumber: 1,
      pageSize: 50
    };
  }
}

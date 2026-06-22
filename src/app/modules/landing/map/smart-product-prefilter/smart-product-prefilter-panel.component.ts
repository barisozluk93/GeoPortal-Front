import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ProductSmartFilterRequest } from '../smart-filter/models/product-smart-filter.model';

@Component({
  selector: 'app-smart-product-prefilter-panel',
  templateUrl: './smart-product-prefilter-panel.component.html',
  styleUrls: ['./smart-product-prefilter-panel.component.scss'],
})
export class SmartProductPrefilterPanelComponent implements OnChanges {
  @Input() request: ProductSmartFilterRequest = { pageNumber: 1, pageSize: 100 };
  @Input() loading = false;

  @Output() searchClicked = new EventEmitter<ProductSmartFilterRequest>();
  @Output() closeClicked = new EventEmitter<void>();

  draft: ProductSmartFilterRequest = { pageNumber: 1, pageSize: 100 };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['request']) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.draft = {
      ...this.request,
      acquisitionStartDate: null,
      acquisitionEndDate: null,
      pageNumber: this.request?.pageNumber ?? 1,
      pageSize: this.request?.pageSize ?? 100,
    };
  }

  search(): void {
    this.searchClicked.emit(this.normalizeRequest(this.draft));
  }

  clearDates(): void {
    this.draft = {
      ...this.draft,
      acquisitionStartDate: null,
      acquisitionEndDate: null,
    };
  }

  private normalizeRequest(request: ProductSmartFilterRequest): ProductSmartFilterRequest {
    return {
      ...request,
      acquisitionStartDate: this.emptyToNull(request.acquisitionStartDate),
      acquisitionEndDate: this.emptyToNull(request.acquisitionEndDate),
      pageNumber: 1,
      pageSize: request.pageSize ?? 100,
    };
  }

  private emptyToNull(value: string | null | undefined): string | null {
    return value === undefined || value === '' ? null : value;
  }

  private toDateInputValue(value: string | Date | null | undefined): string | null {
    if (!value) return null;

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}

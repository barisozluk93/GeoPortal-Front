import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ProductSmartFilterRequest } from '../models/product-smart-filter.model';

@Component({
  selector: 'app-smart-product-filter-panel',
  templateUrl: './smart-product-filter-panel.component.html',
  styleUrls: ['./smart-product-filter-panel.component.scss'],
})
export class SmartProductFilterPanelComponent implements OnChanges {
  @Input() request: ProductSmartFilterRequest = { pageNumber: 1, pageSize: 100 };
  @Input() loading = false;

  @Output() filterApplied = new EventEmitter<ProductSmartFilterRequest>();
  @Output() filterCleared = new EventEmitter<void>();
  @Output() closeClicked = new EventEmitter<void>();

  draft: ProductSmartFilterRequest = { pageNumber: 1, pageSize: 100 };

  imageTypes = [
    { label: 'Mono', value: 'mono' },
    { label: 'Stereo', value: 'stereo' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.request) {
      this.draft = {
        ...this.request,
        pageNumber: this.request?.pageNumber ?? 1,
        pageSize: this.request?.pageSize ?? 100,
      };
    }
  }

  apply(): void {
    this.filterApplied.emit(this.normalizeRequest(this.draft));
  }

  clear(): void {
    this.filterCleared.emit();
  }

  private normalizeRequest(request: ProductSmartFilterRequest): ProductSmartFilterRequest {
    return {
      ...request,
      imageType: this.emptyToNull(request.imageType),
      acquisitionStartDate: this.emptyToNull(request.acquisitionStartDate),
      acquisitionEndDate: this.emptyToNull(request.acquisitionEndDate),
      maxCloudRate: this.toNullableNumber(request.maxCloudRate),
      minOffNadir: this.toNullableNumber(request.minOffNadir),
      maxOffNadir: this.toNullableNumber(request.maxOffNadir),
      minResolution: this.toNullableNumber(request.minResolution),
      maxResolution: this.toNullableNumber(request.maxResolution),
      pageNumber: 1,
      pageSize: request.pageSize ?? 100,
    };
  }

  private emptyToNull(value: string | null | undefined): string | null {
    return value === undefined || value === '' ? null : value;
  }

  private toNullableNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  ProductSmartFilterRequest,
  ProductSmartFilterResult,
} from '../models/product-smart-filter.model';

@Component({
  selector: 'app-smart-product-filter-panel',
  templateUrl: './smart-product-filter-panel.component.html',
  styleUrls: ['./smart-product-filter-panel.component.scss'],
})
export class SmartProductFilterPanelComponent implements OnChanges {
  @Input() request: ProductSmartFilterRequest = { pageNumber: 1, pageSize: 100 };
  @Input() results: ProductSmartFilterResult[] = [];
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
    if (changes['request'] || changes['results']) {
      this.resetDraft();
    }
  }

  apply(): void {
    this.filterApplied.emit(this.normalizeRequest(this.draft));
  }

  clear(): void {
    this.filterCleared.emit();
  }

  private resetDraft(): void {
    const request = this.request ?? { pageNumber: 1, pageSize: 100 };
    const autoValues = this.getAutoFilterValues(this.results ?? []);

    this.draft = {
      ...request,
      acquisitionStartDate: this.hasValue(request.acquisitionStartDate)
        ? request.acquisitionStartDate
        : autoValues.acquisitionStartDate,
      acquisitionEndDate: this.hasValue(request.acquisitionEndDate)
        ? request.acquisitionEndDate
        : autoValues.acquisitionEndDate,
      minCloudRate: this.hasValue(request.minCloudRate)
        ? request.minCloudRate
        : autoValues.minCloudRate,
      maxCloudRate: this.hasValue(request.maxCloudRate)
        ? request.maxCloudRate
        : autoValues.maxCloudRate,
      minOffNadir: this.hasValue(request.minOffNadir)
        ? request.minOffNadir
        : autoValues.minOffNadir,
      maxOffNadir: this.hasValue(request.maxOffNadir)
        ? request.maxOffNadir
        : autoValues.maxOffNadir,
      minResolution: this.hasValue(request.minResolution)
        ? request.minResolution
        : autoValues.minResolution,
      maxResolution: this.hasValue(request.maxResolution)
        ? request.maxResolution
        : autoValues.maxResolution,
      pageNumber: request.pageNumber ?? 1,
      pageSize: request.pageSize ?? 100,
    };
  }

  private getAutoFilterValues(
    results: ProductSmartFilterResult[]
  ): Partial<ProductSmartFilterRequest> {
    const acquisitionDates = (results ?? [])
      .map((item) => this.toDateInputValue(item.acquisitionDate))
      .filter((value): value is string => !!value)
      .sort();

    const cloudRates = this.getNumericValues(results, (item) => item.cloudRate);
    const offNadirs = this.getNumericValues(results, (item) => item.nadirAngle);
    const resolutions = this.getNumericValues(results, (item) => item.resolution);

    return {
      acquisitionStartDate: acquisitionDates[0] ?? null,
      acquisitionEndDate: acquisitionDates[acquisitionDates.length - 1] ?? null,
      minCloudRate: this.getMin(cloudRates),
      maxCloudRate: this.getMax(cloudRates),
      minOffNadir: this.getMin(offNadirs),
      maxOffNadir: this.getMax(offNadirs),
      minResolution: this.getMin(resolutions),
      maxResolution: this.getMax(resolutions),
    };
  }

  private getNumericValues(
    results: ProductSmartFilterResult[],
    selector: (item: ProductSmartFilterResult) => number | string | null | undefined
  ): number[] {
    return (results ?? [])
      .map((item) => this.toNullableNumber(selector(item)))
      .filter((value): value is number => value !== null);
  }

  private getMin(values: number[]): number | null {
    return values.length ? this.roundNumber(Math.min(...values)) : null;
  }

  private getMax(values: number[]): number | null {
    return values.length ? this.roundNumber(Math.max(...values)) : null;
  }

  private roundNumber(value: number): number {
    return Number(value.toFixed(2));
  }

  private toDateInputValue(value: string | Date | null | undefined): string | null {
    if (!value) return null;

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalizeRequest(request: ProductSmartFilterRequest): ProductSmartFilterRequest {
    return {
      ...request,
      imageType: this.emptyToNull(request.imageType),
      acquisitionStartDate: this.emptyToNull(request.acquisitionStartDate),
      acquisitionEndDate: this.emptyToNull(request.acquisitionEndDate),
      minCloudRate: this.toNullableNumber(request.minCloudRate),
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

  private hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  private toNullableNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

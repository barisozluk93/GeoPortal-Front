import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

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
  @Input() request: ProductSmartFilterRequest = {
    pageNumber: 1,
    pageSize: 100,
  };

  @Input() results: ProductSmartFilterResult[] = [];
  @Input() loading = false;

  @Output() filterApplied = new EventEmitter<ProductSmartFilterRequest>();
  @Output() filterCleared = new EventEmitter<void>();
  @Output() closeClicked = new EventEmitter<void>();

  readonly cloudSliderMin = 0;
  readonly cloudSliderMax = 100;
  readonly nadirSliderMin = 0;
  readonly nadirSliderMax = 90;

  draft: ProductSmartFilterRequest = {
    pageNumber: 1,
    pageSize: 100,
  };

  imageTypes = [
    { label: 'Mono', value: 'mono' },
    { label: 'Stereo', value: 'stereo' },
  ];

  platforms = [
    { label: 'MSP1', value: 'MSP1' },
    { label: 'MSP2', value: 'MSP2' },
    { label: 'MSP3', value: 'MSP3' },
    { label: 'MSP4', value: 'MSP4' },
    { label: 'MSP5', value: 'MSP5' },
  ];

  /**
   * true olduğunda kullanıcı panel üzerinde değişiklik yapmış,
   * ancak henüz Uygula butonuna basmamıştır.
   *
   * Bu durumda results/request değişse bile kullanıcının açık paneldeki
   * taslağı ezilmez. Panel kapanırsa component yok olacağı için uygulanmamış
   * değişiklikler doğal olarak kaybolabilir.
   */
  private hasUnappliedChanges = false;
  private initialized = false;

  get cloudValue(): number {
    return this.clamp(
      this.toNullableNumber(this.draft.maxCloudRate) ??
        this.cloudSliderMin,
      this.cloudSliderMin,
      this.cloudSliderMax
    );
  }

  get nadirValue(): number {
    return this.clamp(
      this.toNullableNumber(this.draft.maxOffNadir) ??
        this.nadirSliderMin,
      this.nadirSliderMin,
      this.nadirSliderMax
    );
  }

  get cloudPercent(): number {
    return this.toPercent(
      this.cloudValue,
      this.cloudSliderMin,
      this.cloudSliderMax
    );
  }

  get nadirPercent(): number {
    return this.toPercent(
      this.nadirValue,
      this.nadirSliderMin,
      this.nadirSliderMax
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      this.syncDraftFromAppliedRequestAndResults();
      this.initialized = true;
      return;
    }

    /*
     * Uygulanmamış bir kullanıcı değişikliği varsa açık paneldeki taslağı
     * koru. Kullanıcı Uygula demeden panel kapanırsa bu taslak saklanmaz.
     */
    if (this.hasUnappliedChanges) {
      return;
    }

    /*
     * Sonuç listesi veya parent'taki uygulanmış request değiştiğinde alanları
     * yeniden doldur. Uygulanmış request değerleri önceliklidir; request'te
     * olmayan değerler o anki sonuç listesinden hesaplanır.
     */
    if (changes['request'] || changes['results']) {
      this.syncDraftFromAppliedRequestAndResults();
    }
  }

  apply(): void {
    const normalizedRequest = this.normalizeRequest(this.draft);

    this.draft = { ...normalizedRequest };
    this.hasUnappliedChanges = false;

    /*
     * Kalıcılık parent'taki request üzerinden sağlanır.
     * Burada sessionStorage kullanılmaz; böylece Uygula denmemiş değerler
     * panel tekrar açıldığında geri gelmez.
     */
    this.filterApplied.emit(normalizedRequest);
  }

  clear(): void {
    this.hasUnappliedChanges = false;

    /*
     * Clear sonrasında görünür alanları mevcut listedeki değerlere döndür.
     * Parent filterCleared event'i ile sorguyu temizleyip yeni listeyi
     * getirdiğinde ngOnChanges tekrar senkronizasyon yapacaktır.
     */
    this.draft = this.buildDraft(
      {
        pageNumber: 1,
        pageSize: this.request?.pageSize ?? 100,
      },
      this.results ?? []
    );

    this.filterCleared.emit();
  }

  onStartDateChange(value: string | null): void {
    const startDate = this.toDateInputValue(value);
    const endDate = this.toDateInputValue(this.draft.acquisitionEndDate);

    this.draft.acquisitionStartDate = startDate;

    // Başlangıç tarihi bitiş tarihinden sonra olamaz. Eşit olabilir.
    if (startDate && endDate && startDate > endDate) {
      this.draft.acquisitionEndDate = startDate;
    }

    this.markDraftAsChanged();
  }

  onEndDateChange(value: string | null): void {
    const startDate = this.toDateInputValue(this.draft.acquisitionStartDate);
    const endDate = this.toDateInputValue(value);

    this.draft.acquisitionEndDate = endDate;

    // Bitiş tarihi başlangıç tarihinden önce olamaz. Eşit olabilir.
    if (startDate && endDate && endDate < startDate) {
      this.draft.acquisitionStartDate = endDate;
    }

    this.markDraftAsChanged();
  }

  onCloudChange(value: number | string): void {
    this.draft.minCloudRate = this.cloudSliderMin;
    this.draft.maxCloudRate = this.clamp(
      Number(value),
      this.cloudSliderMin,
      this.cloudSliderMax
    );

    this.markDraftAsChanged();
  }

  onNadirChange(value: number | string): void {
    this.draft.minOffNadir = this.nadirSliderMin;
    this.draft.maxOffNadir = this.roundNumber(
      this.clamp(
        Number(value),
        this.nadirSliderMin,
        this.nadirSliderMax
      )
    );

    this.markDraftAsChanged();
  }

  onDraftChange(): void {
    this.markDraftAsChanged();
  }

  private markDraftAsChanged(): void {
    this.hasUnappliedChanges = true;
  }

  private syncDraftFromAppliedRequestAndResults(): void {
    this.draft = this.buildDraft(
      this.request ?? { pageNumber: 1, pageSize: 100 },
      this.results ?? []
    );

    this.hasUnappliedChanges = false;
  }

  private buildDraft(
    appliedRequest: ProductSmartFilterRequest,
    results: ProductSmartFilterResult[]
  ): ProductSmartFilterRequest {
    const autoValues = this.getAutoFilterValues(results);

    return {
      ...appliedRequest,

      imageType: this.hasValue(appliedRequest.imageType)
        ? appliedRequest.imageType
        : autoValues.imageType ?? null,

      provider: this.hasValue(appliedRequest.provider)
        ? appliedRequest.provider
        : autoValues.provider ?? null,

      // Detay filtre tarihleri request'ten değil, ekranda bulunan
      // sonuçların gerçek minimum ve maksimum acquisitionDate değerlerinden gelir.
      acquisitionStartDate: autoValues.acquisitionStartDate ?? null,
      acquisitionEndDate: autoValues.acquisitionEndDate ?? null,

      minCloudRate: this.cloudSliderMin,

      maxCloudRate: this.hasValue(appliedRequest.maxCloudRate)
        ? this.clamp(
            this.toNullableNumber(
              appliedRequest.maxCloudRate
            ) ?? this.cloudSliderMin,
            this.cloudSliderMin,
            this.cloudSliderMax
          )
        : autoValues.maxCloudRate ?? this.cloudSliderMax,

      minOffNadir: this.nadirSliderMin,

      maxOffNadir: this.hasValue(appliedRequest.maxOffNadir)
        ? this.clamp(
            this.toNullableNumber(
              appliedRequest.maxOffNadir
            ) ?? this.nadirSliderMin,
            this.nadirSliderMin,
            this.nadirSliderMax
          )
        : autoValues.maxOffNadir ?? this.nadirSliderMax,

      minResolution: this.hasValue(
        appliedRequest.minResolution
      )
        ? this.toNullableNumber(
            appliedRequest.minResolution
          )
        : autoValues.minResolution ?? null,

      maxResolution: this.hasValue(
        appliedRequest.maxResolution
      )
        ? this.toNullableNumber(
            appliedRequest.maxResolution
          )
        : autoValues.maxResolution ?? null,

      pageNumber: appliedRequest.pageNumber ?? 1,
      pageSize: appliedRequest.pageSize ?? 100,
    };
  }

  private getAutoFilterValues(
    results: ProductSmartFilterResult[]
  ): Partial<ProductSmartFilterRequest> {
    const acquisitionDates = (results ?? [])
      .map((item) =>
        this.toDateInputValue(
          (item as any).acquisitionDate
        )
      )
      .filter((value): value is string => !!value)
      .sort();

    const cloudRates = this.getNumericValues(
      results,
      (item) => (item as any).cloudRate
    );

    const offNadirs = this.getNumericValues(
      results,
      (item) =>
        (item as any).nadirAngle ??
        (item as any).offNadirAngle
    );

    const resolutions = this.getNumericValues(
      results,
      (item) => (item as any).resolution
    );

    const imageTypes = this.getDistinctStringValues(
      results,
      (item) => (item as any).imageType
    );

    const providers = this.getDistinctStringValues(
      results,
      (item) =>
        (item as any).provider ??
        (item as any).platform
    );

    return {
      /*
       * Select tek seçimli olduğu için listedeki tüm kayıtlar aynı değere
       * sahipse otomatik seçilir. Birden fazla farklı değer varsa boş kalır.
       */
      imageType:
        imageTypes.length === 1
          ? imageTypes[0]
          : null,

      provider:
        providers.length === 1
          ? providers[0]
          : null,

      acquisitionStartDate:
        acquisitionDates[0] ?? null,

      acquisitionEndDate:
        acquisitionDates[
          acquisitionDates.length - 1
        ] ?? null,

      maxCloudRate: this.getMax(cloudRates),
      maxOffNadir: this.getMax(offNadirs),
      minResolution: this.getMin(resolutions),
      maxResolution: this.getMax(resolutions),
    };
  }

  private getNumericValues(
    results: ProductSmartFilterResult[],
    selector: (
      item: ProductSmartFilterResult
    ) => number | string | null | undefined
  ): number[] {
    return (results ?? [])
      .map((item) =>
        this.toNullableNumber(selector(item))
      )
      .filter(
        (value): value is number => value !== null
      );
  }

  private getDistinctStringValues(
    results: ProductSmartFilterResult[],
    selector: (
      item: ProductSmartFilterResult
    ) => string | null | undefined
  ): string[] {
    return Array.from(
      new Set(
        (results ?? [])
          .map((item) => selector(item)?.trim())
          .filter(
            (value): value is string => !!value
          )
      )
    );
  }

  private getMin(values: number[]): number | null {
    return values.length
      ? this.roundNumber(Math.min(...values))
      : null;
  }

  private getMax(values: number[]): number | null {
    return values.length
      ? this.roundNumber(Math.max(...values))
      : null;
  }

  private roundNumber(value: number): number {
    return Number(value.toFixed(2));
  }

  private toDateInputValue(
    value: string | Date | null | undefined
  ): string | null {
    if (!value) return null;

    if (typeof value === 'string') {
      const datePart =
        value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

      if (datePart) {
        return datePart;
      }
    }

    const date =
      value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(
      2,
      '0'
    );
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalizeRequest(
    request: ProductSmartFilterRequest
  ): ProductSmartFilterRequest {
    return {
      ...request,

      provider: this.emptyToNull(request.provider),
      imageType: this.emptyToNull(request.imageType),

      acquisitionStartDate: this.emptyToNull(
        request.acquisitionStartDate
      ),

      acquisitionEndDate: this.emptyToNull(
        request.acquisitionEndDate
      ),

      minCloudRate: this.cloudSliderMin,

      maxCloudRate: this.toNullableNumber(
        request.maxCloudRate
      ),

      minOffNadir: this.nadirSliderMin,

      maxOffNadir: this.toNullableNumber(
        request.maxOffNadir
      ),

      minResolution: this.toNullableNumber(
        request.minResolution
      ),

      maxResolution: this.toNullableNumber(
        request.maxResolution
      ),

      pageNumber: 1,
      pageSize: request.pageSize ?? 100,
    };
  }

  private emptyToNull(
    value: string | null | undefined
  ): string | null {
    return value === undefined || value === ''
      ? null
      : value;
  }

  private hasValue(value: unknown): boolean {
    return (
      value !== null &&
      value !== undefined &&
      value !== ''
    );
  }

  private toNullableNumber(
    value: number | string | null | undefined
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private clamp(
    value: number,
    min: number,
    max: number
  ): number {
    if (!Number.isFinite(value)) {
      return min;
    }

    return Math.min(Math.max(value, min), max);
  }

  private toPercent(
    value: number,
    min: number,
    max: number
  ): number {
    if (max <= min) {
      return 0;
    }

    return ((value - min) / (max - min)) * 100;
  }
}

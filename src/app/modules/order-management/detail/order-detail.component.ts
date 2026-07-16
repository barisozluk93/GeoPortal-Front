import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { formatDate } from '@angular/common';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { OrderStatusEnum } from 'src/app/enums/order-status.enum';
import { OrderManagementService } from '../order-management.service';
import { OrderModel } from '../../coming-order-management/models/order.model';
import { OrderProductModel } from '../../coming-order-management/models/orderproduct.model';



interface OrderAoiGroupView {
  key: string;
  aoiName: string;
  products: OrderProductModel[];
  totalPrice: number;
}

interface OrderProcessingOptionView {
  key: string;
  name: string;
  unitPrice: number;
  areaKm2: number;
  totalPrice: number;
}

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  header = '';
  orderId!: number;
  order!: OrderModel;

  loading = false;

  copiedMap: { [key: number]: boolean } = {};

  previewModalOpen = false;
  previewUrl: SafeResourceUrl | null = null;
  previewFileName = '';

  private destroy$ = new Subject<void>();

  orderFlowSteps = [
    { value: 0, labelKey: 'PENDING_APPROVAL', icon: 'fa-regular fa-clock' },
    { value: 1, labelKey: 'APPROVED', icon: 'fa-solid fa-circle-check' },
    { value: 2, labelKey: 'REJECTED', icon: 'fa-solid fa-circle-xmark' },
    { value: 3, labelKey: 'PREPARING', icon: 'fa-solid fa-gear' },
    { value: 4, labelKey: 'COMPLETED', icon: 'fa-solid fa-box-open' },
  ];

  constructor(
    private orderManagementService: OrderManagementService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    @Inject(LOCALE_ID) public locale: string,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateHeader();
        if (this.orderId) {
          this.getById();
        }
      });

    this.updateHeader();

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = Number(params.get('id'));
        if (id) {
          this.orderId = id;
          this.getById();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateHeader(): void {
    this.header = this.translate.instant('ORDER_DETAIL');
  }

  getById(): void {
    this.loading = true;

    const keys = [
      'ORDER_COMPLETED',
      'ORDER_NOT_YET_COMPLETED',
      'PENDING_APPROVAL',
      'APPROVED',
      'PREPARING',
      'REJECTED',
      'COMPLETED'
    ];

    forkJoin(keys.map(key => this.translate.get(key)))
      .subscribe(translations => {
        const [
          orderCompletedText,
          orderNotCompletedText,
          pendingApprovalText,
          approvedText,
          preparingText,
          rejectedText,
          completedText
        ] = translations;

        this.orderManagementService.getById(this.orderId).subscribe({
          next: (result) => {
            this.loading = false;

            if (!result?.isSuccess) {
              return;
            }

            const data = result.data as OrderModel;

            data.orderDate = data.orderDate
              ? formatDate(data.orderDate, 'dd.MM.yyyy HH:mm', this.locale)
              : data.orderDate;

            if (data.orderStatus === OrderStatusEnum['Sipariş Tamamlandı']) {
              data.orderStatusStr = orderCompletedText;
            } else if (data.orderStatus === OrderStatusEnum['Sipariş Tamamlanmadı']) {
              data.orderStatusStr = orderNotCompletedText;
            } else {
              data.orderStatusStr = this.getOrderStatusText(data.orderStatus);
            }

            data.orderProducts?.forEach(orderProduct => {
              if (orderProduct.orderStatus === OrderStatusEnum['Onay Bekliyor']) {
                orderProduct.orderStatusStr = pendingApprovalText;
              } else if (orderProduct.orderStatus === OrderStatusEnum['Onaylandı']) {
                orderProduct.orderStatusStr = approvedText;
              } else if (orderProduct.orderStatus === OrderStatusEnum['Hazırlanıyor']) {
                orderProduct.orderStatusStr = preparingText;
              } else if (orderProduct.orderStatus === OrderStatusEnum['Reddedildi']) {
                orderProduct.orderStatusStr = rejectedText;
              } else if (orderProduct.orderStatus === OrderStatusEnum['Tamamlandı']) {
                orderProduct.orderStatusStr = completedText;
              }

              if (orderProduct.product) {
                orderProduct.product.acquisitionDate = orderProduct.product.acquisitionDate
                  ? formatDate(orderProduct.product.acquisitionDate, 'dd.MM.yyyy HH:mm', this.locale)
                  : orderProduct.product.acquisitionDate;
                orderProduct.product.acquisitionStartDate = orderProduct.product.acquisitionStartDate
                  ? formatDate(orderProduct.product.acquisitionStartDate, 'dd.MM.yyyy HH:mm', this.locale)
                  : orderProduct.product.acquisitionStartDate;
                orderProduct.product.acquisitionEndDate = orderProduct.product.acquisitionEndDate
                  ? formatDate(orderProduct.product.acquisitionEndDate, 'dd.MM.yyyy HH:mm', this.locale)
                  : orderProduct.product.acquisitionEndDate;
              }

              orderProduct.orderDate = orderProduct.orderDate
                ? formatDate(orderProduct.orderDate, 'dd.MM.yyyy HH:mm', this.locale)
                : orderProduct.orderDate;

              orderProduct.proccessDate = orderProduct.proccessDate
                ? formatDate(orderProduct.proccessDate, 'dd.MM.yyyy HH:mm', this.locale)
                : orderProduct.proccessDate;

              orderProduct.completionDate = orderProduct.completionDate
                ? formatDate(orderProduct.completionDate, 'dd.MM.yyyy HH:mm', this.locale)
                : orderProduct.completionDate;
            });

            this.order = data;
          },
          error: () => {
            this.loading = false;
          }
        });
      });
  }

  getOrderStatusText(status?: number): string {
    switch (status) {
      case 0:
        return this.translate.instant('PENDING_APPROVAL');
      case 1:
        return this.translate.instant('APPROVED');
      case 2:
        return this.translate.instant('REJECTED');
      case 3:
        return this.translate.instant('PREPARING');
      case 4:
        return this.translate.instant('COMPLETED');
      case 5:
        return this.translate.instant('ORDER_COMPLETED');
      case 6:
        return this.translate.instant('ORDER_NOT_YET_COMPLETED');
      default:
        return '-';
    }
  }

  getStatusBadgeClass(status?: number): string {
    switch (status) {
      case 0:
        return 'badge badge-light-warning';
      case 1:
        return 'badge badge-light-primary';
      case 2:
      case 6:
        return 'badge badge-light-danger';
      case 3:
        return 'badge badge-light-info';
      case 4:
      case 5:
        return 'badge badge-light-success';
      default:
        return 'badge badge-light';
    }
  }

  getOrderStatusIconClass(status?: number): string {
    switch (status) {
      case 0:
        return 'fa-regular fa-clock text-warning';
      case 1:
        return 'fa-solid fa-circle-check text-primary';
      case 2:
      case 6:
        return 'fa-solid fa-circle-xmark text-danger';
      case 3:
        return 'fa-solid fa-gear text-info';
      case 4:
      case 5:
        return 'fa-solid fa-box-open text-success';
      default:
        return 'fa-solid fa-circle-info text-gray-700';
    }
  }

  getFileIconClass(fileName?: string): string {
    if (!fileName) {
      return 'fa-solid fa-file-lines text-primary';
    }

    const lower = fileName.toLowerCase();

    if (lower.endsWith('.pdf')) {
      return 'fa-solid fa-file-pdf text-danger';
    }

    return 'fa-solid fa-file-lines text-primary';
  }

  hasFile(item: OrderModel): boolean {
    return !!(
      item?.fileId ||
      item?.fileName ||
      item?.fileResult?.url ||
      item?.fileResult?.downloadUrl ||
      item?.fileResult?.fileContents
    );
  }

  canViewFile(item: OrderModel): boolean {
    if (!this.hasFile(item)) {
      return false;
    }

    const fileName = item.fileName?.toLowerCase() || '';
    const contentType = item.fileResult?.contentType?.toLowerCase?.() || '';

    return (
      fileName.endsWith('.pdf') ||
      contentType.includes('pdf')
    );
  }

  openFileModal(item: OrderModel): void {
    const safeUrl = this.buildFilePreviewUrl(item);

    if (!safeUrl) {
      return;
    }

    this.previewUrl = safeUrl;
    this.previewFileName = item.fileName!;
    this.previewModalOpen = true;
  }

  closePreviewModal(): void {
    this.previewModalOpen = false;
    this.previewUrl = null;
    this.previewFileName = '';
  }

  downloadFile(item: OrderModel): void {
    const rawUrl =
      item?.fileResult?.downloadUrl ||
      item?.fileResult?.url ||
      item?.fileResult?.path ||
      item?.fileResult?.fileUrl ||
      null;

    if (rawUrl) {
      const link = document.createElement('a');
      link.href = rawUrl;
      link.target = '_blank';
      link.download = item.fileName || 'file';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    if (item?.fileResult?.fileContents && item?.fileResult?.contentType) {
      let fileContents = item.fileResult.fileContents as string;
      const prefix = `data:${item.fileResult.contentType};base64,`;

      if (!fileContents.includes(prefix)) {
        fileContents = prefix + fileContents;
      }

      const link = document.createElement('a');
      link.href = fileContents;
      link.download = item.fileName || 'file';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  private buildFilePreviewUrl(item: OrderModel): SafeResourceUrl | null {
    const rawUrl =
      item?.fileResult?.url ||
      item?.fileResult?.downloadUrl ||
      item?.fileResult?.path ||
      item?.fileResult?.fileUrl ||
      null;

    if (rawUrl) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    }

    if (item?.fileResult?.fileContents && item?.fileResult?.contentType) {
      let fileContents = item.fileResult.fileContents as string;
      const prefix = `data:${item.fileResult.contentType};base64,`;

      if (!fileContents.includes(prefix)) {
        fileContents = prefix + fileContents;
      }

      return this.sanitizer.bypassSecurityTrustResourceUrl(fileContents);
    }

    return null;
  }

  copyToClipboard(value: string | undefined | null, itemId: number): void {
    if (!value) {
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      this.copiedMap[itemId] = true;

      setTimeout(() => {
        this.copiedMap[itemId] = false;
      }, 2000);
    }).catch(() => {});
  }


  get apiServiceItems(): OrderProductModel[] {
    return (this.order?.orderProducts ?? []).filter(item => this.isApiKey(item));
  }

  get apiServiceTotal(): number {
    return this.apiServiceItems.reduce((sum, item) => sum + this.getItemTotal(item), 0);
  }

  get aoiGroups(): OrderAoiGroupView[] {
    const groups = new Map<string, OrderAoiGroupView>();

    for (const item of this.order?.orderProducts ?? []) {
      if (this.isApiKey(item)) {
        continue;
      }

      const aoiName = this.getAoiName(item);
      const key = this.normalizeAoiKey(aoiName);
      const existing = groups.get(key);

      if (existing) {
        existing.products.push(item);
        existing.totalPrice += this.getItemTotal(item);
        continue;
      }

      groups.set(key, {
        key,
        aoiName,
        products: [item],
        totalPrice: this.getItemTotal(item),
      });
    }

    return Array.from(groups.values());
  }

  trackByAoiGroup(index: number, group: OrderAoiGroupView): string {
    return `${group.key}-${index}`;
  }

  private normalizeAoiKey(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, '-') || 'ilgi-alani';
  }

  getTotalProductCount(): number {
    return this.order?.orderProducts?.length || 0;
  }

  getProductPrice(item: OrderProductModel): number | null {
    const value = this.getItemValue(item, 'calculatedTotalPrice')
      ?? this.getItemValue(item, 'totalPrice')
      ?? item?.product?.price;

    return this.toNullableNumber(value);
  }

  getItemCount(item: OrderProductModel): number {
    return Math.max(1, this.toNumber(this.getItemValue(item, 'numberOf'), 1));
  }

  getItemArea(item: OrderProductModel): number {
    return this.toNumber(this.getItemValue(item, 'requestAreaKm2'), 0);
  }

  getItemUnitPrice(item: OrderProductModel): number {
    const snapshotPrice = this.getItemValue(item, 'unitPrice');
    return this.toNumber(snapshotPrice ?? item?.product?.price, 0);
  }

  getItemBaseTotal(item: OrderProductModel): number {
    const explicit = this.toNullableNumber(this.getItemValue(item, 'baseTotalPrice'));
    if (explicit !== null) {
      return explicit;
    }

    return this.getItemArea(item) * this.getItemUnitPrice(item);
  }

  getItemProcessingTotal(item: OrderProductModel): number {
    const optionsTotal = this.getProcessingOptions(item)
      .reduce((sum, option) => sum + option.totalPrice, 0);

    const explicit = this.toNullableNumber(
      this.getFirstItemValue(item, [
        'processingTotalPrice',
        'ProcessingTotalPrice',
        'processingPrice',
        'ProcessingPrice',
      ])
    );

    // Backend eski kayıtlarda 0 döndürebiliyor. Seçeneklerden hesaplanan
    // tutar pozitifse onu esas alıyoruz.
    if (optionsTotal > 0) {
      return optionsTotal;
    }

    return Math.max(0, explicit ?? 0);
  }

  getItemTotal(item: OrderProductModel): number {
    const calculated = this.toNullableNumber(
      this.getFirstItemValue(item, [
        'calculatedTotalPrice',
        'CalculatedTotalPrice',
        'totalPrice',
        'TotalPrice',
      ])
    );

    const computed = (
      this.getItemBaseTotal(item) +
      this.getItemProcessingTotal(item)
    ) * this.getItemCount(item);

    // Snapshot toplamı seçenek toplamından küçük kalmışsa yeni hesaplanan
    // toplamı göster. Bu, eski sipariş kayıtlarını da doğru görüntüler.
    if (computed > 0 && (calculated === null || calculated < computed)) {
      return computed;
    }

    return Math.max(0, calculated ?? computed);
  }

  getAoiName(item: OrderProductModel): string {
    const value =
      this.getFirstItemValue(item, ['aoiName', 'AoiName']) ??
      this.getFirstItemValue(item, ['sourceLabel', 'SourceLabel']) ??
      (item.product as any)?.sourceLabel;

    return String(value ?? 'İlgi Alanı').trim() || 'İlgi Alanı';
  }

  getProcessingOptions(item: OrderProductModel): OrderProcessingOptionView[] {
    const raw = this.getFirstItemValue(item, [
      'processingOptions',
      'ProcessingOptions',
      'processingOptionsJson',
      'ProcessingOptionsJson',
    ]);

    const parsedOptions = this.unwrapProcessingOptions(raw)
      .map((option: any, index: number): OrderProcessingOptionView | null => {
        const keyValue = this.getObjectValue(option, [
          'key', 'Key', 'code', 'Code', 'type', 'Type',
        ]);
        const normalizedKey = this.normalizeProcessingKey(keyValue);
        const nameValue = this.getObjectValue(option, [
          'name', 'Name', 'displayName', 'DisplayName', 'label', 'Label',
        ]);
        const areaKm2 = this.toNumber(
          this.getObjectValue(option, ['areaKm2', 'AreaKm2', 'area', 'Area']),
          this.getItemArea(item)
        );
        const unitPrice = this.toNumber(
          this.getObjectValue(option, ['unitPrice', 'UnitPrice', 'price', 'Price']),
          0
        );
        const totalValue = this.toNullableNumber(
          this.getObjectValue(option, [
            'totalPrice', 'TotalPrice', 'total', 'Total', 'amount', 'Amount',
          ])
        );
        const selectedValue = this.getObjectValue(option, [
          'selected', 'Selected', 'isSelected', 'IsSelected', 'enabled', 'Enabled',
        ]);

        if (selectedValue === false || selectedValue === 'false') {
          return null;
        }

        const totalPrice = Math.max(0, totalValue ?? (areaKm2 * unitPrice));

        return {
          key: normalizedKey || String(keyValue ?? index),
          name: String(
            nameValue ??
            this.getProcessingOptionName(normalizedKey) ??
            keyValue ??
            this.translate.instant('ORDER_DETAIL_VIEW.PROCESSING_SERVICE')
          ),
          areaKm2,
          unitPrice,
          totalPrice,
        };
      })
      .filter((option): option is OrderProcessingOptionView => option !== null);

    if (parsedOptions.length) {
      return parsedOptions;
    }

    // Eski siparişlerde ProcessingOptionsJson boş olsa bile seçilen servisler
    // Product üzerindeki boolean alanlarda tutulmuş olabilir.
    const product = item?.product as any;
    const areaKm2 = this.getItemArea(item);
    const fallbackOptions: OrderProcessingOptionView[] = [];

    this.addFallbackProcessingOption(
      fallbackOptions,
      product?.isOrthorectified ?? product?.IsOrthorectified,
      'orthorectification',
      250,
      areaKm2
    );
    this.addFallbackProcessingOption(
      fallbackOptions,
      product?.isPansharpened ?? product?.IsPansharpened,
      'pansharpening',
      180,
      areaKm2
    );
    this.addFallbackProcessingOption(
      fallbackOptions,
      product?.isNVDIAnalysis ?? product?.IsNVDIAnalysis ?? product?.isNDVIAnalysis ?? product?.IsNDVIAnalysis,
      'ndvi',
      120,
      areaKm2
    );
    this.addFallbackProcessingOption(
      fallbackOptions,
      product?.isClassified ?? product?.IsClassified,
      'classification',
      300,
      areaKm2
    );

    if (fallbackOptions.length) {
      return fallbackOptions;
    }

    // İşleme toplamı pozitif fakat seçenek snapshot'ı gelmiyorsa "seçenek yok"
    // demek yerine tutardan servisi çıkar. Bilinen birim fiyatlardan biriyle
    // eşleşiyorsa gerçek adı gösterilir; eşleşmezse genel hizmet adı kullanılır.
    const explicitTotal = Math.max(
      0,
      this.toNumber(
        this.getFirstItemValue(item, [
          'processingTotalPrice',
          'ProcessingTotalPrice',
          'processingPrice',
          'ProcessingPrice',
        ]),
        0
      )
    );

    if (explicitTotal <= 0) {
      return [];
    }

    const inferredUnitPrice = areaKm2 > 0 ? explicitTotal / areaKm2 : explicitTotal;
    const inferredKey = this.getProcessingKeyByUnitPrice(inferredUnitPrice);

    return [{
      key: inferredKey ?? 'processing-service',
      name: inferredKey
        ? (this.getProcessingOptionName(inferredKey) ?? this.translate.instant('ORDER_DETAIL_VIEW.PROCESSING_SERVICE'))
        : this.translate.instant('ORDER_DETAIL_VIEW.PROCESSING_SERVICE'),
      areaKm2,
      unitPrice: inferredUnitPrice,
      totalPrice: explicitTotal,
    }];
  }

  private addFallbackProcessingOption(
    options: OrderProcessingOptionView[],
    selected: unknown,
    key: string,
    unitPrice: number,
    areaKm2: number
  ): void {
    if (selected !== true && String(selected).toLowerCase() !== 'true') {
      return;
    }

    options.push({
      key,
      name: this.getProcessingOptionName(key) ?? this.translate.instant('ORDER_DETAIL_VIEW.PROCESSING_SERVICE'),
      unitPrice,
      areaKm2,
      totalPrice: Math.max(0, areaKm2 * unitPrice),
    });
  }

  private getProcessingKeyByUnitPrice(unitPrice: number): string | null {
    const prices: Array<{ key: string; price: number }> = [
      { key: 'orthorectification', price: 250 },
      { key: 'pansharpening', price: 180 },
      { key: 'ndvi', price: 120 },
      { key: 'classification', price: 300 },
    ];

    const match = prices.find(x => Math.abs(x.price - unitPrice) < 0.01);
    return match?.key ?? null;
  }

  private unwrapProcessingOptions(raw: unknown): any[] {
    let value: any = raw;

    // API bazı sürümlerde JSON'u iki kez serialize etmiş olabilir.
    for (let index = 0; index < 3 && typeof value === 'string'; index++) {
      const text = value.trim();

      if (!text) {
        return [];
      }

      try {
        value = JSON.parse(text);
      } catch {
        return [];
      }
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (!value || typeof value !== 'object') {
      return [];
    }

    const candidateKeys = [
      '$values',
      'values',
      'Values',
      'items',
      'Items',
      'data',
      'Data',
      'processingOptions',
      'ProcessingOptions',
      'options',
      'Options',
    ];

    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const nested = this.unwrapProcessingOptions(value[key]);
        if (nested.length) {
          return nested;
        }
      }
    }

    // Tek seçenek object olarak geldiyse onu da kabul et.
    const hasOptionShape = [
      'key', 'Key', 'name', 'Name', 'unitPrice', 'UnitPrice',
      'totalPrice', 'TotalPrice'
    ].some(key => Object.prototype.hasOwnProperty.call(value, key));

    return hasOptionShape ? [value] : [];
  }

  private normalizeProcessingKey(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[\s_-]+/g, '');
  }

  private getProcessingOptionName(key: string): string | null {
    switch (key) {
      case 'orthorectification':
      case 'ortorektifikasyon':
        return this.translate.instant('ORDER_DETAIL_VIEW.ORTHORECTIFICATION');
      case 'pansharpening':
        return this.translate.instant('ORDER_DETAIL_VIEW.PANSHARPENING');
      case 'ndvi':
      case 'ndvianalizi':
      case 'nvdi':
      case 'nvdianalizi':
        return this.translate.instant('ORDER_DETAIL_VIEW.NDVI_ANALYSIS');
      case 'classification':
      case 'siniflama':
        return this.translate.instant('ORDER_DETAIL_VIEW.CLASSIFICATION');
      default:
        return null;
    }
  }

  isApiKey(item: OrderProductModel): boolean {
    const productName = String(item?.product?.name ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR');

    const itemType = String(this.getItemValue(item, 'itemType') ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR');

    return (
      item?.product?.id === 1 ||
      item?.product?.categoryId === 2 ||
      productName === 'api key' ||
      productName.includes('api key') ||
      itemType === 'processingservice'
    );
  }

  isCustomSatelliteRequest(item: OrderProductModel): boolean {
    return !this.isApiKey(item) && item?.product?.isCustomArea === true;
  }

  hasSatelliteMetadata(item: OrderProductModel): boolean {
    return !!(
      item?.product?.provider ||
      item?.product?.satellite ||
      item?.product?.sensor ||
      item?.product?.resolution ||
      item?.product?.acquisitionDate ||
      item?.product?.acquisitionStartDate ||
      item?.product?.acquisitionEndDate ||
      (item?.product as any)?.imageType ||
      item?.product?.cloudRate !== undefined && item?.product?.cloudRate !== null ||
      (item?.product as any)?.offNadirAngle !== undefined && (item?.product as any)?.offNadirAngle !== null
    );
  }

  formatMoney(value: unknown): string {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toNumber(value, 0));
  }

  formatArea(value: unknown): string {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(this.toNumber(value, 0));
  }

  trackByOrderProduct(index: number, item: OrderProductModel): string {
    return `${item?.id ?? 0}-${item?.product?.id ?? 0}-${index}`;
  }

  trackByProcessingOption(index: number, option: OrderProcessingOptionView): string {
    return `${option.key}-${index}`;
  }

  private getItemValue(item: OrderProductModel, key: string): any {
    return (item as any)?.[key];
  }

  private getFirstItemValue(item: OrderProductModel, keys: string[]): any {
    for (const key of keys) {
      const value = this.getItemValue(item, key);
      if (value !== undefined && value !== null) {
        return value;
      }
    }

    return undefined;
  }

  private getObjectValue(source: any, keys: string[]): any {
    if (!source || typeof source !== 'object') {
      return undefined;
    }

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = source[key];
        if (value !== undefined && value !== null) {
          return value;
        }
      }
    }

    return undefined;
  }

  private toNumber(value: unknown, fallback: number): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  goBack() {
    this.location.back();
  }

  getOrderWithFiles(): OrderModel[] {
    return this.hasFile(this.order) ? [this.order] : [];
  }

  hasAnyOrderFile(): boolean {
    return this.getOrderWithFiles().length > 0;
  }
}
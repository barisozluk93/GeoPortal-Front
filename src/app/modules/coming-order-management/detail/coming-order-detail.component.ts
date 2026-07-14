import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { Location, formatDate } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { OrderStatusEnum } from 'src/app/enums/order-status.enum';
import { OrderModel } from '../../coming-order-management/models/order.model';
import { OrderProductModel } from '../../coming-order-management/models/orderproduct.model';
import { ComingOrderManagementService } from '../coming-order-management.service';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';

@Component({
  selector: 'app-coming-order-detail',
  templateUrl: './coming-order-detail.component.html',
  styleUrls: ['./coming-order-detail.component.scss'],
})
export class ComingOrderDetailComponent implements OnInit, OnDestroy {
  header = '';
  orderId!: number;
  order!: OrderModel;

  loading = false;

  invoiceUploading = false;
  invoiceDeleting = false;
  updatingProductId: number | null = null;

  selectedStatusMap: { [key: number]: number | null } = {};
  statusOptions: Array<{ value: number; label: string }> = [];

  mapPreviewDrawerOpen = false;
  selectedPreviewProduct: OrderProductModel | null = null;
  selectedPreviewWkt: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private comingOrderManagementService: ComingOrderManagementService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    @Inject(LOCALE_ID) public locale: string,
    private location: Location,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateHeader();
        this.buildStatusOptions();

        if (this.orderId) {
          this.getById();
        }
      });

    this.updateHeader();
    this.buildStatusOptions();

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
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
    document.body.style.overflow = '';
  }

  private updateHeader(): void {
    this.header = this.translate.instant('ORDER_DETAIL');
  }

  private buildStatusOptions(): void {
    this.statusOptions = [
      { value: 0, label: this.translate.instant('PENDING_APPROVAL') },
      { value: 1, label: this.translate.instant('APPROVED') },
      { value: 2, label: this.translate.instant('REJECTED') },
      { value: 3, label: this.translate.instant('PREPARING') },
      { value: 4, label: this.translate.instant('COMPLETED') },
    ];
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

    forkJoin(keys.map((key) => this.translate.get(key))).subscribe((translations) => {
      const [
        orderCompletedText,
        orderNotCompletedText,
        pendingApprovalText,
        approvedText,
        preparingText,
        rejectedText,
        completedText
      ] = translations;

      this.comingOrderManagementService.getById(this.orderId).subscribe({
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

          data.orderProducts?.forEach((orderProduct) => {
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

            if (orderProduct?.id != null) {
              this.selectedStatusMap[orderProduct.id] = orderProduct.orderStatus ?? null;
            }
          });

          this.order = data;
        },
        error: () => {
          this.loading = false;
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
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

  onInvoiceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (!file || !this.orderId) {
      return;
    }

    this.invoiceUploading = true;

    const formData = new FormData();
    formData.append('file', file);

    this.comingOrderManagementService.upload(formData).subscribe({
      next: (result: any) => {
        this.invoiceUploading = false;
        input.value = '';

        if (result?.isSuccess) {
          this.order.fileId = result.data.id;

          this.comingOrderManagementService.addInvoice(this.order.id, this.order.fileId!).subscribe({
            next: (saveResult) => {
              if (saveResult.isSuccess) {
                this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
                this.getById();
              } else {
                this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
              }
            },
            error: () => {
              this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
            }
          });
        } else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      },
      error: () => {
        this.invoiceUploading = false;
        input.value = '';
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  deleteInvoice(): void {
    if (!this.orderId || !this.order?.fileId) {
      return;
    }

    this.invoiceDeleting = true;

    this.comingOrderManagementService.deleteInvoice(this.order.id).subscribe({
      next: (result: any) => {
        this.invoiceDeleting = false;

        if (result?.isSuccess) {
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
          this.getById();
        } else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      },
      error: () => {
        this.invoiceDeleting = false;
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  isStatusUpdateDisabled(item: OrderProductModel): boolean {
    return item.orderStatus === 2 || item.orderStatus === 4;
  }

  isUpdateButtonDisabled(item: OrderProductModel): boolean {
    const selectedValue = this.selectedStatusMap[item.id];
    return (
      this.isStatusUpdateDisabled(item) ||
      selectedValue == null ||
      selectedValue === item.orderStatus ||
      this.updatingProductId === item.id
    );
  }

  getAvailableStatusOptions(item: OrderProductModel): Array<{ value: number; label: string }> {
    const status = item.orderStatus;

    let allowed: number[] = [];

    switch (status) {
      case 0:
        allowed = [0, 1, 2];
        break;
      case 1:
        allowed = [1, 3];
        break;
      case 2:
        allowed = [2];
        break;
      case 3:
        allowed = [3, 4];
        break;
      case 4:
        allowed = [4];
        break;
      default:
        return [];
    }

    return allowed.map((s) => ({
      value: s,
      label: this.getOrderStatusText(s)
    }));
  }

  updateProductStatus(item: OrderProductModel): void {
    const selectedStatus = this.selectedStatusMap[item.id];

    if (
      item?.id == null ||
      selectedStatus == null ||
      this.isStatusUpdateDisabled(item) ||
      selectedStatus === item.orderStatus
    ) {
      return;
    }

    this.updatingProductId = item.id;

    item.orderStatus = selectedStatus;
    this.comingOrderManagementService.updateStatus(item.id, selectedStatus).subscribe({
      next: (result: any) => {
        this.updatingProductId = null;

        if (result?.isSuccess) {
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
          this.getById();
        } else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      },
      error: () => {
        this.updatingProductId = null;
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  getTotalProductCount(): number {
    return this.order?.orderProducts?.length || 0;
  }

  getProductPrice(item: OrderProductModel): number | null {
    return this.getCalculatedTotal(item);
  }

  isApiKey(item: OrderProductModel): boolean {
    const raw: any = item;
    const product: any = item?.product;
    const name = String(product?.name ?? '').trim().toLocaleLowerCase('tr-TR');

    return (
      product?.id === 1 ||
      product?.categoryId === 2 ||
      raw?.itemType === 'processingService' ||
      name === 'api key' ||
      name.includes('api key')
    );
  }

  getItemCount(item: OrderProductModel): number {
    const value = Number((item as any)?.numberOf ?? 1);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  formatArea(value: number | null | undefined): string {
    const parsed = Number(value ?? 0);
    const safeValue = Number.isFinite(parsed) ? parsed : 0;

    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(safeValue);
  }

  getRequestArea(item: OrderProductModel): number {
    const raw: any = item;
    const product: any = item?.product;
    return this.toNonNegativeNumber(
      raw?.requestAreaKm2 ??
      raw?.RequestAreaKm2 ??
      product?.requestAreaKm2 ??
      product?.areaKm2,
      0
    );
  }

  getUnitPrice(item: OrderProductModel): number {
    const raw: any = item;
    const product: any = item?.product;
    return this.toNonNegativeNumber(
      raw?.unitPrice ??
      raw?.UnitPrice ??
      product?.unitPrice ??
      product?.price,
      0
    );
  }

  getBaseTotal(item: OrderProductModel): number {
    const raw: any = item;
    const explicit = this.toNonNegativeNumber(
      raw?.baseTotalPrice ?? raw?.BaseTotalPrice,
      0
    );

    if (explicit > 0) {
      return explicit;
    }

    if (this.isApiKey(item)) {
      return this.getUnitPrice(item);
    }

    return this.getRequestArea(item) * this.getUnitPrice(item);
  }

  getProcessingOptions(item: OrderProductModel): any[] {
    const raw: any = item;
    const product: any = item?.product;

    const candidates = [
      raw?.processingOptions,
      raw?.ProcessingOptions,
      raw?.processingOptionsJson,
      raw?.ProcessingOptionsJson,
      product?.processingOptions,
      product?.ProcessingOptions,
      product?.processingOptionsJson,
      product?.ProcessingOptionsJson
    ];

    for (const candidate of candidates) {
      const parsed = this.parseProcessingOptions(candidate);
      if (parsed.length) {
        return parsed.map(option => this.normalizeProcessingOption(option, item));
      }
    }

    const inferred: any[] = [];
    const area = this.getRequestArea(item);

    this.addBooleanProcessingOption(
      inferred,
      product?.isOrthorectified,
      'orthorectification',
      'ORDER_DETAIL_VIEW.ORTHORECTIFICATION',
      250,
      area
    );
    this.addBooleanProcessingOption(
      inferred,
      product?.isPansharpened,
      'pansharpening',
      'ORDER_DETAIL_VIEW.PANSHARPENING',
      180,
      area
    );
    this.addBooleanProcessingOption(
      inferred,
      product?.isNVDIAnalysis ?? product?.isNDVIAnalysis,
      'ndvi',
      'ORDER_DETAIL_VIEW.NDVI',
      120,
      area
    );
    this.addBooleanProcessingOption(
      inferred,
      product?.isClassified,
      'classification',
      'ORDER_DETAIL_VIEW.CLASSIFICATION',
      300,
      area
    );

    if (inferred.length) {
      return inferred;
    }

    const processingTotal = this.getStoredProcessingTotal(item);
    if (processingTotal > 0) {
      const unitPrice = area > 0 ? processingTotal / area : processingTotal;
      const key = this.resolveProcessingKeyByUnitPrice(unitPrice);

      return [{
        key,
        nameKey: this.getProcessingNameKey(key),
        name: null,
        areaKm2: area,
        unitPrice,
        totalPrice: processingTotal
      }];
    }

    return [];
  }

  getProcessingTotal(item: OrderProductModel): number {
    const optionsTotal = this.getProcessingOptions(item)
      .reduce((sum, option) => sum + this.toNonNegativeNumber(option?.totalPrice, 0), 0);
    const storedTotal = this.getStoredProcessingTotal(item);
    return Math.max(optionsTotal, storedTotal);
  }

  getCalculatedTotal(item: OrderProductModel): number {
    const raw: any = item;
    const explicit = this.toNonNegativeNumber(
      raw?.calculatedTotalPrice ??
      raw?.CalculatedTotalPrice ??
      raw?.totalPrice ??
      raw?.TotalPrice,
      0
    );

    const calculated =
      (this.getBaseTotal(item) + this.getProcessingTotal(item)) *
      this.getItemCount(item);

    return Math.max(explicit, calculated);
  }

  getAoiName(item: OrderProductModel): string {
    const raw: any = item;
    const product: any = item?.product;
    return String(
      raw?.aoiName ??
      raw?.AoiName ??
      product?.aoiName ??
      product?.sourceLabel ??
      this.translate.instant('ORDER_DETAIL_VIEW.AOI')
    );
  }

  getProcessingOptionLabel(option: any): string {
    if (option?.name) {
      return String(option.name);
    }

    return this.translate.instant(
      option?.nameKey ?? this.getProcessingNameKey(option?.key)
    );
  }

  private getStoredProcessingTotal(item: OrderProductModel): number {
    const raw: any = item;
    return this.toNonNegativeNumber(
      raw?.processingTotalPrice ?? raw?.ProcessingTotalPrice,
      0
    );
  }

  private parseProcessingOptions(value: unknown, depth = 0): any[] {
    if (depth > 4 || value == null) {
      return [];
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return [];
      }

      try {
        return this.parseProcessingOptions(JSON.parse(trimmed), depth + 1);
      } catch {
        return [];
      }
    }

    if (typeof value === 'object') {
      const objectValue: any = value;
      const nestedCandidates = [
        objectValue.$values,
        objectValue.items,
        objectValue.data,
        objectValue.value,
        objectValue.processingOptions,
        objectValue.ProcessingOptions
      ];

      for (const nested of nestedCandidates) {
        const parsed = this.parseProcessingOptions(nested, depth + 1);
        if (parsed.length) {
          return parsed;
        }
      }
    }

    return [];
  }

  private normalizeProcessingOption(option: any, item: OrderProductModel): any {
    const area = this.toNonNegativeNumber(
      option?.areaKm2 ?? option?.AreaKm2,
      this.getRequestArea(item)
    );
    const unitPrice = this.toNonNegativeNumber(
      option?.unitPrice ?? option?.UnitPrice,
      0
    );
    const totalPrice = this.toNonNegativeNumber(
      option?.totalPrice ?? option?.TotalPrice,
      area * unitPrice
    );
    const key = this.normalizeProcessingKey(option?.key ?? option?.Key ?? option?.name ?? option?.Name);

    return {
      key,
      name: option?.name ?? option?.Name ?? null,
      nameKey: this.getProcessingNameKey(key),
      areaKm2: area,
      unitPrice,
      totalPrice
    };
  }

  private addBooleanProcessingOption(
    target: any[],
    selected: unknown,
    key: string,
    nameKey: string,
    unitPrice: number,
    areaKm2: number
  ): void {
    if (selected !== true) {
      return;
    }

    target.push({
      key,
      nameKey,
      name: null,
      areaKm2,
      unitPrice,
      totalPrice: areaKm2 * unitPrice
    });
  }

  private normalizeProcessingKey(value: unknown): string {
    const normalized = String(value ?? '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[\s_-]+/g, '');

    if (normalized.includes('ortorekt') || normalized.includes('orthorect')) return 'orthorectification';
    if (normalized.includes('pansharp')) return 'pansharpening';
    if (normalized.includes('ndvi') || normalized.includes('nvdi')) return 'ndvi';
    if (normalized.includes('sinif') || normalized.includes('classif')) return 'classification';
    return 'processing';
  }

  private resolveProcessingKeyByUnitPrice(unitPrice: number): string {
    const rounded = Math.round(unitPrice);
    if (rounded === 250) return 'orthorectification';
    if (rounded === 180) return 'pansharpening';
    if (rounded === 120) return 'ndvi';
    if (rounded === 300) return 'classification';
    return 'processing';
  }

  private getProcessingNameKey(key: string): string {
    switch (key) {
      case 'orthorectification':
        return 'ORDER_DETAIL_VIEW.ORTHORECTIFICATION';
      case 'pansharpening':
        return 'ORDER_DETAIL_VIEW.PANSHARPENING';
      case 'ndvi':
        return 'ORDER_DETAIL_VIEW.NDVI';
      case 'classification':
        return 'ORDER_DETAIL_VIEW.CLASSIFICATION';
      default:
        return 'ORDER_DETAIL_VIEW.PROCESSING_SERVICE';
    }
  }

  private toNonNegativeNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  goBack(): void {
    this.location.back();
  }

  getOrderWithFiles(): OrderModel[] {
    return this.hasFile(this.order) ? [this.order] : [];
  }

  hasAnyOrderFile(): boolean {
    return this.getOrderWithFiles().length > 0;
  }

  canPreviewProduct(item: OrderProductModel): boolean {
    return item?.product?.categoryId === 3;
  }

  openMapPreview(item: OrderProductModel): void {
    const wkt = this.resolveProductWkt(item);

    if (!wkt) {
      return;
    }

    this.selectedPreviewProduct = item;
    this.selectedPreviewWkt = wkt;
    this.mapPreviewDrawerOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeMapPreview(): void {
    this.mapPreviewDrawerOpen = false;
    this.selectedPreviewProduct = null;
    this.selectedPreviewWkt = null;
    document.body.style.overflow = '';
  }

  private resolveProductWkt(item: OrderProductModel): string | null {
    const product: any = item?.product;
    const orderProduct: any = item;

    const candidates = [
      product?.wkt,
      product?.areaWkt,
      product?.geometryWkt,
      product?.polygonWkt,
      product?.footprintWkt,
      orderProduct?.wkt,
      orderProduct?.areaWkt,
      orderProduct?.geometryWkt,
      orderProduct?.polygonWkt,
      orderProduct?.footprintWkt
    ];

    const found = candidates.find((x) => typeof x === 'string' && x.trim().length > 0);
    return found ? found.trim() : null;
  }
}
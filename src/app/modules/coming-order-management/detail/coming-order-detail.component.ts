import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { Location, formatDate } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { OrderStatusEnum } from 'src/app/enums/order-status.enum';
import { OrderModel } from '../../coming-order-management/models/order.model';
import { OrderProductModel } from '../../coming-order-management/models/orderproduct.model';
import { ComingOrderManagementService } from '../coming-order-management.service';

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

  previewModalOpen = false;
  previewUrl: SafeResourceUrl | null = null;
  previewFileName = '';

  invoiceUploading = false;
  invoiceDeleting = false;
  updatingProductId: number | null = null;

  selectedStatusMap: { [key: number]: number | null } = {};

  statusOptions: Array<{ value: number; label: string }> = [];

  private destroy$ = new Subject<void>();

  constructor(
    private comingOrderManagementService: ComingOrderManagementService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    @Inject(LOCALE_ID) public locale: string,
    private location: Location
  ) { }

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

    forkJoin(keys.map(key => this.translate.get(key))).subscribe(translations => {
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

  isImageFile(fileName?: string): boolean {
    if (!fileName) {
      return false;
    }

    const lower = fileName.toLowerCase();

    return (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.bmp')
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

          this.comingOrderManagementService.addInvoice(this.order.id, this.order.fileId!).subscribe(saveResult => {
            if (saveResult.isSuccess) {
              this.getById();
            } else {
            }
          });
        }
      },
      error: () => {
        this.invoiceUploading = false;
        input.value = '';
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
          this.getById();
        }
      },
      error: () => {
        this.invoiceDeleting = false;
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
        return []; // 2 ve 4 → update yok
    }

    return allowed.map(s => ({
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
          this.getById();
        }
      },
      error: () => {
        this.updatingProductId = null;
      }
    });
  }

  getTotalProductCount(): number {
    return this.order?.orderProducts?.length || 0;
  }

  getProductPrice(item: OrderProductModel): number | null {
    return item?.product?.price ?? null;
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
}
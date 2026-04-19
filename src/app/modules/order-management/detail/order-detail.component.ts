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

  getTotalProductCount(): number {
    return this.order?.orderProducts?.length || 0;
  }

  getProductPrice(item: OrderProductModel): number | null {
    return item?.product?.price ?? null;
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
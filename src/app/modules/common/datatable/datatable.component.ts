import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ColumnModel } from 'src/app/models/column-model';
import { PaginationModel } from 'src/app/models/pagination.model';
import { AuthService } from '../../auth';
import { TranslateService } from '@ngx-translate/core';

export interface DatatableFilterModel {
  [key: string]: any;
}

@Component({
  selector: 'app-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
})
export class DataTableComponent implements OnInit, OnDestroy {
  @Input() header: string;
  @Input() columnList: ColumnModel[];
  @Input() dataSource: any[];
  @Input() totalCount: number;
  @Input() paginationModel: PaginationModel;
  @Input() hasEditPermission: boolean;
  @Input() hasDeletePermission: boolean;
  @Input() hasNewRecordPermission: boolean;
  @Input() hasShowPermission: boolean = false;
  @Input() hasMapPreviewPermission: boolean = false;
  @Input() hasExportPermission: boolean = false;
  @Input() filterModel: DatatableFilterModel = {};

  @Output() paginationModelChange: EventEmitter<PaginationModel> = new EventEmitter<PaginationModel>();
  @Output() newButtonClick: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() editButtonClick: EventEmitter<number> = new EventEmitter<number>();
  @Output() deleteButtonClick: EventEmitter<number> = new EventEmitter<number>();
  @Output() showButtonClick: EventEmitter<number> = new EventEmitter<number>();
  @Output() filterModelChange: EventEmitter<DatatableFilterModel> = new EventEmitter<DatatableFilterModel>();
  @Output() mapPreviewClick: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() exportExcelClick: EventEmitter<boolean> = new EventEmitter<boolean>();

  permissionList: number[] = [];
  showFilters: boolean = false;

  typeFilterOptions = [
    { label: 'Base Map', value: 1 },
    { label: 'WMS', value: 2 },
    { label: 'WFS', value: 3 },
    { label: 'WMTS', value: 4 }
  ];

  booleanFilterOptions = [
    { label: 'YES', value: true },
    { label: 'NO', value: false },
  ];
  booleanFilterOptionsTemp = [
    { label: 'YES', value: true },
    { label: 'NO', value: false },
  ];

  statusFilterOptions = [
    { label: 'ACTIVE', value: false },
    { label: 'PASSIVE', value: true },
  ];
  statusFilterOptionsTemp = [
    { label: 'ACTIVE', value: false },
    { label: 'PASSIVE', value: true },
  ];

  orderStatusFilterOptions = [
    { label: 'PENDING_APPROVAL', value: 0 },
    { label: 'APPROVED', value: 1 },
    { label: 'REJECTED', value: 2 },
    { label: 'PREPARING', value: 3 },
    { label: 'COMPLETED', value: 4 },
    { label: 'ORDER_COMPLETED', value: 5 },
    { label: 'ORDER_NOT_YET_COMPLETED', value: 6 },
  ];
  orderStatusFilterOptionsTemp = [
    { label: 'PENDING_APPROVAL', value: 0 },
    { label: 'APPROVED', value: 1 },
    { label: 'REJECTED', value: 2 },
    { label: 'PREPARING', value: 3 },
    { label: 'COMPLETED', value: 4 },
    { label: 'ORDER_COMPLETED', value: 5 },
    { label: 'ORDER_NOT_YET_COMPLETED', value: 6 },
  ];

  supportStatusFilterOptions = [
    { label: 'SUPPORT_MANAGEMENT.STATUS_NEW', value: 'New' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_ADMIN', value: 'WaitingForAdmin' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_CUSTOMER', value: 'WaitingForCustomer' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CUSTOMER_REPLIED', value: 'CustomerReplied' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CLOSED', value: 'Closed' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_SPAM', value: 'Spam' },
  ];

  supportStatusFilterOptionsTemp = [
    { label: 'SUPPORT_MANAGEMENT.STATUS_NEW', value: 'New' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_ADMIN', value: 'WaitingForAdmin' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_CUSTOMER', value: 'WaitingForCustomer' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CUSTOMER_REPLIED', value: 'CustomerReplied' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CLOSED', value: 'Closed' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_SPAM', value: 'Spam' },
  ];

  constructor(private authService: AuthService, private translate: TranslateService) { }

  ngOnInit(): void {
    this.statusFilterOptions.forEach(item => {
      item.label = this.translate.instant(item.label);
    });

    this.booleanFilterOptions.forEach(item => {
      item.label = this.translate.instant(item.label);
    });

    this.orderStatusFilterOptions.forEach(item => {
      item.label = this.translate.instant(item.label);
    });

    this.supportStatusFilterOptions.forEach(item => {
      item.label = this.translate.instant(item.label);
    });

    this.translate.onLangChange.subscribe(() => {
      let tempList: any = [];

      this.statusFilterOptionsTemp.forEach(item => {
        const tempItem = { label: this.translate.instant(item.label), value: item.value };
        tempList.push(tempItem);
      });
      this.statusFilterOptions = tempList;

      tempList = [];
      this.booleanFilterOptionsTemp.forEach(item => {
        const tempItem = { label: this.translate.instant(item.label), value: item.value };
        tempList.push(tempItem);
      });
      this.booleanFilterOptions = tempList;

      tempList = [];
      this.orderStatusFilterOptionsTemp.forEach(item => {
        const tempItem = { label: this.translate.instant(item.label), value: item.value };
        tempList.push(tempItem);
      });
      this.orderStatusFilterOptions = tempList;

      tempList = [];
      this.supportStatusFilterOptionsTemp.forEach(item => {
        const tempItem = { label: this.translate.instant(item.label), value: item.value };
        tempList.push(tempItem);
      });
      this.supportStatusFilterOptions = tempList;
    });

    this.authService.currentUserSubject.asObservable().subscribe((result) => {
      if (result?.permissions) {
        this.permissionList = JSON.parse(result.permissions) as number[];
      }
    });
  }

  ngOnDestroy(): void { }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onMapPreviewClick(): void {
    this.mapPreviewClick.emit(true);
  }

  onExportExcelClick(): void {
    this.exportExcelClick.emit(true);
  }

  onRowClick(id: number): void {
    this.showButtonClick.emit(id);
  }

  openDeleteModal(id: number): void {
    this.deleteButtonClick.emit(id);
  }

  openEditModal(id: number): void {
    this.editButtonClick.emit(id);
  }

  openSaveModal(): void {
    this.newButtonClick.emit(true);
  }

  onPageChanges(): void {
    this.paginationModelChange.emit(this.paginationModel);
  }


  onDateFilterChange(
    columnKey: string,
    relatedColumnKey: string,
    type: 'from' | 'to',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const selectedValue = input.value;
    const previousValue = this.getFilterValue(columnKey) || '';
    const relatedValue = this.getFilterValue(relatedColumnKey);

    input.setCustomValidity('');

    if (!selectedValue) {
      this.onColumnFilterChange(columnKey, null);
      return;
    }

    if (!relatedValue) {
      this.onColumnFilterChange(columnKey, selectedValue);
      return;
    }

    const selectedDate = this.parseLocalDate(selectedValue);
    const relatedDate = this.parseLocalDate(relatedValue);

    const isInvalidDate = !selectedDate || !relatedDate;

    // Aynı gün dahil olmak üzere geçersiz aralıkları reddeder.
    const isInvalidRange =
      !isInvalidDate &&
      (type === 'from'
        ? selectedDate!.getTime() >= relatedDate!.getTime()
        : selectedDate!.getTime() <= relatedDate!.getTime());

    if (isInvalidDate || isInvalidRange) {
      input.value = previousValue;

      const message =
        type === 'from'
          ? this.translate.currentLang === 'tr'
            ? 'Başlangıç tarihi bitiş tarihinden önce olmalı; aynı gün seçilemez.'
            : 'Start date must be before end date; the same day cannot be selected.'
          : this.translate.currentLang === 'tr'
            ? 'Bitiş tarihi başlangıç tarihinden sonra olmalı; aynı gün seçilemez.'
            : 'End date must be after start date; the same day cannot be selected.';

      input.setCustomValidity(message);
      input.reportValidity();

      setTimeout(() => {
        input.setCustomValidity('');
      });

      return;
    }

    this.onColumnFilterChange(columnKey, selectedValue);
  }

  getMinEndDate(startColumnKey: string): string | null {
    const startValue = this.getFilterValue(startColumnKey);

    if (!startValue) {
      return null;
    }

    // Başlangıç günü ve öncesi bitiş takviminde disable olur.
    return this.addDaysToDateValue(startValue, 1);
  }

  getMaxStartDate(endColumnKey: string): string | null {
    const endValue = this.getFilterValue(endColumnKey);

    if (!endValue) {
      return null;
    }

    // Bitiş günü ve sonrası başlangıç takviminde disable olur.
    return this.addDaysToDateValue(endValue, -1);
  }

  private addDaysToDateValue(value: string, days: number): string | null {
    const date = this.parseLocalDate(value);

    if (!date) {
      return null;
    }

    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseLocalDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const parts = value.split('-').map(Number);

    if (
      parts.length !== 3 ||
      parts.some((part) => Number.isNaN(part))
    ) {
      return null;
    }

    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  onColumnFilterChange(columnKey: string, value: any): void {
    const normalizedValue =
      typeof value === 'string' ? value.trim() : value;

    const nextFilterModel: DatatableFilterModel = {
      ...(this.filterModel || {}),
      [columnKey]: normalizedValue,
    };

    if (
      normalizedValue === '' ||
      normalizedValue === null ||
      normalizedValue === undefined
    ) {
      delete nextFilterModel[columnKey];
    }

    this.filterModel = nextFilterModel;
    this.filterModelChange.emit(nextFilterModel);
  }

  clearAllFilters(): void {
    const clearedFilterModel: DatatableFilterModel = {};
    this.filterModel = clearedFilterModel;
    this.filterModelChange.emit(clearedFilterModel);
  }

  getFilterValue(columnKey: string): any {
    return this.filterModel?.[columnKey] ?? null;
  }

  toNumberOrNull(value: any): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  getLayerTypeLabel(type: number): string {
    switch (type) {
      case 1:
        return 'Base Map';
      case 2:
        return 'WMS';
      case 3:
        return 'WFS';
      case 4:
        return 'WMTS';
      default:
        return '-';
    }
  }

  getSupportStatusLabel(status: string): string {
    switch (status) {
      case 'New':
        return this.translate.currentLang == "tr" ? 'Yeni' : 'New';
      case 'WaitingForAdmin':
        return this.translate.currentLang == "tr" ? 'Admin Bekliyor' : 'Waiting for Admin';
      case 'WaitingForCustomer':
        return this.translate.currentLang == "tr" ? 'Müşteri Bekliyor' : 'Waiting for Customer';
      case 'CustomerReplied':
        return this.translate.currentLang == "tr" ? 'Müşteri Cevapladı' : 'Customer Replied';
      case 'Closed':
        return this.translate.currentLang == "tr" ? 'Kapalı' : 'Closed';
      case 'Spam':
        return this.translate.currentLang == "tr" ? 'Spam' : 'Spam';
      default:
        return '-';
    }
  }

  getSupportStatusBadgeClass(status: string): string {
    switch (status) {
      case 'New':
        return 'badge-light-primary';
      case 'WaitingForAdmin':
        return 'badge-light-warning';
      case 'WaitingForCustomer':
        return 'badge-light-info';
      case 'CustomerReplied':
        return 'badge-light-success';
      case 'Closed':
        return 'badge-light-danger';
      case 'Spam':
        return 'badge-light-danger';
      default:
        return 'badge-light';
    }
  }

  getOrderStatusBadgeClass(status: string | number): string {
    switch (status) {
      case 0:
      case this.translate.currentLang == "tr" ? 'Onay Bekliyor' : 'Pending Approval':
        return 'badge-light-warning';

      case 1:
      case this.translate.currentLang == "tr" ? 'Onaylandı' : 'Approved':
        return 'badge-light-primary';

      case 2:
      case this.translate.currentLang == "tr" ? 'Reddedildi' : 'Rejected':
        return 'badge-light-danger';

      case 3:
      case this.translate.currentLang == "tr" ? 'Hazırlanıyor' : 'Preparing':
        return 'badge-light-info';

      case 4:
      case this.translate.currentLang == "tr" ? 'Tamamlandı' : 'Completed':
        return 'badge-light-success';

      case 5:
      case this.translate.currentLang == "tr" ? 'Sipariş Tamamlandı' : 'Order Completed':
        return 'badge-light-success';

      case 6:
      case this.translate.currentLang == "tr" ? 'Sipariş Henüz Tamamlanmadı' : 'Order Not Yet Completed':
        return 'badge-light-danger';

      default:
        return 'badge-light-dark';
    }
  }
}
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
  @Input() filterModel: DatatableFilterModel = {};

  @Output() paginationModelChange: EventEmitter<PaginationModel> = new EventEmitter<PaginationModel>();
  @Output() newButtonClick: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() editButtonClick: EventEmitter<number> = new EventEmitter<number>();
  @Output() deleteButtonClick: EventEmitter<number> = new EventEmitter<number>();
  @Output() showButtonClick: EventEmitter<number> = new EventEmitter<number>();
  @Output() filterModelChange: EventEmitter<DatatableFilterModel> = new EventEmitter<DatatableFilterModel>();

  permissionList: number[] = [];
  showFilters: boolean = false;

  typeFilterOptions = [
    { label: 'Base Map', value: 1 },
    { label: 'WMS', value: 2 },
    { label: 'WFS', value: 3 },
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

  onColumnFilterChange(columnKey: string, value: any): void {
    const nextFilterModel: DatatableFilterModel = {
      ...(this.filterModel || {}),
      [columnKey]: value,
    };

    if (value === '' || value === null || value === undefined) {
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
      default:
        return '-';
    }
  }

  getSupportStatusLabel(status: string): string {
    switch (status) {
      case 'New':
        return 'Yeni';
      case 'WaitingForAdmin':
        return 'Admin Bekliyor';
      case 'WaitingForCustomer':
        return 'Müşteri Bekliyor';
      case 'CustomerReplied':
        return 'Müşteri Cevapladı';
      case 'Closed':
        return 'Kapalı';
      case 'Spam':
        return 'Spam';
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
        return 'badge-light-dark';
      case 'Spam':
        return 'badge-light-danger';
      default:
        return 'badge-light';
    }
  }
}
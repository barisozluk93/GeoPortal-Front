import { Component, OnInit } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { ColumnModel } from 'src/app/models/column-model';
import { PaginationModel } from 'src/app/models/pagination.model';
import { PermissionEnum } from 'src/app/enums/permission.enum';

import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { AuthService } from '../auth';

import { SupportManagementService } from './support-management.service';
import { SupportTicketModel } from './models/support-ticket.model';

interface DatatableFilterModel {
  [key: string]: any;
}

@Component({
  selector: 'app-support-management',
  templateUrl: './support-management.component.html',
  styleUrls: ['./support-management.component.scss'],
})
export class SupportManagementComponent implements OnInit {
  header = 'SUPPORT_MANAGEMENT.HEADER';

  dataSource: SupportTicketModel[] = [];
  totalCount = 0;

  hasEditPermission = false;
  hasDeletePermission = false;
  hasNewRecordPermission = false;
  hasExportPermission = false;
  hasShowPermission = false;

  filterModel: DatatableFilterModel = {};

  paginationModel: PaginationModel = {
    pageNumber: 1,
    pageSize: 10,
  } as PaginationModel;

  summary = {
    newCount: 0,
    waitingForAdminCount: 0,
    waitingForCustomerCount: 0,
    customerRepliedCount: 0,
    closedCount: 0,
  };

  columnListTr: ColumnModel[] = [
    { name: 'SUPPORT_MANAGEMENT.COLUMN_TICKET_NO', index: 'ticketNo', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_CUSTOMER', index: 'customerName', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_EMAIL', index: 'customerEmail', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_SUBJECT', index: 'subject', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_STATUS', index: 'status', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_LAST_MESSAGE', index: 'lastMessageAtDisplay', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_ACTIONS', index: null, visibility: true },
  ];

  columnListEn: ColumnModel[] = [
    { name: 'SUPPORT_MANAGEMENT.COLUMN_TICKET_NO', index: 'ticketNo', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_CUSTOMER', index: 'customerName', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_EMAIL', index: 'customerEmail', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_SUBJECT', index: 'subject', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_STATUS', index: 'status', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_LAST_MESSAGE', index: 'lastMessageAtDisplay', visibility: true },
    { name: 'SUPPORT_MANAGEMENT.COLUMN_ACTIONS', index: null, visibility: true },
  ];

  columnList: ColumnModel[] = [];

  statusOptions = [
    { label: 'SUPPORT_MANAGEMENT.STATUS_NEW', value: 'New' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_ADMIN', value: 'WaitingForAdmin' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_CUSTOMER', value: 'WaitingForCustomer' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CUSTOMER_REPLIED', value: 'CustomerReplied' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CLOSED', value: 'Closed' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_SPAM', value: 'Spam' },
  ];

  statusOptionsTemp = [
    { label: 'SUPPORT_MANAGEMENT.STATUS_NEW', value: 'New' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_ADMIN', value: 'WaitingForAdmin' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_CUSTOMER', value: 'WaitingForCustomer' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CUSTOMER_REPLIED', value: 'CustomerReplied' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CLOSED', value: 'Closed' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_SPAM', value: 'Spam' },
  ];

  constructor(
    private supportManagementService: SupportManagementService,
    private alertService: AlertService,
    private translate: TranslateService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.controlPermissions();

    this.statusOptions = this.statusOptions.map((item) => ({
      ...item,
      label: this.translate.instant(item.label),
    }));

    this.translate.onLangChange.subscribe(() => {
      this.statusOptions = this.statusOptionsTemp.map((item) => ({
        label: this.translate.instant(item.label),
        value: item.value,
      }));

      this.setColumnList();
    });

    this.setColumnList();
    this.loadTickets();
  }

  controlPermissions(): void {
    this.authService.currentUserSubject.asObservable().subscribe((result) => {
      if (result?.permissions) {
        const permissionList = JSON.parse(result.permissions) as number[];

        this.hasEditPermission = permissionList.includes(
          PermissionEnum['SupportScene.Edit.Permission']
        );

        this.hasExportPermission = permissionList.includes(
          PermissionEnum['Table.Export.Permission']
        );

        // İstersen bunları da backend permissionlarına göre açarsın
        this.hasDeletePermission = false;
        this.hasNewRecordPermission = false;
        this.hasShowPermission = false;
      } else {
        this.hasEditPermission = false;
        this.hasExportPermission = false;
        this.hasDeletePermission = false;
        this.hasNewRecordPermission = false;
        this.hasShowPermission = false;
      }
    });
  }

  setColumnList(): void {
    const currentLang = this.translate.currentLang;

    if (currentLang === 'tr') {
      this.columnList = this.columnListTr.map((item) => ({
        ...item,
        name: this.translate.instant(item.name),
      }));
      return;
    }

    this.columnList = this.columnListEn.map((item) => ({
      ...item,
      name: this.translate.instant(item.name),
    }));
  }

  loadTickets(): void {
    const filterParams = this.buildFilterQueryParams(this.filterModel);

    this.supportManagementService
      .paging(this.paginationModel.pageNumber, this.paginationModel.pageSize, filterParams)
      .subscribe({
        next: (result) => {
          const rawData = result?.data?.items || [];

          const mapped = rawData.map((item: SupportTicketModel) => ({
            ...item,
            lastMessageAtDisplay: this.formatDate(item.lastMessageAtUtc),
          }));

          const filtered = this.applyClientFilters(mapped);

          this.totalCount = filtered.length;
          this.dataSource = filtered;
          this.calculateSummary(rawData);
        },
        error: () => {
          this.alertService.createAlert(
            'danger',
            this.translate.instant('SUPPORT_MANAGEMENT.ALERT.LIST_ERROR')
          );
        },
      });
  }

  onPaginationChanged(model: PaginationModel): void {
    this.paginationModel = { ...model };
    this.loadTickets();
  }

  onFilterChanged(model: DatatableFilterModel): void {
    this.filterModel = { ...model };
    this.paginationModel.pageNumber = 1;
    this.loadTickets();
  }

  openDetailPage(id: number): void {
    if (!id) {
      return;
    }

    this.router.navigate(['/supportmanagement/', id]);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'New':
        return this.translate.instant('SUPPORT_MANAGEMENT.STATUS_NEW');
      case 'WaitingForAdmin':
        return this.translate.instant('SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_ADMIN');
      case 'WaitingForCustomer':
        return this.translate.instant('SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_CUSTOMER');
      case 'CustomerReplied':
        return this.translate.instant('SUPPORT_MANAGEMENT.STATUS_CUSTOMER_REPLIED');
      case 'Closed':
        return this.translate.instant('SUPPORT_MANAGEMENT.STATUS_CLOSED');
      case 'Spam':
        return this.translate.instant('SUPPORT_MANAGEMENT.STATUS_SPAM');
      default:
        return status || '-';
    }
  }

  getStatusBadgeClass(status: string): string {
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

  private calculateSummary(list: SupportTicketModel[]): void {
    this.summary = {
      newCount: list.filter((x) => x.status === 'New').length,
      waitingForAdminCount: list.filter((x) => x.status === 'WaitingForAdmin').length,
      waitingForCustomerCount: list.filter((x) => x.status === 'WaitingForCustomer').length,
      customerRepliedCount: list.filter((x) => x.status === 'CustomerReplied').length,
      closedCount: list.filter((x) => x.status === 'Closed').length,
    };
  }

  private applyClientFilters(list: any[]): any[] {
    let filtered = [...list];

    if (this.filterModel?.ticketNo) {
      filtered = filtered.filter((x) =>
        (x.ticketNo || '')
          .toString()
          .toLowerCase()
          .includes(String(this.filterModel.ticketNo).toLowerCase())
      );
    }

    if (this.filterModel?.customerName) {
      filtered = filtered.filter((x) =>
        (x.customerName || '')
          .toLowerCase()
          .includes(String(this.filterModel.customerName).toLowerCase())
      );
    }

    if (this.filterModel?.customerEmail) {
      filtered = filtered.filter((x) =>
        (x.customerEmail || '')
          .toLowerCase()
          .includes(String(this.filterModel.customerEmail).toLowerCase())
      );
    }

    if (this.filterModel?.subject) {
      filtered = filtered.filter((x) =>
        (x.subject || '')
          .toLowerCase()
          .includes(String(this.filterModel.subject).toLowerCase())
      );
    }

    if (this.filterModel?.status) {
      filtered = filtered.filter((x) => x.status === this.filterModel.status);
    }

    return filtered;
  }

  private formatDate(date: string): string {
    if (!date) {
      return '-';
    }

    const value = new Date(date);

    if (isNaN(value.getTime())) {
      return '-';
    }

    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  buildFilterQueryParams(filterModel: Record<string, any>): HttpParams {
    let params = new HttpParams();

    Object.entries(filterModel || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  exportExcel(event: boolean): void {
    this.supportManagementService.exportExcel().subscribe({
      next: (response) => {
        const blob = response.body;

        if (!blob) {
          return;
        }

        const fileName =
          this.getFileNameFromHeader(response.headers.get('content-disposition')) ||
          'DestekTalepleri.xlsx';

        this.downloadBlob(blob, fileName);
      },
      error: (err) => {
        console.error('Excel export hatası:', err);

        this.alertService.createAlert(
          'danger',
          this.translate.instant('SUPPORT_MANAGEMENT.ALERT.EXPORT_ERROR')
        );
      },
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = fileName;
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  }

  private getFileNameFromHeader(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
    return match?.[1] ?? null;
  }
}
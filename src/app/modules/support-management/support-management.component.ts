import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColumnModel } from 'src/app/models/column-model';
import { PaginationModel } from 'src/app/models/pagination.model';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { SupportManagementService } from './support-management.service';
import { TranslateService } from '@ngx-translate/core';
import { SupportTicketModel } from './models/support-ticket.model';
import { HttpParams } from '@angular/common/http';

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
  isDetailModalOpen = false;
  isSubmitting = false;
  replyForm: FormGroup

  dataSource: SupportTicketModel[] = [];
  selectedTicket: SupportTicketModel | null = null;
  totalCount = 0;

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
    private fb: FormBuilder,
    private supportManagementService: SupportManagementService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.statusOptions.forEach(item => {
      item.label = this.translate.instant(item.label);
    });

    this.translate.onLangChange.subscribe(() => {
      let tempList: any = [];

      this.statusOptionsTemp.forEach(item => {
        const tempItem = { label: this.translate.instant(item.label), value: item.value };
        tempList.push(tempItem);
      });
      this.statusOptions = tempList;
    });

    this.setColumnList();
    this.loadTickets();
    this.initForm();

    this.translate.onLangChange.subscribe(() => {
      this.setColumnList();
    });
  }

  setColumnList(): void {
    const currentLang = this.translate.currentLang;

    if (currentLang === 'tr') {
      this.columnList = this.columnListTr.map(item => ({
        ...item,
        name: this.translate.instant(item.name)
      }));
    } else {
      this.columnList = this.columnListEn.map(item => ({
        ...item,
        name: this.translate.instant(item.name)
      }));
    }
  }

  initForm() {
    this.replyForm = this.fb.group({
      status: ['WaitingForCustomer', Validators.required],
      adminEmail: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(2)]],
    });
  }


  loadTickets(): void {
    const filterParams = this.buildFilterQueryParams(this.filterModel);

    this.supportManagementService.paging(this.paginationModel.pageNumber, this.paginationModel.pageSize, filterParams)
      .subscribe(result => {
        const rawData = result?.data.items || [];
        const mapped = rawData.map((item: SupportTicketModel) => ({
          ...item,
          lastMessageAtDisplay: this.formatDate(item.lastMessageAtUtc),
        }));

        const filtered = this.applyClientFilters(mapped);

        this.totalCount = filtered.length;
        this.dataSource = filtered;
        this.calculateSummary(rawData);
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

  openDetailModal(id: number): void {
    this.supportManagementService.getTicketById(id).subscribe({
      next: (result) => {
        this.selectedTicket = result?.data || null;

        if (!this.selectedTicket) {
          this.alertService.createAlert('warning', this.translate.instant('SUPPORT_MANAGEMENT.ALERT.TICKET_NOT_FOUND'));
          return;
        }

        this.replyForm.patchValue({
          status: this.selectedTicket.status || 'WaitingForCustomer',
          adminEmail: this.selectedTicket.assignedAdminEmail || '',
          message: '',
        });

        this.isDetailModalOpen = true;
      },
      error: () => {
        this.alertService.createAlert('danger', this.translate.instant('SUPPORT_MANAGEMENT.ALERT.TICKET_DETAIL_ERROR'));
      },
    });
  }

  openReplyModal(id: number): void {
    this.openDetailModal(id);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedTicket = null;
    this.replyForm.reset({
      status: 'WaitingForCustomer',
      adminEmail: '',
      message: '',
    });
  }

  submitReply(): void {
    if (!this.selectedTicket || this.replyForm.invalid) {
      this.replyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const formValue = this.replyForm.getRawValue();

    this.supportManagementService.replyTicket(this.selectedTicket.id, {
      adminEmail: formValue.adminEmail,
      message: formValue.message,
    }).subscribe({
      next: () => {
        this.supportManagementService.updateTicketStatus(this.selectedTicket!.id, {
          status: formValue.status,
        }).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.alertService.createAlert('success', this.translate.instant('SUPPORT_MANAGEMENT.ALERT.REPLY_SUCCESS'));
            this.openDetailModal(this.selectedTicket!.id);
            this.loadTickets();
          },
          error: () => {
            this.isSubmitting = false;
            this.alertService.createAlert('warning', this.translate.instant('SUPPORT_MANAGEMENT.ALERT.REPLY_SUCCESS_STATUS_ERROR'));
            this.loadTickets();
          },
        });
      },
      error: () => {
        this.isSubmitting = false;
        this.alertService.createAlert('danger', this.translate.instant('SUPPORT_MANAGEMENT.ALERT.REPLY_ERROR'));
      },
    });
  }

  updateStatusOnly(): void {
    if (!this.selectedTicket) {
      return;
    }

    const status = this.replyForm.get('status')?.value;

    if (!status) {
      this.replyForm.get('status')?.markAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.supportManagementService.updateTicketStatus(this.selectedTicket.id, { status }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.alertService.createAlert('success', this.translate.instant('SUPPORT_MANAGEMENT.ALERT.STATUS_UPDATED'));
        this.openDetailModal(this.selectedTicket!.id);
        this.loadTickets();
      },
      error: () => {
        this.isSubmitting = false;
        this.alertService.createAlert('danger', this.translate.instant('SUPPORT_MANAGEMENT.ALERT.STATUS_UPDATE_ERROR'));
      },
    });
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
      newCount: list.filter(x => x.status === 'New').length,
      waitingForAdminCount: list.filter(x => x.status === 'WaitingForAdmin').length,
      waitingForCustomerCount: list.filter(x => x.status === 'WaitingForCustomer').length,
      customerRepliedCount: list.filter(x => x.status === 'CustomerReplied').length,
      closedCount: list.filter(x => x.status === 'Closed').length,
    };
  }

  private applyPagination(list: any[]): any[] {
    const start = (this.paginationModel.pageNumber - 1) * this.paginationModel.pageSize;
    const end = start + this.paginationModel.pageSize;
    return list.slice(start, end);
  }

  private applyClientFilters(list: any[]): any[] {
    let filtered = [...list];

    if (this.filterModel?.ticketNo) {
      filtered = filtered.filter(x =>
        (x.ticketNo || '').toLowerCase().includes(String(this.filterModel.ticketNo).toLowerCase())
      );
    }

    if (this.filterModel?.customerName) {
      filtered = filtered.filter(x =>
        (x.customerName || '').toLowerCase().includes(String(this.filterModel.customerName).toLowerCase())
      );
    }

    if (this.filterModel?.customerEmail) {
      filtered = filtered.filter(x =>
        (x.customerEmail || '').toLowerCase().includes(String(this.filterModel.customerEmail).toLowerCase())
      );
    }

    if (this.filterModel?.subject) {
      filtered = filtered.filter(x =>
        (x.subject || '').toLowerCase().includes(String(this.filterModel.subject).toLowerCase())
      );
    }

    if (this.filterModel?.status) {
      filtered = filtered.filter(x => x.status === this.filterModel.status);
    }


    return filtered;
  }

  private formatDate(date: string): string {
    if (!date) return '-';

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
}
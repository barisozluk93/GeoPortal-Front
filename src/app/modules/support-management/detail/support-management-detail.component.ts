import {
  Component,
  OnInit,
  AfterViewChecked,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { SupportManagementService } from '../support-management.service';
import { SupportTicketModel } from '../models/support-ticket.model';

@Component({
  selector: 'app-support-management-detail',
  templateUrl: './support-management-detail.component.html',
  styleUrls: ['./support-management-detail.component.scss'],
})
export class SupportManagementDetailComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer?: ElementRef<HTMLDivElement>;

  selectedTicket: SupportTicketModel | null = null;

  isLoading = false;
  isSubmitting = false;

  statusForm!: FormGroup;
  replyForm!: FormGroup;

  statusOptions = [
    { label: 'SUPPORT_MANAGEMENT.STATUS_NEW', value: 'New' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_ADMIN', value: 'WaitingForAdmin' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_CUSTOMER', value: 'WaitingForCustomer' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CUSTOMER_REPLIED', value: 'CustomerReplied' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CLOSED', value: 'Closed' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_SPAM', value: 'Spam' },
  ];

  private rawStatusOptions = [
    { label: 'SUPPORT_MANAGEMENT.STATUS_NEW', value: 'New' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_ADMIN', value: 'WaitingForAdmin' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_WAITING_FOR_CUSTOMER', value: 'WaitingForCustomer' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CUSTOMER_REPLIED', value: 'CustomerReplied' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_CLOSED', value: 'Closed' },
    { label: 'SUPPORT_MANAGEMENT.STATUS_SPAM', value: 'Spam' },
  ];

  private shouldScrollChatToBottom = false;
  private ticketId = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private supportManagementService: SupportManagementService,
    private alertService: AlertService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.prepareStatusOptions();

    this.translate.onLangChange.subscribe(() => {
      this.prepareStatusOptions();
    });

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));

      if (!id || isNaN(id)) {
        this.alertService.createAlert(
          'warning',
          this.translate.instant('SUPPORT_MANAGEMENT.ALERT.TICKET_NOT_FOUND')
        );
        this.backToList();
        return;
      }

      this.ticketId = id;
      this.loadTicket();
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollChatToBottom) {
      this.scrollChatToBottom();
      this.shouldScrollChatToBottom = false;
    }
  }

  get isClosed(): boolean {
    return this.selectedTicket?.status === 'Closed';
  }

  get canReply(): boolean {
    return !!this.selectedTicket && !this.isClosed && !this.isSubmitting;
  }

  get canUpdateStatus(): boolean {
    return !!this.selectedTicket && !this.isClosed && !this.isSubmitting;
  }

  get ticketStatus(): string {
    return this.selectedTicket?.status || '';
  }

  private initForms(): void {
    this.statusForm = this.fb.group({
      status: [null, Validators.required],
    });

    this.replyForm = this.fb.group({
      adminEmail: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  private prepareStatusOptions(): void {
    this.statusOptions = this.rawStatusOptions.map((item) => ({
      label: this.translate.instant(item.label),
      value: item.value,
    }));
  }

  loadTicket(): void {
    if (!this.ticketId) {
      return;
    }

    this.isLoading = true;

    this.supportManagementService.getTicketById(this.ticketId).subscribe({
      next: (result) => {
        this.isLoading = false;
        this.selectedTicket = result?.data || null;

        if (!this.selectedTicket) {
          this.alertService.createAlert(
            'warning',
            this.translate.instant('SUPPORT_MANAGEMENT.ALERT.TICKET_NOT_FOUND')
          );
          this.backToList();
          return;
        }

        this.patchForms();
        this.shouldScrollChatToBottom = true;
      },
      error: () => {
        this.isLoading = false;
        this.alertService.createAlert(
          'danger',
          this.translate.instant('SUPPORT_MANAGEMENT.ALERT.TICKET_DETAIL_ERROR')
        );
      },
    });
  }

  private patchForms(): void {
    if (!this.selectedTicket) {
      return;
    }

    this.statusForm.patchValue({
      status: this.selectedTicket.status || 'WaitingForCustomer',
    });

    this.replyForm.patchValue({
      adminEmail: this.selectedTicket.assignedAdminEmail || '',
      message: '',
    });
  }

  updateStatusOnly(): void {
    if (!this.selectedTicket || this.isClosed) {
      return;
    }

    if (this.statusForm.invalid) {
      this.statusForm.markAllAsTouched();
      return;
    }

    const status = this.statusForm.get('status')?.value;

    this.isSubmitting = true;

    this.supportManagementService
      .updateTicketStatus(this.selectedTicket.id, { status })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.alertService.createAlert(
            'success',
            this.translate.instant('SUPPORT_MANAGEMENT.ALERT.STATUS_UPDATED')
          );
          this.loadTicket();
        },
        error: () => {
          this.isSubmitting = false;
          this.alertService.createAlert(
            'danger',
            this.translate.instant('SUPPORT_MANAGEMENT.ALERT.STATUS_UPDATE_ERROR')
          );
        },
      });
  }

  submitReply(): void {
    if (!this.selectedTicket || this.isClosed) {
      return;
    }

    if (this.replyForm.invalid) {
      this.replyForm.markAllAsTouched();
      return;
    }

    if (this.statusForm.invalid) {
      this.statusForm.markAllAsTouched();
      return;
    }

    const replyFormValue = this.replyForm.getRawValue();
    const selectedStatus = this.statusForm.get('status')?.value;

    this.isSubmitting = true;

    this.supportManagementService
      .replyTicket(this.selectedTicket.id, {
        adminEmail: replyFormValue.adminEmail,
        message: replyFormValue.message,
      })
      .subscribe({
        next: () => {
          this.supportManagementService
            .updateTicketStatus(this.selectedTicket!.id, {
              status: selectedStatus,
            })
            .subscribe({
              next: () => {
                this.isSubmitting = false;
                this.alertService.createAlert(
                  'success',
                  this.translate.instant('MESSAGES.SUCCESS')
                );
                this.loadTicket();
              },
              error: () => {
                this.isSubmitting = false;
                this.alertService.createAlert(
                  'danger',
                  this.translate.instant('MESSAGES.ERROR')
                );
                this.loadTicket();
              },
            });
        },
        error: () => {
          this.isSubmitting = false;
          this.alertService.createAlert(
            'danger',
            this.translate.instant('MESSAGES.ERROR')
          );
        },
      });
  }

  backToList(): void {
    this.router.navigate(['/supportmanagement']);
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
        return 'badge-light-danger';
      case 'Spam':
        return 'badge-light-danger';
      default:
        return 'badge-light';
    }
  }

  getSenderLabel(senderType: string): string {
    if (senderType === 'Admin') {
      return this.translate.instant('SUPPORT_MANAGEMENT.ADMIN');
    }

    if (senderType === 'Customer') {
      return this.translate.instant('SUPPORT_MANAGEMENT.CUSTOMER');
    }

    return senderType || '-';
  }

  formatDate(date: string): string {
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

  trackByMessage(index: number, item: any): any {
    return item?.id || item?.createdAtUtc || index;
  }

  private scrollChatToBottom(): void {
    if (!this.chatContainer?.nativeElement) {
      return;
    }

    const el = this.chatContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }
}
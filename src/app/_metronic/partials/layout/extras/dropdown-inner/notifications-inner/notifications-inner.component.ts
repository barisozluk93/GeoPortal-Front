import { Component, HostBinding, Input, OnChanges, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationModel } from 'src/app/models/notification.model';
import { AuthService } from 'src/app/modules/auth';
import { NotificationService } from './notification.service';
import { TranslateService } from '@ngx-translate/core';
import { AlertService } from '../../../alert/alert.service';

@Component({
  selector: 'app-notifications-inner',
  templateUrl: './notifications-inner.component.html',
  styleUrls: ['./notifications-inner.component.scss']
})
export class NotificationsInnerComponent implements OnInit, OnChanges {
  @HostBinding('class')
  class =
    'menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-800 menu-state-bg-light-primary fw-semibold w-375px border border-gray-200 bg-body shadow-sm overflow-hidden';

  @HostBinding('attr.data-kt-menu')
  dataKtMenu = 'true';

  @Input() notifications: Array<NotificationModel> = [];
  @Input() unreadedNotificationCount: number = 0;
  @Input() totalNotificationCount: number = 0;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: any): void {
    if (changes.notifications) {
      if (changes.notifications.currentValue) {
        changes.notifications.currentValue.forEach((notification: NotificationModel) => {
          if (notification.type == 'NEW_ORDER') {
            notification.body = this.translate.instant('NEW_ORDER_MESSAGE');
          } else if (notification.type == 'ORDER_APPROVED') {
            notification.body = this.translate.instant('ORDER_APPROVED_MESSAGE');
          } else if (notification.type == 'ORDER_REJECTED') {
            notification.body =  this.translate.instant('ORDER_REJECTED_MESSAGE');
          } else if (notification.type == 'ORDER_COMPLETED') {
            notification.body = this.translate.instant('ORDER_COMPLETED_MESSAGE');
          } else if (notification.type == 'ORDER_PREPARING') {
            notification.body =  this.translate.instant('ORDER_PREPARING_MESSAGE');
          }
        });
      }
    }
  }

  delete(notificationId: number): void {
    const notification = this.notifications.find((f) => f.id === notificationId);

    if (!notification) {
      return;
    }

    this.notificationService.delete(notificationId).subscribe({
      next: (result: any) => {
        if (result?.isSuccess) {
          this.notifications = this.notifications.filter((f) => f.id !== notificationId);
          this.totalNotificationCount = this.notifications.length;

          if (!notification.isRead && this.unreadedNotificationCount > 0) {
            this.unreadedNotificationCount--;
          }

          if (notification.userId) {
            this.notificationService.updateNotifications(notification.userId);
          }

          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        }
        else{
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      },
      error: (error) => {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        console.error('Bildirim silinirken hata oluştu:', error);
      }
    });
  }

  goToPage(notification: NotificationModel): void {
    if (!notification) {
      return;
    }

    const currentUser = this.authService.currentUserValue;
    let screen = 'ordermanagement';

    if (currentUser?.roles?.includes('1')) {
      screen = 'incomingordermanagement';
    }

    const navigateUrl = `/${screen}/${notification.targetUrl}`;

    if (!notification.isRead) {
      this.notificationService.read(notification.id).subscribe({
        next: () => {
          notification.isRead = true;

          if (this.unreadedNotificationCount > 0) {
            this.unreadedNotificationCount--;
          }

          this.router.navigate([navigateUrl]);
        },
        error: (error) => {
          console.error('Bildirim okundu yapılırken hata oluştu:', error);
          this.router.navigate([navigateUrl]);
        }
      });
    } else {
      this.router.navigate([navigateUrl]);
    }
  }
}
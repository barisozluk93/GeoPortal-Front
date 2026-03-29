import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationModel } from 'src/app/models/notification.model';
import { AuthService } from 'src/app/modules/auth';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notifications-inner',
  templateUrl: './notifications-inner.component.html',
  styleUrls: ['./notifications-inner.component.scss']
})
export class NotificationsInnerComponent implements OnInit {
  @HostBinding('class')
  class = 'menu menu-sub menu-sub-dropdown menu-column w-350px w-lg-375px';

  @HostBinding('attr.data-kt-menu')
  dataKtMenu = 'true';

  @Input() notifications: Array<NotificationModel> = [];
  @Input() unreadedNotificationCount: number = 0;
  @Input() totalNotificationCount: number = 0;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  delete(notificationId: number): void {
    const notification = this.notifications.find(f => f.id === notificationId);

    if (!notification) {
      return;
    }

    this.notificationService.delete(notificationId).subscribe({
      next: (result: any) => {
        if (result?.isSuccess) {
          this.notifications = this.notifications.filter(f => f.id !== notificationId);
          this.totalNotificationCount = this.notifications.length;

          if (!notification.isRead && this.unreadedNotificationCount > 0) {
            this.unreadedNotificationCount--;
          }

          if (notification.userId) {
            this.notificationService.updateNotifications(notification.userId);
          }
        }
      },
      error: (error) => {
        console.error('Bildirim silinirken hata oluştu:', error);
      }
    });
  }

  goToPage(notification: NotificationModel): void {
    if (!notification) {
      return;
    }

    const navigateUrl = notification.targetUrl
      ? `/memories/${notification.targetUrl}`
      : '/memories';

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
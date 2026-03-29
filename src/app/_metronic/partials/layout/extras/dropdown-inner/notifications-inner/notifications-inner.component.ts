import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { LayoutService } from '../../../../../layout';
import { NotificationModel } from 'src/app/models/notification.model';
import { NotificationService } from './notification.service';
import { AuthService } from 'src/app/modules/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications-inner',
  templateUrl: './notifications-inner.component.html',
})
export class NotificationsInnerComponent implements OnInit {
  @HostBinding('class') class =
    'menu menu-sub menu-sub-dropdown menu-column w-350px w-lg-375px';
  @HostBinding('attr.data-kt-menu') dataKtMenu = 'true';

  @Input() notifications: Array<NotificationModel> = [];
  @Input() unreadedNotificationCount: number = 0;
  @Input() totalNotificationCount: number = 0;

  constructor(private notificationService: NotificationService, private authService: AuthService, private router: Router
  ) { }

  ngOnInit(): void {
  }

  delete(notificationId: number) {
    var notification = this.notifications.filter(f => f.id == notificationId)[0];

    this.notificationService.delete(notificationId).subscribe(result => {
      if(result.isSuccess) {
        this.notificationService.updateNotifications(notification.userId);
      }
    })
  }

  goToOrder(notificationId: number) {

    var notification = this.notifications.filter(f => f.id == notificationId)[0];
    
    this.notificationService.read(notificationId).subscribe(result => {
      this.notificationService.updateNotifications(notification.userId);
    });
  }
}



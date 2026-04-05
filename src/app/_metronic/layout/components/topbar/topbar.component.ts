import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from 'src/app/_metronic/partials/layout/extras/dropdown-inner/notifications-inner/notification.service';
import { NotificationModel } from 'src/app/models/notification.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { UserModel } from 'src/app/modules/user-management/models/user.model';
import { UserManagementService } from 'src/app/modules/user-management/user-management.service';
import { NotificationSignalrService } from 'src/app/modules/common/signalR.service';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit, OnDestroy {
  language!: LanguageFlag;
  langs = languages;
  isCurrentUserExist = true;
  user: UserModel | undefined;

  unreadedNotificationCount = 0;
  totalNotificationCount = 0;
  notifications: NotificationModel[] = [];
  avatarUrl = '';

  private destroy$ = new Subject<void>();
  isNotificationAnimating = false;

  @Input() isAdmin!: boolean;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private router: Router,
    private translate: TranslateService,
    private translationService: TranslationService,
    private signalRService: NotificationSignalrService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.setLanguage(this.translate.currentLang);

    this.listenRealtimeNotifications();

    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshNotificationData();
      });

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.setLanguage(result.lang);
      });

    this.authService.currentUserSubject
      .asObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.isCurrentUserExist = true;

          this.userManagementService.updateUser(result.id!);

          this.userManagementService.user$
            .pipe(takeUntil(this.destroy$))
            .subscribe(userResult => {
              this.user = userResult ?? undefined;
            });

          this.loadNotifications();
          this.loadUnreadedNotificationCount();
        } else {
          this.isCurrentUserExist = false;
          this.user = undefined;
          this.notifications = [];
          this.unreadedNotificationCount = 0;
          this.totalNotificationCount = 0;
          this.avatarUrl = '';
        }
      });
  }

  private triggerNotificationAnimation(): void {
    this.isNotificationAnimating = true;

    setTimeout(() => {
      this.isNotificationAnimating = false;
    }, 700);
  }

  private listenRealtimeNotifications(): void {
    this.signalRService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification: NotificationModel | null) => {
        if (!notification) {
          return;
        }

        const exists = this.notifications.some(x => x.id === notification.id);
        if (exists) {
          return;
        }

        this.notifications.unshift(notification);
        this.totalNotificationCount = this.notifications.length;
        this.unreadedNotificationCount++;

        this.triggerNotificationAnimation();
        this.showNotificationAlert(notification);
      });

    this.signalRService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count: number | null) => {
        if (count === null || count === undefined) {
          return;
        }

        this.unreadedNotificationCount = count;
      });
  }

  private showNotificationAlert(notification: NotificationModel): void {
    let message = '';

    switch (notification.type) {
      case 'NEW_ORDER':
        message = `(${notification.body}) ${this.translate.instant('NEW_ORDER_MESSAGE')}`;
        break;
      case 'ORDER_APPROVED':
        message = `(${notification.body}) ${this.translate.instant('ORDER_APPROVED_MESSAGE')}`;
        break;
      case 'ORDER_REJECTED':
        message = `(${notification.body}) ${this.translate.instant('ORDER_REJECTED_MESSAGE')}`;
        break;
      case 'ORDER_COMPLETED':
        message = `(${notification.body}) ${this.translate.instant('ORDER_COMPLETED_MESSAGE')}`;
        break;
      case 'ORDER_PREPARING':
        message = `(${notification.body}) ${this.translate.instant('ORDER_PREPARING_MESSAGE')}`;
        break;
      default:
        message = notification.body ?? '';
        break;
    }

    if (message) {
      this.alertService.createAlert('info', message);
    }
  }

  loadNotifications(): void {
    if (this.authService.currentUserValue) {
      this.notificationService
        .all(this.authService.currentUserValue.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notifications = response.data ?? [];
            this.totalNotificationCount = this.notifications.length;
          },
          error: (error) => {
            console.error('Bildirimler alınırken hata oluştu:', error);
            this.notifications = [];
            this.totalNotificationCount = 0;
          }
        });
    }
  }

  loadUnreadedNotificationCount(): void {
    if (this.authService.currentUserValue) {
      this.notificationService
        .getUnreadedCount(this.authService.currentUserValue.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.unreadedNotificationCount = response.data ?? 0;
          },
          error: (error) => {
            console.error('Okunmamış bildirim sayısı alınırken hata oluştu:', error);
            this.unreadedNotificationCount = 0;
          }
        });
    }
  }

  refreshNotificationData(): void {
    this.loadNotifications();
    this.loadUnreadedNotificationCount();
  }

  routeToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  setLanguage(lang: string): void {
    this.langs.forEach((language: LanguageFlag) => {
      if (language.lang === lang) {
        language.active = true;
        this.language = language;
      } else {
        language.active = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

interface LanguageFlag {
  lang: string;
  nameTr: string;
  nameEn: string;
  flag: string;
  active?: boolean;
}

const languages: LanguageFlag[] = [
  {
    lang: 'en',
    nameTr: 'İngilizce',
    nameEn: 'English',
    flag: './assets/media/flags/united-states.svg',
  },
  {
    lang: 'tr',
    nameTr: 'Türkçe',
    nameEn: 'Turkish',
    flag: './assets/media/flags/turkey.svg',
  },
];
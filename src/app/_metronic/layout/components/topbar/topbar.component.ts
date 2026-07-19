import { Component, HostListener, OnDestroy, OnInit, NgZone } from '@angular/core';
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
import { RoleEnum } from 'src/app/enums/role.enum';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit, OnDestroy {
  language!: LanguageFlag;
  langs = languages;

  isCurrentUserExist = true;
  isNotificationAnimating = false;
  isLanguageMenuOpen = false;
  isNotificationMenuOpen = false;
  isUserMenuOpen = false;
  isAdmin = false;

  user: UserModel | undefined;

  unreadedNotificationCount = 0;
  totalNotificationCount = 0;

  notifications: NotificationModel[] = [];

  avatarUrl = '';

  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private router: Router,
    private translate: TranslateService,
    private translationService: TranslationService,
    private signalRService: NotificationSignalrService,
    private alertService: AlertService,
    private ngZone: NgZone
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
      .subscribe((result) => {
        this.setLanguage(result.lang);
      });

    this.authService.currentUserSubject
      .asObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.isAdmin =
            result.roles.includes(RoleEnum.SuperAdmin) ?? false;

          this.isCurrentUserExist = true;

          this.userManagementService.updateUser(result.id!);

          this.userManagementService.user$
            .pipe(takeUntil(this.destroy$))
            .subscribe((userResult) => {
              this.user = userResult ?? undefined;
            });

          this.loadNotifications();
          this.loadUnreadedNotificationCount();

        } else {
          this.resetState();
        }
      });
  }


  private resetState(): void {
    this.isAdmin = false;
    this.isCurrentUserExist = false;
    this.user = undefined;
    this.notifications = [];
    this.unreadedNotificationCount = 0;
    this.totalNotificationCount = 0;
    this.avatarUrl = '';
    this.closeAllMenus();
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

        this.ngZone.run(() => {
          const exists = this.notifications.some(
            (x) => x.id === notification.id
          );

          if (exists) {
            return;
          }

          this.notifications.unshift(notification);

          this.totalNotificationCount = this.notifications.length;

          this.unreadedNotificationCount++;

          this.triggerNotificationAnimation();

          this.showNotificationAlert(notification);
        });
      });

    this.signalRService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count: number | null) => {
        if (count === null || count === undefined) {
          return;
        }

        this.ngZone.run(() => {
          this.unreadedNotificationCount = count;
        });
      });
  }

  private showNotificationAlert(
    notification: NotificationModel
  ): void {
    let message = '';

    switch (notification.type) {
      case 'NEW_ORDER':
        message = `(${notification.body}) ${this.translate.instant(
          'NEW_ORDER_MESSAGE'
        )}`;
        break;

      case 'ORDER_APPROVED':
        message = `(${notification.body}) ${this.translate.instant(
          'ORDER_APPROVED_MESSAGE'
        )}`;
        break;

      case 'ORDER_REJECTED':
        message = `(${notification.body}) ${this.translate.instant(
          'ORDER_REJECTED_MESSAGE'
        )}`;
        break;

      case 'ORDER_COMPLETED':
        message = `(${notification.body}) ${this.translate.instant(
          'ORDER_COMPLETED_MESSAGE'
        )}`;
        break;

      case 'ORDER_PREPARING':
        message = `(${notification.body}) ${this.translate.instant(
          'ORDER_PREPARING_MESSAGE'
        )}`;
        break;

      case 'ADD_INVOICE':
        message = `(${notification.body}) ${this.translate.instant(
          'ADD_INVOICE_MESSAGE'
        )}`;
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
    if (!this.authService.currentUserValue) {
      return;
    }

    this.notificationService
      .all(this.authService.currentUserValue.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications = response.data ?? [];
          this.totalNotificationCount = this.notifications.length;
        },
        error: () => {
          this.notifications = [];
          this.totalNotificationCount = 0;
        },
      });
  }

  loadUnreadedNotificationCount(): void {
    if (!this.authService.currentUserValue) {
      return;
    }

    this.notificationService
      .getUnreadedCount(this.authService.currentUserValue.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.unreadedNotificationCount = response.data ?? 0;
        },
        error: () => {
          this.unreadedNotificationCount = 0;
        },
      });
  }

  refreshNotificationData(): void {
    this.loadNotifications();
    this.loadUnreadedNotificationCount();
  }

  toggleLanguageMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const nextState = !this.isLanguageMenuOpen;
    this.closeAllMenus();
    this.isLanguageMenuOpen = nextState;
  }

  closeLanguageMenu(): void {
    this.isLanguageMenuOpen = false;
  }

  toggleNotificationMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const nextState = !this.isNotificationMenuOpen;
    this.closeAllMenus();
    this.isNotificationMenuOpen = nextState;

    if (nextState) {
      this.loadNotifications();
      this.loadUnreadedNotificationCount();
    }
  }

  toggleUserMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const nextState = !this.isUserMenuOpen;
    this.closeAllMenus();
    this.isUserMenuOpen = nextState;
  }

  closeAllMenus(): void {
    this.isLanguageMenuOpen = false;
    this.isNotificationMenuOpen = false;
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAllMenus();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeAllMenus();
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
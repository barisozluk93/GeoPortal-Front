import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from 'src/app/_metronic/partials/layout/extras/dropdown-inner/notifications-inner/notification.service';
import { NotificationModel } from 'src/app/models/notification.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { UserModel } from 'src/app/modules/user-management/models/user.model';
import { UserManagementService } from 'src/app/modules/user-management/user-management.service';
import { environment } from 'src/environments/environment';
import { NotificationSignalrService } from 'src/app/modules/common/signalR.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: [ './topbar.component.scss']
})
export class TopbarComponent implements OnInit, OnDestroy {
  language: LanguageFlag;
  langs = languages;
  isCurrentUserExist: boolean = true;
  user: UserModel | undefined;

  unreadedNotificationCount: number = 0;
  totalNotificationCount: number = 0;
  notifications: NotificationModel[] = [];
  avatarUrl: string = '';

  private destroy$ = new Subject<void>();
  private signalRInitialized = false;
  isNotificationAnimating: boolean = false;
  @Input() isAdminPanel: boolean = false;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private router: Router,
    private translate: TranslateService,
    private translationService: TranslationService,
    private signalRService: NotificationSignalrService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.setLanguage(this.translate.currentLang);

    this.notificationService.notifications$.subscribe(result => {
      this.refreshNotificationData();
    })

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.setLanguage(result.lang);
      });

    this.authService.currentUserSubject
      .asObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(async result => {
        if (result) {
          this.isCurrentUserExist = true;

          this.userManagementService.updateUser(result.id!);

          this.userManagementService.user$
            .pipe(takeUntil(this.destroy$))
            .subscribe(userResult => {
              this.user = userResult!;
            });

          this.loadNotifications();
          this.loadUnreadedNotificationCount();

          if (!this.signalRInitialized) {
            this.signalRInitialized = true;
            this.listenRealtimeNotifications();
          }
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

        if(notification.type == "NEW_ORDER") {
          this.toastr.info("(" + notification.body + ")" + this.translate.instant('NEW_ORDER_MESSAGE'), this.translate.instant('NEW_ORDER'));    
        }
        else if(notification.type == "ORDER_APPROVED") {
          this.toastr.info("(" + notification.body + ")" + this.translate.instant('ORDER_APPROVED_MESSAGE'), this.translate.instant('ORDER_APPROVED'));
        }
        else if(notification.type == "ORDER_REJECTED") {
          this.toastr.info("(" + notification.body + ")" + this.translate.instant('ORDER_REJECTED_MESSAGE'), this.translate.instant('ORDER_REJECTED'));
        }
        else if(notification.type == "ORDER_COMPLETED") {
          this.toastr.info("(" + notification.body + ")" + this.translate.instant('ORDER_COMPLETED_MESSAGE'), this.translate.instant('ORDER_COMPLETED'));
        }
        else if(notification.type == "ORDER_PREPARING") {
          this.toastr.info("(" + notification.body + ")" + this.translate.instant('ORDER_PREPARING_MESSAGE'), this.translate.instant('ORDER_PREPARING'));
        }
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

  loadNotifications(): void {
    this.notificationService
      .all(this.authService.currentUserValue?.id!)
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

  loadUnreadedNotificationCount(): void {
    this.notificationService
      .getUnreadedCount(this.authService.currentUserValue?.id!)
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

const languages = [
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
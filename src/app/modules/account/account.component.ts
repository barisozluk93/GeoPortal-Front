import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, UserType } from '../auth';
import { UserManagementService } from '../user-management/user-management.service';
import { UserModel } from '../user-management/models/user.model';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit, OnDestroy {
  user: UserType | null = null;
  userData: UserModel | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private userManagementService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.auth.currentUserSubject
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.user = result;

        if (this.user?.id) {
          this.userManagementService.updateUser(this.user.id);
        }
      });

    this.userManagementService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.userData = result ?? null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get fullName(): string {
    const name = this.userData?.name ?? '';
    const surname = this.userData?.surname ?? '';
    return `${name} ${surname}`.trim();
  }

  get profileImage(): string {
    return this.userData?.fileResult?.fileContents || './assets/media/avatars/blank.png';
  }
}
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../../../../modules/i18n';
import { AuthService } from '../../../../../../modules/auth';
import { UserModel } from 'src/app/modules/user-management/models/user.model';
import { UserManagementService } from 'src/app/modules/user-management/user-management.service';
import { RoleEnum } from 'src/app/enums/role.enum';

@Component({
  selector: 'app-user-inner',
  templateUrl: './user-inner.component.html',
  styleUrls: ['./user-inner.component.scss'],
})
export class UserInnerComponent implements OnInit, OnDestroy {
  @HostBinding('class')
  class =
    'user-menu-dropdown menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-800 fw-semibold py-3 fs-6 w-300px border border-gray-200 bg-body shadow-sm';

  @HostBinding('attr.data-kt-menu')
  dataKtMenu = 'true';

  isAdmin = false;
  langDropdownOpen = false;

  language!: LanguageFlag;
  user!: UserModel;
  langs = languages;

  private unsubscribe: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private userManagementService: UserManagementService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const authSub = this.auth.currentUserSubject.subscribe((auth) => {
      if (auth?.id) {
        this.isAdmin = auth.roles.includes(RoleEnum.SuperAdmin);
        this.userManagementService.updateUser(auth.id);
      } else {
        this.isAdmin = false;
      }
    });

    const userSub = this.userManagementService.user$.subscribe((result) => {
      if (result) {
        this.user = result;
      }
    });

    this.unsubscribe.push(authSub, userSub);
    this.setLanguage(this.translationService.getSelectedLanguage());
  }

  openLangDropdown(): void {
    this.langDropdownOpen = true;
  }

  closeLangDropdown(): void {
    this.langDropdownOpen = false;
  }

  toggleLangDropdown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.langDropdownOpen = !this.langDropdownOpen;
  }

  selectLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
    this.setLanguage(lang);
    this.langDropdownOpen = false;
  }

  setLanguage(lang: string): void {
    this.langs.forEach((language: LanguageFlag) => {
      language.active = language.lang === lang;

      if (language.lang === lang) {
        this.language = language;
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
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
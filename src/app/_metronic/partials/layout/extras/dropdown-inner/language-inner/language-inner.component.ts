import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../../../../modules/i18n';

@Component({
  selector: 'app-language-inner',
  templateUrl: './language-inner.component.html',
  styleUrls: ['./language-inner.component.scss']
})
export class LanguageInnerComponent implements OnInit, OnDestroy {
  @HostBinding('class')
  class = 'menu menu-sub menu-sub-dropdown menu-column menu-rounded border border-gray-200 shadow-sm py-2 fs-6 w-200px';

  @HostBinding('attr.data-kt-menu')
  dataKtMenu = 'true';

  language!: LanguageFlag;
  langs = languages;
  private unsubscribe: Subscription[] = [];

  constructor(private translationService: TranslationService) {}

  ngOnInit(): void {
    this.setLanguage(this.translationService.getSelectedLanguage());
  }

  selectLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
    this.setLanguage(lang);
  }

  setLanguage(lang: string): void {
    this.langs.forEach((item) => {
      item.active = item.lang === lang;
      if (item.active) this.language = item;
    });
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
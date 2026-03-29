import { Injectable, computed, signal } from '@angular/core';
import { TR } from '../i18n/tr';
import { EN } from '../i18n/en';

export type Language = 'tr' | 'en';
const DICTIONARIES = { tr: TR, en: EN } as const;
export type I18nKey = keyof typeof TR;

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly language = signal<Language>('tr');
  readonly currentLanguage = computed(() => this.language());

  setLanguage(lang: Language): void {
    this.language.set(lang);
  }

  t(key: I18nKey): string {
    return DICTIONARIES[this.language()][key] ?? key;
  }
}

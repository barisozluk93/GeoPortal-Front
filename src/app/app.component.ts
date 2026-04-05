import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { TranslationService } from './modules/i18n';
// language list
import { locale as enLang } from './modules/i18n/vocabs/en';
import { locale as chLang } from './modules/i18n/vocabs/ch';
import { locale as esLang } from './modules/i18n/vocabs/es';
import { locale as jpLang } from './modules/i18n/vocabs/jp';
import { locale as deLang } from './modules/i18n/vocabs/de';
import { locale as frLang } from './modules/i18n/vocabs/fr';
import { locale as trLang } from './modules/i18n/vocabs/tr';
import { ThemeModeService } from './_metronic/partials/layout/theme-mode-switcher/theme-mode.service';
import { AuthService } from './modules/auth';
import { NotificationSignalrService } from './modules/common/signalR.service';
import { environment } from 'src/environments/environment';

@Component({
  // tslint:disable-next-line:component-selector
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'body[root]',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class AppComponent implements OnInit {
  constructor(
    private translationService: TranslationService,
    private modeService: ThemeModeService,
    private authService: AuthService,
    private notificationService: NotificationSignalrService
  ) {
    // register translations
    this.translationService.loadTranslations(
      enLang,
      chLang,
      esLang,
      jpLang,
      deLang,
      frLang,
      trLang
    );
  }

  ngOnInit() {
    this.modeService.init();
    if(this.authService.currentUserValue) {
      const authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
      const lsValue = localStorage.getItem(authLocalStorageToken);
      const authData = JSON.parse(lsValue!);

      if(authData?.accessToken){
        this.notificationService.startConnection(authData?.accessToken);
      }
    }
    //deneme
  }
}

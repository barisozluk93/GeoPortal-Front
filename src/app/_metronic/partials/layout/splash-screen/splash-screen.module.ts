import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SplashScreenComponent } from './splash-screen.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [SplashScreenComponent],
  imports: [CommonModule, TranslateModule],
  exports: [SplashScreenComponent],
})
export class SplashScreenModule {}

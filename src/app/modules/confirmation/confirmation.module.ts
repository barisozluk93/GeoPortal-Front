import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationModule } from '../i18n/translation.module';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { ConfirmationComponent } from './confirmation.component';
import { CustomModalComponent } from '../common/custom-modal/custom-modal.component';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';

@NgModule({
  declarations: [
    ConfirmationComponent,
  ],
  exports: [
    ConfirmationComponent,
  ],
  imports: [
    CommonModule,
    TranslationModule,
    InlineSVGModule,
    CustomModalModule
  ],
})
export class ConfirmationModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { BasketComponent } from './basket.component';
import { BasketService } from './basket.service';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [BasketComponent],
  imports: [CommonModule, InlineSVGModule, TranslateModule],
  exports: [BasketComponent],
  providers: [BasketService]
})
export class BasketModule {}

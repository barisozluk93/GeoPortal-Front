import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { DropdownMenusModule } from 'src/app/_metronic/partials';
import { TranslationModule } from '../../i18n';
import { CustomSelectComponent } from './custom-select.component';

@NgModule({
  declarations: [
    CustomSelectComponent
  ],
  exports: [
    CustomSelectComponent,
  ],
  imports: [
    DropdownMenusModule,
    NgbPaginationModule,
    CommonModule,
    TranslationModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    InlineSVGModule
  ],
})
export class CustomSelectModule {}

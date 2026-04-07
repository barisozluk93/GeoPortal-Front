import { NgModule } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { LandingRoutingModule } from './landing-routing.module';
import { LandingComponent } from './landing.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { MarketplaceComponent } from './marketplace/marketplace.component';
import { DataComponent } from './data/data.component';
import { ApiComponent } from './api/api.component';
import { ContactComponent } from './contact/contact.component';
import { DocumentationComponent } from './documentation/documentation.component';
import { MapComponent } from './map/map.component';
import { CustomSelectModule } from '../common/select/custom-select.module';

@NgModule({
  declarations: [
    LandingComponent,
    MarketplaceComponent,
    DataComponent,
    ApiComponent,
    ContactComponent,
    DocumentationComponent,
    MapComponent
  ],
  imports: [
    CommonModule, 
    LandingRoutingModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    NgbPaginationModule,
    InlineSVGModule,
    CustomSelectModule
  ],
  exports: [
    MapComponent
  ]
})
export class LandingModule {}

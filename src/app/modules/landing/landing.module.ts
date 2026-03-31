import { NgModule } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { LandingRoutingModule } from './landing-routing.module';
import { LandingComponent } from './landing.component';
import { MapViewComponent } from './map-view/map-view.component';
import { DataViewComponent } from './data-view/data-view.component';
import { ApiViewComponent } from './api-view/api-view.component';
import { ContactViewComponent } from './contact-view/contact-view.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MarketplaceViewComponent } from './marketplace-view/marketplace-view.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { DocumentationViewComponent } from './documentation-view/documentation-view.component';

@NgModule({
  declarations: [
    LandingComponent,
    MapViewComponent,
    DataViewComponent,
    ApiViewComponent,
    ContactViewComponent,
    MarketplaceViewComponent,
    DocumentationViewComponent
  ],
  imports: [
    CommonModule, 
    LandingRoutingModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    NgbPaginationModule
  ],
})
export class LandingModule {}

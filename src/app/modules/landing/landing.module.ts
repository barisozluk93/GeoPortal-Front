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
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';
import { MarketplaceDetailDrawerComponent } from './marketplace/detail/marketplace-detail-drawer.component';
import { MapLeftPanelComponent } from './map/left-panel/map-left-panel.component';
import { MapLegendDrawerComponent } from './map/legend/map-legend-drawer.component';
import { MapInfoDrawerComponent } from './map/info/map-info-drawer.component';
import { MapFilterDrawerComponent } from './map/layer-filter/map-filter-drawer.component';
import { MapFeatureInfoDrawerComponent } from './map/feature-info/map-feature-info-drawer.component';
import { MapToolbarComponent } from './map/toolbar/map-toolbar.component';
import { MapCoordinatePanelComponent } from './map/coordinate/map-coordinate-panel.component';
import { MapExportPanelComponent } from './map/export-panel/map-export-panel.component';
import { MapProductSmartFilterComponent } from './map/smart-filter/map-product-smart-filter.component';
import { MapProductSmartFilterResultsPanelComponent } from './map/smart-filter/results/map-product-smart-filter-results-panel.component';

@NgModule({
  declarations: [
    LandingComponent,
    MarketplaceComponent,
    MarketplaceDetailDrawerComponent,
    DataComponent,
    ApiComponent,
    ContactComponent,
    DocumentationComponent,
    MapComponent,
    MapLeftPanelComponent,
    MapLegendDrawerComponent,
    MapInfoDrawerComponent,
    MapFilterDrawerComponent,
    MapFeatureInfoDrawerComponent,
    MapToolbarComponent,
    MapCoordinatePanelComponent,
    MapExportPanelComponent,
    MapProductSmartFilterComponent,
    MapProductSmartFilterResultsPanelComponent
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
    CustomSelectModule,
    CustomModalModule
  ],
  exports: [
    MapComponent
  ]
})
export class LandingModule {}

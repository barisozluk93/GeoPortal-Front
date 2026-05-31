import { NgModule } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { LandingRoutingModule } from './landing-routing.module';
import { LandingComponent } from './landing.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { DataComponent } from './data/data.component';
import { ApiComponent } from './api/api.component';
import { ContactComponent } from './contact/contact.component';
import { DocumentationComponent } from './documentation/documentation.component';
import { MapComponent } from './map/map.component';
import { CustomSelectModule } from '../common/select/custom-select.module';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';
import { MapToolbarComponent } from './map/toolbar/map-toolbar.component';
import { MapExportPanelComponent } from './map/export-panel/map-export-panel.component';
import { LayerManagerComponent } from './map/layer-manager/layer-manager.component';
import { GoToCoordinatePanelComponent } from './map/coordinate/go-to-coordinate-panel.component';
import { LayerLegendPanelComponent } from './map/legend/layer-legend-panel.component';
import { LayerFilterPanelComponent } from './map/layer-filter/layer-filter-panel.component';
import { MapSearchPanelComponent } from './map/search/map-search-panel.component';
import { SmartFilterPanelComponent } from './map/smart-filter/smart-filter-panel.component';
import { SmartProductMetadataPanelComponent } from './map/smart-filter/metadata/smart-product-metadata-panel.component';
import { SmartProductFilterPanelComponent } from './map/smart-filter/filter/smart-product-filter-panel.component';
import { SmartProductRequestPanelComponent } from './map/smart-filter/request/smart-product-request-panel.component';
import { MapPanelShellComponent } from './map/panel-shell/map-panel-shell.component';

@NgModule({
  declarations: [
    LandingComponent,
    DataComponent,
    ApiComponent,
    ContactComponent,
    DocumentationComponent,
    MapComponent,
    LayerLegendPanelComponent,
    LayerFilterPanelComponent,
    MapToolbarComponent,
    GoToCoordinatePanelComponent,
    MapExportPanelComponent,
    LayerManagerComponent,
    MapSearchPanelComponent,
    SmartFilterPanelComponent,
    SmartProductMetadataPanelComponent,
    SmartProductFilterPanelComponent,
    SmartProductRequestPanelComponent,
    MapPanelShellComponent
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

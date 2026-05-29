import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslationModule } from '../i18n/translation.module';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { DataTableModule } from '../common/datatable/datatable.module';
import { MapManagementRoutingModule } from './map-management-routing.module';
import { LayerComponent } from './layer/layer.component';
import { LayerGroupComponent } from './layergroup/layergroup.component';
import { LayerEditSaveComponent } from './layer/edit-save/edit-save.component';
import { LayerGroupEditSaveComponent } from './layergroup/edit-save/edit-save.component';
import { MapManagementComponent } from './map-management.component';
import { LandingModule } from '../landing/landing.module';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';
import { MapComponent } from '../landing/map/map.component';
import { CustomSelectModule } from '../common/select/custom-select.module';
import { LayerMapDrawerComponent } from './layer/map-drawer/layer-map-drawer.component';

@NgModule({
  declarations: [
    MapManagementComponent,
    LayerComponent,
    LayerGroupComponent,
    LayerEditSaveComponent,
    LayerGroupEditSaveComponent,
    LayerMapDrawerComponent
  ],
  imports: [
    DataTableModule,
    ConfirmationModule,
    CommonModule,
    TranslationModule,
    MapManagementRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    LandingModule,
    InlineSVGModule,
    CustomModalModule,
    CustomSelectModule,
  ],
})
export class MapManagementModule {}

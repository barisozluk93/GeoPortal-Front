import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingRoutingModule } from './landing-routing.module';
import { LandingComponent } from './landing.component';
import { MapViewComponent } from './map-view/map-view.component';
import { DataViewComponent } from './data-view/data-view.component';
import { ApiViewComponent } from './api-view/api-view.component';
import { ContactViewComponent } from './contact-view/contact-view.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    LandingComponent,
    MapViewComponent,
    DataViewComponent,
    ApiViewComponent,
    ContactViewComponent
  ],
  imports: [
    CommonModule, 
    LandingRoutingModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule
  ],
})
export class LandingModule {}

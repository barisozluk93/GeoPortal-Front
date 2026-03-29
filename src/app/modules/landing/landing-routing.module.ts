import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { MapViewComponent } from './map-view/map-view.component';
import { DataViewComponent } from './data-view/data-view.component';
import { ApiViewComponent } from './api-view/api-view.component';
import { ContactViewComponent } from './contact-view/contact-view.component';

const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    children: [
      { path: '', redirectTo: 'map', pathMatch: 'full' },
      { path: 'map', component: MapViewComponent },
      { path: 'data', component: DataViewComponent },
      { path: 'api', component: ApiViewComponent },
      { path: 'contact', component: ContactViewComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LandingRoutingModule {}

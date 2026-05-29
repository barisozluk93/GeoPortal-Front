import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { MarketplaceComponent } from './marketplace/marketplace.component';
import { DataComponent } from './data/data.component';
import { ApiComponent } from './api/api.component';
import { ContactComponent } from './contact/contact.component';
import { DocumentationComponent } from './documentation/documentation.component';
import { MapComponent } from './map/map.component';


const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    children: [
      { path: '', redirectTo: 'data', pathMatch: 'full' },
      // { path: 'marketplace', component: MarketplaceComponent },
      { path: 'data', component: DataComponent },
      { path: 'api', component: ApiComponent },
      { path: 'contact', component: ContactComponent },
      { path: 'documentation', component: DocumentationComponent},
      { path: 'map', component: MapComponent}
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LandingRoutingModule {}

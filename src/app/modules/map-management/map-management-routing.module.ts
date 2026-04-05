import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MapManagementComponent } from './map-management.component';
import { LayerComponent } from './layer/layer.component';
import { LayerGroupComponent } from './layergroup/layergroup.component';

const routes: Routes = [
  {
    path: '',
    component: MapManagementComponent,
    children: [
      {
        path: '',
        redirectTo: 'layers',
        pathMatch: 'full',
      },
      {
        path: 'layers',
        component: LayerComponent,
      },
      {
        path: 'layergroups',
        component: LayerGroupComponent,
      },
      { path: '', redirectTo: 'layers', pathMatch: 'full' },
      { path: '**', redirectTo: 'layers', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MapManagementRoutingModule {}

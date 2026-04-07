import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

import { FilterBarComponent } from './components/filter-bar/filter-bar.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { ChartCardComponent } from './components/chart-card/chart-card.component';
import { OrdersTableComponent } from './components/orders-table/orders-table.component';
import { RegionalDemandsComponent } from './components/regional-demands/regional-demands.component';
import { SystemHealthComponent } from './components/system-health/system-health.component';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';

@NgModule({
  declarations: [
    DashboardComponent,
    FilterBarComponent,
    KpiCardComponent,
    ChartCardComponent,
    OrdersTableComponent,
    RegionalDemandsComponent,
    SystemHealthComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    DashboardRoutingModule
  ],
  exports: [DashboardComponent],
})
export class DashboardModule {}
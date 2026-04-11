import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

import { FilterBarComponent } from './components/filter-bar/filter-bar.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { ChartCardComponent } from './components/chart-card/chart-card.component';
import { OrdersTableComponent } from './components/orders-table/orders-table.component';
import { RegionalDemandsComponent } from './components/regional-demands/regional-demands.component';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { CustomSelectModule } from 'src/app/modules/common/select/custom-select.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    DashboardComponent,
    FilterBarComponent,
    KpiCardComponent,
    ChartCardComponent,
    OrdersTableComponent,
    RegionalDemandsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    DashboardRoutingModule,
    CustomSelectModule,
    TranslateModule
  ],
  exports: [DashboardComponent],
})
export class DashboardModule {}
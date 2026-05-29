import { Component, Input, OnChanges } from '@angular/core';
import { DashboardKpis } from '../../dashboard.models';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss'],
})
export class KpiCardComponent implements OnChanges {
  @Input() kpis!: DashboardKpis;

  kpiItems: any[] = [];

  ngOnChanges(): void {
    if (!this.kpis) return;

    this.kpiItems = [
      {
        title: 'DASHBOARD.KPI.TOTAL_REVENUE',
        sub: 'DASHBOARD.KPI.TOTAL_REVENUE_SUB',
        value: this.kpis.totalRevenue,
        format: 'currency',
        icon: 'ki-duotone ki-wallet',
        color: 'kpi-blue'
      },
      // {
      //   title: 'DASHBOARD.KPI.MARKETPLACE',
      //   sub: 'DASHBOARD.KPI.MARKETPLACE_SUB',
      //   value: this.kpis.marketplaceRevenue,
      //   format: 'currency',
      //   icon: 'ki-duotone ki-shop',
      //   color: 'kpi-purple'
      // },
      {
        title: 'DASHBOARD.KPI.API_REVENUE',
        sub: 'DASHBOARD.KPI.API_REVENUE_SUB',
        value: this.kpis.apiRevenue,
        format: 'currency',
        icon: 'ki-duotone ki-code',
        color: 'kpi-cyan'
      },
      {
        title: 'DASHBOARD.KPI.API_SUBSCRIPTIONS',
        sub: 'DASHBOARD.KPI.API_SUBSCRIPTIONS_SUB',
        value: this.kpis.activeApiSubscriptions,
        format: 'number',
        icon: 'ki-duotone ki-technology-2',
        color: 'kpi-green'
      },
      {
        title: 'DASHBOARD.KPI.PENDING_ORDERS',
        sub: 'DASHBOARD.KPI.PENDING_ORDERS_SUB',
        value: this.kpis.pendingOrders,
        format: 'number',
        icon: 'ki-duotone ki-time',
        color: 'kpi-orange'
      },
      {
        title: 'DASHBOARD.KPI.READY_ORDERS',
        sub: 'DASHBOARD.KPI.READY_ORDERS_SUB',
        value: this.kpis.readyOrders,
        format: 'number',
        icon: 'ki-duotone ki-check-circle',
        color: 'kpi-success'
      }
    ];
  }

  formatCurrency(value: number): string {
    return `₺${value.toLocaleString('tr-TR')}`;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('tr-TR');
  }
}
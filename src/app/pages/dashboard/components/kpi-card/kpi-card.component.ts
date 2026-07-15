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
        badge: 'DASHBOARD.CHIPS.REVENUE',
        value: this.kpis.totalRevenue,
        format: 'currency',
        icon: 'ki-outline ki-wallet',
        bgClass: 'bg-light-primary',
        textClass: 'text-primary',
        badgeClass: 'badge-light-primary',
      },
      {
        title: 'DASHBOARD.KPI.API_REVENUE',
        sub: 'DASHBOARD.KPI.API_REVENUE_SUB',
        badge: 'DASHBOARD.CHIPS.API',
        value: this.kpis.apiRevenue,
        format: 'currency',
        icon: 'ki-outline ki-chart-line-up',
        bgClass: 'bg-light-info',
        textClass: 'text-info',
        badgeClass: 'badge-light-info',
      },
      {
        title: 'DASHBOARD.KPI.API_SUBSCRIPTIONS',
        sub: 'DASHBOARD.KPI.API_SUBSCRIPTIONS_SUB',
        badge: 'DASHBOARD.CHIPS.MEMBERS',
        value: this.kpis.activeApiSubscriptions,
        format: 'number',
        icon: 'ki-outline ki-profile-user',
        bgClass: 'bg-light-success',
        textClass: 'text-success',
        badgeClass: 'badge-light-success',
      },
      {
        title: 'DASHBOARD.KPI.PENDING_ORDERS',
        sub: 'DASHBOARD.KPI.PENDING_ORDERS_SUB',
        badge: 'DASHBOARD.CHIPS.PIPELINE',
        value: this.kpis.pendingOrders,
        format: 'number',
        icon: 'ki-outline ki-time',
        bgClass: 'bg-light-warning',
        textClass: 'text-warning',
        badgeClass: 'badge-light-warning',
      },
      {
        title: 'DASHBOARD.KPI.READY_ORDERS',
        sub: 'DASHBOARD.KPI.READY_ORDERS_SUB',
        badge: 'DASHBOARD.CHIPS.ORDERS',
        value: this.kpis.readyOrders,
        format: 'number',
        icon: 'ki-outline ki-check-circle',
        bgClass: 'bg-light-success',
        textClass: 'text-success',
        badgeClass: 'badge-light-success',
      },
    ];
  }

  formatCurrency(value: number): string {
    return `₺${value.toLocaleString('tr-TR')}`;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('tr-TR');
  }
}
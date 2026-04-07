import { Component, Input } from '@angular/core';
import { DashboardKpis } from '../../dashboard.models';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss'],
})
export class KpiCardComponent {
  @Input() kpis!: DashboardKpis;

  formatCurrency(value: number): string {
    return `₺${value.toLocaleString('tr-TR')}`;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('tr-TR');
  }
}
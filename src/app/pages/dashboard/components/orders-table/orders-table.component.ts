import { Component, Input } from '@angular/core';
import { RecentOrder } from '../../dashboard.models';

@Component({
  selector: 'app-orders-table',
  templateUrl: './orders-table.component.html',
  styleUrls: ['./orders-table.component.scss'],
})
export class OrdersTableComponent {
  @Input() orders: RecentOrder[] = [];

  getStatusClass(status: string): string {
    switch (status) {
      case 'Hazır':
      case 'Teslim Edildi':
      case 'Healthy':
        return 'badge text-success bg-success bg-opacity-10 border border-success border-opacity-25';

      case 'İşleniyor':
      case 'Dış Sisteme İletildi':
      case 'Uydu Planlamasında':
      case 'Uydu Bekleniyor':
      case 'Görüntü Geldi':
      case 'Warning':
        return 'badge text-warning bg-warning bg-opacity-10 border border-warning border-opacity-25';

      case 'Başarısız':
      case 'Critical':
        return 'badge text-danger bg-danger bg-opacity-10 border border-danger border-opacity-25';

      default:
        return 'badge text-info bg-info bg-opacity-10 border border-info border-opacity-25';
    }
  }
}
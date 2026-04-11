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
        return 'badge badge-light-success fw-semibold';

      case 'İşleniyor':
      case 'Dış Sisteme İletildi':
      case 'Uydu Planlamasında':
      case 'Uydu Bekleniyor':
      case 'Görüntü Geldi':
      case 'Warning':
        return 'badge badge-light-warning fw-semibold';

      case 'Başarısız':
      case 'Critical':
        return 'badge badge-light-danger fw-semibold';

      default:
        return 'badge badge-light-info fw-semibold';
    }
  }
}
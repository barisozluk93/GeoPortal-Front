import { Component, Input } from '@angular/core';
import { RegionalDemand } from '../../dashboard.models';

@Component({
  selector: 'app-regional-demands',
  templateUrl: './regional-demands.component.html',
  styleUrls: ['./regional-demands.component.scss'],
})
export class RegionalDemandsComponent {
  @Input() demands: RegionalDemand[] = [];

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
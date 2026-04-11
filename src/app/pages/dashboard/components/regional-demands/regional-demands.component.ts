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
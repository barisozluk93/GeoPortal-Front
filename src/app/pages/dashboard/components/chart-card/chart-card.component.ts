import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chart-card',
  templateUrl: './chart-card.component.html',
  styleUrls: ['./chart-card.component.scss'],
})
export class ChartCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() chip = '';
  @Input() chipClass = '';
  @Input() chipIcon = '';
  @Input() chipDot = true;
  @Input() chipDotClass = '';
  @Input() bodyClass = 'pt-2';
}
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-map-legend-drawer',
  templateUrl: './map-legend-drawer.component.html',
  styleUrls: ['./map-legend-drawer.component.scss']
})
export class MapLegendDrawerComponent {
  @Input() open = false;
  @Input() layer: any | null = null;

  @Input() getLayerTypeText!: (layer: any | null) => string;
  @Input() hasLegend!: (layer: any) => boolean;
  @Input() getLegendUrl!: (layer: any | null) => string;

  @Output() close = new EventEmitter<void>();
}
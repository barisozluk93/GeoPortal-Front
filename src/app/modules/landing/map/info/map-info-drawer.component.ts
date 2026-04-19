import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-map-info-drawer',
  templateUrl: './map-info-drawer.component.html',
  styleUrls: ['./map-info-drawer.component.scss']
})
export class MapInfoDrawerComponent {
  @Input() open = false;
  @Input() layer: any | null = null;
  @Input() layerType: any;

  @Input() getLayerTypeText!: (layer: any | null) => string;
  @Input() getDefaultVersion!: (layer: any | null) => string;
  @Input() getDefaultFormat!: (layer: any | null) => string;

  @Output() close = new EventEmitter<void>();
}
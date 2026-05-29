import { Component, EventEmitter, Input, Output } from '@angular/core';

import { LayerModel } from '../../../map-management/models/layer.model';

@Component({
  selector: 'app-layer-legend-panel',
  templateUrl: './layer-legend-panel.component.html',
  styleUrls: ['./layer-legend-panel.component.scss'],
})
export class LayerLegendPanelComponent {
  @Input() layer?: LayerModel;

  @Output() closed = new EventEmitter<void>();

  get legendUrl(): string {
    if (!this.layer?.url || !this.layer?.layerName) return '';

    const separator = this.layer.url.includes('?') ? '&' : '?';

    return (
      `${this.layer.url}${separator}` +
      `SERVICE=WMS` +
      `&VERSION=${encodeURIComponent(this.layer.version || '1.1.1')}` +
      `&REQUEST=GetLegendGraphic` +
      `&FORMAT=image/png` +
      `&LAYER=${encodeURIComponent(this.layer.layerName)}`
    );
  }
}

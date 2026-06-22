import { Component, EventEmitter, Input, Output } from '@angular/core';

import { LayerModel } from '../../../map-management/models/layer.model';

@Component({
  selector: 'app-layer-manager',
  templateUrl: './layer-manager.component.html',
  styleUrls: ['./layer-manager.component.scss'],
})
export class LayerManagerComponent {
  @Input() layers: LayerModel[] = [];

  /**
   * Eski template binding'i `[layerGroups]="..."` kaldıysa projeyi kırmamak için.
   * Yeni kullanım: `[layers]="layers"`.
   */
  @Input()
  set layerGroups(value: LayerModel[] | null | undefined) {
    this.layers = value ?? [];
  }

  @Output() layerVisibilityChanged = new EventEmitter<{
    layer: LayerModel;
    visible: boolean;
  }>();

  get activeLayers(): LayerModel[] {
    return (this.layers ?? [])
      .filter((layer) => !layer.isDeleted)
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));
  }

  isLayerVisible(layer: LayerModel): boolean {
    return layer?.isVisible === true;
  }

  onLayerVisibilityToggle(layer: LayerModel): void {
    const visible = !this.isLayerVisible(layer);

    layer.isVisible = visible;

    this.layerVisibilityChanged.emit({
      layer,
      visible,
    });
  }

  trackLayer(index: number, layer: LayerModel): number | string {
    return layer.id ?? layer.layerName ?? layer.name ?? index;
  }
}

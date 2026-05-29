import { Component, EventEmitter, Input, Output } from '@angular/core';

import { LayerModel } from '../../../map-management/models/layer.model';
import { LayerGroupModel } from '../../../map-management/models/layergroup.model';
import { LayerType } from '../../../map-management/models/layertype.model';

@Component({
  selector: 'app-layer-manager',
  templateUrl: './layer-manager.component.html',
  styleUrls: ['./layer-manager.component.scss'],
})
export class LayerManagerComponent {
  @Input() layerGroups: LayerGroupModel[] = [];
  @Input() baseMapOpacity = 1;

  @Output() baseMapOpacityChanged = new EventEmitter<number>();

  @Output() layerVisibilityChanged = new EventEmitter<{
    layer: LayerModel;
    visible: boolean;
  }>();

  @Output() layerOpacityChanged = new EventEmitter<{
    layer: LayerModel;
    opacity: number;
  }>();

  @Output() layerFilterClicked = new EventEmitter<LayerModel>();
  @Output() layerLegendClicked = new EventEmitter<LayerModel>();
  @Output() layerInfoClicked = new EventEmitter<LayerModel>();

  readonly LayerType = LayerType;

  collapsedGroups = new Set<number | string>();

  get activeGroups(): LayerGroupModel[] {
    return (this.layerGroups ?? [])
      .filter((group) => !group.isDeleted)
      .map((group) => {
        const layers = (group.layers ?? [])
          .filter((layer) => !layer.isDeleted)
          .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

        return {
          ...group,
          layers,
        };
      })
      .filter((group) => group.layers.length > 0);
  }

  toggleGroup(group: LayerGroupModel): void {
    const key = this.getGroupKey(group);

    if (this.collapsedGroups.has(key)) {
      this.collapsedGroups.delete(key);
      return;
    }

    this.collapsedGroups.add(key);
  }

  isGroupCollapsed(group: LayerGroupModel): boolean {
    return this.collapsedGroups.has(this.getGroupKey(group));
  }

  isLayerVisible(layer: LayerModel): boolean {
    return (layer as any)?.isVisible === true;
  }

  onLayerVisibilityToggle(layer: LayerModel): void {
    const visible = !this.isLayerVisible(layer);

    (layer as any).isVisible = visible;

    this.layerVisibilityChanged.emit({
      layer,
      visible,
    });
  }

  getLayerOpacity(layer: LayerModel): number {
    const opacity = layer.opacity;

    if (opacity === null || opacity === undefined) {
      return 1;
    }

    if (opacity > 1) {
      return Math.min(opacity / 100, 1);
    }

    return Math.max(opacity, 0);
  }

  onLayerOpacityChange(layer: LayerModel, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    layer.opacity = value;

    this.layerOpacityChanged.emit({
      layer,
      opacity: value,
    });
  }

  onBaseMapOpacityChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    this.baseMapOpacity = value;
    this.baseMapOpacityChanged.emit(value);
  }

  isWms(layer: LayerModel): boolean {
    return layer.type === LayerType.Wms;
  }

  isWfs(layer: LayerModel): boolean {
    return layer.type === LayerType.Wfs;
  }

  isWmts(layer: LayerModel): boolean {
    return layer.type === LayerType.Wmts;
  }

  canUseFilter(layer: LayerModel): boolean {
    return this.isWms(layer) || this.isWfs(layer);
  }

  canUseLegend(layer: LayerModel): boolean {
    return this.isWms(layer);
  }

  canUseInfo(layer: LayerModel): boolean {
    return this.isWms(layer) || this.isWfs(layer);
  }

  trackGroup(index: number, group: LayerGroupModel): number | string {
    return group.id ?? group.name ?? index;
  }

  trackLayer(index: number, layer: LayerModel): number | string {
    return layer.id ?? layer.layerName ?? layer.name ?? index;
  }

  private getGroupKey(group: LayerGroupModel): number | string {
    return group.id ?? group.name ?? 'unknown-group';
  }
}
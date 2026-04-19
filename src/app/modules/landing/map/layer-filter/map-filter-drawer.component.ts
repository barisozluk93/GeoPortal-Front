import { Component, EventEmitter, Input, Output } from '@angular/core';

type LayerFilterOperator = '' | 'eq' | 'like' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';

@Component({
  selector: 'app-map-filter-drawer',
  templateUrl: './map-filter-drawer.component.html',
  styleUrls: ['./map-filter-drawer.component.scss']
})
export class MapFilterDrawerComponent {
  @Input() open = false;
  @Input() layer: any | null = null;
  @Input() layerType: any;
  @Input() operatorSelectItems: Array<{ label: string; value: LayerFilterOperator }> = [];
  @Input() buildLayerCqlFilter!: (layer: any) => string;
  @Input() loadFilterFieldOptionsFn!: (layer: any | null, forceReload?: boolean) => Promise<void>;

  @Output() close = new EventEmitter<void>();
  @Output() addRule = new EventEmitter<void>();
  @Output() removeRule = new EventEmitter<number>();
  @Output() apply = new EventEmitter<any>();
  @Output() clear = new EventEmitter<any>();

  getLayerTypeText(layer: any | null): string {
    if (!layer) return '-';
    if (layer.type === this.layerType?.BaseMap) return 'BaseMap';
    if (layer.type === this.layerType?.Wms) return 'WMS';
    if (layer.type === this.layerType?.Wfs) return 'WFS';
    return '-';
  }

  getFieldSelectItems(layer: any | null): Array<{ label: string; value: string }> {
    if (!layer?.availableFields?.length) {
      return [];
    }

    return layer.availableFields.map((field: any) => ({
      label: field.type ? `${field.name} (${field.type})` : field.name,
      value: field.name
    }));
  }

  onFilterFieldChange(filter: any, value: string): void {
    filter.field = value;
    filter.invalidField = false;
  }

  onFilterOperatorChange(filter: any, value: LayerFilterOperator): void {
    filter.operator = value;
    filter.invalidOperator = false;

    if (value !== 'between') {
      filter.invalidValue2 = false;
      filter.value2 = '';
    }
  }

  onFilterValueChange(filter: any, value: string): void {
    filter.value = value;
    filter.invalidValue = false;
  }

  onFilterSecondValueChange(filter: any, value: string): void {
    filter.value2 = value;
    filter.invalidValue2 = false;
  }

  refreshFields(layer: any): void {
    if (this.loadFilterFieldOptionsFn) {
      void this.loadFilterFieldOptionsFn(layer, true);
    }
  }
}
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-map-left-panel',
  templateUrl: './map-left-panel.component.html',
  styleUrls: ['./map-left-panel.component.scss']
})
export class MapLeftPanelComponent {
  @Input() searchOpen = false;
  @Input() layerManagerOpen = false;
  @Input() loading = false;
  @Input() error = '';
  @Input() layerGroups: any[] = [];
  @Input() searchText = '';
  @Input() searchResults: any[] = [];
  @Input() uploadedFileName = '';
  @Input() layerType: any;

  @Input() legendOpen = false;
  @Input() infoOpen = false;
  @Input() filterOpen = false;
  @Input() selectedLegendLayerId: number | null = null;
  @Input() selectedInfoLayerId: number | null = null;
  @Input() selectedFilterLayerId: number | null = null;

  @Output() closeSearch = new EventEmitter<void>();
  @Output() toggleLayerManager = new EventEmitter<void>();
  @Output() searchTextChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() selectResult = new EventEmitter<any>();
  @Output() toggleGroup = new EventEmitter<any>();
  @Output() toggleLayerVisibility = new EventEmitter<{ layer: any; value: boolean }>();
  @Output() changeOpacity = new EventEmitter<{ layer: any; value: number }>();
  @Output() openLegend = new EventEmitter<any>();
  @Output() openInfo = new EventEmitter<any>();
  @Output() openFilter = new EventEmitter<any>();

  onSearchEnter(): void {
    this.search.emit();
  }

  onLayerVisibilityChange(layer: any, value: boolean): void {
    this.toggleLayerVisibility.emit({ layer, value });
  }

  onOpacityChange(layer: any, value: number | string): void {
    this.changeOpacity.emit({ layer, value: Number(value) });
  }

  isLegendLayer(layer: any): boolean {
    return this.legendOpen && this.selectedLegendLayerId === layer?.id;
  }

  isInfoLayer(layer: any): boolean {
    return this.infoOpen && this.selectedInfoLayerId === layer?.id;
  }

  isFilterLayer(layer: any): boolean {
    return this.filterOpen && this.selectedFilterLayerId === layer?.id;
  }

  canOpenInfo(layer: any): boolean {
    return layer?.type === this.layerType?.Wms || layer?.type === this.layerType?.Wfs;
  }

  canOpenFilter(layer: any): boolean {
    return layer?.type === this.layerType?.Wms || layer?.type === this.layerType?.Wfs;
  }

  trackByGroup(_: number, item: any): number {
    return item.id;
  }

  trackByLayer(_: number, item: any): number {
    return item.id;
  }
}
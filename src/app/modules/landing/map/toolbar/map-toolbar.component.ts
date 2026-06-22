import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-map-toolbar',
  templateUrl: './map-toolbar.component.html',
  styleUrls: ['./map-toolbar.component.scss'],
})
export class MapToolbarComponent {
  @Input() side: 'left' | 'right' = 'left';
  @Input() measureText = '';

  @Input()
  activeTool:
    | 'layer-manager'
    | 'coordinate'
    | 'measure'
    | 'export'
    | 'polygon'
    | 'rectangle'
    | 'upload'
    | 'search'
    | 'smart-filter'
    | null = null;

  @Output() layerManagerHovered = new EventEmitter<void>();
  @Output() layerManagerClicked = new EventEmitter<void>();

  @Output() searchClicked = new EventEmitter<void>();
  @Output() polygonClicked = new EventEmitter<void>();
  @Output() rectangleClicked = new EventEmitter<void>();
  @Output() uploadClicked = new EventEmitter<void>();

  @Output() measureLengthClicked = new EventEmitter<void>();

  @Output() goToCoordinateHovered = new EventEmitter<void>();
  @Output() goToCoordinateClicked = new EventEmitter<void>();

  @Output() exportClicked = new EventEmitter<void>();
  @Output() resetClicked = new EventEmitter<void>();

  @Output() zoomInClicked = new EventEmitter<void>();
  @Output() zoomOutClicked = new EventEmitter<void>();
}
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-map-toolbar',
  templateUrl: './map-toolbar.component.html',
  styleUrls: ['./map-toolbar.component.scss']
})
export class MapToolbarComponent {
  @Input() previewMode = false;
  @Input() layerManagerOpen = false;
  @Input() searchPanelOpen = false;
  @Input() exportPanelOpen = false;
  @Input() smartFilterOpen = false;
  @Input() polygonMode = false;
  @Input() measureLengthMode = false;
  @Input() measureAreaMode = false;

  @Output() layerManagerClick = new EventEmitter<void>();
  @Output() searchClick = new EventEmitter<void>();
  @Output() smartFilterClick = new EventEmitter<void>();
  @Output() polygonClick = new EventEmitter<void>();
  @Output() measureLengthClick = new EventEmitter<void>();
  @Output() measureAreaClick = new EventEmitter<void>();
  @Output() coordinateClick = new EventEmitter<void>();
  @Output() exportImageClick = new EventEmitter<void>();
  @Output() uploadClick = new EventEmitter<void>();
  @Output() resetClick = new EventEmitter<void>();
}
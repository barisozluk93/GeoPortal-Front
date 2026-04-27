import { Component, EventEmitter, Input, Output } from '@angular/core';

export type MapExportFormat = 'image' | 'pdf';

@Component({
  selector: 'app-map-export-panel',
  templateUrl: './map-export-panel.component.html',
  styleUrls: ['./map-export-panel.component.scss']
})
export class MapExportPanelComponent {
  @Input() open = false;

  @Output() close = new EventEmitter<void>();
  @Output() exportAs = new EventEmitter<MapExportFormat>();
}

import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-map-coordinate-panel',
  templateUrl: './map-coordinate-panel.component.html',
  styleUrls: ['./map-coordinate-panel.component.scss']
})
export class MapCoordinatePanelComponent {
  @Input() open = false;
  @Input() lat = '';
  @Input() lon = '';

  @Output() latChange = new EventEmitter<string>();
  @Output() lonChange = new EventEmitter<string>();
  @Output() goClick = new EventEmitter<void>();
  @Output() useCurrentClick = new EventEmitter<void>();
  @Output() closeClick = new EventEmitter<void>();

  onLatInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.latChange.emit(target.value ?? '');
  }

  onLonInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.lonChange.emit(target.value ?? '');
  }
}
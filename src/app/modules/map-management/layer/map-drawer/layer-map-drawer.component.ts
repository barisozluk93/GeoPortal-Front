import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-layer-map-drawer',
  templateUrl: './layer-map-drawer.component.html',
  styleUrls: ['./layer-map-drawer.component.scss']
})
export class LayerMapDrawerComponent {
  @Input() isOpen = false;
  @Input() refreshKey = 0;

  @Output() closeDrawer = new EventEmitter<void>();

  close(): void {
    this.closeDrawer.emit();
  }
}
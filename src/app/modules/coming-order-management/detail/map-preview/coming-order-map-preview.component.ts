import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-coming-order-map-preview',
  templateUrl: './coming-order-map-preview.component.html',
  styleUrls: ['./coming-order-map-preview.component.scss']
})
export class ComingOrderMapPreviewComponent {
  @Input() isOpen = false;
  @Input() title = '-';
  @Input() previewWkt: string | null = null;

  @Output() closeDrawer = new EventEmitter<void>();

  close(): void {
    this.closeDrawer.emit();
  }
}
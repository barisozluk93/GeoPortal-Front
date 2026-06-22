import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-map-panel-shell',
  templateUrl: './map-panel-shell.component.html',
  styleUrls: ['./map-panel-shell.component.scss'],
})
export class MapPanelShellComponent {
  @Input() title = '';
  @Input() icon = 'fa-solid fa-window-maximize';
  @Input() panelClass = '';

  @Input() minimized = false;
  @Input() maximized = false;

  @Output() closeClicked = new EventEmitter<MouseEvent>();
  @Output() minimizeClicked = new EventEmitter<MouseEvent>();
  @Output() maximizeClicked = new EventEmitter<MouseEvent>();

  onClose(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeClicked.emit(event);
  }

  onMinimize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.minimizeClicked.emit(event);
  }

  onMaximize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.maximizeClicked.emit(event);
  }
}
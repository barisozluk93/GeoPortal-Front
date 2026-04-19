import { Component, EventEmitter, Input, Output } from '@angular/core';

type FeaturePopupEntry = {
  label: string;
  value: string;
};

@Component({
  selector: 'app-map-feature-info-drawer',
  templateUrl: './map-feature-info-drawer.component.html',
  styleUrls: ['./map-feature-info-drawer.component.scss']
})
export class MapFeatureInfoDrawerComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() entries: FeaturePopupEntry[] = [];

  @Output() close = new EventEmitter<void>();
}
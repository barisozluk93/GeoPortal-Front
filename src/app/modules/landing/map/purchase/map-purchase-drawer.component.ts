import { Component, EventEmitter, Input, Output } from '@angular/core';

type PurchaseOptionKey = 'orthorectified' | 'pansharpened' | 'classified';

type PurchaseOptions = {
  orthorectified: boolean;
  pansharpened: boolean;
  classified: boolean;
};

@Component({
  selector: 'app-map-purchase-drawer',
  templateUrl: './map-purchase-drawer.component.html',
  styleUrls: ['./map-purchase-drawer.component.scss']
})
export class MapPurchaseDrawerComponent {
  @Input() open = false;
  @Input() product: any | null = null;
  @Input() options: PurchaseOptions = {
    orthorectified: false,
    pansharpened: false,
    classified: false
  };

  @Output() close = new EventEmitter<void>();
  @Output() optionChange = new EventEmitter<{ key: PurchaseOptionKey; checked: boolean }>();
  @Output() addToCart = new EventEmitter<void>();

  onOptionChange(key: PurchaseOptionKey, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.optionChange.emit({ key, checked });
  }
}
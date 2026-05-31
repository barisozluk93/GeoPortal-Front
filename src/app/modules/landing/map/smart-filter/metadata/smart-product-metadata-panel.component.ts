import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface MetadataRow {
  key: string;
  value: string;
}

@Component({
  selector: 'app-smart-product-metadata-panel',
  templateUrl: './smart-product-metadata-panel.component.html',
  styleUrls: ['./smart-product-metadata-panel.component.scss'],
})
export class SmartProductMetadataPanelComponent {
  @Input() loading = false;
  @Input() productName = '';
  @Input() metadataRows: MetadataRow[] = [];
  @Input() rawText = '';

  @Output() closeClicked = new EventEmitter<void>();
}
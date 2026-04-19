import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-invoice-preview-modal',
  templateUrl: './invoice-preview-modal.component.html',
  styleUrls: ['./invoice-preview-modal.component.scss']
})
export class InvoicePreviewModalComponent {
  @Input() isOpen = false;
  @Input() previewUrl: SafeResourceUrl | null = null;
  @Input() fileName = '';

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  isImageFile(fileName?: string): boolean {
    if (!fileName) {
      return false;
    }

    const lower = fileName.toLowerCase();

    return (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.bmp')
    );
  }
}
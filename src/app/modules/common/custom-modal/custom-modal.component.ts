import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-custom-modal',
  templateUrl: './custom-modal.component.html',
  styleUrls: ['./custom-modal.component.scss'],
})
export class CustomModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() width = '840px';
  @Input() variant: 'center' | 'right' = 'center';
  @Input() showFooter = true;
  @Input() cancelText = 'CANCEL';
  @Input() submitText = 'SUBMIT';
  @Input() submitDisabled = false;

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    if (this.submitDisabled) {
      return;
    }

    this.submitted.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('glass-modal-backdrop')) {
      this.close();
    }
  }
}
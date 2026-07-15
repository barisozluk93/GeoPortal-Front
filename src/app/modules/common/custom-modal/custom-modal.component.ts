import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-custom-modal',
  templateUrl: './custom-modal.component.html',
  styleUrls: ['./custom-modal.component.scss'],
})
export class CustomModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() width = '840px';
  @Input() variant: 'center' | 'right' = 'center';
  @Input() showFooter = true;
  @Input() cancelText = 'CANCEL';
  @Input() submitText = 'SUBMIT';
  @Input() submitDisabled = false;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      this.setBodyModalState(this.isOpen);
    }
  }

  ngOnDestroy(): void {
    this.setBodyModalState(false);
  }

  close(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    if (!this.submitDisabled) {
      this.submitted.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen && this.closeOnEscape) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.closeOnBackdrop) {
      return;
    }

    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  private setBodyModalState(isOpen: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('modal-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
}

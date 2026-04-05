import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.scss'],
})
export class ConfirmationComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('modalRoot', { static: true }) modalRoot!: ElementRef;

  isModalOpen: boolean = false;
  modalTitle: string;

  id: number | undefined;

  @Output() dismissButtonClick: EventEmitter<number> = new EventEmitter<number>();

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // 🔥 EN KRİTİK SATIR
    document.body.appendChild(this.modalRoot.nativeElement);
  }

  ngOnDestroy() {
    if (this.modalRoot?.nativeElement) {
      document.body.removeChild(this.modalRoot.nativeElement);
    }
  }

  openModal(title: string, id?: number) {
    this.id = id;
    this.modalTitle = title;
    this.isModalOpen = true;
  }

  submit() {
    this.dismissButtonClick.emit(this.id);
    this.closeModal();
  }

  closeModal() {
    this.isModalOpen = false;
  }
}
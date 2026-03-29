import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslationService } from 'src/app/services/translation.service';

@Component({
  selector: 'app-api-view',
  templateUrl: './api-view.component.html',
  styleUrl: './api-view.component.css'
})
export class ApiViewComponent {
  readonly i18n = inject(TranslationService);
  t(key: any): string { return this.i18n.t(key); }
}

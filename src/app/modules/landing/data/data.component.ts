import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  geojson?: any;
};

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrl: './data.component.scss'
})
export class DataComponent implements AfterViewInit {
  readonly router = inject(Router);

  readonly searchQuery = signal('');
  readonly loading = signal(false);

  ngAfterViewInit() {
    
  }
}
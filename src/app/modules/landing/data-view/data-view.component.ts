import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MapSearchService } from 'src/app/services/map-search.service';

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  geojson?: any;
};

@Component({
  selector: 'app-data-view',
  templateUrl: './data-view.component.html',
  styleUrl: './data-view.component.css'
})
export class DataViewComponent {
  readonly mapSearch = inject(MapSearchService);
  readonly router = inject(Router);

  readonly searchQuery = signal('');
  readonly loading = signal(false);

  async submitSearch(): Promise<void> {
    const query = this.searchQuery().trim();

    if (!query) {
      return;
    }

    this.loading.set(true);

    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&polygon_geojson=1&q=' +
        encodeURIComponent(query);

      const response = await fetch(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = (await response.json()) as SearchResult[];

      const polygonOnlyResults = (data ?? []).filter((item) => {
        const geoType = item?.geojson?.type;
        return geoType === 'Polygon' || geoType === 'MultiPolygon';
      });

      if (!polygonOnlyResults.length) {
        alert('Polygon tipinde arama sonucu bulunamadı.');
        return;
      }

      const first = polygonOnlyResults[0];

      this.mapSearch.setTargetLocation(
        Number(first.lat),
        Number(first.lon),
        first.display_name,
        first.geojson
      );

      await this.router.navigate(['/landing/map']);
    } catch (error) {
      console.error('submitSearch error:', error);
      alert('Arama sırasında hata oluştu.');
    } finally {
      this.loading.set(false);
    }
  }
}
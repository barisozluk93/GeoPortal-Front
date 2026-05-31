import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  takeUntil,
} from 'rxjs/operators';

export interface MapSearchResult {
  displayName: string;
  geoJson: any;
}

@Component({
  selector: 'app-map-search-panel',
  templateUrl: './map-search-panel.component.html',
  styleUrls: ['./map-search-panel.component.scss'],
})
export class MapSearchPanelComponent implements OnDestroy {
  @Output() resultSelected = new EventEmitter<MapSearchResult>();

  searchText = '';
  results: MapSearchResult[] = [];
  isLoading = false;
  hasSearched = false;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {
    this.search$
      .pipe(
        debounceTime(450),
        map((value) => value.trim()),
        distinctUntilChanged(),
        switchMap((query) => {
          this.results = [];
          this.hasSearched = query.length >= 3;

          if (query.length < 3) {
            this.isLoading = false;
            return of([]);
          }

          this.isLoading = true;

          const params = new HttpParams()
            .set('q', query)
            .set('format', 'geojson')
            .set('polygon_geojson', '1')
            .set('addressdetails', '1')
            .set('limit', '10');

          return this.http
            .get<any>('https://nominatim.openstreetmap.org/search', {
              params,
            })
            .pipe(
              map((response) => this.toPolygonResults(response)),
              catchError(() => of([])),
              finalize(() => {
                this.isLoading = false;
              })
            );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((results) => {
        this.results = results;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.onSearchChange(input.value);
  }

  onSearchChange(value: any): void {
    this.searchText = value;
    this.search$.next(value);
  }

  selectResult(result: MapSearchResult): void {
    this.resultSelected.emit(result);
  }

  trackResult(index: number, result: MapSearchResult): string {
    return result.displayName || index.toString();
  }

  private toPolygonResults(response: any): MapSearchResult[] {
    const features = response?.features ?? [];

    return features
      .filter((feature: any) => this.isPolygonGeometry(feature?.geometry))
      .map((feature: any) => ({
        displayName:
          feature?.properties?.display_name ||
          feature?.properties?.name ||
          'Adres sonucu',
        geoJson: feature,
      }));
  }

  private isPolygonGeometry(geometry: any): boolean {
    return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';
  }
}
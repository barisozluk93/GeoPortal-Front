import { Injectable, signal } from '@angular/core';

export interface MapTargetLocation {
  lat: number;
  lon: number;
  label?: string;
  geojson?: any;
  nonce: number;
}

@Injectable({ providedIn: 'root' })
export class MapSearchService {
  readonly targetLocation = signal<MapTargetLocation | null>(null);

  setTargetLocation(
    lat: number,
    lon: number,
    label?: string,
    geojson?: any
  ): void {
    this.targetLocation.set({
      lat,
      lon,
      label,
      geojson,
      nonce: Date.now()
    });
  }

  clear(): void {
    this.targetLocation.set(null);
  }
}
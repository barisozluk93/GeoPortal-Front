import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import View from 'ol/View';
import Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import shp from 'shpjs';
import { TranslationService } from 'src/app/services/translation.service';
import { MapSearchService } from 'src/app/services/map-search.service';

type SearchResult = { display_name: string; lat: string; lon: string; geojson?: any };

@Component({
  selector: 'app-map-view',
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.css'
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  readonly i18n = inject(TranslationService);
  readonly mapSearch = inject(MapSearchService);

  private map?: Map;
  private view?: View;
  private drawInteraction?: Draw;
  private modifyInteraction?: Modify;
  private snapInteraction?: Snap;

  private readonly mapReady = signal(false);
  private lastHandledTargetNonce: number | null = null;

  private readonly vectorSource = new VectorSource<Feature<Geometry>>();
  private readonly vectorLayer = new VectorLayer({
    source: this.vectorSource,
    visible: true,
    opacity: 1,
    style: (feature) => {
      const type = feature.getGeometry()?.getType();

      if (type === 'Point') {
        return new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#2c63ff', width: 3 })
          })
        });
      }

      return new Style({
        fill: new Fill({ color: 'rgba(44, 99, 255, 0.20)' }),
        stroke: new Stroke({ color: '#2c63ff', width: 2.5 })
      });
    }
  });

  private readonly baseStandard = new TileLayer({
    source: new OSM(),
    visible: true,
    opacity: 1
  });

  private readonly baseHot = new TileLayer({
    source: new XYZ({
      url: 'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
    }),
    visible: false,
    opacity: 1
  });

  readonly selectedBasemap = signal<'standard' | 'hot'>('standard');
  readonly searchText = signal('');
  readonly searchResults = signal<SearchResult[]>([]);
  readonly currentCoords = signal(35.2433.toFixed(5) + ", " + 39.0.toFixed(5)); readonly currentZoom = signal(6);
  readonly layerManagerOpen = signal(true);
  readonly uploadedFileName = signal('');
  readonly standardVisible = signal(true);
  readonly hotVisible = signal(false);
  readonly overlayVisible = signal(true);
  readonly standardOpacity = signal(100);
  readonly hotOpacity = signal(100);
  readonly overlayOpacity = signal(100);
  readonly polygonMode = signal(false);

  private readonly defaultCenter = fromLonLat([35.2433, 39.0]);
  private readonly defaultZoom = 6;

  constructor() {
    effect(() => {
      const isMapReady = this.mapReady();
      const target = this.mapSearch.targetLocation();

      if (!isMapReady || !target || !this.map || !this.view) return;
      if (this.lastHandledTargetNonce === target.nonce) return;

      this.lastHandledTargetNonce = target.nonce;

      queueMicrotask(() => {
        setTimeout(() => {
          this.map?.updateSize();
          this.focusTarget(target.lat, target.lon, target.geojson);
          this.mapSearch.clear();
        }, 150);
      });
    });
  }

  ngAfterViewInit(): void {
    this.view = new View({
      center: this.defaultCenter,
      zoom: this.defaultZoom
    });

    this.map = new Map({
      target: this.mapEl.nativeElement,
      layers: [this.baseStandard, this.baseHot, this.vectorLayer],
      view: this.view,
      controls: []
    });

    this.currentZoom.set(this.defaultZoom);

    this.map.on('pointermove', (event) => {
      const [lon, lat] = toLonLat(event.coordinate);
      this.currentCoords.set(`${lon.toFixed(5)}, ${lat.toFixed(5)}`);
    });

    this.view.on('change:resolution', () => {
      const zoom = this.view?.getZoom();
      if (zoom !== undefined) {
        this.currentZoom.set(Number(zoom.toFixed(2)));
      }
    });

    this.modifyInteraction = new Modify({ source: this.vectorSource });
    this.snapInteraction = new Snap({ source: this.vectorSource });

    this.map.addInteraction(this.modifyInteraction);
    this.map.addInteraction(this.snapInteraction);

    this.mapReady.set(true);

    setTimeout(() => {
      this.map?.updateSize();
    }, 0);
  }

  ngOnDestroy(): void {
    this.mapReady.set(false);
    this.map?.setTarget(undefined);
  }

  t(key: any): string {
    return this.i18n.t(key);
  }

  toggleLayerManager(): void {
    this.layerManagerOpen.set(!this.layerManagerOpen());
  }

  setBasemap(type: 'standard' | 'hot'): void {
    this.selectedBasemap.set(type);

    if (type === 'standard') {
      this.standardVisible.set(true);
      this.hotVisible.set(false);
    } else {
      this.standardVisible.set(false);
      this.hotVisible.set(true);
    }

    this.syncLayerState();
  }

  onLayerVisibilityChange(): void {
    this.syncLayerState();
  }

  onOpacityChange(): void {
    this.syncLayerState();
  }

  zoomIn(): void {
    const zoom = this.view?.getZoom() ?? this.defaultZoom;
    this.view?.animate({ zoom: zoom + 1, duration: 250 });
  }

  zoomOut(): void {
    const zoom = this.view?.getZoom() ?? this.defaultZoom;
    this.view?.animate({ zoom: zoom - 1, duration: 250 });
  }

  resetView(): void {
    this.clearOverlaySource();
    this.stopPolygonDrawing();
    this.uploadedFileName.set('');
    this.searchResults.set([]);
    this.searchText.set('');

    this.view?.animate({
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      duration: 300
    });
  }

  togglePolygonDraw(): void {
    if (!this.map) return;

    if (this.drawInteraction) {
      this.stopPolygonDrawing();
      return;
    }

    this.clearOverlaySource();
    this.uploadedFileName.set('');
    this.searchResults.set([]);

    this.drawInteraction = new Draw({
      source: this.vectorSource,
      type: 'Polygon'
    });

    this.drawInteraction.on('drawend', () => {
      this.stopPolygonDrawing();
      this.fitToOverlay();
    });

    this.map.addInteraction(this.drawInteraction);
    this.polygonMode.set(true);
  }

  triggerFileUpload(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  private focusTarget(lat: number, lon: number, geojson?: any): void {
    this.vectorSource.clear();

    if (geojson) {
      try {
        const features = new GeoJSON().readFeatures(
          {
            type: 'Feature',
            geometry: geojson,
            properties: {}
          },
          {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
          }
        ) as Feature<Geometry>[];

        if (features.length > 0) {
          this.vectorSource.addFeatures(features);
          this.fitToOverlay();
          return;
        }
      } catch (error) {
        console.error('Polygon parse error:', error);
      }
    }

    const center = fromLonLat([lon, lat]);
    this.view?.animate({
      center,
      zoom: 14,
      duration: 500
    });
  }

  private validatePolygonFeatures(features: Feature<Geometry>[]): Feature<Geometry>[] {
    return features.filter((feature) => {
      const type = feature.getGeometry()?.getType();
      return type === 'Polygon' || type === 'MultiPolygon';
    });
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.stopPolygonDrawing();
    this.clearOverlaySource();
    this.searchResults.set([]);
    this.uploadedFileName.set(file.name);

    try {
      const lower = file.name.toLowerCase();

      if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
        const text = await file.text();
        const features = new GeoJSON().readFeatures(text, {
          featureProjection: 'EPSG:3857'
        }) as Feature<Geometry>[];

        const polygonFeatures = this.validatePolygonFeatures(features);

        if (!polygonFeatures.length) {
          alert('Yüklenen dosyada polygon veya multipolygon bulunamadı.');
          input.value = '';
          return;
        }

        this.vectorSource.addFeatures(polygonFeatures);
        this.fitToOverlay();
        input.value = '';
        return;
      }

      if (lower.endsWith('.kml')) {
        const text = await file.text();
        const features = new KML().readFeatures(text, {
          featureProjection: 'EPSG:3857'
        }) as Feature<Geometry>[];

        const polygonFeatures = this.validatePolygonFeatures(features);

        if (!polygonFeatures.length) {
          alert('Yüklenen KML dosyasında polygon veya multipolygon bulunamadı.');
          input.value = '';
          return;
        }

        this.vectorSource.addFeatures(polygonFeatures);
        this.fitToOverlay();
        input.value = '';
        return;
      }

      if (lower.endsWith('.zip')) {
        const buffer = await file.arrayBuffer();
        const geojson = await shp(buffer);

        const features = new GeoJSON().readFeatures(geojson, {
          featureProjection: 'EPSG:3857'
        }) as Feature<Geometry>[];

        const polygonFeatures = this.validatePolygonFeatures(features);

        if (!polygonFeatures.length) {
          alert('Yüklenen shapefile içinde polygon veya multipolygon bulunamadı.');
          input.value = '';
          return;
        }

        this.vectorSource.addFeatures(polygonFeatures);
        this.fitToOverlay();
        input.value = '';
        return;
      }

      alert('Supported formats: .geojson, .json, .kml, .zip');
      input.value = '';
    } catch (error) {
      console.error('File load error:', error);
      alert('Dosya yüklenemedi. Lütfen geçerli bir Polygon GeoJSON, KML veya ZIP Shapefile seç.');
      input.value = '';
    }
  }

  async searchPlace(): Promise<void> {
    const query = this.searchText().trim();

    if (!query) {
      this.searchResults.set([]);
      return;
    }

    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&polygon_geojson=1&q=' +
        encodeURIComponent(query);

      const response = await fetch(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`);
      }

      const data = (await response.json()) as SearchResult[];
      this.searchResults.set(data);
    } catch (error) {
      console.error('Search error:', error);
      this.searchResults.set([]);
    }
  }

  flyToResult(item: SearchResult): void {
    this.focusTarget(Number(item.lat), Number(item.lon), item.geojson);
    this.searchResults.set([]);
  }

  private syncLayerState(): void {
    this.baseStandard.setVisible(this.standardVisible());
    this.baseHot.setVisible(this.hotVisible());
    this.vectorLayer.setVisible(this.overlayVisible());

    this.baseStandard.setOpacity(this.standardOpacity() / 100);
    this.baseHot.setOpacity(this.hotOpacity() / 100);
    this.vectorLayer.setOpacity(this.overlayOpacity() / 100);
  }

  private fitToOverlay(): void {
    const extent = this.vectorSource.getExtent();

    if (!extent || extent.some((v) => !isFinite(v))) return;

    this.view?.fit(extent, {
      padding: [100, 100, 100, 100],
      maxZoom: 15,
      duration: 300
    });
  }

  private clearOverlaySource(): void {
    this.vectorSource.clear();
  }

  private stopPolygonDrawing(): void {
    if (this.map && this.drawInteraction) {
      this.map.removeInteraction(this.drawInteraction);
      this.drawInteraction = undefined;
    }
    this.polygonMode.set(false);
  }
}
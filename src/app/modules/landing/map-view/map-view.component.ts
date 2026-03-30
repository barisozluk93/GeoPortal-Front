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
import OlMap from 'ol/Map';
import View from 'ol/View';
import Geometry from 'ol/geom/Geometry';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
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
import { MapService } from './map-view.service';
import { LayerModel } from './models/layer.model';
import { LayerGroupModel } from './models/layerGroup.model';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { BasketManagementService } from '../../basket-management/basket-management.service';
import { BasketModel } from '../../basket-management/models/basket.model';
import { AuthService } from '../../auth';
import { Alert } from 'bootstrap';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { ProductModel } from '../../product-management/models/product.model';

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  geojson?: any;
};

type UiLayerModel = LayerModel & {
  visible: boolean;
  opacity: number;
  inBasket: boolean;
};

type UiLayerGroupModel = LayerGroupModel & {
  expanded: boolean;
  layers: UiLayerModel[];
};

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
  readonly mapViewService = inject(MapService);
  readonly basketManagementService = inject(BasketManagementService);
  readonly basketService = inject(BasketService);
  readonly authService = inject(AuthService);
  readonly alertService = inject(AlertService);

  private map?: OlMap;
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

  readonly searchText = signal('');
  readonly searchResults = signal<SearchResult[]>([]);
  readonly currentCoords = signal(`${35.2433.toFixed(5)}, ${39.0.toFixed(5)}`);
  readonly currentZoom = signal(6);
  readonly layerManagerOpen = signal(true);
  readonly uploadedFileName = signal('');
  readonly polygonMode = signal(false);

  readonly layerGroups = signal<UiLayerGroupModel[]>([]);
  readonly loadingLayers = signal(false);
  readonly layerLoadError = signal('');

  private readonly mapLayerRegistry = new globalThis.Map<number, TileLayer<XYZ>>();

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

  updateBasketState(): void {
    this.basketService.basket$.subscribe(basket => {
      const groups = this.layerGroups();

      for (const group of groups) {
        for (const layer of group.layers) {
          layer.inBasket = basket.some(item => item.productId === layer.id);
        }
      }

      this.layerGroups.set([...groups]);
    });
  }

  ngAfterViewInit(): void {    
    this.view = new View({
      center: this.defaultCenter,
      zoom: this.defaultZoom
    });

    this.map = new OlMap({
      target: this.mapEl.nativeElement,
      layers: [this.vectorLayer],
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
    this.loadLayerGroups();

    setTimeout(() => {
      this.map?.updateSize();
    }, 0);

    this.updateBasketState();
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

  loadLayerGroups(): void {
    this.loadingLayers.set(true);
    this.layerLoadError.set('');

    this.mapViewService.allLayers().subscribe({
      next: (response: any) => {
        const groups = this.extractGroups(response)
          .filter((group) => !group.isDeleted)
          .map((group) => this.toUiGroup(group));

        this.layerGroups.set(groups);
        this.loadingLayers.set(false);

        this.activateFirstBasemap();
      },
      error: (error: any) => {
        console.error('Katman grupları alınamadı:', error);
        this.layerLoadError.set('Katman grupları yüklenemedi.');
        this.loadingLayers.set(false);
      }
    });
  }

  private extractGroups(response: any): LayerGroupModel[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.result)) return response.result;
    if (Array.isArray(response?.items)) return response.items;
    return [];
  }

  private toUiGroup(group: LayerGroupModel): UiLayerGroupModel {
    return {
      ...group,
      expanded: true,
      layers: (group.layers ?? [])
        .filter((layer) => !layer.isDeleted)
        .map((layer) => ({
          ...layer,
          visible: false,
          opacity: 100,
          inBasket: false
        }))
    };
  }

  private activateFirstBasemap(): void {
    const groups = this.layerGroups();

    for (const group of groups) {
      const baseLayer = group.layers.find((x) => x.isBaseMap) as UiLayerModel | undefined;

      if (baseLayer) {
        this.closeOtherBaseMaps(baseLayer.id);
        baseLayer.visible = true;
        this.ensureLayerExists(baseLayer);
        this.setLayerVisible(baseLayer, true);
        this.setLayerOpacity(baseLayer, baseLayer.opacity);
        this.layerGroups.set([...groups]);
        return;
      }
    }
  }

  toggleGroup(group: UiLayerGroupModel): void {
    group.expanded = !group.expanded;
    this.layerGroups.set([...this.layerGroups()]);
  }

  onLayerVisibilityChange(layer: UiLayerModel, checked: boolean): void {
    if (layer.isBaseMap && checked) {
      this.closeOtherBaseMaps(layer.id);
    }

    layer.visible = checked;

    if (checked) {
      this.ensureLayerExists(layer);
    }

    this.setLayerVisible(layer, checked);
    this.layerGroups.set([...this.layerGroups()]);
  }

  onOpacityChange(layer: UiLayerModel, value: number | string): void {
    const opacity = Number(value);
    layer.opacity = opacity;
    this.setLayerOpacity(layer, opacity);
    this.layerGroups.set([...this.layerGroups()]);
  }

  onBuyLayer(layer: UiLayerModel): void {
    var currentUser = this.authService.currentUserValue;

    if (currentUser) {
      let data: BasketModel = { id: 0, userId: currentUser.id, productId: layer.id, isDeleted: false, product: undefined, totalPrice: undefined, numberOf: undefined };

      this.basketManagementService.save(data).subscribe(result => {
        if (result.isSuccess) {
          this.alertService.createAlert("success", result.message);
          this.basketService.loadBasketFromDb();
        }
        else {
          this.alertService.createAlert("danger", result.message);
        }
      })
    }
    else {
      var product: ProductModel = { categoryId: 1, id: layer.id, name: layer.name, price: layer.price ?? 0, isDeleted: false, userId: 0 };
      var basket = JSON.parse(localStorage.getItem("basket") as string) as BasketModel[];

      if (basket) {
        if (basket.length < 15) {
          basket.push({ id: 0, userId: 0, product: product, productId: product.id, isDeleted: false, numberOf: 0, totalPrice: 0 });
        }
        else {
          this.alertService.createAlert("warning", "Daha fazla ürün eklemek için lütfen giriş yapınız!");
        }
      }
      else {
        basket = [{ id: 0, userId: 0, product: product, productId: product.id, isDeleted: false, numberOf: 0, totalPrice: 0 }];
      }

      this.basketService.setBasket(basket);
    }
  }

  private closeOtherBaseMaps(activeLayerId: number): void {
    const groups = this.layerGroups();

    for (const group of groups) {
      for (const layer of group.layers) {
        if (layer.isBaseMap && layer.id !== activeLayerId) {
          layer.visible = false;
          this.setLayerVisible(layer, false);
        }
      }
    }
  }

  private ensureLayerExists(layer: UiLayerModel): void {
    if (!this.map) return;
    if (!layer.url) return;
    if (this.mapLayerRegistry.has(layer.id)) return;

    const olLayer = new TileLayer({
      source: new XYZ({
        url: layer.url
      }),
      visible: layer.visible,
      opacity: layer.opacity / 100
    });

    this.map.getLayers().insertAt(0, olLayer);
    this.mapLayerRegistry.set(layer.id, olLayer);
  }

  private setLayerVisible(layer: UiLayerModel, visible: boolean): void {
    const olLayer = this.mapLayerRegistry.get(layer.id);
    if (!olLayer) return;
    olLayer.setVisible(visible);
  }

  private setLayerOpacity(layer: UiLayerModel, opacity: number): void {
    const olLayer = this.mapLayerRegistry.get(layer.id);
    if (!olLayer) return;
    olLayer.setOpacity(opacity / 100);
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
        const geometryType = geojson?.type;

        if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
          console.warn('Sadece polygon ve multipolygon desteklenir.');
          return;
        }

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

        const polygonFeatures = this.validatePolygonFeatures(features);

        if (polygonFeatures.length > 0) {
          this.vectorSource.addFeatures(polygonFeatures);
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
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&polygon_geojson=1&q=' +
        encodeURIComponent(query);

      const response = await fetch(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`);
      }

      const data = (await response.json()) as SearchResult[];

      const polygonOnlyResults = (data ?? []).filter((item) => {
        const geoType = item?.geojson?.type;
        return geoType === 'Polygon' || geoType === 'MultiPolygon';
      });

      this.searchResults.set(polygonOnlyResults);
    } catch (error) {
      console.error('Search error:', error);
      this.searchResults.set([]);
    }
  }

  flyToResult(item: SearchResult): void {
    const geoType = item?.geojson?.type;

    if (geoType !== 'Polygon' && geoType !== 'MultiPolygon') {
      console.warn('Seçilen sonuç polygon değil, işlem yapılmadı.');
      return;
    }

    this.focusTarget(Number(item.lat), Number(item.lon), item.geojson);
    this.searchResults.set([]);
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

  trackByGroup(_: number, item: UiLayerGroupModel): number {
    return item.id;
  }

  trackByLayer(_: number, item: UiLayerModel): number {
    return item.id;
  }

  showBuyButton(layer: UiLayerModel): boolean {
    if (layer.price === undefined || layer.price === null) return false;
    if (layer.price <= 0) return false;
    return true;
  }
}
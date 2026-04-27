import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  Input,
  LOCALE_ID,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import shp from 'shpjs';
import WKT from 'ol/format/WKT.js';
import Overlay from 'ol/Overlay';
import { getArea, getLength } from 'ol/sphere';

import { TranslateService } from '@ngx-translate/core';
import { LayerGroupModel } from '../../map-management/models/layergroup.model';
import { LayerModel } from '../../map-management/models/layer.model';
import { LayerType } from '../../map-management/models/layertype.model';
import { MapSearchService } from '../map-search.service';
import { MapService } from './map.service';
import { LangChangeEvent } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { jsPDF } from 'jspdf';
import { ProductSmartFilterRequest, ProductSmartFilterResult } from './smart-filter/models/product-smart-filter.model';
import { formatDate } from '@angular/common';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { BasketModel } from '../../basket-management/models/basket.model';
import { AuthService } from '../../auth';
import { BasketManagementService } from '../../basket-management/basket-management.service';


type MapExportFormat = 'image' | 'pdf';


type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  geojson?: any;
};

type LayerFilterOperator = '' | 'eq' | 'like' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';

type LayerFilterItem = {
  field: string;
  operator: LayerFilterOperator;
  value: string;
  value2?: string;
  invalidField?: boolean;
  invalidOperator?: boolean;
  invalidValue?: boolean;
  invalidValue2?: boolean;
};

type UiLayerModel = LayerModel & {
  visible: boolean;
  opacity: number;
  filters: LayerFilterItem[];
  activeCqlFilter: string;
  availableFields: LayerAttributeField[];
  fieldsLoading: boolean;
  fieldsLoaded: boolean;
  fieldLoadError: string;
};

type UiLayerGroupModel = LayerGroupModel & {
  expanded: boolean;
  layers: UiLayerModel[];
};

type FeaturePopupEntry = {
  label: string;
  value: string;
};

type LayerAttributeField = {
  name: string;
  type: string;
};

type FeatureInfoContext =
  | { type: 'feature'; feature: Feature<Geometry>; layer: BaseLayer | null }
  | { type: 'wmsPayload'; layer: UiLayerModel; payload: any }
  | { type: 'wmsText'; layer: UiLayerModel; responseText: string }
  | null;

type SmartFilterPopupInfo = {
  labelKey: string;
  value: string;
};

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements AfterViewInit, OnDestroy, OnInit, OnChanges {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  @Input() previewWkt: string | null = null;
  @Input() previewMode = false;
  @Input() refreshKey = 0;

  operatorSelectItems: Array<{ label: string; value: LayerFilterOperator }> = [];

  readonly translateService = inject(TranslateService);
  readonly mapSearch = inject(MapSearchService);
  readonly mapService = inject(MapService);
  readonly basketService = inject(BasketService);
  readonly alertService = inject(AlertService);
  readonly authService = inject(AuthService);
  readonly basketManagementService = inject(BasketManagementService);

  private langChangeSubscription?: Subscription;
  private featureInfoContext: FeatureInfoContext = null;

  private map?: OlMap;
  private view?: View;
  private drawInteraction?: Draw;
  private modifyInteraction?: Modify;
  private snapInteraction?: Snap;
  private measurementDrawInteraction?: Draw;
  private measurementTooltipOverlay?: Overlay;
  private measurementTooltipEl?: HTMLDivElement;
  private finishedMeasurementOverlays: Overlay[] = [];

  private readonly mapReady = signal(false);
  private lastHandledTargetNonce: number | null = null;
  private suppressMapClickUntil = 0;

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

  private readonly serviceLayerStyle = new Style({
    fill: new Fill({ color: 'rgba(44, 99, 255, 0.18)' }),
    stroke: new Stroke({ color: '#4c8cff', width: 2 }),
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#2c63ff', width: 2.5 })
    })
  });


  private readonly selectedSmartFilterFootprintStyle = new Style({
    fill: new Fill({ color: 'rgba(77, 163, 255, 0.24)' }),
    stroke: new Stroke({ color: '#7eb6ff', width: 4 }),
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#7eb6ff', width: 3 })
    })
  });

  readonly smartFilterResultsPanelOpen = signal(false);
  readonly searchText = signal('');
  readonly searchResults = signal<SearchResult[]>([]);
  readonly searchPanelOpen = signal(false);
  readonly currentCoords = signal(`${35.2433.toFixed(5)}, ${39.0.toFixed(5)}`);
  readonly currentZoom = signal(6);
  readonly layerManagerOpen = signal(false);
  readonly uploadedFileName = signal('');
  readonly polygonMode = signal(false);
  readonly measureLengthMode = signal(false);
  readonly measureAreaMode = signal(false);
  readonly measurementLabel = signal('');
  readonly coordinatePanelOpen = signal(false);
  readonly exportPanelOpen = signal(false);
  readonly gotoLat = signal('');
  readonly gotoLon = signal('');

  readonly layerGroups = signal<UiLayerGroupModel[]>([]);
  readonly loadingLayers = signal(false);
  readonly layerLoadError = signal('');

  readonly legendPanelOpen = signal(false);
  readonly selectedLegendLayer = signal<UiLayerModel | null>(null);
  readonly infoPanelOpen = signal(false);
  readonly selectedInfoLayer = signal<UiLayerModel | null>(null);
  readonly filterDrawerOpen = signal(false);
  readonly selectedFilterLayer = signal<UiLayerModel | null>(null);
  readonly featureInfoDrawerOpen = signal(false);
  readonly featurePopupTitle = signal('');
  readonly featurePopupSubtitle = signal('');
  readonly featurePopupEntries = signal<FeaturePopupEntry[]>([]);

  readonly smartFilterOpen = signal(false);
  readonly smartFilterLoading = signal(false);
  readonly smartFilterResults = signal<ProductSmartFilterResult[]>([]);
  readonly selectedSmartFilterProductId = signal<number | null>(null);
  readonly smartFilterCart = signal<ProductSmartFilterResult[]>([]);

  readonly LayerType = LayerType;

  private readonly mapLayerRegistry = new globalThis.Map<number, BaseLayer>();

  private readonly defaultCenter = fromLonLat([35.2433, 39.0]);
  private readonly defaultZoom = 6;

  constructor(@Inject(LOCALE_ID) public locale: string) {
    effect(() => {
      const isMapReady = this.mapReady();
      const target = this.mapSearch.targetLocation();

      if (!isMapReady || !target || !this.map || !this.view) return;
      if (this.lastHandledTargetNonce === target.nonce) return;

      this.lastHandledTargetNonce = target.nonce;

      queueMicrotask(() => {
        setTimeout(() => {
          this.map?.updateSize();
          void this.handleMapSearchTarget(target);
        }, 150);
      });
    });
  }

  private async handleMapSearchTarget(target: any): Promise<void> {
    this.suppressMapClicks();
    this.focusTarget(target.lat, target.lon, target.geojson);


    this.mapSearch.clear();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewWkt'] && this.previewWkt && this.mapReady()) {
      this.renderPreviewWkt(this.previewWkt);
    }

    if (changes['previewWkt'] && this.previewWkt && this.mapReady()) {
      this.renderPreviewWkt(this.previewWkt);
    }

    if (changes['refreshKey'] && !changes['refreshKey'].firstChange && this.mapReady()) {
      this.reloadMapLayers();
    }
  }

  ngOnInit(): void {
    this.updateOperatorSelectItems();
    this.langChangeSubscription = this.translateService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.handleLanguageChange(event.lang);
    });
  }

  private t(key: string): string {
    return this.translateService.instant(key);
  }

  private updateOperatorSelectItems(): void {
    this.operatorSelectItems = [
      { label: '=', value: 'eq' },
      { label: this.t('MAP.FILTER.OPERATORS.CONTAINS'), value: 'like' },
      { label: '>', value: 'gt' },
      { label: '>=', value: 'gte' },
      { label: '<', value: 'lt' },
      { label: '<=', value: 'lte' },
      { label: this.t('MAP.FILTER.OPERATORS.BETWEEN'), value: 'between' }
    ];
  }

  private handleLanguageChange(_lang: string): void {
    this.updateOperatorSelectItems();
    this.refreshFilterFieldErrors();
    this.refreshOpenFeatureInfoDrawer();
    this.syncSelectedFilterLayer();
  }

  private refreshFilterFieldErrors(): void {
    const groups = this.layerGroups();

    for (const group of groups) {
      for (const layer of group.layers ?? []) {
        if (layer.fieldsLoading) continue;

        if (layer.fieldsLoaded && !layer.availableFields.length) {
          layer.fieldLoadError = this.t('MAP.FILTER.NO_ATTRIBUTES_FOUND');
        } else if (!layer.fieldsLoaded && layer.fieldLoadError) {
          layer.fieldLoadError = this.t('MAP.FILTER.ATTRIBUTE_LOAD_ERROR');
        }
      }
    }

    this.layerGroups.set([...groups]);
  }

  private refreshOpenFeatureInfoDrawer(): void {
    if (!this.featureInfoDrawerOpen() || !this.featureInfoContext) return;

    switch (this.featureInfoContext.type) {
      case 'feature':
        this.renderFeatureInfoFromFeature(this.featureInfoContext.feature, this.featureInfoContext.layer);
        return;
      case 'wmsPayload':
        this.renderFeatureInfoFromWmsPayload(this.featureInfoContext.layer, this.featureInfoContext.payload);
        return;
      case 'wmsText':
        this.renderFeatureInfoFromWmsText(this.featureInfoContext.layer, this.featureInfoContext.responseText);
        return;
      default:
        return;
    }
  }

  private syncSelectedFilterLayer(): void {
    const selectedLayer = this.selectedFilterLayer();
    if (!selectedLayer) return;

    this.selectedFilterLayer.set({ ...selectedLayer });
  }

  initializeMap() {
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

    this.registerMapClickHandler();

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
  }

  ngAfterViewInit(): void {
    this.initializeMap();

    if (this.previewWkt) {
      setTimeout(() => {
        this.renderPreviewWkt(this.previewWkt!);
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.langChangeSubscription?.unsubscribe();
    this.mapReady.set(false);
    this.closeFeatureInfoDrawer();
    this.stopMeasurementDrawing();
    this.map?.setTarget(undefined);
  }

  private suppressMapClicks(durationMs = 350): void {
    this.suppressMapClickUntil = Date.now() + durationMs;
  }

  private shouldIgnoreMapClick(): boolean {
    return Date.now() < this.suppressMapClickUntil;
  }

  openSearchPanel(): void {
    this.searchPanelOpen.set(true);
    this.layerManagerOpen.set(false);
    this.exportPanelOpen.set(false);
    this.closeRightDrawersOnly();
  }

  closeSearchPanel(): void {
    this.searchPanelOpen.set(false);
    this.searchResults.set([]);
  }

  toggleSearchPanel(): void {
    this.searchPanelOpen.update((current) => {
      const next = !current;

      if (next) {
        this.layerManagerOpen.set(false);
        this.exportPanelOpen.set(false);
        this.closeRightDrawersOnly();
      }

      if (!next) {
        this.searchResults.set([]);
      }

      return next;
    });
  }

  toggleLayerManager(): void {
    this.layerManagerOpen.update((current) => {
      const next = !current;

      if (next) {
        this.closeSearchPanel();
        this.exportPanelOpen.set(false);
        this.closeRightDrawersOnly();
      }

      return next;
    });
  }

  openLegend(layer: UiLayerModel): void {
    if (layer.type !== LayerType.Wms) return;

    this.layerManagerOpen.set(false);
    this.closeSearchPanel();
    this.closeInfo();
    this.closeFilterDrawer();
    this.closeFeatureInfoDrawer();
    this.selectedLegendLayer.set(layer);
    this.legendPanelOpen.set(true);
  }

  closeLegend(): void {
    this.legendPanelOpen.set(false);
    this.selectedLegendLayer.set(null);
  }

  toggleLegend(layer: UiLayerModel): void {
    if (this.isLegendLayer(layer)) {
      this.closeLegend();
      return;
    }

    this.openLegend(layer);
  }

  isLegendLayer(layer: UiLayerModel): boolean {
    return this.selectedLegendLayer()?.id === layer.id && this.legendPanelOpen();
  }

  canOpenInfo(layer: UiLayerModel): boolean {
    return layer.type === LayerType.Wms || layer.type === LayerType.Wfs;
  }

  openInfo(layer: UiLayerModel): void {
    if (!this.canOpenInfo(layer)) return;

    this.layerManagerOpen.set(false);
    this.closeSearchPanel();
    this.closeLegend();
    this.closeFilterDrawer();
    this.closeFeatureInfoDrawer();
    this.selectedInfoLayer.set(layer);
    this.infoPanelOpen.set(true);
  }

  closeInfo(): void {
    this.infoPanelOpen.set(false);
    this.selectedInfoLayer.set(null);
  }

  closeRightDrawersOnly(): void {
    this.closeLegend();
    this.closeInfo();
    this.closeFilterDrawer();
    this.closeFeatureInfoDrawer();
    this.closeCoordinatePanel();
    this.closeSmartFilter();
  }

  closeAllDrawers(): void {
    this.closeRightDrawersOnly();
    this.layerManagerOpen.set(false);
    this.searchPanelOpen.set(false);
    this.exportPanelOpen.set(false);
    this.smartFilterResultsPanelOpen.set(false);
  }

  toggleInfo(layer: UiLayerModel): void {
    if (this.isInfoLayer(layer)) {
      this.closeInfo();
      return;
    }

    this.openInfo(layer);
  }

  isInfoLayer(layer: UiLayerModel): boolean {
    return this.selectedInfoLayer()?.id === layer.id && this.infoPanelOpen();
  }

  canOpenFilter(layer: UiLayerModel): boolean {
    return layer.type === LayerType.Wms || layer.type === LayerType.Wfs;
  }

  openFilterDrawer(layer: UiLayerModel): void {
    if (!this.canOpenFilter(layer)) return;

    this.layerManagerOpen.set(false);
    this.closeSearchPanel();
    this.closeLegend();
    this.closeInfo();
    this.closeFeatureInfoDrawer();

    if (!layer.filters?.length) {
      layer.filters = [this.createEmptyFilterRule()];
    }

    this.resetFilterValidation(layer);

    this.selectedFilterLayer.set(layer);
    this.filterDrawerOpen.set(true);

    this.updateFieldOptionsForLayer(layer);
    void this.loadFilterFieldOptions(layer);
  }

  closeFilterDrawer(): void {
    this.filterDrawerOpen.set(false);
    this.selectedFilterLayer.set(null);
  }

  toggleExportPanel(): void {
    this.exportPanelOpen.update((current) => {
      const next = !current;

      if (next) {
        this.layerManagerOpen.set(false);
        this.closeSearchPanel();
        this.closeRightDrawersOnly();
      }

      return next;
    });
  }

  closeExportPanel(): void {
    this.exportPanelOpen.set(false);
  }


  toggleFilterDrawer(layer: UiLayerModel): void {
    if (this.isFilterLayer(layer)) {
      this.closeFilterDrawer();
      return;
    }

    this.openFilterDrawer(layer);
  }

  isFilterLayer(layer: UiLayerModel): boolean {
    return this.selectedFilterLayer()?.id === layer.id && this.filterDrawerOpen();
  }

  getFilterFieldOptions(layer: UiLayerModel | null): LayerAttributeField[] {
    return layer?.availableFields ?? [];
  }

  getFieldSelectItems(layer: UiLayerModel | null): Array<{ label: string; value: string }> {
    if (!layer?.availableFields?.length) {
      return [];
    }

    return layer.availableFields.map((field: LayerAttributeField) => ({
      label: field.type ? `${field.name} (${field.type})` : field.name,
      value: field.name
    }));
  }

  async loadFilterFieldOptions(layer: UiLayerModel | null, forceReload = false): Promise<void> {
    if (!layer || !this.canOpenFilter(layer)) return;
    if (layer.fieldsLoading) return;
    if (!forceReload && layer.fieldsLoaded && layer.availableFields.length) return;

    layer.fieldsLoading = true;
    layer.fieldLoadError = '';

    if (forceReload) {
      layer.fieldsLoaded = false;
      layer.availableFields = [];
      for (const filter of layer.filters ?? []) {
        filter.field = '';
        filter.invalidField = false;
      }
    }

    this.syncLayerState(layer);

    try {
      const fields = await this.fetchLayerAttributeFields(layer);
      layer.availableFields = fields;
      layer.fieldsLoaded = true;
      layer.fieldLoadError = fields.length ? '' : this.t('MAP.FILTER.NO_ATTRIBUTES_FOUND');

      const availableNames = new Set(fields.map((item) => item.name));
      for (const filter of layer.filters ?? []) {
        if (filter.field && !availableNames.has(filter.field)) {
          filter.field = '';
        }
      }
    } catch (error) {
      console.error('Öznitelik alanları alınamadı:', error);
      layer.availableFields = [];
      layer.fieldsLoaded = false;
      layer.fieldLoadError = this.t('MAP.FILTER.ATTRIBUTE_LOAD_ERROR');
    } finally {
      layer.fieldsLoading = false;
      this.updateFieldOptionsForLayer(layer);
      this.syncLayerState(layer);
    }
  }

  addFilterRow(): void {
    const layer = this.selectedFilterLayer();
    if (!layer) return;

    layer.filters = [...(layer.filters ?? []), this.createEmptyFilterRule()];
    this.syncLayerState(layer);
  }

  removeFilterRow(index: number): void {
    const layer = this.selectedFilterLayer();
    if (!layer) return;

    const nextRules = (layer.filters ?? []).filter((_, ruleIndex) => ruleIndex !== index);
    layer.filters = nextRules.length ? nextRules : [this.createEmptyFilterRule()];
    this.syncLayerState(layer);
  }

  applyFilterToLayerWithValidation(layer: UiLayerModel | null): void {
    if (!layer) return;

    const hasInvalid = this.validateLayerFilters(layer);
    this.syncLayerState(layer);

    if (hasInvalid) {
      return;
    }

    this.applyFilterToLayer(layer);
  }

  applyFilterToLayer(layer: UiLayerModel | null): void {
    if (!layer) return;

    const cqlFilter = this.buildLayerCqlFilter(layer);
    layer.activeCqlFilter = cqlFilter;

    if (!this.mapLayerRegistry.has(layer.id)) {
      this.ensureLayerExists(layer);
    }

    const olLayer = this.mapLayerRegistry.get(layer.id);
    if (!olLayer) {
      this.syncLayerState(layer);
      return;
    }

    if (layer.type === LayerType.Wms && olLayer instanceof TileLayer) {
      const source = olLayer.getSource();
      if (source instanceof TileWMS) {
        const nextParams: Record<string, string | boolean> = {
          LAYERS: layer.layerName || '',
          FORMAT: layer.format || 'image/png',
          VERSION: layer.version || '1.3.0',
          TRANSPARENT: true,
          TILED: true
        };

        if (cqlFilter) {
          nextParams['CQL_FILTER'] = cqlFilter;
        }

        source.updateParams(nextParams);
        source.refresh();
      }
    }

    if (layer.type === LayerType.Wfs && olLayer instanceof VectorLayer) {
      const source = olLayer.getSource();
      if (source instanceof VectorSource) {
        source.clear(true);
        source.refresh();
      }
    }

    this.syncLayerState(layer);
  }

  clearFilterForLayer(layer: UiLayerModel | null): void {
    if (!layer) return;

    layer.filters = [this.createEmptyFilterRule()];
    layer.activeCqlFilter = '';
    this.applyFilterToLayer(layer);
    this.resetFilterValidation(layer);
    this.syncLayerState(layer);
  }

  getFilterOperatorLabel(operator: LayerFilterOperator): string {
    switch (operator) {
      case 'eq':
        return '=';
      case 'like':
        return 'contains';
      case 'gt':
        return '>';
      case 'gte':
        return '>=';
      case 'lt':
        return '<';
      case 'lte':
        return '<=';
      case 'between':
        return 'between';
      default:
        return operator;
    }
  }

  hasLegend(layer: UiLayerModel): boolean {
    return layer.type === LayerType.Wms && !!layer.url && !!layer.layerName;
  }

  getLayerTypeText(layer: UiLayerModel | null): string {
    if (!layer) return '-';
    if (layer.type === LayerType.BaseMap) return 'BaseMap';
    if (layer.type === LayerType.Wms) return 'WMS';
    if (layer.type === LayerType.Wfs) return 'WFS';
    return '-';
  }

  getDefaultVersion(layer: UiLayerModel | null): string {
    if (!layer) return '-';
    return layer.type === LayerType.Wfs ? '2.0.0' : '1.3.0';
  }

  getDefaultFormat(layer: UiLayerModel | null): string {
    if (!layer) return '-';
    return layer.type === LayerType.Wfs ? 'application/json' : 'image/png';
  }

  getLegendUrl(layer: UiLayerModel | null): string {
    if (!layer || layer.type !== LayerType.Wms || !layer.url || !layer.layerName) {
      return '';
    }

    const separator = layer.url.includes('?') ? '&' : '?';
    const version = encodeURIComponent(layer.version || '1.3.0');
    const format = encodeURIComponent(layer.format || 'image/png');

    return (
      `${layer.url}${separator}` +
      `service=WMS` +
      `&version=${version}` +
      `&request=GetLegendGraphic` +
      `&format=${format}` +
      `&transparent=true` +
      `&layer=${encodeURIComponent(layer.layerName)}` +
      `&style=` +
      `&LEGEND_OPTIONS=${encodeURIComponent('forceLabels:on;fontAntiAliasing:true;dpi:180;fontSize:14')}`
    );
  }

  loadLayerGroups(): void {
    this.loadingLayers.set(true);
    this.layerLoadError.set('');

    this.mapService.allLayers().subscribe({
      next: (response: any) => {
        const groups = this.extractGroups(response)
          .filter((group) => !group.isDeleted)
          .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
          .map((group) => this.toUiGroup(group));

        this.layerGroups.set(groups);
        this.loadingLayers.set(false);

        this.activateInitialLayers();
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

  private normalizeOpacityValue(value: number | null | undefined): number {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return 100;
    if (value <= 1) return Math.round(value * 100);
    return Math.round(value);
  }

  private toUiGroup(group: LayerGroupModel): UiLayerGroupModel {
    return {
      ...group,
      expanded: true,
      layers: (group.layers ?? [])
        .filter((layer) => !layer.isDeleted)
        .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
        .map((layer) => ({
          ...layer,
          visible: !!layer.isVisible,
          opacity: this.normalizeOpacityValue(layer.opacity as number),
          filters: [this.createEmptyFilterRule()],
          activeCqlFilter: '',
          availableFields: [],
          fieldsLoading: false,
          fieldsLoaded: false,
          fieldLoadError: ''
        }))
    };
  }

  private activateInitialLayers(): void {
    const groups = this.layerGroups();
    let hasVisibleBaseMap = false;

    for (const group of groups) {
      for (const layer of group.layers) {
        if (layer.visible) {
          if (layer.type == LayerType.BaseMap) {
            if (hasVisibleBaseMap) {
              layer.visible = false;
              layer.isVisible = false;
              continue;
            }
            hasVisibleBaseMap = true;
          }

          this.ensureLayerExists(layer);
          this.setLayerVisible(layer, true);
          this.setLayerOpacity(layer, layer.opacity);
        }
      }
    }

    this.layerGroups.set([...groups]);
  }

  toggleGroup(group: UiLayerGroupModel): void {
    group.expanded = !group.expanded;
    this.layerGroups.set([...this.layerGroups()]);
  }

  onLayerVisibilityChange(layer: UiLayerModel, checked: boolean): void {
    if (layer.type == LayerType.BaseMap && checked) {
      this.closeOtherBaseMaps(layer.id);
    }

    layer.visible = checked;
    layer.isVisible = checked;

    if (checked) {
      this.ensureLayerExists(layer);
    }

    this.setLayerVisible(layer, checked);

    if (!checked && this.selectedLegendLayer()?.id === layer.id) {
      this.closeLegend();
    }

    if (!checked && this.selectedInfoLayer()?.id === layer.id) {
      this.closeInfo();
    }

    if (!checked && this.selectedFilterLayer()?.id === layer.id) {
      this.closeFilterDrawer();
    }

    this.layerGroups.set([...this.layerGroups()]);
  }

  onOpacityChange(layer: UiLayerModel, value: number | string): void {
    const opacity = Number(value);
    layer.opacity = opacity;
    this.setLayerOpacity(layer, opacity);
    this.layerGroups.set([...this.layerGroups()]);
  }

  onFilterFieldChange(filter: LayerFilterItem, value: string): void {
    filter.field = value;
    filter.invalidField = false;
  }

  onFilterOperatorChange(filter: LayerFilterItem, value: LayerFilterOperator): void {
    filter.operator = value;
    filter.invalidOperator = false;

    if (value !== 'between') {
      filter.invalidValue2 = false;
      filter.value2 = '';
    }
  }

  onFilterValueChange(filter: LayerFilterItem, value: string): void {
    filter.value = value;
    filter.invalidValue = false;
  }

  onFilterSecondValueChange(filter: LayerFilterItem, value: string): void {
    filter.value2 = value;
    filter.invalidValue2 = false;
  }

  private closeOtherBaseMaps(activeLayerId: number): void {
    const groups = this.layerGroups();

    for (const group of groups) {
      for (const layer of group.layers) {
        if (layer.type == LayerType.BaseMap && layer.id !== activeLayerId) {
          layer.visible = false;
          layer.isVisible = false;
          this.setLayerVisible(layer, false);
        }
      }
    }
  }

  private ensureLayerExists(layer: LayerModel): void {
    if (!this.map) return;
    if (!layer.url) return;
    if (this.mapLayerRegistry.has(layer.id)) return;

    let olLayer: BaseLayer | null = null;

    if (layer.type === LayerType.BaseMap) {
      olLayer = new TileLayer({
        source: new XYZ({
          url: layer.url,
          crossOrigin: 'anonymous'
        }),
        visible: !!layer.isVisible,
        opacity: this.normalizeOpacityValue(layer.opacity as number) / 100
      });
    }

    if (layer.type === LayerType.Wms) {
      if (!layer.layerName) {
        console.warn(`WMS layerName boş. LayerId: ${layer.id}`);
        return;
      }

      olLayer = new TileLayer({
        source: new TileWMS({
          url: layer.url,
          params: {
            LAYERS: layer.layerName,
            FORMAT: layer.format || 'image/png',
            VERSION: layer.version || '1.3.0',
            TRANSPARENT: true,
            TILED: true,
            ...(this.getActiveCqlFilter(layer) ? { CQL_FILTER: this.getActiveCqlFilter(layer) } : {})
          },
          serverType: 'geoserver',
          crossOrigin: 'anonymous'
        }),
        visible: !!layer.isVisible,
        opacity: this.normalizeOpacityValue(layer.opacity as number) / 100
      });
    }

    if (layer.type === LayerType.Wfs) {
      if (!layer.layerName) {
        console.warn(`WFS layerName boş. LayerId: ${layer.id}`);
        return;
      }

      const source = new VectorSource({
        format: new GeoJSON(),
        url: (extent) => {
          const baseUrl = layer.url;
          const separator = baseUrl.includes('?') ? '&' : '?';
          const cqlFilter = this.getActiveCqlFilter(layer);

          let requestUrl = (
            `${baseUrl}${separator}` +
            `service=WFS&version=${encodeURIComponent(layer.version || '2.0.0')}` +
            `&request=GetFeature` +
            `&typeName=${encodeURIComponent(layer.layerName || '')}` +
            `&outputFormat=${encodeURIComponent(layer.format || 'application/json')}` +
            `&srsName=EPSG:3857` +
            `&bbox=${extent.join(',')},EPSG:3857`
          );

          if (cqlFilter) {
            requestUrl += `&cql_filter=${encodeURIComponent(cqlFilter)}`;
          }

          return requestUrl;
        },
        strategy: bboxStrategy
      });

      olLayer = new VectorLayer({
        source,
        style: this.serviceLayerStyle,
        visible: !!layer.isVisible,
        opacity: this.normalizeOpacityValue(layer.opacity as number) / 100
      });
    }

    if (!olLayer) return;

    olLayer.set('gpLayerId', layer.id);
    olLayer.set('gpLayerName', layer.name || layer.layerName || '-');
    olLayer.set('gpLayerType', this.getLayerTypeText(layer as UiLayerModel));

    const insertIndex = this.getInsertIndex(layer);
    this.map.getLayers().insertAt(insertIndex, olLayer);
    this.mapLayerRegistry.set(layer.id, olLayer);
  }

  private getInsertIndex(layer: LayerModel): number {
    if (!this.map) return 0;

    const totalLayers = this.map.getLayers().getLength();
    const overlayIndex = Math.max(totalLayers - 1, 0);

    if (layer.type == LayerType.BaseMap) {
      return 0;
    }

    return overlayIndex;
  }

  private setLayerVisible(layer: LayerModel, visible: boolean): void {
    const olLayer = this.mapLayerRegistry.get(layer.id);
    if (!olLayer) return;
    olLayer.setVisible(visible);
  }

  private setLayerOpacity(layer: LayerModel, opacity: number): void {
    const olLayer = this.mapLayerRegistry.get(layer.id);
    if (!olLayer) return;
    olLayer.setOpacity(Number(opacity) / 100);
  }

  private async fetchLayerAttributeFields(layer: UiLayerModel): Promise<LayerAttributeField[]> {
    let fields: LayerAttributeField[] = [];

    if (layer.type === LayerType.Wfs) {
      fields = await this.fetchWfsAttributeFields(layer);
    }

    if (layer.type === LayerType.Wms) {
      fields = await this.fetchWmsAttributeFields(layer);
    }

    const seen = new Set<string>();
    return fields
      .filter((field) => !!field?.name)
      .map((field) => ({
        name: String(field.name).trim(),
        type: String(field.type || '').trim()
      }))
      .filter((field) => {
        if (!field.name || seen.has(field.name)) return false;
        seen.add(field.name);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }

  private async fetchWfsAttributeFields(layer: UiLayerModel): Promise<LayerAttributeField[]> {
    const describeUrls = this.buildDescribeFeatureTypeUrls(layer);

    for (const url of describeUrls) {
      try {
        const response = await fetch(url, { headers: { Accept: 'application/xml, text/xml, application/json' } });
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.json();
          const jsonFields = this.parseFieldsFromDescribeFeatureTypeJson(payload);
          if (jsonFields.length) return jsonFields;
          continue;
        }

        const text = await response.text();
        const xmlFields = this.parseFieldsFromDescribeFeatureTypeXml(text);
        if (xmlFields.length) return xmlFields;
      } catch (error) {
        console.warn('DescribeFeatureType isteği başarısız:', url, error);
      }
    }

    return this.fetchWfsSampleAttributeFields(layer);
  }

  private async fetchWmsAttributeFields(layer: UiLayerModel): Promise<LayerAttributeField[]> {
    const derivedWfsFields = await this.fetchWfsAttributeFields({
      ...layer,
      url: this.guessWfsEndpoint(layer.url || '')
    } as UiLayerModel);

    if (derivedWfsFields.length) {
      return derivedWfsFields;
    }

    return this.fetchWmsSampleAttributeFields(layer);
  }

  private buildDescribeFeatureTypeUrls(layer: UiLayerModel): string[] {
    if (!layer.url || !layer.layerName) return [];

    const candidates = [layer.url];
    const guessed = this.guessWfsEndpoint(layer.url);
    if (guessed && guessed !== layer.url) {
      candidates.push(guessed);
    }

    return [...new Set(candidates)].map((baseUrl) => {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return (
        `${baseUrl}${separator}` +
        `service=WFS&version=${encodeURIComponent(layer.version || '2.0.0')}` +
        `&request=DescribeFeatureType` +
        `&typeName=${encodeURIComponent(layer.layerName || '')}`
      );
    });
  }

  private guessWfsEndpoint(url: string): string {
    if (!url) return url;
    return url
      .replace(/\/ows(\?|$)/i, '/wfs$1')
      .replace(/\/wms(\?|$)/i, '/wfs$1');
  }

  private parseFieldsFromDescribeFeatureTypeJson(payload: any): LayerAttributeField[] {
    const properties = Array.isArray(payload?.featureTypes?.[0]?.properties)
      ? payload.featureTypes[0].properties
      : Array.isArray(payload?.properties)
        ? payload.properties
        : [];

    return properties
      .map((item: any) => ({
        name: String(item?.name || '').trim(),
        type: String(item?.type || item?.localType || '').trim()
      }))
      .filter((item: LayerAttributeField) => item.name && item.name.toLowerCase() !== 'geometry');
  }

  private parseFieldsFromDescribeFeatureTypeXml(xmlText: string): LayerAttributeField[] {
    if (!xmlText?.trim()) return [];

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');
    const parseError = xml.querySelector('parsererror');
    if (parseError) return [];

    const elements = Array.from(xml.getElementsByTagNameNS('*', 'element'));
    return elements
      .map((element) => ({
        name: element.getAttribute('name') || '',
        type: element.getAttribute('type') || ''
      }))
      .filter((item) => item.name && item.name.toLowerCase() !== 'geometry' && !/^gml:/i.test(item.type));
  }

  private async fetchWfsSampleAttributeFields(layer: UiLayerModel): Promise<LayerAttributeField[]> {
    if (!layer.url || !layer.layerName) return [];

    const candidates = [layer.url];
    const guessed = this.guessWfsEndpoint(layer.url);
    if (guessed && guessed !== layer.url) {
      candidates.push(guessed);
    }

    for (const baseUrl of [...new Set(candidates)]) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      const url = (
        `${baseUrl}${separator}` +
        `service=WFS&version=${encodeURIComponent(layer.version || '2.0.0')}` +
        `&request=GetFeature` +
        `&typeName=${encodeURIComponent(layer.layerName || '')}` +
        `&outputFormat=${encodeURIComponent(layer.format || 'application/json')}` +
        `&count=1&srsName=EPSG:3857`
      );

      try {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) continue;

        const payload = await response.json();
        const feature = Array.isArray(payload?.features) ? payload.features[0] : null;
        const properties = feature?.properties && typeof feature.properties === 'object' ? feature.properties : null;
        if (!properties) continue;

        return Object.keys(properties).map((key) => ({
          name: key,
          type: this.inferFieldType(properties[key])
        }));
      } catch (error) {
        console.warn('WFS örnek feature alınamadı:', url, error);
      }
    }

    return [];
  }

  private async fetchWmsSampleAttributeFields(layer: UiLayerModel): Promise<LayerAttributeField[]> {
    if (!this.map || !this.view || !layer.layerName) return [];

    const olLayer = this.mapLayerRegistry.get(layer.id);
    if (!(olLayer instanceof TileLayer)) return [];

    const source = olLayer.getSource();
    if (!(source instanceof TileWMS)) return [];

    const resolution = this.view.getResolution();
    const projection = this.view.getProjection();
    const coordinate = this.view.getCenter();
    if (!resolution || !projection || !coordinate) return [];

    const url = source.getFeatureInfoUrl(coordinate, resolution, projection, {
      INFO_FORMAT: 'application/json',
      FEATURE_COUNT: 1,
      QUERY_LAYERS: layer.layerName,
      LAYERS: layer.layerName
    });

    if (!url) return [];

    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) return [];

      const payload = await response.json();
      const feature = Array.isArray(payload?.features) ? payload.features[0] : null;
      const properties = feature?.properties && typeof feature.properties === 'object' ? feature.properties : null;
      if (!properties) return [];

      return Object.keys(properties).map((key) => ({
        name: key,
        type: this.inferFieldType(properties[key])
      }));
    } catch (error) {
      console.warn('WMS örnek feature info alınamadı:', error);
      return [];
    }
  }

  private inferFieldType(value: unknown): string {
    if (value === null || value === undefined) return 'string';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private createEmptyFilterRule(): LayerFilterItem {
    return {
      field: '',
      operator: '',
      value: '',
      value2: '',
      invalidField: false,
      invalidOperator: false,
      invalidValue: false,
      invalidValue2: false
    };
  }

  private resetFilterValidation(layer: UiLayerModel): void {
    layer.filters = (layer.filters ?? []).map((filter) => ({
      ...filter,
      invalidField: false,
      invalidOperator: false,
      invalidValue: false,
      invalidValue2: false
    }));
  }

  private validateLayerFilters(layer: UiLayerModel): boolean {
    let hasInvalid = false;

    layer.filters = (layer.filters ?? []).map((filter) => {
      const field = (filter.field || '').trim();
      const operator = (filter.operator || '').trim() as LayerFilterOperator;
      const value = (filter.value || '').trim();
      const value2 = (filter.value2 || '').trim();

      const invalidField = !field;
      const invalidOperator = !operator;
      const invalidValue = !value;
      const invalidValue2 = operator === 'between' && !value2;

      if (invalidField || invalidOperator || invalidValue || invalidValue2) {
        hasInvalid = true;
      }

      return {
        ...filter,
        field,
        operator,
        value,
        value2,
        invalidField,
        invalidOperator,
        invalidValue,
        invalidValue2
      };
    });

    return hasInvalid;
  }

  private syncLayerState(layer: UiLayerModel): void {
    this.layerGroups.set([...this.layerGroups()]);

    if (this.selectedFilterLayer()?.id === layer.id) {
      this.selectedFilterLayer.set(layer);
    }
  }

  private updateFieldOptionsForLayer(layer: UiLayerModel): void {
    return;
  }

  private getActiveCqlFilter(layer: LayerModel): string {
    const uiLayer = this.findUiLayerById(layer.id);
    return uiLayer?.activeCqlFilter?.trim() || '';
  }

  private findUiLayerById(layerId: number): UiLayerModel | null {
    for (const group of this.layerGroups()) {
      const matchedLayer = group.layers.find((item) => item.id === layerId);
      if (matchedLayer) {
        return matchedLayer as UiLayerModel;
      }
    }

    return null;
  }

  buildLayerCqlFilter(layer: UiLayerModel): string {
    return (layer.filters ?? [])
      .map((filter) => this.buildCqlExpression(filter))
      .filter(Boolean)
      .join(' AND ');
  }

  private buildCqlExpression(filter: LayerFilterItem): string {
    const field = (filter.field || '').trim();
    const value = (filter.value || '').trim();
    const value2 = (filter.value2 || '').trim();

    if (!field) return '';

    switch (filter.operator) {
      case 'eq':
        return value ? `${field} = ${this.formatCqlValue(value)}` : '';
      case 'like':
        return value ? `${field} ILIKE ${this.formatCqlValue(`%${value}%`)}` : '';
      case 'gt':
        return value ? `${field} > ${this.formatComparableValue(value)}` : '';
      case 'gte':
        return value ? `${field} >= ${this.formatComparableValue(value)}` : '';
      case 'lt':
        return value ? `${field} < ${this.formatComparableValue(value)}` : '';
      case 'lte':
        return value ? `${field} <= ${this.formatComparableValue(value)}` : '';
      case 'between':
        return value && value2
          ? `${field} BETWEEN ${this.formatComparableValue(value)} AND ${this.formatComparableValue(value2)}`
          : '';
      default:
        return '';
    }
  }

  private formatComparableValue(value: string): string {
    return this.isNumericValue(value) ? value : this.formatCqlValue(value);
  }

  private formatCqlValue(value: string): string {
    if (/^(true|false)$/i.test(value)) {
      return value.toLowerCase();
    }

    if (/^null$/i.test(value)) {
      return 'null';
    }

    if (this.isNumericValue(value)) {
      return value;
    }

    return `'${value.replace(/'/g, "''")}'`;
  }

  private isNumericValue(value: string): boolean {
    if (!value?.trim()) return false;
    return /^-?\d+(\.\d+)?$/.test(value.trim());
  }

  private registerMapClickHandler(): void {
    if (!this.map) return;

    this.map.on('singleclick', async (event) => {
      if (this.shouldIgnoreMapClick()) {
        return;
      }

      if (this.polygonMode() || this.drawInteraction || this.measureLengthMode() || this.measureAreaMode()) {
        return;
      }

      let clickedFeature: Feature<Geometry> | null = null;
      let clickedLayer: BaseLayer | null = null;

      this.map?.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          clickedFeature = feature as Feature<Geometry>; // 🔥 CRITICAL
          clickedLayer = (layer ?? null) as BaseLayer | null;
          return true;
        },
        { hitTolerance: 6 }
      );

      if (clickedFeature) {
        const clickedOnOverlayDrawing = clickedLayer === this.vectorLayer || !clickedLayer;

        if (clickedOnOverlayDrawing) {
          const isSmartFilterFootprint =
            (clickedFeature as Feature<Geometry>).get('featureType') === 'smartFilterFootprint';

          if (isSmartFilterFootprint) {
            this.closeAllDrawers();
            this.openFeatureInfoFromFeature(clickedFeature, clickedLayer);
            return;
          }

          this.closeFeatureInfoDrawer();
          return;
        }

        this.closeAllDrawers();
        this.openFeatureInfoFromFeature(clickedFeature, clickedLayer);
        return;
      }

      const wmsFeatureInfoFound = await this.tryOpenWmsFeatureInfo(event.coordinate);
      if (!wmsFeatureInfoFound) {
        this.closeFeatureInfoDrawer();
      }
    });
  }

  private async tryOpenWmsFeatureInfo(coordinate: number[]): Promise<boolean> {
    if (!this.map || !this.view) return false;

    const resolution = this.view.getResolution();
    const projection = this.view.getProjection();
    if (!resolution || !projection) return false;

    const visibleWmsLayers = this.getVisibleWmsLayers();

    for (const layer of visibleWmsLayers) {
      const olLayer = this.mapLayerRegistry.get(layer.id);
      if (!(olLayer instanceof TileLayer)) continue;

      const source = olLayer.getSource();
      if (!(source instanceof TileWMS)) continue;

      const url = source.getFeatureInfoUrl(coordinate, resolution, projection, {
        INFO_FORMAT: 'application/json',
        FEATURE_COUNT: 10,
        QUERY_LAYERS: layer.layerName,
        LAYERS: layer.layerName
      });

      if (!url) continue;

      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json') || contentType.includes('geojson')) {
          const payload = await response.json();
          if (this.openFeatureInfoFromWmsPayload(layer, payload)) {
            return true;
          }
          continue;
        }

        const textResponse = await response.text();
        if (this.openFeatureInfoFromWmsText(layer, textResponse)) {
          return true;
        }
      } catch (error) {
        console.error('WMS GetFeatureInfo alınamadı:', error);
      }
    }

    return false;
  }

  private getVisibleWmsLayers(): UiLayerModel[] {
    return this.layerGroups()
      .flatMap((group: UiLayerGroupModel) => group.layers)
      .filter((layer: UiLayerModel) => layer.type === LayerType.Wms && !!layer.visible && !!layer.url && !!layer.layerName)
      .reverse();
  }

  private openFeatureInfoFromFeature(feature: Feature<Geometry>, layer: BaseLayer | null): void {
    this.featureInfoContext = { type: 'feature', feature, layer };
    this.renderFeatureInfoFromFeature(feature, layer);
  }

  private renderFeatureInfoFromFeature(feature: Feature<Geometry>, layer: BaseLayer | null): void {
    const geometryType = feature.getGeometry()?.getType() || '-';
    const isSmartFilterFootprint = feature.get('featureType') === 'smartFilterFootprint';

    const layerName = isSmartFilterFootprint
      ? this.t('PRODUCT.FOOTPRINT')
      : String(layer?.get('gpLayerName') || this.t('SELECTED_FEATURE'));

    const entries: FeaturePopupEntry[] = [
      { label: this.t('LAYER_NAME_LABEL'), value: layerName },
      { label: this.t('GEOMETRY_TYPE'), value: geometryType }
    ];

    if (isSmartFilterFootprint) {
      const smartFilterInfo = feature.get('smartFilterInfo') as SmartFilterPopupInfo[] | undefined;

      for (const item of smartFilterInfo ?? []) {
        entries.push({
          label: this.t(item.labelKey),
          value: item.value || '-'
        });
      }

      this.openFeatureInfoDrawer(layerName, `${this.t('FEATURE_DETAILS')} • ${geometryType}`, entries);
      return;
    }

    const featureId = feature.getId();
    const rawProps = { ...(feature.getProperties() || {}) } as Record<string, unknown>;
    delete rawProps.geometry;

    if (featureId !== undefined && featureId !== null && `${featureId}`.trim()) {
      entries.push({ label: this.t('FEATURE_ID'), value: String(featureId) });
    }

    for (const [key, value] of Object.entries(rawProps)) {
      const normalized = this.toDisplayValue(value);
      if (!normalized) continue;

      entries.push({
        label: this.formatPropertyLabel(key),
        value: normalized
      });
    }

    this.openFeatureInfoDrawer(layerName, `${this.t('FEATURE_DETAILS')} • ${geometryType}`, entries);
  }

  private openFeatureInfoFromWmsPayload(layer: UiLayerModel, payload: any): boolean {
    this.featureInfoContext = { type: 'wmsPayload', layer, payload };
    return this.renderFeatureInfoFromWmsPayload(layer, payload);
  }

  private renderFeatureInfoFromWmsPayload(layer: UiLayerModel, payload: any): boolean {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    if (!features.length) return false;

    const feature = features[0] ?? {};
    const geometryType = feature?.geometry?.type || feature?.geometry_name || 'WMS';
    const featureId = feature?.id;
    const properties = feature?.properties && typeof feature.properties === 'object'
      ? feature.properties
      : {};

    const entries: FeaturePopupEntry[] = [
      { label: this.t('LAYER_NAME_LABEL'), value: layer.name || layer.layerName || '-' },
      { label: this.t('SERVICE_TYPE'), value: 'WMS' },
      { label: this.t('GEOMETRY_TYPE'), value: String(geometryType || '-') }
    ];

    if (featureId !== undefined && featureId !== null && `${featureId}`.trim()) {
      entries.push({ label: this.t('FEATURE_ID'), value: String(featureId) });
    }

    entries.push({
      label: this.t('RESULT_COUNT'),
      value: String(features.length)
    });

    for (const [key, value] of Object.entries(properties)) {
      const normalized = this.toDisplayValue(value);
      if (!normalized) continue;

      entries.push({
        label: this.formatPropertyLabel(key),
        value: normalized
      });
    }

    this.openFeatureInfoDrawer(
      layer.name || layer.layerName || this.t('SELECTED_FEATURE'),
      `${this.t('FEATURE_DETAILS')} • WMS`,
      entries
    );

    return true;
  }

  private openFeatureInfoFromWmsText(layer: UiLayerModel, responseText: string): boolean {
    this.featureInfoContext = { type: 'wmsText', layer, responseText };
    return this.renderFeatureInfoFromWmsText(layer, responseText);
  }

  private renderFeatureInfoFromWmsText(layer: UiLayerModel, responseText: string): boolean {
    const normalizedText = responseText?.trim();
    if (!normalizedText) return false;

    const sanitized = normalizedText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!sanitized || /no features were found/i.test(sanitized)) {
      return false;
    }

    const entries: FeaturePopupEntry[] = [
      { label: this.t('LAYER_NAME_LABEL'), value: layer.name || layer.layerName || '-' },
      { label: this.t('SERVICE_TYPE'), value: 'WMS' },
      {
        label: this.t('RESPONSE'),
        value: sanitized.length > 1200 ? `${sanitized.slice(0, 1197)}...` : sanitized
      }
    ];

    this.openFeatureInfoDrawer(
      layer.name || layer.layerName || this.t('SELECTED_FEATURE'),
      `${this.t('FEATURE_DETAILS')} • WMS`,
      entries
    );

    return true;
  }

  private openFeatureInfoDrawer(title: string, subtitle: string, entries: FeaturePopupEntry[]): void {
    this.closeLegend();
    this.closeInfo();
    this.closeFilterDrawer();
    this.closeSearchPanel();
    this.layerManagerOpen.set(false);

    this.featurePopupTitle.set(title);
    this.featurePopupSubtitle.set(subtitle);
    this.featurePopupEntries.set(entries);
    this.featureInfoDrawerOpen.set(true);
  }

  closeFeatureInfoDrawer(): void {
    this.featureInfoContext = null;
    this.featureInfoDrawerOpen.set(false);
    this.featurePopupTitle.set('');
    this.featurePopupSubtitle.set('');
    this.featurePopupEntries.set([]);
  }

  private formatPropertyLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (char) => char.toLocaleUpperCase());
  }

  private toDisplayValue(value: unknown): string {
    if (value === null || value === undefined) return '';

    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length ? normalized : '';
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      const joined = value.map((item) => this.toDisplayValue(item)).filter(Boolean).join(', ');
      return joined.length > 120 ? `${joined.slice(0, 117)}...` : joined;
    }

    try {
      const json = JSON.stringify(value);
      return json.length > 120 ? `${json.slice(0, 117)}...` : json;
    } catch {
      return String(value);
    }
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
    this.stopMeasurementDrawing(true);
    this.closeAllDrawers();
    this.coordinatePanelOpen.set(false);
    this.measureAreaMode.set(false);
    this.measureLengthMode.set(false);
    this.measurementLabel.set('');
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

    this.stopMeasurementDrawing();
    this.measureAreaMode.set(false);
    this.measureLengthMode.set(false);
    this.measurementLabel.set('');

    if (this.polygonMode()) {
      this.stopPolygonDrawing();
      return;
    }

    this.closeAllDrawers();
    this.vectorSource.clear();

    this.drawInteraction = new Draw({
      source: this.vectorSource,
      type: 'Polygon'
    });

    this.drawInteraction.on('drawend', () => {
      this.suppressMapClicks();
      this.stopPolygonDrawing();
      this.fitToOverlay();
    });

    this.map.addInteraction(this.drawInteraction);
    this.polygonMode.set(true);
  }

  triggerFileUpload(): void {
    this.closeAllDrawers();

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  private focusTarget(lat: number, lon: number, geojson?: any): void {
    this.vectorSource.clear();
    this.closeFeatureInfoDrawer();

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

    this.uploadedFileName.set(file.name);
    this.vectorSource.clear();
    this.closeAllDrawers();

    try {
      const lower = file.name.toLowerCase();

      if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
        const text = await file.text();
        const features = new GeoJSON().readFeatures(text, {
          featureProjection: 'EPSG:3857'
        }) as Feature<Geometry>[];

        const polygonFeatures = this.validatePolygonFeatures(features);

        if (!polygonFeatures.length) {
          alert('Yüklenen GeoJSON içinde polygon veya multipolygon bulunamadı.');
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
    this.searchPanelOpen.set(true);

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

  async flyToResult(item: SearchResult): Promise<void> {
    const geoType = item?.geojson?.type;

    if (geoType !== 'Polygon' && geoType !== 'MultiPolygon') {
      console.warn('Seçilen sonuç polygon değil, işlem yapılmadı.');
      return;
    }

    this.suppressMapClicks();
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

  refreshMap(): void {
    if (!this.map) return;

    this.closeAllDrawers();

    this.mapLayerRegistry.forEach((layer) => {
      this.map?.removeLayer(layer);
    });

    this.mapLayerRegistry.clear();
    this.layerGroups.set([]);

    this.loadLayerGroups();

    setTimeout(() => {
      this.map?.updateSize();
      this.map?.render();
    }, 250);
  }

  private renderPreviewWkt(wkt: string, closeDrawers = true): void {
    if (!wkt || !this.map || !this.view) {
      return;
    }

    try {
      this.clearOverlaySource();

      if (closeDrawers) {
        this.closeAllDrawers();
      }

      const feature = new WKT().readFeature(wkt, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }) as Feature<Geometry>;

      const geometry = feature.getGeometry();
      const geometryType = geometry?.getType();

      if (!geometry || (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon')) {
        console.warn('Preview için sadece Polygon veya MultiPolygon WKT desteklenir.');
        return;
      }

      this.vectorSource.addFeature(feature);
      this.fitToOverlay();

      setTimeout(() => {
        this.map?.updateSize();
      }, 50);
    } catch (error) {
      console.error('WKT preview çizimi başarısız:', error);
    }
  }


  toggleLengthMeasure(): void {
    if (!this.map) return;

    if (this.measureLengthMode()) {
      this.stopMeasurementDrawing();
      this.measureLengthMode.set(false);
      this.measurementLabel.set('');
      return;
    }

    this.stopPolygonDrawing();
    this.measureAreaMode.set(false);
    this.measureLengthMode.set(true);
    this.startMeasurementDrawing('LineString');
  }

  toggleAreaMeasure(): void {
    if (!this.map) return;

    if (this.measureAreaMode()) {
      this.stopMeasurementDrawing();
      this.measureAreaMode.set(false);
      this.measurementLabel.set('');
      return;
    }

    this.stopPolygonDrawing();
    this.measureLengthMode.set(false);
    this.measureAreaMode.set(true);
    this.startMeasurementDrawing('Polygon');
  }

  toggleCoordinatePanel(): void {
    const next = !this.coordinatePanelOpen();

    this.closeRightDrawersOnly();
    this.layerManagerOpen.set(false);
    this.closeSearchPanel();

    this.coordinatePanelOpen.set(next);

    if (next) {
      this.fillCurrentCoordinates();
    }
  }

  fillCurrentCoordinates(): void {
    const [lon, lat] = this.currentCoords().split(',');
    this.gotoLat.set((lat || '').trim());
    this.gotoLon.set((lon || '').trim());
  }

  goToCoordinates(): void {
    if (!this.view) return;

    const lat = Number(this.gotoLat());
    const lon = Number(this.gotoLon());

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      alert(this.t('MAP.COORDINATE_PANEL.INVALID'));
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      alert(this.t('MAP.COORDINATE_PANEL.INVALID'));
      return;
    }

    this.vectorSource.clear();
    this.closeFeatureInfoDrawer();

    const point = new Feature<Geometry>({
      geometry: new Point(fromLonLat([lon, lat]))
    });

    this.vectorSource.addFeature(point);

    this.view.animate({
      center: fromLonLat([lon, lat]),
      zoom: 15,
      duration: 500
    });
  }

  async exportMap(format: MapExportFormat): Promise<void> {
    try {
      const result = await this.captureMapAsImage();

      if (format === 'image') {
        this.downloadMapImage(result.dataUrl);
      }

      if (format === 'pdf') {
        this.downloadMapPdf(result.dataUrl, result.width, result.height);
      }

      if (result.skippedCanvasCount > 0) {
        alert(this.translateService.instant('MAP.EXPORT.PARTIAL_WARNING'));
      }

      this.closeExportPanel();
    } catch (error) {
      console.error('Harita export edilemedi:', error);
      alert(this.translateService.instant('MAP.EXPORT.FAILED'));
    }
  }

  private captureMapAsImage(): Promise<{ dataUrl: string; width: number; height: number; skippedCanvasCount: number }> {
    return new Promise((resolve, reject) => {
      if (!this.map) {
        reject(new Error('Map bulunamadı.'));
        return;
      }

      this.map.once('rendercomplete', () => {
        const exportCanvas = document.createElement('canvas');
        const size = this.map?.getSize();

        if (!size) {
          reject(new Error('Map size alınamadı.'));
          return;
        }

        exportCanvas.width = size[0];
        exportCanvas.height = size[1];

        const exportContext = exportCanvas.getContext('2d');
        if (!exportContext) {
          reject(new Error('Canvas context oluşturulamadı.'));
          return;
        }

        let skippedCanvasCount = 0;
        const canvases = this.mapEl.nativeElement.querySelectorAll('.ol-layer canvas');

        canvases.forEach((canvasEl: Element) => {
          const canvas = canvasEl as HTMLCanvasElement;
          if (!canvas.width || !canvas.height) return;

          const opacity = canvas.parentElement?.style.opacity;
          exportContext.globalAlpha = opacity === '' || opacity == null ? 1 : Number(opacity);

          const transform = canvas.style.transform;
          if (transform) {
            const matrix = transform
              .match(/^matrix\(([-0-9., ]+)\)$/)?.[1]
              ?.split(',')
              .map((value) => Number(value.trim()));

            if (matrix && matrix.length === 6) {
              exportContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
            } else {
              exportContext.setTransform(1, 0, 0, 1, 0, 0);
            }
          } else {
            exportContext.setTransform(1, 0, 0, 1, 0, 0);
          }

          try {
            exportContext.drawImage(canvas, 0, 0);
          } catch (error) {
            skippedCanvasCount++;
            console.warn('Canvas export sırasında atlandı (muhtemelen CORS/tainted):', error);
          }
        });

        exportContext.setTransform(1, 0, 0, 1, 0, 0);
        exportContext.globalAlpha = 1;

        try {
          resolve({
            dataUrl: exportCanvas.toDataURL('image/png'),
            width: exportCanvas.width,
            height: exportCanvas.height,
            skippedCanvasCount
          });
        } catch (error) {
          reject(error);
        }
      });

      this.map.renderSync();
    });
  }

  private downloadMapImage(dataUrl: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `map-export-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.click();
  }

  private downloadMapPdf(dataUrl: string, width: number, height: number): void {
    const orientation = width >= height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [width, height]
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    pdf.save(`map-export-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
  }

  private startMeasurementDrawing(type: 'LineString' | 'Polygon'): void {
    if (!this.map) return;

    this.stopMeasurementDrawing(true);
    this.closeAllDrawers();
    this.createMeasurementTooltip(false);

    this.measurementDrawInteraction = new Draw({
      source: this.vectorSource,
      type
    });

    this.measurementDrawInteraction.on('drawstart', (event) => {
      const geometry = event.feature.getGeometry();

      geometry?.on('change', (geomEvent: any) => {
        const geom = geomEvent.target as Geometry;
        this.updateMeasurementTooltip(geom);
      });
    });

    this.measurementDrawInteraction.on('drawend', (event) => {
      const geometry = event.feature.getGeometry();
      if (geometry) {
        this.updateMeasurementTooltip(geometry, true);
      }

      if (this.measurementTooltipEl) {
        this.measurementTooltipEl.classList.add('map-measure-tooltip--static');
        this.measurementTooltipEl.style.background = 'linear-gradient(180deg, rgba(120,53,15,0.98) 0%, rgba(234,88,12,0.98) 100%)';
        this.measurementTooltipEl.style.border = '2px solid #ffffff';
        this.measurementTooltipEl.style.boxShadow = '0 14px 34px rgba(0,0,0,0.42), 0 0 0 5px rgba(251,146,60,0.28)';
        this.measurementTooltipEl.style.color = '#ffffff';
      }

      if (this.measurementTooltipOverlay) {
        this.finishedMeasurementOverlays.push(this.measurementTooltipOverlay);
        this.measurementTooltipOverlay = undefined;
        this.measurementTooltipEl = undefined;
      }

      this.suppressMapClicks();
      this.stopMeasurementDrawing(false);
    });

    this.map.addInteraction(this.measurementDrawInteraction);
  }

  private stopMeasurementDrawing(clearSource = false): void {
    if (this.map && this.measurementDrawInteraction) {
      this.map.removeInteraction(this.measurementDrawInteraction);
      this.measurementDrawInteraction = undefined;
    }

    if (this.map && this.measurementTooltipOverlay) {
      this.map.removeOverlay(this.measurementTooltipOverlay);
      this.measurementTooltipOverlay = undefined;
      this.measurementTooltipEl = undefined;
    }

    if (clearSource) {
      this.clearFinishedMeasurementOverlays();
      this.vectorSource.clear();
    }
  }

  private clearFinishedMeasurementOverlays(): void {
    if (!this.map || !this.finishedMeasurementOverlays.length) return;

    for (const overlay of this.finishedMeasurementOverlays) {
      this.map.removeOverlay(overlay);
    }

    this.finishedMeasurementOverlays = [];
  }

  private createMeasurementTooltip(_finished = false): void {
    if (!this.map) return;

    if (this.measurementTooltipOverlay) {
      this.map.removeOverlay(this.measurementTooltipOverlay);
    }

    this.measurementTooltipEl = document.createElement('div');
    this.measurementTooltipEl.className = 'map-measure-tooltip';
    this.measurementTooltipEl.innerHTML = this.t('MAP.MEASUREMENT.START');
    this.measurementTooltipEl.style.position = 'relative';
    this.measurementTooltipEl.style.display = 'inline-flex';
    this.measurementTooltipEl.style.alignItems = 'center';
    this.measurementTooltipEl.style.gap = '10px';
    this.measurementTooltipEl.style.minWidth = '156px';
    this.measurementTooltipEl.style.maxWidth = '280px';
    this.measurementTooltipEl.style.padding = '10px 12px';
    this.measurementTooltipEl.style.borderRadius = '16px';
    this.measurementTooltipEl.style.border = '1px solid rgba(126, 182, 255, 0.35)';
    this.measurementTooltipEl.style.background = 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.88))';
    this.measurementTooltipEl.style.color = '#e6f0ff';
    this.measurementTooltipEl.style.backdropFilter = 'blur(16px)';
    this.measurementTooltipEl.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.45), 0 0 12px rgba(44, 99, 255, 0.25)';
    this.measurementTooltipEl.style.whiteSpace = 'normal';
    this.measurementTooltipEl.style.zIndex = '9999';
    this.measurementTooltipEl.style.pointerEvents = 'none';
    this.measurementTooltipEl.style.transform = 'translateY(-6px)';

    this.measurementTooltipOverlay = new Overlay({
      element: this.measurementTooltipEl,
      offset: [0, -12],
      positioning: 'bottom-center',
      stopEvent: false
    });

    this.map.addOverlay(this.measurementTooltipOverlay);
  }

  private updateMeasurementTooltip(geometry: Geometry, finished = false): void {
    if (!this.measurementTooltipEl || !this.measurementTooltipOverlay) return;

    let labelHtml = '';
    let position: number[] | undefined;

    if (geometry instanceof Polygon) {
      labelHtml = this.formatAreaMeasurement(geometry);
      position = geometry.getInteriorPoint().getCoordinates();
      this.measurementTooltipEl.classList.remove('map-measure-tooltip--length');
      this.measurementTooltipEl.classList.add('map-measure-tooltip--area');
    } else if (geometry instanceof LineString) {
      labelHtml = this.formatLengthMeasurement(geometry);
      position = geometry.getLastCoordinate();
      this.measurementTooltipEl.classList.remove('map-measure-tooltip--area');
      this.measurementTooltipEl.classList.add('map-measure-tooltip--length');
    }

    if (!labelHtml || !position) return;

    this.measurementTooltipEl.innerHTML = labelHtml;
    this.measurementTooltipOverlay.setPosition(position);

    if (finished) {
      this.measureAreaMode.set(false);
      this.measureLengthMode.set(false);
    }
  }

  private formatLengthMeasurement(line: LineString): string {
    const length = getLength(line, { projection: 'EPSG:3857' });
    const unit = length >= 1000 ? 'km' : 'm';
    const value = length >= 1000 ? length / 1000 : length;

    return this.buildMeasurementLabelHtml(
      'length',
      this.t('MAP.MEASUREMENT.LENGTH'),
      this.formatMeasurementNumber(value),
      unit
    );
  }

  private formatAreaMeasurement(polygon: Polygon): string {
    const area = getArea(polygon, { projection: 'EPSG:3857' });
    const unit = area >= 1000000 ? 'km²' : 'm²';
    const value = area >= 1000000 ? area / 1000000 : area;

    return this.buildMeasurementLabelHtml(
      'area',
      this.t('MAP.MEASUREMENT.AREA'),
      this.formatMeasurementNumber(value),
      unit
    );
  }

  private buildMeasurementLabelHtml(kind: 'length' | 'area', title: string, value: string, unit: string): string {
    const icon = kind === 'area' ? '⬡' : '⬌';

    return `
    <span class="map-measure-tooltip__icon" aria-hidden="true">${icon}</span>
    <span class="map-measure-tooltip__content">
      <span class="map-measure-tooltip__title">${title}</span>
      <span class="map-measure-tooltip__value">${value} <small>${unit}</small></span>
    </span>
  `;
  }

  private formatMeasurementNumber(value: number): string {
    const lang = this.translateService.currentLang || this.translateService.getDefaultLang() || 'tr';

    return new Intl.NumberFormat(lang, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  private reloadMapLayers(): void {
    for (const [, olLayer] of this.mapLayerRegistry.entries()) {
      this.map?.removeLayer(olLayer);
    }

    this.mapLayerRegistry.clear();

    this.layerGroups.set([]);
    this.loadingLayers.set(false);
    this.layerLoadError.set('');
    this.closeAllDrawers();

    this.loadLayerGroups();

    setTimeout(() => {
      this.map?.updateSize();
    }, 0);
  }

  closeCoordinatePanel(): void {
    this.coordinatePanelOpen.set(false);
  }

  toggleSmartFilter(): void {
    this.smartFilterOpen.update((current) => {
      const next = !current;

      if (next) {
        this.layerManagerOpen.set(false);
        this.closeSearchPanel();
        this.exportPanelOpen.set(false);
        this.closeLegend();
        this.closeInfo();
        this.closeFilterDrawer();
        this.closeFeatureInfoDrawer();
        this.closeCoordinatePanel();
      }

      return next;
    });
  }

  closeSmartFilter(): void {
    this.smartFilterOpen.set(false);
  }

  closeSmartFilterResultsPanel(): void {
    this.smartFilterResultsPanelOpen.set(false);
  }

  applySmartFilter(request: ProductSmartFilterRequest): void {
    const normalizedRequest: ProductSmartFilterRequest = {
      ...request,
      provider: '',
      minOffNadir: null,
      minResolution: null,
      acquisitionStartDate: request.acquisitionStartDate || null,
      acquisitionEndDate: request.acquisitionEndDate || null,
      pageNumber: request.pageNumber || 1,
      pageSize: request.pageSize || 50
    };

    this.smartFilterLoading.set(true);

    this.mapService.smartProductFilter(normalizedRequest).subscribe({
      next: (result) => {
        const results = result ?? [];

        this.smartFilterResults.set(results);
        this.smartFilterResultsPanelOpen.set(results.length > 0);

        this.smartFilterLoading.set(false);
        this.selectedSmartFilterProductId.set(null);
        this.clearOverlaySource();
      },
      error: (error) => {
        console.error('Akıllı filtreleme hatası:', error);

        this.smartFilterResults.set([]);
        this.smartFilterResultsPanelOpen.set(false);

        this.selectedSmartFilterProductId.set(null);
        this.clearOverlaySource();
        this.smartFilterLoading.set(false);
      }
    });
  }

  clearSmartFilter(): void {
    this.smartFilterResults.set([]);
    this.smartFilterResultsPanelOpen.set(false);
    this.selectedSmartFilterProductId.set(null);
    this.clearOverlaySource();
  }

  selectSmartFilterProduct(item: ProductSmartFilterResult): void {
    this.selectedSmartFilterProductId.set(this.getSmartFilterProductId(item));
    this.zoomToSmartFilterProduct(item);
    this.closeAllDrawers();
  }

  canViewAddToCart(item: ProductSmartFilterResult): boolean {
    const productId = this.getSmartFilterProductId(item);

    if (!productId) {
      return false;
    }

    const basket = this.basketService.basket;

    if (basket) {
      return !basket.some((basketItem) => Number(basketItem.productId) === productId);
    }

    return true;
  }

  addSmartFilterProductToCart(item: ProductSmartFilterResult): void {
    this.addToCart(item);
  }

  addToCart(item: ProductSmartFilterResult): void {
    const productId = this.getSmartFilterProductId(item);

    if (!productId) {
      this.alertService.createAlert('danger', this.translateService.instant('MESSAGES.ERROR'));
      return;
    }

    if (!this.canViewAddToCart(item)) {
      return;
    }

    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      const data: BasketModel = {
        id: 0,
        userId: Number(currentUser.id),
        productId,
        isDeleted: false,
        product: undefined,
        totalPrice: undefined,
        numberOf: undefined
      };

      this.basketManagementService.save(data).subscribe((result) => {
        if (result.isSuccess) {
          this.alertService.createAlert('success', this.translateService.instant('MESSAGES.SUCCESS'));
          this.basketService.loadBasketFromDb();
        } else {
          this.alertService.createAlert('danger', this.translateService.instant('MESSAGES.ERROR'));
        }
      });

      return;
    }

    const smartItem = item as ProductSmartFilterResult & {
      price?: number | null;
      totalPrice?: number | null;
      unitPrice?: number | null;
    };

    const product = {
      categoryId: 1,
      id: productId,
      name: item.name || item.imageId || '-',
      price: smartItem.price ?? smartItem.totalPrice ?? smartItem.unitPrice ?? 0,
      isDeleted: false,
      userId: 0
    };

    let basket = JSON.parse(localStorage.getItem('basket') as string) as BasketModel[] | null;

    if (basket?.length) {
      if (basket.some((basketItem) => Number(basketItem.productId) === productId)) {
        this.basketService.setBasket(basket);
        return;
      }

      if (basket.length < 15) {
        basket.push({
          id: 0,
          userId: 0,
          product: product as any,
          productId: product.id,
          isDeleted: false,
          numberOf: 0,
          totalPrice: 0
        });
      } else {
        this.alertService.createAlert(
          'warning',
          this.translateService.instant('MESSAGES.LOGIN_REQUIRED_FOR_MORE_PRODUCTS')
        );
        return;
      }
    } else {
      basket = [
        {
          id: 0,
          userId: 0,
          product: product as any,
          productId: product.id,
          isDeleted: false,
          numberOf: 0,
          totalPrice: 0
        }
      ];
    }

    this.alertService.createAlert('success', this.translateService.instant('MESSAGES.SUCCESS'));
    this.basketService.setBasket(basket);
  }

  private getSmartFilterProductId(item: ProductSmartFilterResult | null | undefined): number {
    const rawItem = item as (ProductSmartFilterResult & {
      productId?: number | string | null;
      id?: number | string | null;
    }) | null | undefined;
    const rawId = rawItem?.productId ?? rawItem?.id;
    const productId = Number(rawId);

    return Number.isFinite(productId) && productId > 0 ? productId : 0;
  }

  zoomToSmartFilterProduct(item: ProductSmartFilterResult): void {
    this.suppressMapClicks();

    if (item.wkt) {
      this.renderSmartFilterFootprint(item);
      return;
    }

    if (this.renderSmartFilterBboxFootprint(item)) {
      return;
    }
  }

  private renderSmartFilterBboxFootprint(item: ProductSmartFilterResult): boolean {
    if (
      item.bboxMinX == null ||
      item.bboxMinY == null ||
      item.bboxMaxX == null ||
      item.bboxMaxY == null ||
      !this.map ||
      !this.view
    ) {
      this.clearOverlaySource();
      return false;
    }

    try {
      this.clearOverlaySource();

      const min = fromLonLat([item.bboxMinX, item.bboxMinY]);
      const max = fromLonLat([item.bboxMaxX, item.bboxMaxY]);
      const minX = min[0];
      const minY = min[1];
      const maxX = max[0];
      const maxY = max[1];

      const feature = new Feature({
        geometry: new Polygon([
          [
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY],
            [minX, minY]
          ]
        ])
      }) as Feature<Geometry>;

      this.setSmartFilterFootprintProperties(feature, item);

      this.vectorSource.addFeature(feature);
      this.fitToOverlay();

      setTimeout(() => {
        this.map?.updateSize();
      }, 50);

      return true;
    } catch (error) {
      console.error('Smart filter bbox çizimi başarısız:', error);
      return false;
    }
  }

  private renderSmartFilterFootprint(item: ProductSmartFilterResult): void {
    if (!item.wkt || !this.map || !this.view) {
      return;
    }

    try {
      this.clearOverlaySource();

      const feature = new WKT().readFeature(item.wkt, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }) as Feature<Geometry>;

      const geometry = feature.getGeometry();
      const geometryType = geometry?.getType();

      if (!geometry || (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon')) {
        console.warn('Smart filter footprint için sadece Polygon veya MultiPolygon WKT desteklenir.');
        return;
      }

      this.setSmartFilterFootprintProperties(feature, item);

      this.vectorSource.addFeature(feature);
      this.fitToOverlay();

      setTimeout(() => {
        this.map?.updateSize();
      }, 50);
    } catch (error) {
      console.error('Smart filter footprint çizimi başarısız:', error);
    }
  }

  private setSmartFilterFootprintProperties(
    feature: Feature<Geometry>,
    item: ProductSmartFilterResult
  ): void {
    feature.set('featureType', 'smartFilterFootprint');
    feature.set('productId', item.id);
    feature.set('selected', true);
    feature.setStyle(this.selectedSmartFilterFootprintStyle);

    const smartFilterInfo: SmartFilterPopupInfo[] = [
      { labelKey: 'PRODUCT.NAME', value: item.name || '-' },
      { labelKey: 'PRODUCT.IMAGE_ID', value: item.imageId || '-' },
      { labelKey: 'PRODUCT.PROVIDER', value: item.provider || '-' },
      { labelKey: 'PRODUCT.SENSOR_MODE', value: item.sensorMode || '-' },
      {
        labelKey: 'PRODUCT.ACQUISITION_DATE',
        value: item.acquisitionDate
          ? formatDate(item.acquisitionDate, 'dd/MM/yyyy HH:mm', this.locale)
          : '-'
      },
      { labelKey: 'PRODUCT.CLOUD_RATE', value: item.cloudRate != null ? `${item.cloudRate}%` : '-' },
      { labelKey: 'PRODUCT.NADIR_ANGLE', value: item.nadirAngle != null ? `${item.nadirAngle}°` : '-' },
      { labelKey: 'PRODUCT.RESOLUTION', value: item.resolution != null ? `${item.resolution} m` : '-' },
      { labelKey: 'PRODUCT.SPECTRAL_RESOLUTION', value: item.spectralResolution || '-' }
    ];

    feature.set('smartFilterInfo', smartFilterInfo);
  }

  toggleSmartFilterResultsPanel(): void {
    if (!this.smartFilterResults().length) return;

    this.smartFilterResultsPanelOpen.update(v => !v);
  }
}
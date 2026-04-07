import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Geometry from 'ol/geom/Geometry';
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

import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { BasketManagementService } from '../../basket-management/basket-management.service';
import { AuthService } from '../../auth';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { LayerGroupModel } from '../../map-management/models/layergroup.model';
import { LayerModel } from '../../map-management/models/layer.model';
import { LayerType } from '../../map-management/models/layertype.model';
import { MapSearchService } from '../map-search.service';
import { MapService } from './map.service';

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

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  operatorSelectItems: Array<{ label: string; value: LayerFilterOperator }> = [];

  readonly translateService = inject(TranslateService);
  readonly mapSearch = inject(MapSearchService);
  readonly mapService = inject(MapService);
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

  private readonly serviceLayerStyle = new Style({
    fill: new Fill({ color: 'rgba(44, 99, 255, 0.18)' }),
    stroke: new Stroke({ color: '#4c8cff', width: 2 }),
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#2c63ff', width: 2.5 })
    })
  });

  readonly searchText = signal('');
  readonly searchResults = signal<SearchResult[]>([]);
  readonly searchPanelOpen = signal(false);
  readonly currentCoords = signal(`${35.2433.toFixed(5)}, ${39.0.toFixed(5)}`);
  readonly currentZoom = signal(6);
  readonly layerManagerOpen = signal(false);
  readonly uploadedFileName = signal('');
  readonly polygonMode = signal(false);

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

  readonly LayerType = LayerType;

  private readonly mapLayerRegistry = new globalThis.Map<number, BaseLayer>();

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

  ngOnInit(): void {
    this.operatorSelectItems = [
      { label: '=', value: 'eq' },
      { label: this.translateService.instant('MAP.FILTER.OPERATORS.CONTAINS'), value: 'like' },
      { label: '>', value: 'gt' },
      { label: '>=', value: 'gte' },
      { label: '<', value: 'lt' },
      { label: '<=', value: 'lte' },
      { label: this.translateService.instant('MAP.FILTER.OPERATORS.BETWEEN'), value: 'between' }
    ];
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
  }

  ngOnDestroy(): void {
    this.mapReady.set(false);
    this.closeFeatureInfoDrawer();
    this.map?.setTarget(undefined);
  }

  openSearchPanel(): void {
    this.searchPanelOpen.set(true);
    this.layerManagerOpen.set(false);
    this.closeAllDrawers();
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
        this.closeAllDrawers();
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
        this.closeAllDrawers();
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

  closeAllDrawers(): void {
    this.closeLegend();
    this.closeInfo();
    this.closeFilterDrawer();
    this.closeFeatureInfoDrawer();

    this.layerManagerOpen.set(false);
    this.searchPanelOpen.set(false);
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
      layer.fieldLoadError = fields.length ? '' : this.translateService.instant('MAP.FILTER.NO_ATTRIBUTES_FOUND');

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
      layer.fieldLoadError = this.translateService.instant('MAP.FILTER.ATTRIBUTE_LOAD_ERROR');
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
  private activateFirstBasemap(): void {
    const groups = this.layerGroups();

    for (const group of groups) {
      const baseLayer = group.layers.find((x) => x.type == LayerType.BaseMap);

      if (baseLayer) {
        this.closeOtherBaseMaps(baseLayer.id);
        baseLayer.isVisible = true;
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
          url: layer.url
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
      if (this.polygonMode() || this.drawInteraction) {
        return;
      }

      let clickedFeature: Feature<Geometry> | null = null;
      let clickedLayer: BaseLayer | null = null;

      this.map?.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          clickedFeature = feature as Feature<Geometry>;
          clickedLayer = layer ?? null;
          return true;
        },
        { hitTolerance: 6 }
      );

      if (clickedFeature) {
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
    const geometryType = feature.getGeometry()?.getType() || '-';
    const layerName = String(layer?.get('gpLayerName') || this.translateService.instant('SELECTED_FEATURE'));
    const featureId = feature.getId();
    const rawProps = { ...(feature.getProperties() || {}) } as Record<string, unknown>;
    delete rawProps.geometry;

    const entries: FeaturePopupEntry[] = [
      { label: this.translateService.instant('LAYER_NAME_LABEL'), value: layerName },
      { label: this.translateService.instant('GEOMETRY_TYPE'), value: geometryType }
    ];

    if (featureId !== undefined && featureId !== null && `${featureId}`.trim()) {
      entries.push({ label: this.translateService.instant('FEATURE_ID'), value: String(featureId) });
    }

    for (const [key, value] of Object.entries(rawProps)) {
      const normalized = this.toDisplayValue(value);
      if (!normalized) continue;

      entries.push({
        label: this.formatPropertyLabel(key),
        value: normalized
      });
    }

    this.openFeatureInfoDrawer(layerName, `${this.translateService.instant('FEATURE_DETAILS')} • ${geometryType}`, entries);
  }

  private openFeatureInfoFromWmsPayload(layer: UiLayerModel, payload: any): boolean {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    if (!features.length) return false;

    const feature = features[0] ?? {};
    const geometryType = feature?.geometry?.type || feature?.geometry_name || 'WMS';
    const featureId = feature?.id;
    const properties = feature?.properties && typeof feature.properties === 'object'
      ? feature.properties
      : {};

    const entries: FeaturePopupEntry[] = [
      { label: this.translateService.instant('LAYER_NAME_LABEL'), value: layer.name || layer.layerName || '-' },
      { label: this.translateService.instant('SERVICE_TYPE'), value: 'WMS' },
      { label: this.translateService.instant('GEOMETRY_TYPE'), value: String(geometryType || '-') }
    ];

    if (featureId !== undefined && featureId !== null && `${featureId}`.trim()) {
      entries.push({ label: this.translateService.instant('FEATURE_ID'), value: String(featureId) });
    }

    entries.push({
      label: this.translateService.instant('RESULT_COUNT'),
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
      layer.name || layer.layerName || this.translateService.instant('SELECTED_FEATURE'),
      `${this.translateService.instant('FEATURE_DETAILS')} • WMS`,
      entries
    );

    return true;
  }

  private openFeatureInfoFromWmsText(layer: UiLayerModel, responseText: string): boolean {
    const normalizedText = responseText?.trim();
    if (!normalizedText) return false;

    const sanitized = normalizedText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!sanitized || /no features were found/i.test(sanitized)) {
      return false;
    }

    const entries: FeaturePopupEntry[] = [
      { label: this.translateService.instant('LAYER_NAME_LABEL'), value: layer.name || layer.layerName || '-' },
      { label: this.translateService.instant('SERVICE_TYPE'), value: 'WMS' },
      {
        label: this.translateService.instant('RESPONSE'),
        value: sanitized.length > 1200 ? `${sanitized.slice(0, 1197)}...` : sanitized
      }
    ];

    this.openFeatureInfoDrawer(
      layer.name || layer.layerName || this.translateService.instant('SELECTED_FEATURE'),
      `${this.translateService.instant('FEATURE_DETAILS')} • WMS`,
      entries
    );

    return true;
  }

  private openFeatureInfoDrawer(title: string, subtitle: string, entries: FeaturePopupEntry[]): void {
    this.closeLegend();
    this.closeInfo();
    this.closeFilterDrawer();
    this.closeSearchPanel();
    this.featurePopupTitle.set(title);
    this.featurePopupSubtitle.set(subtitle);
    this.featurePopupEntries.set(entries);
    this.featureInfoDrawerOpen.set(true);
  }

  closeFeatureInfoDrawer(): void {
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
    this.closeFeatureInfoDrawer();
    this.uploadedFileName.set('');
    this.searchResults.set([]);
    this.searchText.set('');
    this.searchPanelOpen.set(false);

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

    this.closeAllDrawers();
    this.clearOverlaySource();
    this.closeFeatureInfoDrawer();
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

    this.stopPolygonDrawing();
    this.clearOverlaySource();
    this.closeFeatureInfoDrawer();
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

  refreshMap(): void {
    if (!this.map) return;

    this.closeLegend();
    this.closeInfo();
    this.closeFilterDrawer();
    this.closeFeatureInfoDrawer();

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
}
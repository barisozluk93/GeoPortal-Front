import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { jsPDF } from 'jspdf';
import shp from 'shpjs';
import JSZip from 'jszip';

import Map from 'ol/Map';
import View from 'ol/View';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import ImageLayer from 'ol/layer/Image';

import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';
import WMTS from 'ol/source/WMTS';
import VectorSource from 'ol/source/Vector';
import Static from 'ol/source/ImageStatic';

import WMTSTileGrid from 'ol/tilegrid/WMTS';

import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import WKT from 'ol/format/WKT';

import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import Feature from 'ol/Feature';

import Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';

import { getArea, getLength } from 'ol/sphere';
import { Style, Stroke, Circle as CircleStyle, Fill } from 'ol/style';

import { defaults as defaultControls } from 'ol/control';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Extent } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';

import { TranslateService } from '@ngx-translate/core';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';

import { LayerModel } from '../../map-management/models/layer.model';
import { LayerType } from '../../map-management/models/layertype.model';
import { MapService } from './map.service';
import { MapExportOptions } from './export-panel/map-export-panel.component';
import { MapSearchResult } from './search/map-search-panel.component';
import {
  ProductSmartFilterRequest,
  ProductSmartFilterResult,
} from './smart-filter/models/product-smart-filter.model';
import { BasketModel } from '../../basket-management/models/basket.model';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { AuthService } from '../../auth';
import { BasketManagementService } from '../../basket-management/basket-management.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MetadataRow } from './smart-filter/metadata/smart-product-metadata-panel.component';
import { ProductModel } from '../marketplace/models/product.model';
import Overlay from 'ol/Overlay';
import { EventsKey } from 'ol/events';
import { unByKey } from 'ol/Observable';
import { createBox } from 'ol/interaction/Draw';

type OlMapLayer = TileLayer<any> | VectorLayer<VectorSource>;
type CoordinateFormat = 'dd' | 'dms';
type SupportedAreaFileExtension = 'zip' | 'geojson' | 'json' | 'kml' | 'kmz';

type ActiveTool =
  | 'layer-manager'
  | 'coordinate'
  | 'measure'
  | 'export'
  | 'polygon'
  | 'rectangle'
  | 'upload'
  | 'search'
  | 'smart-filter'
  | null;

type PanelKey =
  | 'layerManager'
  | 'search'
  | 'coordinate'
  | 'export'
  | 'smartFilter'
  | 'smartPrefilter'
  | 'metadata'
  | 'smartAdvancedFilter'
  | 'smartProductRequest';

type PanelUiState = Record<PanelKey, { minimized: boolean; maximized: boolean }>;

type UserAreaOrigin = 'draw' | 'upload' | 'search' | null;

type AoiPanelSnapshot = {
  isSmartPrefilterPanelOpen: boolean;
  isSmartFilterPanelOpen: boolean;
  isSmartAdvancedFilterPanelOpen: boolean;
  isSmartProductRequestPanelOpen: boolean;
  isMetadataPanelOpen: boolean;
};

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('areaFileInput') areaFileInput?: ElementRef<HTMLInputElement>;

  @Input() refreshKey: number | string | null = null;
  @Input() previewMode = false;
  @Input() previewWkt: string | null = null;

  coordinateFormat: CoordinateFormat = 'dd';
  currentCoordinateText = '-';
  customScaleText = '3000 km';
  isCoordinateMenuOpen = false;

  isLayerManagerOpen = false;
  isSearchPanelOpen = false;
  isGoToCoordinatePanelOpen = false;
  isExportPanelOpen = false;
  isSmartFilterPanelOpen = false;
  isSmartFilterLoading = false;
  isSmartPrefilterPanelOpen = false;

  smartFilterResults: ProductSmartFilterResult[] = [];
  smartFilterRequest: ProductSmartFilterRequest = {
    pageNumber: 1,
    pageSize: 100,
  };

  selectedSmartFilterAreaUnit: 'km2' | 'm2' | 'ha' | 'da' = 'km2';
  totalSelectedAreaM2 = 0;


  activeTool: ActiveTool = null;

  panelUiState: PanelUiState = {
    layerManager: { minimized: false, maximized: false },
    search: { minimized: false, maximized: false },
    coordinate: { minimized: false, maximized: false },
    export: { minimized: false, maximized: false },
    smartFilter: { minimized: false, maximized: false },
    smartPrefilter: { minimized: false, maximized: false },
    metadata: { minimized: false, maximized: false },
    smartAdvancedFilter: { minimized: false, maximized: false },
    smartProductRequest: { minimized: false, maximized: false },
  };

  layers: LayerModel[] = [];

  isLengthMeasureActive = false;
  lengthMeasureText = '';

  isMetadataPanelOpen = false;
  isSmartAdvancedFilterPanelOpen = false;
  isSmartProductRequestPanelOpen = false;
  isSmartProductRequestLoading = false;
  isMetadataLoading = false;
  selectedMetadataProductName = '';
  metadataRows: MetadataRow[] = [];
  metadataRawText = '';

  isAoiUpdateMode = false;
  private userAreaOrigin: UserAreaOrigin = null;
  private aoiUpdatePanelSnapshot?: AoiPanelSnapshot;
  private aoiUpdateEscHandler?: (event: KeyboardEvent) => void;

  private readonly defaultCenter = fromLonLat([35.2433, 38.9637]);
  private readonly defaultZoom = 6;

  private readonly drawColor = '#50cd89';
  private readonly drawFillColor = 'rgba(80, 205, 137, 0.18)';
  private readonly supportedAreaFileExtensions: SupportedAreaFileExtension[] = [
    'zip',
    'geojson',
    'json',
    'kml',
    'kmz'
  ];

  private readonly scaleBarWidthPx = 276;
  private readonly maxScaleDistanceMeters = 3_000_000;


  private map?: Map;
  private dynamicLayers: OlMapLayer[] = [];
  private layerRegistry = new globalThis.Map<number | string, OlMapLayer>();
  private currentLonLat?: [number, number];

  private measureDraw?: Draw;
  private measureSource = new VectorSource();
  private measureTooltipElement?: HTMLDivElement;
  private measureTooltipOverlay?: Overlay;
  private measureGeometryChangeKey?: EventsKey;

  private areaTooltipOverlays: Overlay[] = [];
  private areaGeometryChangeKey?: EventsKey;
  private areaModify?: Modify;
  private areaSnap?: Snap;
  private areaModifyGeometryChangeKeys: EventsKey[] = [];

  private polygonDraw?: Draw;
  private userAreaSource = new VectorSource();
  private smartProductResultSource = new VectorSource();

  private smartProductResultLayer = new VectorLayer({
    source: this.smartProductResultSource,
    zIndex: 9997,
    style: new Style({
      stroke: new Stroke({
        color: '#009ef7',
        width: 2,
      }),
      fill: new Fill({
        color: 'rgba(0, 158, 247, 0.12)',
      }),
    }),
  });

  private selectedSmartProductResultSource = new VectorSource();
  private selectedSmartProducts: ProductSmartFilterResult[] = [];
  private hoveredSmartProduct: ProductSmartFilterResult | null = null;

  private selectedSmartProductResultLayer = new VectorLayer({
    source: this.selectedSmartProductResultSource,
    zIndex: 9998,
    style: new Style({
      stroke: new Stroke({
        color: '#ffc700',
        width: 4,
      }),
      fill: new Fill({
        color: 'rgba(255, 199, 0, 0.20)',
      }),
    }),
  });

  private smartProductPreviewImageLayers: ImageLayer<Static>[] = [];

  private userAreaLayer = new VectorLayer({
    source: this.userAreaSource,
    zIndex: 9999,
    style: new Style({
      stroke: new Stroke({
        color: this.drawColor,
        width: 3,
      }),
      fill: new Fill({
        color: this.drawFillColor,
      }),
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({
          color: this.drawColor,
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 2,
        }),
      }),
    }),
  });

  private measureLayer = new VectorLayer({
    source: this.measureSource,
    zIndex: 10000,
    style: new Style({
      stroke: new Stroke({
        color: this.drawColor,
        width: 3,
      }),
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({
          color: this.drawColor,
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 2,
        }),
      }),
    }),
  });

  constructor(
    private mapService: MapService,
    private alertService: AlertService,
    private translate: TranslateService,
    private authService: AuthService,
    private basketManagementService: BasketManagementService,
    private basketService: BasketService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngAfterViewInit(): void {
    this.initMap();
    this.registerMapEvents();
    this.loadLayers();
    this.renderPreviewWktIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange && this.map && !this.previewMode) {
      this.loadLayers();
    }

    if ((changes['previewWkt'] || changes['previewMode']) && this.map) {
      this.renderPreviewWktIfNeeded();
    }
  }

  ngOnDestroy(): void {
    this.stopLengthMeasure(true);
    this.stopPolygonDraw(true);
    this.stopAoiUpdateMode(false);
    this.disableAreaModify();
    this.map?.setTarget(undefined);
    this.clearDynamicLayers();
  }

  zoomIn(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    const view = this.map?.getView();
    if (!view) return;

    const currentZoom = view.getZoom() ?? this.defaultZoom;

    view.animate({
      zoom: currentZoom + 1,
      duration: 180,
    });
  }

  zoomOut(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    const view = this.map?.getView();
    if (!view) return;

    const currentZoom = view.getZoom() ?? this.defaultZoom;

    view.animate({
      zoom: currentZoom - 1,
      duration: 180,
    });
  }

  resetMap(): void {
    const view = this.map?.getView();
    if (!view) return;

    this.stopLengthMeasure(true);
    this.stopPolygonDraw(true);
    this.disableAreaModify();
    this.userAreaSource.clear();
    this.userAreaOrigin = null;
    this.clearSmartFilterResults();

    view.animate({
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      rotation: 0,
      duration: 300,
    });

    this.closeAllPanels();
    this.activeTool = null;
  }

  toggleLengthMeasure(): void {
    if (this.previewMode) return;

    if (this.isLengthMeasureActive || this.lengthMeasureText) {
      this.stopLengthMeasure(true);
      this.activeTool = null;
      return;
    }

    this.stopPolygonDraw(true);
    this.closeAllPanels();

    this.disableAreaModify();
    this.userAreaSource.clear();
    this.userAreaOrigin = null;
    this.clearSmartFilterResults();

    this.activeTool = 'measure';
    this.startLengthMeasure();
  }

  togglePolygonDraw(): void {
    if (this.previewMode) return;

    if (this.polygonDraw) {
      this.stopPolygonDraw(true);
      this.activeTool = null;
      return;
    }

    this.clearMeasure();
    this.closeAllPanels();

    this.disableAreaModify();
    this.userAreaSource.clear();
    this.userAreaOrigin = null;
    this.clearSmartFilterResults();

    this.activeTool = 'polygon';
    this.startPolygonDraw();
  }

  openUploadFilePicker(): void {
    if (this.previewMode) return;

    this.clearMeasure();
    this.stopPolygonDraw(true);
    this.closeAllPanels();

    this.activeTool = 'upload';

    if (!this.areaFileInput?.nativeElement) {
      this.activeTool = null;
      return;
    }

    const input = this.areaFileInput.nativeElement;

    input.value = '';

    const onFocus = () => {
      setTimeout(() => {
        if (!input.files?.length && this.activeTool === 'upload') {
          this.activeTool = null;
        }

        window.removeEventListener('focus', onFocus);
      }, 300);
    };

    window.addEventListener('focus', onFocus, { once: true });
    input.click();
  }

  async uploadAreaFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.activeTool = null;
      return;
    }

    this.stopPolygonDraw(true);
    this.clearMeasure();

    this.disableAreaModify();
    this.userAreaSource.clear();
    this.userAreaOrigin = null;
    this.clearSmartFilterResults();

    try {
      const extension = this.getAreaFileExtension(file.name);

      if (!extension || !this.isSupportedAreaFileExtension(extension)) {
        this.showUploadWarning('MAP.UPLOAD.FILE_FORMAT_WARNING');
        return;
      }

      const features = await this.readAreaFile(file, extension);

      const polygonFeatures = features.filter((feature) =>
        this.isPolygonFeature(feature)
      );

      if (!polygonFeatures.length) {
        this.showUploadWarning('MAP.UPLOAD.FILE_UPLOAD_WARNING');
        return;
      }

      this.userAreaSource.addFeatures(polygonFeatures);
      this.userAreaOrigin = 'upload';
      this.disableAreaModify();
      this.fitToUserAreas();
      this.calculateSelectedArea();
      this.clearAreaTooltips();
      this.openSmartPrefilterPanel();
    } catch (error) {
      console.error('Dosya yüklenirken hata oluştu:', error);
      this.disableAreaModify();
      this.userAreaSource.clear();
    this.userAreaOrigin = null;
      this.clearSmartFilterResults();
      this.showUploadWarning('MAP.UPLOAD.FILE_READ_ERROR');
    } finally {
      input.value = '';
      this.activeTool = null;
    }
  }

  openLayerManager(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isLayerManagerOpen = true;

    this.activeTool = 'layer-manager';
  }

  closeLayerManager(): void {
    this.isLayerManagerOpen = false;
    this.resetPanelState('layerManager');
    this.activeTool = null;
  }

  toggleLayerManager(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isLayerManagerOpen = !this.isLayerManagerOpen;

    this.activeTool = this.isLayerManagerOpen ? 'layer-manager' : null;

    if (!this.isLayerManagerOpen) {
          this.resetPanelState('layerManager');
      }
  }

  openSearchPanel(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isLayerManagerOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;
    this.isSearchPanelOpen = true;

    this.activeTool = 'search';
  }

  closeSearchPanel(): void {
    this.isSearchPanelOpen = false;
    this.resetPanelState('search');
    this.activeTool = null;
  }

  toggleSearchPanel(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isLayerManagerOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;

    this.isSearchPanelOpen = !this.isSearchPanelOpen;
    this.activeTool = this.isSearchPanelOpen ? 'search' : null;
  }

  selectSearchResult(result: MapSearchResult): void {
    if (this.previewMode) return;

    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.disableAreaModify();
    this.userAreaSource.clear();
    this.userAreaOrigin = null;
    this.clearSmartFilterResults();

    const features = new GeoJSON().readFeatures(result.geoJson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    }) as Feature<Geometry>[];

    const polygonFeatures = features.filter((feature) =>
      this.isPolygonFeature(feature)
    );

    if (!polygonFeatures.length) {
      this.showUploadWarning('MAP.SEARCH.EMPTY');
      return;
    }

    this.userAreaSource.addFeatures(polygonFeatures);
    this.userAreaOrigin = 'search';
    this.disableAreaModify();
    this.fitToUserAreas();
    this.calculateSelectedArea();
    this.clearAreaTooltips();
    this.openSmartPrefilterPanel();
  }

  openSmartFilterPanel(): void {
    if (this.previewMode) return;

    this.clearMeasure();
    this.stopPolygonDraw(false);

    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;

    this.isSmartFilterPanelOpen = true;
    this.activeTool = 'smart-filter';
  }

  closeSmartFilterPanel(): void {
    this.stopLengthMeasure(true);
    this.stopPolygonDraw(true);
    this.disableAreaModify();

    this.userAreaSource.clear();
    this.userAreaOrigin = null;
    this.clearSmartFilterResults();

    this.isMetadataPanelOpen = false;
    this.isMetadataLoading = false;
    this.selectedMetadataProductName = '';
    this.metadataRows = [];
    this.metadataRawText = '';

    this.resetPanelState('smartFilter');
    this.resetPanelState('smartPrefilter');
    this.resetPanelState('metadata');
    this.resetPanelState('smartAdvancedFilter');
    this.resetPanelState('smartProductRequest');

    this.isSmartFilterPanelOpen = false;
    this.activeTool = null;

    this.map?.getView().animate({
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      rotation: 0,
      duration: 300,
    });
  }

  openSmartPrefilterPanel(): void {
    if (this.previewMode) return;

    const wkt = this.getAoiWkt();

    if (!wkt) {
      this.showUploadWarning('MAP.SMART_FILTER.AOI_REQUIRED');
      return;
    }

    this.smartFilterRequest = {
      wkt,
      acquisitionStartDate: null,
      acquisitionEndDate: null,
      pageNumber: 1,
      pageSize: this.smartFilterRequest.pageSize ?? 100,
    };

    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isSmartFilterPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;
    this.isMetadataPanelOpen = false;

    this.smartFilterResults = [];
    this.smartProductResultSource.clear();
    this.selectedSmartProductResultSource.clear();
    this.selectedSmartProducts = [];
    this.hoveredSmartProduct = null;
    this.clearSelectedProductPreviewImages();

    this.isSmartPrefilterPanelOpen = true;
    this.activeTool = 'smart-filter';
  }

  closeSmartPrefilterPanel(): void {
    this.isSmartPrefilterPanelOpen = false;
    this.resetPanelState('smartPrefilter');
  }

  applySmartProductPrefilter(request: ProductSmartFilterRequest): void {
    this.smartFilterRequest = {
      ...this.smartFilterRequest,
      ...request,
      wkt: this.getAoiWkt(),
      pageNumber: 1,
      pageSize: request.pageSize ?? this.smartFilterRequest.pageSize ?? 100,
    };

    this.isSmartPrefilterPanelOpen = false;
    this.resetPanelState('smartPrefilter');
    this.runSmartProductFilter();
  }

  openSmartAdvancedFilterPanel(): void {
    this.isMetadataPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = true;
  }

  closeSmartAdvancedFilterPanel(): void {
    this.isSmartAdvancedFilterPanelOpen = false;
    this.resetPanelState('smartAdvancedFilter');
  }

  applySmartProductFilter(request: ProductSmartFilterRequest): void {
    this.smartFilterRequest = {
      ...request,
      pageNumber: request.pageNumber ?? 1,
      pageSize: request.pageSize ?? 100,
    };

    this.isSmartAdvancedFilterPanelOpen = false;
    this.runSmartProductFilter();
  }

  clearSmartProductFilter(): void {
    this.smartFilterRequest = {
      wkt: this.getAoiWkt(),
      pageNumber: 1,
      pageSize: 100,
    };

    this.isSmartAdvancedFilterPanelOpen = false;
    this.runSmartProductFilter();
  }

  createNewProductRequest(): void {
    if (!this.totalSelectedAreaM2 || !this.getAoiWkt()) {
      this.showUploadWarning('MAP.SMART_FILTER.AOI_REQUIRED');
      return;
    }

    this.isMetadataPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = true;
  }


  startAoiUpdateFromRequestPanel(): void {
    if (this.previewMode || this.userAreaSource.isEmpty()) return;

    if (this.userAreaOrigin !== 'draw') {
      this.alertService.createAlert(
        'warning',
        this.translate.instant('MAP.SMART_FILTER.AOI_UPDATE_ONLY_FOR_DRAWINGS')
      );
      return;
    }

    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.aoiUpdatePanelSnapshot = {
      isSmartPrefilterPanelOpen: this.isSmartPrefilterPanelOpen,
      isSmartFilterPanelOpen: this.isSmartFilterPanelOpen,
      isSmartAdvancedFilterPanelOpen: this.isSmartAdvancedFilterPanelOpen,
      isSmartProductRequestPanelOpen: this.isSmartProductRequestPanelOpen,
      isMetadataPanelOpen: this.isMetadataPanelOpen,
    };

    this.isSmartPrefilterPanelOpen = false;
    this.isSmartFilterPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;
    this.isMetadataPanelOpen = false;

    this.isAoiUpdateMode = true;
    this.activeTool = null;

    this.prepareUserAreaForAoiUpdate();
    this.enableAreaModify();
    this.bindAoiUpdateEscHandler();
  }

  private bindAoiUpdateEscHandler(): void {
    this.unbindAoiUpdateEscHandler();

    this.aoiUpdateEscHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      event.stopPropagation();
      this.stopAoiUpdateMode(false);
    };

    window.addEventListener('keydown', this.aoiUpdateEscHandler);
  }

  private unbindAoiUpdateEscHandler(): void {
    if (!this.aoiUpdateEscHandler) return;

    window.removeEventListener('keydown', this.aoiUpdateEscHandler);
    this.aoiUpdateEscHandler = undefined;
  }

  private stopAoiUpdateMode(areaChanged: boolean): void {
    if (!this.isAoiUpdateMode) return;

    const shouldReopenRequestPanel =
      this.aoiUpdatePanelSnapshot?.isSmartProductRequestPanelOpen === true;

    this.isAoiUpdateMode = false;
    this.activeTool = null;
    this.unbindAoiUpdateEscHandler();
    this.disableAreaModify();

    if (areaChanged) {
      this.calculateSelectedArea();
      this.clearAreaTooltips();
      this.smartFilterRequest = {
        ...this.smartFilterRequest,
        wkt: this.getAoiWkt(),
        pageNumber: 1,
        pageSize: this.smartFilterRequest.pageSize ?? 100,
      };
    }

    this.restoreAoiUpdatePanels();

    if (areaChanged) {
      this.runSmartProductFilter(shouldReopenRequestPanel);
    }
  }

  private restoreAoiUpdatePanels(): void {
    const snapshot = this.aoiUpdatePanelSnapshot;
    this.aoiUpdatePanelSnapshot = undefined;

    if (!snapshot) return;

    this.isSmartPrefilterPanelOpen = snapshot.isSmartPrefilterPanelOpen;
    this.isSmartFilterPanelOpen = snapshot.isSmartFilterPanelOpen;
    this.isSmartAdvancedFilterPanelOpen = snapshot.isSmartAdvancedFilterPanelOpen;
    this.isSmartProductRequestPanelOpen = snapshot.isSmartProductRequestPanelOpen;
    this.isMetadataPanelOpen = snapshot.isMetadataPanelOpen;

    this.updateMapSizeAsync();
  }

  closeSmartProductRequestPanel(): void {
    this.isSmartProductRequestPanelOpen = false;
    this.isSmartProductRequestLoading = false;
    this.resetPanelState('smartProductRequest');
  }

  addSmartProductRequestToCart(product: ProductModel): void {
    const currentUser = this.authService.currentUserValue;

    const customProduct: ProductModel = {
      ...product,
      userId: currentUser ? Number(currentUser.id) : 0,
      wkt: this.getAoiWkt(),
      areaKm2: this.totalSelectedAreaM2 / 1_000_000,
      isCustomArea: true,
      isInMarket: false,
      isDeleted: false,
      price: product.price ?? 0,
      currency: product.currency || 'TRY',
      categoryId: 3
    };

    if (currentUser) {
      const data: BasketModel = {
        id: 0,
        userId: currentUser ? Number(currentUser.id) : 0,
        productId: customProduct.id ?? 0,
        product: customProduct,
        isDeleted: false,
        totalPrice: undefined,
        numberOf: undefined,
      };

      this.isSmartProductRequestLoading = true;

      this.basketManagementService.save(data).subscribe({
        next: (result) => {
          if (result.isSuccess) {
            this.alertService.createAlert(
              'success',
              this.translate.instant('MESSAGES.ADD_TO_CART_SUCCESS')
            );
            this.basketService.loadBasketFromDb();
            this.closeSmartProductRequestPanel();
            return;
          }

          this.alertService.createAlert(
            'danger',
            this.translate.instant('MESSAGES.ERROR')
          );
        },
        error: (error) => {
          console.error('Custom ürün talebi sepete eklenirken hata oluştu:', error);
          this.alertService.createAlert(
            'danger',
            this.translate.instant('MESSAGES.ERROR')
          );
        },
        complete: () => {
          this.isSmartProductRequestLoading = false;
        },
      });
    }
    else {
      var basket = JSON.parse(localStorage.getItem("basket") as string) as BasketModel[];

      if (basket) {
        if (basket.length < 15) {
          basket.push({ id: 0, userId: 0, product: customProduct, productId: customProduct.id, isDeleted: false, numberOf: 0, totalPrice: 0 });
        }
        else {
          this.alertService.createAlert("warning", this.translate.instant('MESSAGES.LOGIN_REQUIRED_FOR_MORE_PRODUCTS'));
        }
      }
      else {
        basket = [{ id: 0, userId: 0, product: customProduct, productId: customProduct.id, isDeleted: false, numberOf: 0, totalPrice: 0 }];
      }

      this.basketService.setBasket(basket);
      this.alertService.createAlert('success', this.translate.instant('MESSAGES.ADD_TO_CART_WITHOUT_LOGIN_SUCCESS'));
    }
  }

  addSmartProductToCart(productResult: ProductSmartFilterResult): void {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      const data: BasketModel = {
        id: 0,
        userId: Number(currentUser.id),
        productId: productResult.id,
        isDeleted: false,
        product: undefined,
        totalPrice: undefined,
        numberOf: undefined
      };

      this.basketManagementService.save(data).subscribe((result) => {
        if (result.isSuccess) {
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.ADD_TO_CART_SUCCESS'));
          this.basketService.loadBasketFromDb();
        } else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      });

      return;
    }
    else {
      var product: ProductModel = { categoryId: 1, id: productResult.id, name: productResult.name || '-', price: productResult.price ?? 1000, isDeleted: false, userId: 0 };
      var basket = JSON.parse(localStorage.getItem("basket") as string) as BasketModel[];

      if (basket) {
        if (basket.length < 15) {
          basket.push({ id: 0, userId: 0, product: product, productId: product.id, isDeleted: false, numberOf: 0, totalPrice: 0 });
        }
        else {
          this.alertService.createAlert("warning", this.translate.instant('MESSAGES.LOGIN_REQUIRED_FOR_MORE_PRODUCTS'));
        }
      }
      else {
        basket = [{ id: 0, userId: 0, product: product, productId: product.id, isDeleted: false, numberOf: 0, totalPrice: 0 }];
      }

      this.basketService.setBasket(basket);
      this.alertService.createAlert('success', this.translate.instant('MESSAGES.ADD_TO_CART_WITHOUT_LOGIN_SUCCESS'));
    }
  }

  openSmartProductMetadata(product: ProductSmartFilterResult): void {
    var metadataUrl = (product as any).metadataUrl;

    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;
    this.isMetadataPanelOpen = true;
    this.isMetadataLoading = true;
    this.selectedMetadataProductName = product.imageId || product.name || '-';
    this.metadataRows = [];
    this.metadataRawText = '';

    if (!metadataUrl) {
      this.isMetadataLoading = false;
      this.alertService.createAlert('warning', 'Metadata URL bulunamadı.');
      return;
    }

    this.http.get(metadataUrl, { responseType: 'text' }).subscribe({
      next: (text) => {
        this.metadataRawText = text ?? '';
        this.metadataRows = this.parseMetadataText(this.metadataRawText);
      },
      error: (error) => {
        console.error('Metadata okunamadı:', error);
        this.alertService.createAlert('danger', 'Metadata okunamadı.');
        this.metadataRows = [];
        this.metadataRawText = '';
      },
      complete: () => {
        this.isMetadataLoading = false;
      },
    });
  }

  closeMetadataPanel(): void {
    this.isMetadataPanelOpen = false;
    this.isMetadataLoading = false;
    this.selectedMetadataProductName = '';
    this.metadataRows = [];
    this.metadataRawText = '';
    this.resetPanelState('metadata');
  }

  private parseMetadataText(text: string): MetadataRow[] {
    return (text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = this.getMetadataSeparatorIndex(line);

        if (separatorIndex === -1) {
          return {
            key: 'Info',
            value: line,
          };
        }

        return {
          key: line.slice(0, separatorIndex).trim(),
          value: line.slice(separatorIndex + 1).trim(),
        };
      })
      .filter((row) => row.key || row.value);
  }

  private getMetadataSeparatorIndex(line: string): number {
    const separators = [':', '=', '\t'];

    const indexes = separators
      .map((separator) => line.indexOf(separator))
      .filter((index) => index > -1);

    return indexes.length ? Math.min(...indexes) : -1;
  }

  zoomSmartProductToExtent(product: ProductSmartFilterResult): void {
    const feature = this.createSmartProductFeature(product);

    if (!feature || !this.map) return;

    const geometry = feature.getGeometry();

    if (!geometry) return;

    this.selectedSmartProductResultSource.clear();
    this.selectedSmartProductResultSource.addFeature(feature as Feature<Geometry>);

    this.map.getView().fit(geometry.getExtent(), {
      padding: [80, 80, 80, 80],
      duration: 500,
      maxZoom: 17,
    });
  }

  highlightSelectedSmartProducts(products: ProductSmartFilterResult[]): void {
    this.selectedSmartProducts = products ?? [];
    this.renderHighlightedSmartProductFootprints();
  }

  highlightHoveredSmartProduct(product: ProductSmartFilterResult | null): void {
    this.hoveredSmartProduct = product;
    this.renderHighlightedSmartProductFootprints();
  }

  private renderHighlightedSmartProductFootprints(): void {
    this.selectedSmartProductResultSource.clear();

    const productsToHighlight = this.getUniqueSmartProducts([
      ...this.selectedSmartProducts,
      ...(this.hoveredSmartProduct ? [this.hoveredSmartProduct] : []),
    ]);

    const features = productsToHighlight
      .map((product) => this.createSmartProductFeature(product))
      .filter((feature): feature is Feature<Geometry> => !!feature);

    if (this.selectedSmartProducts.length) {
      this.renderSelectedProductPreviewImages(this.selectedSmartProducts);
    } else {
      this.clearSelectedProductPreviewImages();
    }

    if (!features.length) return;

    this.selectedSmartProductResultSource.addFeatures(features);
  }

  private getUniqueSmartProducts(
    products: ProductSmartFilterResult[]
  ): ProductSmartFilterResult[] {
    const uniqueProducts = new globalThis.Map<number, ProductSmartFilterResult>();

    products.forEach((product) => {
      if (!product?.id) return;
      uniqueProducts.set(product.id, product);
    });

    return Array.from(uniqueProducts.values());
  }

  openGoToCoordinatePanel(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isExportPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;
    this.isGoToCoordinatePanelOpen = true;

    this.activeTool = 'coordinate';
  }

  closeGoToCoordinatePanel(): void {
    this.isGoToCoordinatePanelOpen = false;
    this.resetPanelState('coordinate');
    this.activeTool = null;
  }

  toggleGoToCoordinatePanel(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isExportPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;

    this.isGoToCoordinatePanelOpen = !this.isGoToCoordinatePanelOpen;

    this.activeTool = this.isGoToCoordinatePanelOpen ? 'coordinate' : null;
  }

  openExportPanel(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = true;

    this.activeTool = 'export';
  }

  closeExportPanel(): void {
    this.isExportPanelOpen = false;
    this.resetPanelState('export');
    this.activeTool = null;
  }

  toggleExportPanel(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;

    this.isExportPanelOpen = !this.isExportPanelOpen;

    this.activeTool = this.isExportPanelOpen ? 'export' : null;
  }

  exportMap(options: MapExportOptions): void {
    if (!this.map) return;

    this.clearMeasure();
    this.stopPolygonDraw(true);
    this.isExportPanelOpen = false;
    this.resetPanelState('export');
    this.activeTool = null;

    this.map.once('rendercomplete', () => {
      if (!this.map) return;

      const mapSize = this.map.getSize();
      if (!mapSize) return;

      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = mapSize[0];
      sourceCanvas.height = mapSize[1];

      const sourceContext = sourceCanvas.getContext('2d');
      if (!sourceContext) return;

      const canvases = this.map
        .getViewport()
        .querySelectorAll<HTMLCanvasElement>(
          '.ol-layer canvas, canvas.ol-layer'
        );

      canvases.forEach((canvas) => {
        if (canvas.width <= 0 || canvas.height <= 0) return;

        const opacity =
          canvas.parentElement?.style.opacity ||
          canvas.style.opacity ||
          '1';

        sourceContext.globalAlpha = Number(opacity);

        const transform = canvas.style.transform;

        if (transform) {
          const matrix = transform
            .match(/^matrix\(([^\)]*)\)$/)?.[1]
            .split(',')
            .map(Number);

          if (matrix?.length === 6) {
            sourceContext.setTransform(
              matrix[0],
              matrix[1],
              matrix[2],
              matrix[3],
              matrix[4],
              matrix[5]
            );
          }
        }

        sourceContext.drawImage(canvas, 0, 0);
      });

      sourceContext.setTransform(1, 0, 0, 1, 0, 0);
      sourceContext.globalAlpha = 1;

      const targetWidth =
        options.fileType !== 'pdf' && options.x
          ? options.x
          : sourceCanvas.width;

      const targetHeight =
        options.fileType !== 'pdf' && options.y
          ? options.y
          : sourceCanvas.height;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = targetWidth;
      exportCanvas.height = targetHeight;

      const exportContext = exportCanvas.getContext('2d');
      if (!exportContext) return;

      exportContext.drawImage(
        sourceCanvas,
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height,
        0,
        0,
        targetWidth,
        targetHeight
      );

      if (options.fileType === 'pdf') {
        const pdf = new jsPDF({
          orientation:
            exportCanvas.width > exportCanvas.height
              ? 'landscape'
              : 'portrait',
          unit: 'px',
          format: [exportCanvas.width, exportCanvas.height],
        });

        pdf.addImage(
          exportCanvas.toDataURL('image/png'),
          'PNG',
          0,
          0,
          exportCanvas.width,
          exportCanvas.height
        );

        pdf.save(`${options.fileName}.pdf`);
        return;
      }

      const mimeType =
        options.fileType === 'image/jpeg'
          ? 'image/jpeg'
          : 'image/png';

      const extension =
        options.fileType === 'image/jpeg'
          ? 'jpg'
          : 'png';

      const quality =
        options.fileType === 'image/jpeg'
          ? 0.95
          : undefined;

      const link = document.createElement('a');

      link.href = exportCanvas.toDataURL(
        mimeType,
        quality
      );

      link.download = `${options.fileName}.${extension}`;
      link.click();
    });

    this.map.renderSync();
  }

  focusCoordinate(event: { lat: number; lon: number }): void {
    const view = this.map?.getView();
    if (!view) return;

    this.currentLonLat = [event.lon, event.lat];
    this.updateCoordinateText();

    view.animate({
      center: fromLonLat([event.lon, event.lat]),
      zoom: 15,
      duration: 500,
    });

    this.isGoToCoordinatePanelOpen = false;
    this.resetPanelState('coordinate');
    this.activeTool = null;
  }

  toggleCoordinateMenu(event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.isCoordinateMenuOpen = !this.isCoordinateMenuOpen;
  }

  setCoordinateFormat(format: CoordinateFormat, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.coordinateFormat = format;
    this.updateCoordinateText();
    this.isCoordinateMenuOpen = false;
  }

  updateCoordinateText(): void {
    if (!this.currentLonLat) {
      this.currentCoordinateText = '-';
      return;
    }

    const [lon, lat] = this.currentLonLat;
    const labels = this.getCoordinateLabels();

    if (this.coordinateFormat === 'dms') {
      this.currentCoordinateText = `${labels.lat}: ${this.toDms(
        lat,
        'lat'
      )}, ${labels.lng}: ${this.toDms(lon, 'lon')}`;
      return;
    }

    this.currentCoordinateText = `${labels.lat}: ${lat.toFixed(
      6
    )}°, ${labels.lng}: ${lon.toFixed(6)}°`;
  }

  setLayerVisibility(layer: LayerModel, visible: boolean): void {
    this.clearMeasure();

    layer.isVisible = visible;

    const key = this.getLayerKey(layer);
    const existingLayer = this.layerRegistry.get(key);

    if (!visible) {
      if (existingLayer) {
        this.map?.removeLayer(existingLayer);
        this.dynamicLayers = this.dynamicLayers.filter(
          (mapLayer) => mapLayer !== existingLayer
        );
        this.layerRegistry.delete(key);
      }

      return;
    }

    if (existingLayer) {
      existingLayer.setVisible(true);
      existingLayer.setOpacity(this.normalizeOpacity(layer.opacity));
      return;
    }

    const olLayer = this.createOpenLayersLayer(layer);
    if (!olLayer) return;

    olLayer.setVisible(true);
    olLayer.setOpacity(this.normalizeOpacity(layer.opacity));

    this.map?.addLayer(olLayer);
    this.dynamicLayers.push(olLayer);
    this.layerRegistry.set(key, olLayer);
  }

  togglePanelMinimize(key: PanelKey, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    const state = this.panelUiState[key];
    if (!state) return;

    state.minimized = !state.minimized;

    if (state.minimized) {
      state.maximized = false;
    }

    this.updateMapSizeAsync();
  }

  togglePanelMaximize(key: PanelKey, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    const state = this.panelUiState[key];
    if (!state) return;

    state.maximized = !state.maximized;

    if (state.maximized) {
      state.minimized = false;
    }

    this.updateMapSizeAsync();
  }

  resetPanelState(key: PanelKey): void {
    const state = this.panelUiState[key];
    if (!state) return;

    state.minimized = false;
    state.maximized = false;

    this.updateMapSizeAsync();
  }

  private updateMapSizeAsync(): void {
    setTimeout(() => {
      this.map?.updateSize();
    }, 100);
  }

  private initMap(): void {
    this.map = new Map({
      target: 'mapCanvas',
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
      layers: [
        this.smartProductResultLayer,
        this.selectedSmartProductResultLayer,
        this.userAreaLayer,
        this.measureLayer,
      ],
      view: new View({
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        maxResolution: this.maxScaleDistanceMeters / this.scaleBarWidthPx,
        projection: 'EPSG:3857',
      }),
    });

    this.updateCustomScaleBar();
  }

  private registerMapEvents(): void {
    this.map?.on('pointermove', (event) => {
      this.setCoordinate(event.coordinate);
    });

    this.map?.on('click', (event) => {
      this.setCoordinate(event.coordinate);
      this.isCoordinateMenuOpen = false;
    });

    this.map?.getView().on('change:resolution', () => {
      this.updateCustomScaleBar();
    });
  }

  private startLengthMeasure(): void {
    if (!this.map) return;

    this.stopLengthMeasure(true);

    this.isLengthMeasureActive = true;
    this.lengthMeasureText = '';
    this.measureSource.clear();

    this.createMeasureTooltip();

    this.measureDraw = new Draw({
      source: this.measureSource,
      type: 'LineString',
      maxPoints: 2,
      style: new Style({
        stroke: new Stroke({
          color: this.drawColor,
          width: 3,
        }),
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: this.drawColor,
          }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 2,
          }),
        }),
      }),
    });

    this.measureDraw.on('drawstart', (event) => {
      const feature = event.feature as Feature<LineString>;

      this.measureGeometryChangeKey = feature.getGeometry()?.on('change', (geometryEvent) => {
        const geometry = geometryEvent.target as LineString;
        const coordinates = geometry.getCoordinates();

        if (!coordinates.length) return;

        const length = getLength(geometry, {
          projection: 'EPSG:3857',
        });

        const text = this.formatLength(length);
        this.lengthMeasureText = text;

        this.updateMeasureTooltip(
          text,
          coordinates[coordinates.length - 1]
        );
      });
    });

    this.measureDraw.on('drawend', (event) => {
      const feature = event.feature as Feature<LineString>;
      const geometry = feature.getGeometry();

      if (!geometry) return;

      const length = getLength(geometry, {
        projection: 'EPSG:3857',
      });

      const coordinates = geometry.getCoordinates();
      const text = this.formatLength(length);

      this.lengthMeasureText = text;

      this.updateMeasureTooltip(
        text,
        coordinates[coordinates.length - 1]
      );

      if (this.measureGeometryChangeKey) {
        unByKey(this.measureGeometryChangeKey);
        this.measureGeometryChangeKey = undefined;
      }

      this.stopLengthMeasure(false);
    });

    this.map.addInteraction(this.measureDraw);
  }

  private stopLengthMeasure(clearResult: boolean): void {
    if (this.measureDraw && this.map) {
      this.map.removeInteraction(this.measureDraw);
    }

    if (this.measureGeometryChangeKey) {
      unByKey(this.measureGeometryChangeKey);
      this.measureGeometryChangeKey = undefined;
    }

    this.measureDraw = undefined;
    this.isLengthMeasureActive = false;

    if (clearResult) {
      this.lengthMeasureText = '';
      this.measureSource.clear();
      this.removeMeasureTooltip();
    }
  }

  private clearMeasure(): void {
    if (this.isLengthMeasureActive || this.lengthMeasureText) {
      this.stopLengthMeasure(true);
    }
  }

  private startPolygonDraw(): void {
    if (!this.map) return;

    this.stopPolygonDraw(true);

    this.polygonDraw = new Draw({
      source: this.userAreaSource,
      type: 'Polygon',
      stopClick: true,
      style: this.getAreaDrawStyle(),
    });

    this.bindAreaDrawEvents();

    this.map.addInteraction(this.polygonDraw);
  }

  private stopPolygonDraw(clearTooltips = false): void {
    if (this.polygonDraw && this.map) {
      this.map.removeInteraction(this.polygonDraw);
    }

    if (this.areaGeometryChangeKey) {
      unByKey(this.areaGeometryChangeKey);
      this.areaGeometryChangeKey = undefined;
    }

    this.polygonDraw = undefined;

    if (clearTooltips) {
      this.clearAreaTooltips();
    }
  }

  private async readAreaFile(
    file: File,
    extension: SupportedAreaFileExtension
  ): Promise<Feature<Geometry>[]> {

    if (extension === 'zip') {
      const arrayBuffer = await file.arrayBuffer();
      const geoJsonResult = await shp(arrayBuffer);

      if (Array.isArray(geoJsonResult)) {
        return geoJsonResult.flatMap((geoJson) =>
          this.readGeoJsonFeatures(geoJson)
        );
      }

      return this.readGeoJsonFeatures(geoJsonResult);
    }

    if (extension === 'kmz') {
      const zip = await JSZip.loadAsync(file);

      const kmlEntry = Object.values(zip.files).find(
        (entry) =>
          !entry.dir &&
          entry.name.toLowerCase().endsWith('.kml')
      );

      if (!kmlEntry) {
        throw new Error('KMZ içerisinde KML bulunamadı.');
      }

      const kmlText = await kmlEntry.async('text');

      return new KML({
        extractStyles: false,
      }).readFeatures(kmlText, {
        featureProjection: 'EPSG:3857',
      }) as Feature<Geometry>[];
    }

    const text = await file.text();

    if (extension === 'geojson' || extension === 'json') {
      const parsedGeoJson = JSON.parse(text);

      return this.readGeoJsonFeatures(parsedGeoJson);
    }

    if (extension === 'kml') {
      return new KML({
        extractStyles: false,
      }).readFeatures(text, {
        featureProjection: 'EPSG:3857',
      }) as Feature<Geometry>[];
    }

    return [];
  }

  private readGeoJsonFeatures(geoJson: any): Feature<Geometry>[] {
    if (!this.isValidGeoJsonObject(geoJson)) {
      throw new Error('Geçersiz GeoJSON formatı');
    }

    return new GeoJSON().readFeatures(geoJson, {
      featureProjection: 'EPSG:3857',
    }) as Feature<Geometry>[];
  }

  private isValidGeoJsonObject(value: any): boolean {
    if (!value || typeof value !== 'object') return false;

    return [
      'FeatureCollection',
      'Feature',
      'Polygon',
      'MultiPolygon',
      'GeometryCollection',
    ].includes(value.type);
  }

  private getAreaFileExtension(fileName: string): string | null {
    const extension = fileName.split('.').pop()?.toLowerCase();

    return extension || null;
  }

  private isSupportedAreaFileExtension(
    extension: string
  ): extension is SupportedAreaFileExtension {
    return this.supportedAreaFileExtensions.includes(
      extension as SupportedAreaFileExtension
    );
  }

  private showUploadWarning(translationKey: string): void {
    this.alertService.createAlert(
      'warning',
      this.translate.instant(translationKey)
    );
  }

  private isPolygonFeature(feature: Feature<Geometry>): boolean {
    const geometry = feature.getGeometry();

    return geometry instanceof Polygon || geometry instanceof MultiPolygon;
  }

  private fitToUserAreas(): void {
    if (!this.map || this.userAreaSource.isEmpty()) return;

    const extent = this.userAreaSource.getExtent();
    if (!extent) return;

    this.map.getView().fit(extent, {
      padding: [80, 80, 80, 80],
      duration: 500,
      maxZoom: 17,
    });
  }

  private closeAllPanels(): void {
    this.isCoordinateMenuOpen = false;
    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;
    this.resetAllPanelStates();
  }

  private resetAllPanelStates(): void {
    (Object.keys(this.panelUiState) as PanelKey[]).forEach((key) => {
      this.panelUiState[key].minimized = false;
      this.panelUiState[key].maximized = false;
    });

    this.updateMapSizeAsync();
  }

  private runSmartProductFilter(reopenRequestPanelAfterLoad = false): void {
    if (this.previewMode) return;

    const wkt = this.getAoiWkt();

    if (!wkt) {
      this.showUploadWarning('MAP.SMART_FILTER.AOI_REQUIRED');
      return;
    }

    this.smartFilterRequest = {
      ...this.smartFilterRequest,
      wkt,
      pageNumber: this.smartFilterRequest.pageNumber ?? 1,
      pageSize: this.smartFilterRequest.pageSize ?? 100,
    };

    this.isSmartFilterLoading = true;
    this.openSmartFilterPanel();
    this.clearAreaTooltips();

    this.mapService.smartProductFilter(this.smartFilterRequest).subscribe({
      next: (response) => {
        this.smartFilterResults = response ?? [];
        this.selectedSmartProducts = [];
        this.hoveredSmartProduct = null;
        this.selectedSmartProductResultSource.clear();
        this.renderSmartProductResultsOnMap(this.smartFilterResults);
      },
      error: (error) => {
        console.error('Smart product filter çalıştırılırken hata oluştu:', error);
        this.smartFilterResults = [];
        this.selectedSmartProducts = [];
        this.hoveredSmartProduct = null;
        this.smartProductResultSource.clear();
        this.selectedSmartProductResultSource.clear();
        this.alertService.createAlert(
          'danger',
          this.translate.instant('MAP.SMART_FILTER.LOAD_ERROR')
        );
      },
      complete: () => {
        this.isSmartFilterLoading = false;

        if (reopenRequestPanelAfterLoad) {
          this.isSmartProductRequestPanelOpen = true;
          this.isSmartAdvancedFilterPanelOpen = false;
          this.isMetadataPanelOpen = false;
        }
      },
    });
  }

  private renderSmartProductResultsOnMap(
    results: ProductSmartFilterResult[]
  ): void {
    this.smartProductResultSource.clear();

    const features = (results ?? [])
      .map((product) => this.createSmartProductFeature(product))
      .filter((feature): feature is Feature<Geometry> => !!feature);

    if (!features.length) return;

    this.smartProductResultSource.addFeatures(features);
  }

  private renderSelectedProductPreviewImages(
    products: ProductSmartFilterResult[]
  ): void {
    this.clearSelectedProductPreviewImages();

    if (!this.map || !products?.length) return;

    products.forEach((product) => {
      const imageUrl = this.getSmartProductPreviewImageUrl(product);
      if (!imageUrl) return;

      const feature = this.createSmartProductFeature(product);
      const geometry = feature?.getGeometry();

      if (!geometry) return;

      const imageLayer = new ImageLayer({
        source: new Static({
          url: imageUrl,
          imageExtent: geometry.getExtent(),
          projection: 'EPSG:3857',
          crossOrigin: 'anonymous',
        }),
        opacity: 0.75,
        zIndex: 9997,
      });

      this.map?.addLayer(imageLayer);
      this.smartProductPreviewImageLayers.push(imageLayer);
    });
  }

  private clearSelectedProductPreviewImages(): void {
    if (!this.map) {
      this.smartProductPreviewImageLayers = [];
      return;
    }

    this.smartProductPreviewImageLayers.forEach((layer) => {
      this.map?.removeLayer(layer);
    });

    this.smartProductPreviewImageLayers = [];
  }

  private getSmartProductPreviewImageUrl(
    product: ProductSmartFilterResult
  ): string | null {
    const imageUrl = product.previewUrl || product.thumbnailUrl || null;

    if (!imageUrl) return null;

    return imageUrl;
  }

  private createSmartProductFeature(
    product: ProductSmartFilterResult
  ): Feature<Geometry> | null {
    if (product.wkt) {
      try {
        const feature = new WKT().readFeature(product.wkt, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        }) as Feature<Geometry>;

        feature.set('product', product);
        return feature;
      } catch (error) {
        console.warn('Ürün WKT okunamadı:', error, product);
      }
    }

    const hasBbox =
      product.bboxMinX !== null &&
      product.bboxMinX !== undefined &&
      product.bboxMinY !== null &&
      product.bboxMinY !== undefined &&
      product.bboxMaxX !== null &&
      product.bboxMaxX !== undefined &&
      product.bboxMaxY !== null &&
      product.bboxMaxY !== undefined;

    if (!hasBbox) return null;

    const min = fromLonLat([Number(product.bboxMinX), Number(product.bboxMinY)]);
    const max = fromLonLat([Number(product.bboxMaxX), Number(product.bboxMaxY)]);

    const geometry = new Polygon([
      [
        [min[0], min[1]],
        [max[0], min[1]],
        [max[0], max[1]],
        [min[0], max[1]],
        [min[0], min[1]],
      ],
    ]);

    const feature = new Feature<Geometry>(geometry);
    feature.set('product', product);

    return feature;
  }

  getAoiWkt(): string | null {
    const features = this.userAreaSource.getFeatures().filter((feature) =>
      this.isPolygonFeature(feature)
    );

    if (!features.length) {
      return null;
    }

    const geoJson = new GeoJSON().writeFeaturesObject(features, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326',
    }) as any;

    if (features.length === 1) {
      return new WKT().writeFeature(features[0], {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326',
      });
    }

    const polygons = geoJson.features
      ?.map((feature: any) => feature.geometry)
      ?.filter(
        (geometry: any) =>
          geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon'
      );

    if (!polygons?.length) {
      return null;
    }

    const multiPolygonCoordinates = polygons.flatMap((geometry: any) => {
      if (geometry.type === 'Polygon') {
        return [geometry.coordinates];
      }

      return geometry.coordinates;
    });

    return new WKT().writeGeometry(
      new MultiPolygon(multiPolygonCoordinates).transform(
        'EPSG:4326',
        'EPSG:3857'
      ),
      {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326',
      }
    );
  }


  private renderPreviewWktIfNeeded(): void {
    if (!this.previewMode || !this.map) return;

    this.stopLengthMeasure(true);
    this.stopPolygonDraw(true);
    this.clearSmartFilterResults();
    this.userAreaSource.clear();
    this.userAreaOrigin = null;

    const wkt = (this.previewWkt || '').trim();

    if (!wkt) return;

    try {
      const feature = new WKT().readFeature(wkt, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      }) as Feature<Geometry>;

      if (!this.isPolygonFeature(feature)) return;

      this.userAreaSource.addFeature(feature);
      this.fitToUserAreas();
      this.calculateSelectedArea();
      this.clearAreaTooltips();
    } catch (error) {
      console.warn('Preview WKT okunamadı:', error, wkt);
    }
  }

  private calculateSelectedArea(): void {
    let totalArea = 0;

    this.userAreaSource.getFeatures().forEach((feature) => {
      const geometry = feature.getGeometry();

      if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
        totalArea += getArea(geometry, {
          projection: 'EPSG:3857',
        });
      }
    });

    this.totalSelectedAreaM2 = totalArea;
  }

  private clearSmartFilterResults(): void {
    this.totalSelectedAreaM2 = 0;
    this.smartFilterResults = [];
    this.selectedSmartProducts = [];
    this.hoveredSmartProduct = null;
    this.smartProductResultSource.clear();
    this.selectedSmartProductResultSource.clear();
    this.clearSelectedProductPreviewImages();
    this.isSmartFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartFilterLoading = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;
  }

  private formatLength(length: number): string {
    if (length >= 1000) {
      return `${(length / 1000).toFixed(2).replace('.', ',')} km`;
    }

    return `${length.toFixed(2).replace('.', ',')} m`;
  }


  private updateCustomScaleBar(): void {
    if (!this.map) return;

    const resolution = this.map.getView().getResolution();

    if (!resolution) {
      this.customScaleText = '3000 km';
      return;
    }

    const distanceMeters = resolution * this.scaleBarWidthPx;
    const limitedDistanceMeters = Math.min(
      distanceMeters,
      this.maxScaleDistanceMeters
    );

    this.customScaleText = this.formatScaleDistance(limitedDistanceMeters);
  }

  private formatScaleDistance(distanceMeters: number): string {
    if (distanceMeters >= 1000) {
      const km = Math.round(distanceMeters / 1000);
      return `${km} km`;
    }

    return `${Math.round(distanceMeters)} m`;
  }

  private getCoordinateLabels(): { lat: string; lng: string } {
    const lang = (this.translate.currentLang || this.translate.defaultLang || 'en').toLowerCase();

    if (lang.startsWith('tr')) {
      return {
        lat: 'Enlem',
        lng: 'Boylam',
      };
    }

    return {
      lat: 'Lat',
      lng: 'Lng',
    };
  }

  private setCoordinate(coordinate: Coordinate): void {
    const [lon, lat] = toLonLat(coordinate);

    this.currentLonLat = [lon, lat];
    this.updateCoordinateText();
  }

  private loadLayers(): void {
    this.mapService.allLayers().subscribe({
      next: (response) => {
        const layers = response?.data ?? [];

        this.layers = layers
          .filter((layer) => !layer.isDeleted)
          .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

        this.clearDynamicLayers();

        const visibleLayers = this.previewMode
          ? this.getPreviewVisibleLayers(this.layers)
          : this.getVisibleLayers(this.layers);

        visibleLayers.forEach((layer) => {
          const olLayer = this.createOpenLayersLayer(layer);
          if (!olLayer) return;

          olLayer.setVisible(layer.isVisible === true);
          olLayer.setOpacity(this.normalizeOpacity(layer.opacity));

          this.map?.addLayer(olLayer);
          this.dynamicLayers.push(olLayer);
          this.layerRegistry.set(this.getLayerKey(layer), olLayer);
        });

        this.selectedSmartProductResultLayer.setZIndex(9998);
        this.userAreaLayer.setZIndex(9999);
        this.measureLayer.setZIndex(10000);
      },
      error: (error) => {
        console.error('Harita katmanları yüklenirken hata oluştu:', error);
        this.layers = [];
      },
    });
  }

  private getVisibleLayers(layers: LayerModel[]): LayerModel[] {
    return layers
      .filter((layer) => !layer.isDeleted && layer.isVisible === true)
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));
  }

  private getPreviewVisibleLayers(layers: LayerModel[]): LayerModel[] {
    return this.getVisibleLayers(layers).filter(
      (layer) =>
        layer.type === 1 ||
        layer.type === LayerType.Wms ||
        layer.type === LayerType.Wfs ||
        layer.type === LayerType.Wmts
    );
  }

  private createOpenLayersLayer(layer: LayerModel): OlMapLayer | null {
    switch (layer.type) {
      case 1:
        return this.createOsmLayer(layer);

      case LayerType.Wms:
        return this.createWmsLayer(layer);

      case LayerType.Wfs:
        return this.createWfsLayer(layer);

      case LayerType.Wmts:
        return this.createWmtsLayer(layer);

      default:
        return null;
    }
  }

  private createOsmLayer(layer: LayerModel): TileLayer<OSM> {
    return new TileLayer({
      opacity: this.normalizeOpacity(layer.opacity),
      visible: layer.isVisible === true,
      zIndex: layer.orderNo ?? 0,
      source: new OSM({
        url: layer.url || undefined,
        crossOrigin: 'anonymous',
      }),
    });
  }

  private createWmsLayer(layer: LayerModel): TileLayer<TileWMS> | null {
    if (!layer.url || !layer.layerName) return null;

    return new TileLayer({
      opacity: this.normalizeOpacity(layer.opacity),
      visible: layer.isVisible === true,
      zIndex: layer.orderNo ?? 0,
      source: new TileWMS({
        url: layer.url,
        params: {
          LAYERS: layer.layerName,
          TILED: true,
          VERSION: layer.version || '1.1.1',
          FORMAT: layer.format || 'image/png',
          TRANSPARENT: true,
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
    });
  }

  private createWfsLayer(layer: LayerModel): VectorLayer<VectorSource> | null {
    if (!layer.url || !layer.layerName) return null;

    const separator = layer.url.includes('?') ? '&' : '?';

    const wfsUrl =
      `${layer.url}${separator}` +
      `service=WFS&version=${layer.version || '1.0.0'}` +
      `&request=GetFeature` +
      `&typeName=${encodeURIComponent(layer.layerName)}` +
      `&outputFormat=${encodeURIComponent(
        layer.format || 'application/json'
      )}`;

    return new VectorLayer({
      opacity: this.normalizeOpacity(layer.opacity),
      visible: layer.isVisible === true,
      zIndex: layer.orderNo ?? 0,
      source: new VectorSource({
        url: wfsUrl,
        format: new GeoJSON(),
      }),
    });
  }

  private createWmtsLayer(layer: LayerModel): TileLayer<WMTS> | null {
    if (!layer.url || !layer.layerName) return null;

    const projectionExtent: Extent = [
      -20037508.342789244,
      -20037508.342789244,
      20037508.342789244,
      20037508.342789244,
    ];

    const maxResolution = 156543.03392804097;
    const resolutions = Array.from(
      { length: 19 },
      (_, z) => maxResolution / Math.pow(2, z)
    );
    const matrixIds = Array.from({ length: 19 }, (_, z) => z.toString());

    return new TileLayer({
      opacity: this.normalizeOpacity(layer.opacity),
      visible: layer.isVisible === true,
      zIndex: layer.orderNo ?? 0,
      source: new WMTS({
        url: layer.url,
        layer: layer.layerName,
        matrixSet: 'EPSG:3857',
        format: layer.format || 'image/png',
        projection: 'EPSG:3857',
        style: 'default',
        tileGrid: new WMTSTileGrid({
          origin: [projectionExtent[0], projectionExtent[3]],
          resolutions,
          matrixIds,
        }),
        wrapX: true,
        crossOrigin: 'anonymous',
      }),
    });
  }

  private clearDynamicLayers(): void {
    this.dynamicLayers.forEach((layer) => {
      this.map?.removeLayer(layer);
    });

    this.dynamicLayers = [];
    this.layerRegistry.clear();

    if (
      this.map &&
      !this.map.getLayers().getArray().includes(this.smartProductResultLayer)
    ) {
      this.map.addLayer(this.smartProductResultLayer);
    }

    if (
      this.map &&
      !this.map
        .getLayers()
        .getArray()
        .includes(this.selectedSmartProductResultLayer)
    ) {
      this.map.addLayer(this.selectedSmartProductResultLayer);
    }

    if (
      this.map &&
      !this.map.getLayers().getArray().includes(this.userAreaLayer)
    ) {
      this.map.addLayer(this.userAreaLayer);
    }

    if (
      this.map &&
      !this.map.getLayers().getArray().includes(this.measureLayer)
    ) {
      this.map.addLayer(this.measureLayer);
    }
  }

  private getLayerKey(layer: LayerModel): number | string {
    return (
      layer.id ?? layer.layerName ?? layer.name ?? `${layer.type}-${layer.orderNo}`
    );
  }

  private getBaseMapLayers(): OlMapLayer[] {
    return this.layers
      .filter((layer) => layer.type === LayerType.BaseMap)
      .map((layer) => this.layerRegistry.get(this.getLayerKey(layer)))
      .filter((layer): layer is OlMapLayer => !!layer);
  }

  private normalizeOpacity(opacity: number | null | undefined): number {
    if (opacity === null || opacity === undefined) return 1;

    if (opacity > 1) {
      return Math.min(opacity / 100, 1);
    }

    return Math.max(opacity, 0);
  }

  private toDms(value: number, type: 'lat' | 'lon'): string {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    const direction =
      type === 'lat'
        ? value >= 0
          ? 'N'
          : 'S'
        : value >= 0
          ? 'E'
          : 'W';

    return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`;
  }

  private createMeasureTooltip(): void {
    if (!this.map) return;

    this.removeMeasureTooltip();

    this.measureTooltipElement = document.createElement('div');
    this.measureTooltipElement.className = 'map-measure-tooltip';
    this.measureTooltipElement.innerHTML = `
    <div class="map-measure-tooltip__value">0 m</div>
  `;

    this.measureTooltipOverlay = new Overlay({
      element: this.measureTooltipElement,
      offset: [0, -16],
      positioning: 'bottom-center',
      stopEvent: false,
      insertFirst: false,
    });

    this.map.addOverlay(this.measureTooltipOverlay);
  }

  private updateMeasureTooltip(text: string, coordinate: Coordinate): void {
    if (!this.measureTooltipElement || !this.measureTooltipOverlay) return;

    const valueElement = this.measureTooltipElement.querySelector(
      '.map-measure-tooltip__value'
    );

    if (valueElement) {
      valueElement.textContent = text;
    }

    this.measureTooltipOverlay.setPosition(coordinate);
  }

  private removeMeasureTooltip(): void {
    if (this.measureTooltipOverlay) {
      this.map?.removeOverlay(this.measureTooltipOverlay);
    }

    this.measureTooltipOverlay = undefined;
    this.measureTooltipElement = undefined;
  }

  toggleRectangleDraw(): void {
    if (this.previewMode) return;

    if (this.polygonDraw) {
      this.stopPolygonDraw(true);
      this.activeTool = null;
      return;
    }

    this.clearMeasure();
    this.closeAllPanels();

    this.disableAreaModify();
    this.userAreaSource.clear();
    this.userAreaOrigin = null;
    this.clearSmartFilterResults();
    this.clearAreaTooltips();

    this.activeTool = 'rectangle';
    this.startRectangleDraw();
  }

  private startRectangleDraw(): void {
    if (!this.map) return;

    this.stopPolygonDraw(true);

    this.polygonDraw = new Draw({
      source: this.userAreaSource,
      type: 'Circle',
      geometryFunction: createBox(),
      stopClick: true,
      style: this.getAreaDrawStyle(),
    });

    this.bindAreaDrawEvents();

    this.map.addInteraction(this.polygonDraw);
  }

  private getAreaDrawStyle(): Style {
    return new Style({
      stroke: new Stroke({
        color: '#009ef7',
        width: 3,
      }),
      fill: new Fill({
        color: 'rgba(0, 158, 247, 0.25)',
      }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: '#50cd89',
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 2,
        }),
      }),
    });
  }

  private bindAreaDrawEvents(): void {
    if (!this.polygonDraw) return;

    this.polygonDraw.on('drawstart', (event) => {
      const feature = event.feature as Feature<Polygon>;

      this.userAreaSource.clear();
    this.userAreaOrigin = null;
      this.clearSmartFilterResults();
      this.clearAreaTooltips();

      this.areaGeometryChangeKey = feature.getGeometry()?.on('change', (geometryEvent) => {
        const geometry = geometryEvent.target as Polygon;
        this.renderAreaTooltips(geometry);
      });
    });

    this.polygonDraw.on('drawend', (event) => {
      const feature = event.feature as Feature<Polygon>;
      const geometry = feature.getGeometry();

      if (geometry) {
        this.renderAreaTooltips(geometry);
      }

      if (this.areaGeometryChangeKey) {
        unByKey(this.areaGeometryChangeKey);
        this.areaGeometryChangeKey = undefined;
      }

      setTimeout(() => {
        this.userAreaOrigin = 'draw';
        this.stopPolygonDraw(false);
        this.disableAreaModify();
        this.fitToUserAreas();
        this.calculateSelectedArea();
        this.clearAreaTooltips();
        this.openSmartPrefilterPanel();
        this.activeTool = null;
      });
    });
  }

  private prepareUserAreaForAoiUpdate(): void {
    // AOI update modunda alanı kesinlikle bbox/rectangle gibi başka bir geometriye çevirmiyoruz.
    // Kullanıcının çizdiği, dosyadan yüklediği veya aramadan gelen gerçek polygon aynı kalır.
    // Düzenleme sadece Modify interaction ile mevcut geometri üzerinde yapılır.
  }

  private enableAreaModify(): void {
    if (!this.map || this.previewMode || this.userAreaSource.isEmpty()) return;

    this.disableAreaModify();

    this.areaModify = new Modify({
      source: this.userAreaSource,
      style: this.getAreaModifyStyle(),
      pixelTolerance: 30,
    });

    this.areaSnap = new Snap({
      source: this.userAreaSource,
      pixelTolerance: 30,
    });

    this.areaModify.on('modifystart', (event) => {
      this.unbindAreaModifyGeometryChanges();

      event.features.forEach((feature) => {
        const geometry = (feature as Feature<Geometry>).getGeometry();
        if (!geometry) return;

        const key = geometry.on('change', () => {
          this.calculateSelectedArea();
          this.clearAreaTooltips();
        });

        this.areaModifyGeometryChangeKeys.push(key);
      });
    });

    this.areaModify.on('modifyend', () => {
      this.unbindAreaModifyGeometryChanges();
      this.calculateSelectedArea();
      this.clearAreaTooltips();

      if (this.isAoiUpdateMode) {
        this.stopAoiUpdateMode(true);
        return;
      }

      this.openSmartPrefilterPanel();
    });

    this.map.addInteraction(this.areaModify);
    this.map.addInteraction(this.areaSnap);
  }

  private disableAreaModify(): void {
    if (this.areaModify && this.map) {
      this.map.removeInteraction(this.areaModify);
    }

    if (this.areaSnap && this.map) {
      this.map.removeInteraction(this.areaSnap);
    }

    this.areaModify = undefined;
    this.areaSnap = undefined;
    this.unbindAreaModifyGeometryChanges();
  }

  private unbindAreaModifyGeometryChanges(): void {
    if (this.areaModifyGeometryChangeKeys.length) {
      unByKey(this.areaModifyGeometryChangeKeys);
      this.areaModifyGeometryChangeKeys = [];
    }
  }

  private getAreaModifyStyle(): Style {
    return new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: '#ffffff',
        }),
        stroke: new Stroke({
          color: this.drawColor,
          width: 3,
        }),
      }),
    });
  }

  private renderUserAreaTooltips(): void {
    this.clearAreaTooltips();

    this.userAreaSource.getFeatures().forEach((feature) => {
      const geometry = feature.getGeometry();

      if (geometry instanceof Polygon) {
        this.renderAreaTooltips(geometry, false);
        return;
      }

      if (geometry instanceof MultiPolygon) {
        geometry.getPolygons().forEach((polygon) => {
          this.renderAreaTooltips(polygon, false);
        });
      }
    });
  }

  private renderAreaTooltips(geometry: Polygon, clearBeforeRender = true): void {
    if (clearBeforeRender) {
      this.clearAreaTooltips();
    }

    const area = getArea(geometry, {
      projection: 'EPSG:3857',
    });

    const interiorPoint = geometry.getInteriorPoint().getCoordinates();

    this.addAreaTooltip(
      `Alan: ${this.formatArea(area)}`,
      interiorPoint,
      'area'
    );

    const ring = geometry.getCoordinates()[0] ?? [];

    for (let i = 0; i < ring.length - 1; i++) {
      const start = ring[i];
      const end = ring[i + 1];

      const line = new LineString([start, end]);

      const length = getLength(line, {
        projection: 'EPSG:3857',
      });

      const midpoint: Coordinate = [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
      ];

      this.addAreaTooltip(
        `Kenar: ${this.formatLength(length)}`,
        midpoint,
        'segment'
      );
    }
  }

  private addAreaTooltip(
    text: string,
    coordinate: Coordinate,
    type: 'area' | 'segment'
  ): void {
    if (!this.map) return;

    const element = document.createElement('div');
    element.className = `map-area-tooltip map-area-tooltip--${type}`;
    element.textContent = text;

    const overlay = new Overlay({
      element,
      position: coordinate,
      positioning: 'bottom-center',
      offset: [0, -8],
      stopEvent: false,
      insertFirst: false,
    });

    this.map.addOverlay(overlay);
    this.areaTooltipOverlays.push(overlay);
  }

  private clearAreaTooltips(): void {
    this.areaTooltipOverlays.forEach((overlay) => {
      this.map?.removeOverlay(overlay);
    });

    this.areaTooltipOverlays = [];
  }

  private formatArea(areaM2: number): string {
    if (areaM2 >= 1_000_000) {
      return `${(areaM2 / 1_000_000).toFixed(2).replace('.', ',')} km²`;
    }

    return `${areaM2.toFixed(2).replace('.', ',')} m²`;
  }
}
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { jsPDF } from "jspdf";
import shp, { parseDbf } from "shpjs";
import JSZip from "jszip";

import Map from "ol/Map";
import View from "ol/View";

import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import ImageLayer from "ol/layer/Image";

import OSM from "ol/source/OSM";
import TileWMS from "ol/source/TileWMS";
import WMTS from "ol/source/WMTS";
import VectorSource from "ol/source/Vector";
import Static from "ol/source/ImageStatic";

import WMTSTileGrid from "ol/tilegrid/WMTS";

import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import WKT from "ol/format/WKT";

import Draw from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import Snap from "ol/interaction/Snap";
import Feature from "ol/Feature";
import Collection from "ol/Collection";

import Geometry from "ol/geom/Geometry";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import MultiPolygon from "ol/geom/MultiPolygon";

import { getArea, getLength } from "ol/sphere";
import { Style, Stroke, Circle as CircleStyle, Fill } from "ol/style";

import { defaults as defaultControls } from "ol/control";
import { fromLonLat, toLonLat } from "ol/proj";
import { Extent } from "ol/extent";
import { Coordinate } from "ol/coordinate";

import { TranslateService } from "@ngx-translate/core";
import { AlertService } from "src/app/_metronic/partials/layout/alert/alert.service";

import { LayerModel } from "../../map-management/models/layer.model";
import { LayerType } from "../../map-management/models/layertype.model";
import { MapService } from "./map.service";
import { MapExportOptions } from "./export-panel/map-export-panel.component";
import { MapSearchResult } from "./search/map-search-panel.component";
import {
  ProductAcquisitionDateRange,
  ProductSmartFilterRequest,
  ProductSmartFilterResult,
} from "./smart-filter/models/product-smart-filter.model";
import { BasketModel } from "../../basket-management/models/basket.model";
import { BasketService } from "src/app/_metronic/partials/layout/basket/basket.service";
import { AuthService } from "../../auth";
import { BasketManagementService } from "../../basket-management/basket-management.service";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MetadataRow } from "./smart-filter/metadata/smart-product-metadata-panel.component";
import { ProductModel } from "../marketplace/models/product.model";
import Overlay from "ol/Overlay";
import { EventsKey } from "ol/events";
import { unByKey } from "ol/Observable";
import { createBox } from "ol/interaction/Draw";
import { saveAs } from "file-saver";
import { AskFootprintResult } from "./ask-panel/map-ask-panel.component";
import { firstValueFrom } from "rxjs";
import { featureCollection, polygon, multiPolygon } from "@turf/helpers";
import intersect from "@turf/intersect";
import area from "@turf/area";
import {
  SmartPrefilterAoiExportEvent,
  SmartPrefilterAoiItem,
  SmartPrefilterAoiOrigin,
  SmartPrefilterAoiRenameEvent,
  SmartPrefilterNewAreaAction,
} from "./smart-product-prefilter/smart-product-prefilter-panel.component";

type OlMapLayer = TileLayer<any> | VectorLayer<VectorSource>;
type CoordinateFormat = "dd" | "dms";
type MeasureMode = "distance" | "area";
type SupportedAreaFileExtension = "zip" | "geojson" | "json" | "kml" | "kmz";

type ActiveTool =
  | "layer-manager"
  | "coordinate"
  | "measure"
  | "export"
  | "polygon"
  | "rectangle"
  | "upload"
  | "search"
  | "smart-filter"
  | "ask"
  | null;

type PanelKey =
  | "layerManager"
  | "search"
  | "coordinate"
  | "export"
  | "smartFilter"
  | "smartPrefilter"
  | "metadata"
  | "smartAdvancedFilter"
  | "smartProductRequest"
  | "ask";

type PanelUiState = Record<
  PanelKey,
  { minimized: boolean; maximized: boolean }
>;

type UserAreaOrigin = SmartPrefilterAoiOrigin | null;

type MapAoiItem = SmartPrefilterAoiItem;

type AoiPanelSnapshot = {
  isSmartPrefilterPanelOpen: boolean;
  isSmartFilterPanelOpen: boolean;
  isSmartAdvancedFilterPanelOpen: boolean;
  isSmartProductRequestPanelOpen: boolean;
  isMetadataPanelOpen: boolean;
};

@Component({
  selector: "app-map",
  templateUrl: "./map.component.html",
  styleUrls: ["./map.component.scss"],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("areaFileInput") areaFileInput?: ElementRef<HTMLInputElement>;

  @Input() refreshKey: number | string | null = null;
  @Input() previewMode = false;
  @Input() previewWkt: string | null = null;

  coordinateFormat: CoordinateFormat = "dd";
  currentCoordinateText = "-";
  customScaleText = "3000 km";
  mapRotationDegree = 0;
  isCoordinateMenuOpen = false;

  isLayerManagerOpen = false;
  isSearchPanelOpen = false;
  isGoToCoordinatePanelOpen = false;
  isExportPanelOpen = false;
  isSmartFilterPanelOpen = false;
  isSmartFilterLoading = false;
  isSmartPrefilterPanelOpen = false;

  isAskPanelOpen = false;
  isAskLoading = false;
  askFootprints: AskFootprintResult[] = [];
  activeAskFootprintIndex = 0;
  askCoordinateText = "";

  smartFilterResults: ProductSmartFilterResult[] = [];
  smartFilterRequest: ProductSmartFilterRequest = {
    pageNumber: 1,
    pageSize: 100,
  };

  // Prefilter alanlarını dolduran, request modelinden bağımsız backend modeli.
  smartAcquisitionDateRange: ProductAcquisitionDateRange | null = null;
  private isSmartFilterDateRangeInitialized = false;

  selectedSmartFilterAreaUnit: "km2" | "m2" | "ha" | "da" = "km2";
  totalSelectedAreaM2 = 0;
  aoiItems: MapAoiItem[] = [];
  selectedAoiId: string | null = null;
  isResultsPanelCollapsed = false;
  isPrefilterPanelCollapsed = false;
  hoveredAoiId: string | null = null;
  editingAoiId: string | null = null;

  private aoiCounter = 0;
  private aoiRefreshTimer?: ReturnType<typeof setTimeout>;

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
    ask: { minimized: false, maximized: false },
  };

  layers: LayerModel[] = [];

  isLengthMeasureActive = false;
  lengthMeasureText = "";
  private measureMode: MeasureMode | null = null;

  isMetadataPanelOpen = false;
  isSmartAdvancedFilterPanelOpen = false;
  smartAdvancedFilterPosition = { top: 0, left: 0 };
  smartMetadataPanelPosition = { top: 0, left: 0 };
  isSmartProductRequestPanelOpen = false;
  isSmartProductRequestLoading = false;
  isMetadataLoading = false;
  selectedMetadataProductName = "";
  metadataRows: MetadataRow[] = [];
  metadataRawText = "";

  isAoiUpdateMode = false;
  private userAreaOrigin: UserAreaOrigin = null;
  private aoiUpdatePanelSnapshot?: AoiPanelSnapshot;
  private aoiUpdateEscHandler?: (event: KeyboardEvent) => void;
  isAreaCreationMode = false;
  private areaDrawPanelSnapshot?: AoiPanelSnapshot;
  private areaDrawEscHandler?: (event: KeyboardEvent) => void;

  private readonly defaultCenter = fromLonLat([35.2433, 38.9637]);
  private readonly defaultZoom = 3;

  private readonly drawColor = "#263685";
  private readonly drawFillColor = "rgba(38, 54, 133, 0.14)";

  // AOI bazlı yeni fiyatlandırma. Tarife değiştiğinde yalnızca bu değerler güncellenir.
  private readonly satelliteImageUnitPriceTryPerKm2 = 1000;
  private readonly processingServiceUnitPricesTryPerKm2: Record<string, number> = {
    ortorektifikasyon: 250,
    orthorectification: 250,
    pansharpening: 180,
    ndvi: 120,
    siniflama: 300,
    classification: 300,
  };
  private readonly supportedAreaFileExtensions: SupportedAreaFileExtension[] = [
    "zip",
    "geojson",
    "json",
    "kml",
    "kmz",
  ];

  private readonly scaleBarWidthPx = 276;
  private readonly maxScaleDistanceMeters = 3_000_000;

  private map?: Map;
  private dynamicLayers: OlMapLayer[] = [];
  private layerRegistry = new globalThis.Map<number | string, OlMapLayer>();
  private currentLonLat?: [number, number];

  private measureDraw?: Draw;
  private measureSource = new VectorSource();
  private measureSegmentTooltipElement?: HTMLDivElement;
  private measureSegmentTooltipOverlay?: Overlay;
  private measureTotalTooltipElement?: HTMLDivElement;
  private measureTotalTooltipOverlay?: Overlay;
  private measureGeometryChangeKey?: EventsKey;

  private areaTooltipOverlays: Overlay[] = [];
  private areaGeometryChangeKey?: EventsKey;
  private areaModify?: Modify;
  private areaSnap?: Snap;
  private areaModifyGeometryChangeKeys: EventsKey[] = [];

  private polygonDraw?: Draw;
  private userAreaSource = new VectorSource();
  private readonly askHighlightSource = new VectorSource();
  private readonly askHighlightLayer = new VectorLayer({
    source: this.askHighlightSource,
    zIndex: 10002,
    style: (feature) => {
      const isActive = feature.get("askActive") === true;

      return new Style({
        stroke: new Stroke({
          color: "#f1416c",
          width: isActive ? 4 : 2,
          lineDash: isActive ? undefined : [8, 5],
        }),
        fill: new Fill({
          color: isActive
            ? "rgba(241, 65, 108, 0.20)"
            : "rgba(241, 65, 108, 0.08)",
        }),
      });
    },
  });

  private smartProductResultSource = new VectorSource();

  private smartProductResultLayer = new VectorLayer({
    source: this.smartProductResultSource,
    zIndex: 9997,
    style: new Style({
      stroke: new Stroke({
        color: this.drawColor,
        width: 2,
      }),
      fill: new Fill({
        color: "rgba(38, 54, 133, 0.12)",
      }),
    }),
  });

  private selectedSmartProductResultSource = new VectorSource();
  private selectedSmartProducts: ProductSmartFilterResult[] = [];
  private hoveredSmartProduct: ProductSmartFilterResult | null = null;

  private selectedSmartProductResultLayer = new VectorLayer({
    source: this.selectedSmartProductResultSource,
    zIndex: 9998,
    style: (feature) => {
      const highlightType = feature.get("highlightType") as
        "selected" | "hover" | undefined;
      const isSelected = highlightType === "selected";

      return new Style({
        stroke: new Stroke({
          // Footprint rengi AOI renginden özellikle ayrıdır.
          color: "#f59e0b",
          width: isSelected ? 4 : 3,
          lineDash: isSelected ? undefined : [8, 5],
        }),
        fill: new Fill({
          color: isSelected
            ? "rgba(245, 158, 11, 0.18)"
            : "rgba(245, 158, 11, 0.14)",
        }),
      });
    },
  });

  private smartProductIntersectionSource = new VectorSource();

  private smartProductIntersectionLayer = new VectorLayer({
    source: this.smartProductIntersectionSource,
    zIndex: 10000,
    style: new Style({
      stroke: new Stroke({
        color: "#16a34a",
        width: 5,
        lineCap: "round",
        lineJoin: "round",
      }),
    }),
  });

  private smartProductPreviewImageLayers: ImageLayer<Static>[] = [];

  private userAreaLayer = new VectorLayer({
    source: this.userAreaSource,
    zIndex: 9999,
    style: (feature) => {
      const aoiId = feature.get("aoiId") as string | undefined;
      const isHovered = !!aoiId && aoiId === this.hoveredAoiId;
      return new Style({
        stroke: new Stroke({
          color: this.drawColor,
          width: isHovered ? 5 : 2,
        }),
        fill: new Fill({
          color: isHovered ? "rgba(38,54,133,.22)" : "rgba(38,54,133,.12)",
        }),
        image: new CircleStyle({
          radius: isHovered ? 7 : 5,
          fill: new Fill({ color: this.drawColor }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
      });
    },
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
          color: "#ffffff",
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
    private http: HttpClient,
  ) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.registerMapEvents();
    this.loadLayers();
    this.renderPreviewWktIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes["refreshKey"] &&
      !changes["refreshKey"].firstChange &&
      this.map &&
      !this.previewMode
    ) {
      this.loadLayers();
    }

    if ((changes["previewWkt"] || changes["previewMode"]) && this.map) {
      this.renderPreviewWktIfNeeded();
    }
  }

  ngOnDestroy(): void {
    this.stopLengthMeasure(true);
    this.stopPolygonDraw(true);
    this.stopAoiUpdateMode(false);
    this.unbindAreaDrawEscHandler();
    this.disableAreaModify();
    this.closeAskPanel();
    this.map?.setTarget(undefined);
    this.clearDynamicLayers();

    if (this.aoiRefreshTimer) {
      clearTimeout(this.aoiRefreshTimer);
    }

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

  rotateMap(degree: number): void {
    const view = this.map?.getView();
    if (!view || !Number.isFinite(degree)) return;

    view.setRotation((this.normalizeDegree(degree) * Math.PI) / 180);
  }

  resetMapRotation(): void {
    const view = this.map?.getView();
    if (!view) return;

    view.animate({
      rotation: 0,
      duration: 220,
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
    this.aoiItems = [];
    this.editingAoiId = null;
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

  toggleDistanceMeasure(): void {
    this.toggleMeasure("distance");
  }

  toggleAreaMeasure(): void {
    this.toggleMeasure("area");
  }

  private toggleMeasure(mode: MeasureMode): void {
    if (this.previewMode) return;

    if (this.isLengthMeasureActive && this.measureMode === mode) {
      this.stopLengthMeasure(true);
      this.activeTool = null;
      return;
    }

    this.stopLengthMeasure(true);
    this.stopPolygonDraw(true);
    this.closeAllPanels();
    this.disableAreaModify();

    this.activeTool = "measure";
    this.startMeasure(mode);
  }

  togglePolygonDraw(keepSmartPanelOpen = false): void {
    if (this.previewMode) return;

    if (this.activeTool === "polygon" || this.polygonDraw) {
      this.cancelAreaCreationTool();
      return;
    }

    this.clearMeasure();

    // Çizim başladığında smart panel görünürlüğü saklanır, paneller geçici
    // olarak kapatılır ve alan oluşturma hint mesajı gösterilir.
    this.hideSmartPanelsForAreaDrawing();

    this.disableAreaModify();

    // Yeni çizim mevcut AOI geometrilerini ve alan listesini silmez.
    // Draw interaction yeni feature'ı aynı source'a ekler ve drawend'de
    // registerCurrentAoi yalnızca aoiId atanmamış yeni feature'ı kaydeder.
    this.activeTool = "polygon";
    this.startPolygonDraw();
  }

  openUploadFilePicker(keepSmartPanelOpen = false): void {
    if (this.previewMode) return;

    // Upload butonuna ikinci kez basılırsa aktif araç ve hint birlikte kapanır.
    if (this.activeTool === "upload") {
      this.cancelAreaCreationTool();
      return;
    }

    this.clearMeasure();
    this.stopPolygonDraw(true);

    if (!keepSmartPanelOpen) {
      this.closeAllPanels();
    }

    // Dosya seçici açıkken de alan oluşturma hint mesajı görünür.
    this.hideSmartPanelsForAreaDrawing();
    this.activeTool = "upload";

    const input = this.areaFileInput?.nativeElement;

    if (!input) {
      this.cancelAreaCreationTool();
      return;
    }

    input.value = "";

    const onFocus = () => {
      setTimeout(() => {
        // HTML tarafındaki cancel event'i activeTool'u daha önce null yapsa bile
        // isAreaCreationMode üzerinden hint ve panel state'i kesin kapatılır.
        if (!input.files?.length && this.isAreaCreationMode) {
          this.cancelAreaCreationTool();
        }

        window.removeEventListener("focus", onFocus);
      }, 300);
    };

    window.addEventListener("focus", onFocus, { once: true });
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

    // Yeni Alan > Dosya Yükle akışında smart paneller geçici olarak kapalıdır.
    // Bu yüzden panel görünürlüğüne bakarak mevcut AOI'leri temizlemiyoruz;
    // yüklenen geometri her zaman mevcut alan listesine eklenir.
    this.disableAreaModify();

    try {
      const extension = this.getAreaFileExtension(file.name);

      if (!extension || !this.isSupportedAreaFileExtension(extension)) {
        this.showUploadWarning("MAP.UPLOAD.FILE_FORMAT_WARNING");
        return;
      }

      const features = await this.readAreaFile(file, extension);

      const polygonFeatures = features.filter((feature) =>
        this.isPolygonFeature(feature),
      );

      if (!polygonFeatures.length) {
        this.showUploadWarning("MAP.UPLOAD.FILE_UPLOAD_WARNING");
        return;
      }

      this.userAreaSource.addFeatures(polygonFeatures);
      this.userAreaOrigin = "upload";
      this.disableAreaModify();
      this.fitToUserAreas();
      this.calculateSelectedArea();
      this.registerCurrentAoi("upload", this.removeFileExtension(file.name));
      this.clearAreaTooltips();
      this.openSmartPrefilterPanel();
    } catch (error) {
      console.error("Dosya yüklenirken hata oluştu:", error);
      this.disableAreaModify();
      // Okuma hatası mevcut harita çizimlerini ve alan listesini etkilemez.
      this.showUploadWarning("MAP.UPLOAD.FILE_READ_ERROR");
    } finally {
      input.value = "";
      this.restoreAreaDrawPanels();
      this.activeTool = null;
    }
  }

  toggleAskTool(): void {
    if (this.previewMode) return;

    const opening = this.activeTool !== "ask";
    this.clearMeasure();
    this.stopPolygonDraw(true);

    if (!opening) {
      this.closeAskPanel();
      return;
    }

    this.closeAllPanels();
    this.activeTool = "ask";
    // Panel araç seçildiğinde değil, kullanıcı haritada bir noktaya
    // tıkladığında açılır.
    this.isAskPanelOpen = false;
    this.isAskLoading = false;
    this.askFootprints = [];
    this.activeAskFootprintIndex = 0;
    this.askCoordinateText = "";
    this.askHighlightSource.clear();
  }

  private queryFootprintsAtCoordinate(coordinate: Coordinate): void {
    if (!this.map || this.activeTool !== "ask") return;

    const [longitude, latitude] = toLonLat(coordinate);
    const pointWkt = `POINT(${longitude} ${latitude})`;

    this.isAskPanelOpen = true;
    this.isAskLoading = true;
    this.askCoordinateText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    this.askFootprints = [];
    this.activeAskFootprintIndex = 0;
    this.askHighlightSource.clear();

    const request: ProductSmartFilterRequest = {
      ...this.smartFilterRequest,
      wkt: pointWkt,
      pageNumber: 1,
      pageSize: 100,
    };

    this.mapService.smartProductFilter(request).subscribe({
      next: async (response) => {
        try {
          const footprints = (response ?? [])
            .map((item: ProductSmartFilterResult) =>
              this.toAskFootprintResult(item),
            )
            .sort(
              (first, second) =>
                this.getAskDateValue(second.acquisitionDate) -
                this.getAskDateValue(first.acquisitionDate),
            );

          // propertyUrl doğrudan .dbf dosyasını döner. Her footprint'in
          // öznitelikleri paralel okunur; bir dosya hata verirse diğer
          // footprint sonuçları yine de panelde gösterilir.
          this.askFootprints = await Promise.all(
            footprints.map(async (footprint) => ({
              ...footprint,
              ...(await this.loadAskFootprintAttributes(footprint.propertyUrl)),
            })),
          );

          this.activeAskFootprintIndex = 0;
          this.renderAskFootprints();
        } catch (error) {
          console.error("Footprint öznitelikleri hazırlanamadı:", error);
          this.askFootprints = [];
          this.askHighlightSource.clear();
          this.alertService.createAlert(
            "danger",
            this.translate.instant("MAP.ASK.LOAD_ERROR"),
          );
        } finally {
          this.isAskLoading = false;
        }
      },
      error: (error) => {
        console.error("Nokta ayak izi sorgusu çalıştırılırken hata oluştu:", error);
        this.askFootprints = [];
        this.askHighlightSource.clear();
        this.isAskLoading = false;
        this.alertService.createAlert(
          "danger",
          this.translate.instant("MAP.ASK.LOAD_ERROR"),
        );
      },
    });
  }

  private toAskFootprintResult(
    item: ProductSmartFilterResult,
  ): AskFootprintResult {
    const value = item as any;

    return {
      id: value.id,
      name: value.name,
      imageId: value.imageId ?? value.productName ?? value.name,
      productName: value.productName ?? value.imageId,
      acquisitionDate:
        value.acquisitionDate ?? value.date ?? value.createdDate ?? null,
      propertyUrl: value.propertyUrl,
      geometry: value.geometry ?? value.geoJsonGeometry ?? null,
      wkt: value.wkt ?? value.footprintWkt ?? value.geometryWkt ?? null,
      attributes: {},
      attributesLoading: true,
      attributesError: null,
    };
  }

  private async loadAskFootprintAttributes(
    propertyUrl: string | null | undefined,
  ): Promise<
    Pick<
      AskFootprintResult,
      "attributes" | "attributesLoading" | "attributesError"
    >
  > {
    if (!propertyUrl?.trim()) {
      return {
        attributes: {},
        attributesLoading: false,
        attributesError: "Property URL bulunamadı.",
      };
    }

    try {
      const dbfBuffer = await firstValueFrom(
        this.http.get(propertyUrl, { responseType: "arraybuffer" }),
      );

      if (!dbfBuffer?.byteLength) {
        throw new Error("DBF dosyası boş döndü.");
      }

      // @types/shpjs parseDbf için ikinci parametre olarak CPG buffer'ını
      // zorunlu tutuyor. propertyUrl doğrudan DBF döndüğü için varsayılan
      // karakter setini UTF-8 olarak gönderiyoruz.
      const cpgBuffer = new TextEncoder().encode("UTF-8").buffer as ArrayBuffer;
      const parsedRecords = parseDbf(dbfBuffer, cpgBuffer);
      const records = Array.isArray(parsedRecords)
        ? (parsedRecords as Array<Record<string, unknown>>)
        : [];
      const firstRecord = records[0] ?? null;

      return {
        attributes:
          firstRecord && typeof firstRecord === "object" ? firstRecord : {},
        attributesLoading: false,
        attributesError:
          firstRecord && typeof firstRecord === "object"
            ? null
            : "DBF dosyasında öznitelik kaydı bulunamadı.",
      };
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Bilinmeyen DBF okuma hatası";

      console.error(`DBF öznitelikleri okunamadı: ${propertyUrl}`, error);

      return {
        attributes: {},
        attributesLoading: false,
        attributesError: `DBF öznitelikleri okunamadı: ${message}`,
      };
    }
  }

  private getAskDateValue(value: string | Date | null | undefined): number {
    if (!value) return 0;
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  selectAskFootprint(index: number): void {
    if (index < 0 || index >= this.askFootprints.length) return;
    this.activeAskFootprintIndex = index;
    this.renderAskFootprints();
  }

  /**
   * Haritada aynı anda yalnızca aktif sekmeye ait footprint gösterilir.
   * Sonuçlar tarihe göre yeni -> eski sıralandığı için ilk sorguda index 0,
   * yani en yeni footprint çizilir. Sekme değişince önceki geometri temizlenir
   * ve yalnızca yeni seçilen footprint haritaya eklenir.
   */
  private renderAskFootprints(): void {
    this.askHighlightSource.clear();
    if (!this.map || !this.askFootprints.length) return;

    const activeIndex = Math.min(
      Math.max(this.activeAskFootprintIndex, 0),
      this.askFootprints.length - 1,
    );
    const activeFootprint = this.askFootprints[activeIndex];
    const feature = this.createAskFootprintFeature(activeFootprint, activeIndex);

    if (!feature) return;

    this.askHighlightSource.addFeature(feature);

    // İlk footprint çizildiğinde ve panelden yeni sekme seçildiğinde
    // seçili footprint otomatik olarak harita görünümüne sığdırılır.
    this.fitToAskFootprintFeature(feature);
  }

  private fitToAskFootprintFeature(feature: Feature<Geometry>): void {
    if (!this.map) return;

    const geometry = feature.getGeometry();
    if (!geometry) return;

    const extent = geometry.getExtent();

    if (
      !extent ||
      extent.some((value) => !Number.isFinite(value))
    ) {
      return;
    }

    this.map.getView().fit(extent, {
      padding: [80, 80, 80, 80],
      duration: 350,
      maxZoom: 15,
    });
  }

  private createAskFootprintFeature(
    item: AskFootprintResult,
    index: number,
  ): Feature<Geometry> | null {
    if (!this.map) return null;

    try {
      let feature: Feature<Geometry> | null = null;
      const featureProjection = this.map.getView().getProjection();

      if (item.geometry) {
        feature = new GeoJSON().readFeature(
          { type: "Feature", geometry: item.geometry, properties: {} },
          { dataProjection: "EPSG:4326", featureProjection },
        ) as Feature<Geometry>;
      } else if (item.wkt) {
        feature = new WKT().readFeature(item.wkt, {
          dataProjection: "EPSG:4326",
          featureProjection,
        }) as Feature<Geometry>;
      }

      if (!feature?.getGeometry()) return null;

      feature.set("askIndex", index);
      feature.set("askActive", index === this.activeAskFootprintIndex);
      return feature;
    } catch (error) {
      console.error("Sor aracı geometrisi çizilemedi:", error);
      return null;
    }
  }

  zoomToAskFootprint(item: AskFootprintResult): void {
    if (!this.map) return;

    const index = this.askFootprints.indexOf(item);

    if (index >= 0) {
      this.activeAskFootprintIndex = index;
      this.renderAskFootprints();
      return;
    }

    const activeFeature = this.askHighlightSource
      .getFeatures()
      .find((feature) => feature.get("askActive") === true);

    if (activeFeature) {
      this.fitToAskFootprintFeature(activeFeature as Feature<Geometry>);
    }
  }

  closeAskPanel(): void {
    this.isAskPanelOpen = false;
    this.isAskLoading = false;
    this.askFootprints = [];
    this.activeAskFootprintIndex = 0;
    this.askCoordinateText = "";
    this.askHighlightSource.clear();
    this.resetPanelState("ask");
    if (this.activeTool === "ask") this.activeTool = null;
  }

  openLayerManager(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isLayerManagerOpen = true;

    this.activeTool = "layer-manager";
  }

  closeLayerManager(): void {
    this.isLayerManagerOpen = false;
    this.resetPanelState("layerManager");
    this.activeTool = null;
  }

  toggleLayerManager(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isLayerManagerOpen = !this.isLayerManagerOpen;

    this.activeTool = this.isLayerManagerOpen ? "layer-manager" : null;

    if (!this.isLayerManagerOpen) {
      this.resetPanelState("layerManager");
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

    this.activeTool = "search";
  }

  closeSearchPanel(): void {
    this.isSearchPanelOpen = false;
    this.resetPanelState("search");
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
    this.activeTool = this.isSearchPanelOpen ? "search" : null;
  }

  selectSearchResult(result: MapSearchResult): void {
    if (this.previewMode) return;

    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.disableAreaModify();

    // Arama sonucu yeni bir AOI olarak eklenir. Mevcut çizimler ve alan
    // listesi korunur; yalnızca yeni gelen feature'lar aoiId almadan source'a
    // eklenir ve registerCurrentAoi tarafından ayrı kayıt hâline getirilir.
    const features = new GeoJSON().readFeatures(result.geoJson, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }) as Feature<Geometry>[];

    const polygonFeatures = features.filter((feature) =>
      this.isPolygonFeature(feature),
    );

    if (!polygonFeatures.length) {
      this.showUploadWarning("MAP.SEARCH.EMPTY");
      return;
    }

    this.userAreaSource.addFeatures(polygonFeatures);
    this.userAreaOrigin = "search";
    this.disableAreaModify();
    this.fitToUserAreas();
    this.calculateSelectedArea();
    this.registerCurrentAoi("search", this.getSearchAreaName(result));
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
    this.isSmartProductRequestPanelOpen = false;

    // Prefilter ve sonuçlar artık aynı birleşik panel içinde birlikte açık kalır.
    this.isSmartPrefilterPanelOpen = true;
    this.isSmartFilterPanelOpen = true;
    this.activeTool = "smart-filter";
  }

  closeSmartFilterPanel(): void {
    this.smartProductIntersectionSource.clear();
    this.stopLengthMeasure(true);
    this.stopPolygonDraw(true);
    this.disableAreaModify();

    this.userAreaSource.clear();
    this.userAreaOrigin = null;
    this.clearSmartFilterResults();

    this.isMetadataPanelOpen = false;
    this.isMetadataLoading = false;
    this.selectedMetadataProductName = "";
    this.metadataRows = [];
    this.metadataRawText = "";

    this.resetPanelState("smartFilter");
    this.resetPanelState("smartPrefilter");
    this.resetPanelState("metadata");
    this.resetPanelState("smartAdvancedFilter");
    this.resetPanelState("smartProductRequest");

    this.isSmartFilterPanelOpen = false;
    this.isPrefilterPanelCollapsed = false;
    this.isSmartFilterDateRangeInitialized = false;
    this.smartAcquisitionDateRange = null;
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

    const wkt = this.getSelectedAoiWkt();

    if (!wkt) {
      this.showUploadWarning("MAP.SMART_FILTER.AOI_REQUIRED");
      return;
    }

    this.prepareSmartPrefilterPanel();

    // Aynı smart-filter oturumunda yeni bir AOI oluşturulduğunda kullanıcının
    // o anda uyguladığı prefilter/filtre değerlerini koru. Yalnızca WKT'yi
    // yeni seçilen AOI ile değiştir ve tarih aralığı servisine tekrar gitme.
    if (this.isSmartFilterDateRangeInitialized) {
      this.smartFilterRequest = {
        ...this.smartFilterRequest,
        wkt,
        pageNumber: 1,
        pageSize: this.smartFilterRequest.pageSize ?? 100,
      };

      this.isSmartPrefilterPanelOpen = true;
      this.isSmartFilterPanelOpen = true;
      this.activeTool = "smart-filter";
      this.runSmartProductFilter();
      return;
    }

    this.isSmartFilterLoading = true;

    this.mapService.getMarketAcquisitionDateRange().subscribe({
      next: (response) => {
        const dateRange = response?.data as ProductAcquisitionDateRange | null;

        this.isSmartFilterDateRangeInitialized = true;
        this.smartAcquisitionDateRange = {
          acquisitionStartDate: this.toDateInputValue(
            dateRange?.acquisitionStartDate,
          ),
          acquisitionEndDate: this.toDateInputValue(
            dateRange?.acquisitionEndDate,
          ),
        };

        // İlk sonuç sorgusu prefilter endpoint'inden gelen tarih aralığıyla yapılır.
        this.smartFilterRequest = {
          wkt,
          acquisitionStartDate: this.smartAcquisitionDateRange.acquisitionStartDate,
          acquisitionEndDate: this.smartAcquisitionDateRange.acquisitionEndDate,
          pageNumber: 1,
          pageSize: this.smartFilterRequest.pageSize ?? 100,
        };

        this.isSmartPrefilterPanelOpen = true;
        this.isSmartFilterPanelOpen = true;
        this.activeTool = "smart-filter";

        // İlk sorgu ProductAcquisitionDateRange değerleri request'e yazılarak yapılır.
        this.runSmartProductFilter();
      },
      error: (error) => {
        console.error(
          "Market acquisition tarih aralığı alınırken hata oluştu:",
          error,
        );

        this.isSmartFilterDateRangeInitialized = true;
        this.smartAcquisitionDateRange = {
          acquisitionStartDate: null,
          acquisitionEndDate: null,
        };

        this.smartFilterRequest = {
          wkt,
          acquisitionStartDate: null,
          acquisitionEndDate: null,
          pageNumber: 1,
          pageSize: this.smartFilterRequest.pageSize ?? 100,
        };

        this.isSmartPrefilterPanelOpen = true;
        this.isSmartFilterPanelOpen = true;
        this.activeTool = "smart-filter";
        this.isSmartFilterLoading = false;
        this.runSmartProductFilter();
        this.alertService.createAlert(
          "warning",
          "Market ürün tarih aralığı alınamadı.",
        );
      },
      complete: () => {
        this.isSmartFilterLoading = false;
      },
    });
  }

  private prepareSmartPrefilterPanel(): void {
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
  }

  private toDateInputValue(
    value: string | Date | null | undefined,
  ): string | null {
    if (!value) return null;

    if (typeof value === "string") {
      const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      if (datePart) return datePart;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  closeSmartPrefilterPanel(): void {
    this.smartProductIntersectionSource.clear();
    this.isSmartPrefilterPanelOpen = false;
    this.resetPanelState("smartPrefilter");
  }

  applySmartProductPrefilter(request: ProductSmartFilterRequest): void {
    this.smartFilterRequest = {
      ...this.smartFilterRequest,
      ...request,
      wkt: this.getAoiWkt(),
      pageNumber: 1,
      pageSize: request.pageSize ?? this.smartFilterRequest.pageSize ?? 100,
    };

    this.isSmartPrefilterPanelOpen = true;
    this.isSmartFilterPanelOpen = true;
    this.runSmartProductFilter();
  }

  toggleSmartAdvancedFilterPanel(anchorRect: DOMRect): void {
    if (this.isSmartAdvancedFilterPanelOpen) {
      this.closeSmartAdvancedFilterPanel();
      return;
    }

    this.openSmartAdvancedFilterPanel(anchorRect);
  }

  openSmartAdvancedFilterPanel(anchorRect: DOMRect): void {
    this.isMetadataPanelOpen = false;

    const panelWidth = Math.min(380, Math.max(300, window.innerWidth - 24));
    const panelHeight = Math.min(500, Math.max(320, window.innerHeight - 24));
    const gap = 8;
    const viewportPadding = 12;

    let left = anchorRect.right + gap;
    if (left + panelWidth > window.innerWidth - viewportPadding) {
      left = anchorRect.left - panelWidth - gap;
    }

    this.smartAdvancedFilterPosition = {
      top: Math.max(
        viewportPadding,
        Math.min(anchorRect.top, window.innerHeight - panelHeight - viewportPadding),
      ),
      left: Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - panelWidth - viewportPadding),
      ),
    };

    this.isSmartAdvancedFilterPanelOpen = true;
  }

  onMapPageClick(): void {
    if (this.isSmartAdvancedFilterPanelOpen) {
      this.closeSmartAdvancedFilterPanel();
    }

    if (this.isMetadataPanelOpen) {
      this.closeMetadataPanel();
    }
  }

  closeSmartAdvancedFilterPanel(): void {
    this.isSmartAdvancedFilterPanelOpen = false;
    this.resetPanelState("smartAdvancedFilter");
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

  createNewProductRequest(area?: MapAoiItem): void {
    if (area && this.selectedAoiId !== area.id) {
      this.selectedAoiId = area.id;
      this.hoveredAoiId = null;
      this.userAreaLayer.changed();
      this.calculateSelectedArea();
      this.smartFilterRequest = {
        ...this.smartFilterRequest,
        wkt: this.getSelectedAoiWkt(),
        pageNumber: 1,
      };
    }

    if (!this.totalSelectedAreaM2 || !this.getAoiWkt()) {
      this.showUploadWarning("MAP.SMART_FILTER.AOI_REQUIRED");
      return;
    }

    this.isMetadataPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isResultsPanelCollapsed = false;
    this.isSmartProductRequestPanelOpen = true;
    this.updateMapSizeAsync();
  }

  startAoiUpdateFromRequestPanel(): void {
    if (this.previewMode || this.userAreaSource.isEmpty()) return;

    if (!this.aoiItems.length && this.userAreaOrigin) {
      this.registerCurrentAoi(this.userAreaOrigin);
    }

    const area =
      this.aoiItems.find((item) => item.id === this.selectedAoiId) ??
      this.aoiItems[0];
    if (!area) return;

    this.editAoi(area);
  }

  editAoi(area: MapAoiItem): void {
    if (this.previewMode || this.userAreaSource.isEmpty()) return;

    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.selectedAoiId = area.id;
    this.hoveredAoiId = null;
    this.userAreaLayer.changed();
    this.editingAoiId = area.id;
    this.isAoiUpdateMode = true;
    this.activeTool = null;

    // Alan düzenleme sırasında tüm smart paneller kapanır.
    // ESC veya düzenleme tamamlandığında önceki görünüm geri yüklenir.
    this.aoiUpdatePanelSnapshot = this.captureSmartPanelSnapshot();
    this.hideSmartPanels();

    this.prepareUserAreaForAoiUpdate();
    this.enableAreaModify(area.id);
    this.bindAoiUpdateEscHandler();
  }

  finishAoiEdit(): void {
    this.stopAoiUpdateMode(true);
  }

  removeAoi(area: MapAoiItem): void {
    if (!this.aoiItems.some((item) => item.id === area.id)) return;

    this.disableAreaModify();
    this.unbindAoiUpdateEscHandler();
    this.isAoiUpdateMode = false;
    this.editingAoiId = null;

    this.getAoiFeatures(area.id).forEach((feature) =>
      this.userAreaSource.removeFeature(feature),
    );
    this.aoiItems = this.aoiItems.filter((item) => item.id !== area.id);
    if (this.selectedAoiId === area.id)
      this.selectedAoiId = this.aoiItems.length
        ? this.aoiItems[this.aoiItems.length - 1].id
        : null;
    this.calculateSelectedArea();
    this.clearAreaTooltips();

    this.smartFilterRequest = {
      ...this.smartFilterRequest,
      wkt: this.getAoiWkt(),
      pageNumber: 1,
    };

    if (!this.aoiItems.length) {
      this.userAreaOrigin = null;
      this.clearSmartFilterResults();
      this.closeSmartPrefilterPanel();
      return;
    }

    this.scheduleAoiResultRefresh(true);
  }

  togglePrefilterPanel(): void {
    this.isPrefilterPanelCollapsed = !this.isPrefilterPanelCollapsed;
    this.updateMapSizeAsync();
  }

  toggleResultsPanel(): void {
    if (this.isSmartProductRequestPanelOpen) {
      this.isSmartProductRequestPanelOpen = false;
      this.isResultsPanelCollapsed = false;
      this.updateMapSizeAsync();
      return;
    }

    this.isResultsPanelCollapsed = !this.isResultsPanelCollapsed;
    this.updateMapSizeAsync();
  }

  onSmartPrefilterNewArea(action: SmartPrefilterNewAreaAction): void {
    switch (action) {
      case "polygon":
        this.togglePolygonDraw(true);
        return;
      case "rectangle":
        this.toggleRectangleDraw(true);
        return;
      case "upload":
        this.openUploadFilePicker(true);
        return;
    }
  }

  renameAoi(event: SmartPrefilterAoiRenameEvent): void {
    const name = event.name.trim();
    if (!name) return;

    this.aoiItems = this.aoiItems.map((area) =>
      area.id === event.area.id ? { ...area, name } : area,
    );
  }

  async exportAoi(event: SmartPrefilterAoiExportEvent): Promise<void> {
    const { area, format } = event;

    if (!this.aoiItems.some((item) => item.id === area.id)) {
      return;
    }

    try {
      if (format === "kml") {
        this.exportCurrentAoiAsKml(area);
        return;
      }

      await this.exportCurrentAoiAsShp(area);
    } catch (error) {
      console.error("Alan dışa aktarılırken hata oluştu:", error);

      this.alertService.createAlert("danger", "Alan dışa aktarılamadı.");
    }
  }

  private captureSmartPanelSnapshot(): AoiPanelSnapshot {
    return {
      isSmartPrefilterPanelOpen: this.isSmartPrefilterPanelOpen,
      isSmartFilterPanelOpen: this.isSmartFilterPanelOpen,
      isSmartAdvancedFilterPanelOpen: this.isSmartAdvancedFilterPanelOpen,
      isSmartProductRequestPanelOpen: this.isSmartProductRequestPanelOpen,
      isMetadataPanelOpen: this.isMetadataPanelOpen,
    };
  }

  private hideSmartPanels(): void {
    this.isSmartPrefilterPanelOpen = false;
    this.isSmartFilterPanelOpen = false;
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isSmartProductRequestPanelOpen = false;
    this.isMetadataPanelOpen = false;
    this.updateMapSizeAsync();
  }

  private hideSmartPanelsForAreaDrawing(): void {
    this.isAreaCreationMode = true;
    this.areaDrawPanelSnapshot = this.captureSmartPanelSnapshot();
    this.hideSmartPanels();
    this.bindAreaDrawEscHandler();
  }

  private bindAreaDrawEscHandler(): void {
    this.unbindAreaDrawEscHandler();
    this.areaDrawEscHandler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      this.cancelAreaCreationTool();
    };
    window.addEventListener("keydown", this.areaDrawEscHandler);
  }

  cancelAreaCreationTool(): void {
    this.stopPolygonDraw(true);
    this.activeTool = null;
    this.restoreAreaDrawPanels();
  }

  private unbindAreaDrawEscHandler(): void {
    if (!this.areaDrawEscHandler) return;
    window.removeEventListener("keydown", this.areaDrawEscHandler);
    this.areaDrawEscHandler = undefined;
  }

  private restoreAreaDrawPanels(): void {
    this.isAreaCreationMode = false;
    this.unbindAreaDrawEscHandler();
    const snapshot = this.areaDrawPanelSnapshot;
    this.areaDrawPanelSnapshot = undefined;
    if (!snapshot) return;
    this.isSmartPrefilterPanelOpen = snapshot.isSmartPrefilterPanelOpen;
    this.isSmartFilterPanelOpen = snapshot.isSmartFilterPanelOpen;
    this.isSmartAdvancedFilterPanelOpen =
      snapshot.isSmartAdvancedFilterPanelOpen;
    this.isSmartProductRequestPanelOpen =
      snapshot.isSmartProductRequestPanelOpen;
    this.isMetadataPanelOpen = snapshot.isMetadataPanelOpen;
    this.updateMapSizeAsync();
  }

  private bindAoiUpdateEscHandler(): void {
    this.unbindAoiUpdateEscHandler();

    this.aoiUpdateEscHandler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();
      this.stopAoiUpdateMode(false);
    };

    window.addEventListener("keydown", this.aoiUpdateEscHandler);
  }

  private unbindAoiUpdateEscHandler(): void {
    if (!this.aoiUpdateEscHandler) return;

    window.removeEventListener("keydown", this.aoiUpdateEscHandler);
    this.aoiUpdateEscHandler = undefined;
  }

  private stopAoiUpdateMode(areaChanged: boolean): void {
    if (!this.isAoiUpdateMode) return;

    this.isAoiUpdateMode = false;
    this.editingAoiId = null;
    this.activeTool = null;
    this.unbindAoiUpdateEscHandler();
    this.disableAreaModify();
    this.panelUiState.smartFilter.minimized = false;
    this.userAreaLayer.changed();
    this.restoreAoiUpdatePanels();

    if (!areaChanged) return;

    this.calculateSelectedArea();
    this.syncAoiMetric();
    this.clearAreaTooltips();
    this.smartFilterRequest = {
      ...this.smartFilterRequest,
      wkt: this.getSelectedAoiWkt(),
      pageNumber: 1,
      pageSize: this.smartFilterRequest.pageSize ?? 100,
    };

    this.scheduleAoiResultRefresh(true);
  }

  private restoreAoiUpdatePanels(): void {
    const snapshot = this.aoiUpdatePanelSnapshot;
    this.aoiUpdatePanelSnapshot = undefined;

    if (!snapshot) return;

    this.isSmartPrefilterPanelOpen = snapshot.isSmartPrefilterPanelOpen;
    this.isSmartFilterPanelOpen = snapshot.isSmartFilterPanelOpen;
    this.isSmartAdvancedFilterPanelOpen =
      snapshot.isSmartAdvancedFilterPanelOpen;
    this.isSmartProductRequestPanelOpen =
      snapshot.isSmartProductRequestPanelOpen;
    this.isMetadataPanelOpen = snapshot.isMetadataPanelOpen;

    this.updateMapSizeAsync();
  }

  closeSmartProductRequestPanel(): void {
    this.isSmartProductRequestPanelOpen = false;
    this.isSmartProductRequestLoading = false;
    this.isResultsPanelCollapsed = false;
    this.resetPanelState("smartProductRequest");
    this.updateMapSizeAsync();
  }

  addSmartProductRequestToCart(product: ProductModel): void {
    const currentUser = this.authService.currentUserValue;
    const aoiContext = this.getSelectedAoiCartContext();

    if (!aoiContext) {
      this.showUploadWarning("MAP.SMART_FILTER.AOI_REQUIRED");
      return;
    }

    const requestAreaKm2 = aoiContext.areaKm2;
    const imageUnitPrice = this.satelliteImageUnitPriceTryPerKm2;
    const baseTotalPrice = this.roundMoney(requestAreaKm2 * imageUnitPrice);
    const processingOptions = this.buildSelectedProcessingOptions(
      product,
      requestAreaKm2,
    );
    const processingTotalPrice = this.roundMoney(
      processingOptions.reduce((sum, option) => sum + option.totalPrice, 0),
    );
    const calculatedTotalPrice = this.roundMoney(
      baseTotalPrice + processingTotalPrice,
    );

    const customProduct: ProductModel = {
      ...product,
      userId: currentUser ? Number(currentUser.id) : 0,
      wkt: aoiContext.wkt,
      areaKm2: requestAreaKm2,
      isCustomArea: true,
      isInMarket: false,
      isDeleted: false,
      price: imageUnitPrice,
      currency: "TRY",
      categoryId: product.categoryId ?? 3,
      ...({
        basketItemType: "satelliteImage",
        aoiId: aoiContext.id,
        aoiName: aoiContext.name,
        aoiWkt: aoiContext.wkt,
        requestAreaKm2,
        unitPrice: imageUnitPrice,
        baseTotalPrice,
        processingOptions,
        processingTotalPrice,
        calculatedTotalPrice,
        intersectionWkt: aoiContext.wkt,
        requestWkt: aoiContext.wkt,
      } as any),
    };

    this.saveAoiAwareBasketItem(
      customProduct,
      calculatedTotalPrice,
      true,
      aoiContext.wkt,
    );
  }

  addSmartProductToCart(productResult: ProductSmartFilterResult): void {
    const aoiContext = this.getSelectedAoiCartContext();

    if (!aoiContext) {
      this.showUploadWarning("MAP.SMART_FILTER.AOI_REQUIRED");
      return;
    }

    const intersection = this.calculateProductAoiIntersection(
      productResult,
      aoiContext.wkt,
    );

    if (!intersection || intersection.areaKm2 <= 0) {
      this.alertService.createAlert(
        "warning",
        "Seçilen görüntü ile ilgi alanı kesişmiyor.",
      );
      return;
    }

    const requestAreaKm2 = intersection.areaKm2;
    const imageUnitPrice = this.satelliteImageUnitPriceTryPerKm2;
    const baseTotalPrice = this.roundMoney(requestAreaKm2 * imageUnitPrice);
    const processingOptions = this.buildSelectedProcessingOptions(
      productResult as any,
      requestAreaKm2,
    );
    const processingTotalPrice = this.roundMoney(
      processingOptions.reduce((sum, option) => sum + option.totalPrice, 0),
    );
    const calculatedTotalPrice = this.roundMoney(
      baseTotalPrice + processingTotalPrice,
    );

    const product: ProductModel = {
      ...(productResult as any),
      categoryId: 1,
      id: productResult.id,
      name: productResult.name || productResult.imageId || "-",
      price: imageUnitPrice,
      currency: "TRY",
      isDeleted: false,
      userId: Number(this.authService.currentUserValue?.id ?? 0),
      ...({
        basketItemType: "satelliteImage",
        aoiId: aoiContext.id,
        aoiName: aoiContext.name,
        aoiWkt: aoiContext.wkt,
        requestAreaKm2,
        unitPrice: imageUnitPrice,
        baseTotalPrice,
        processingOptions,
        processingTotalPrice,
        calculatedTotalPrice,
        footprintWkt: productResult.wkt ?? null,
        intersectionWkt: intersection.wkt,
        requestWkt: intersection.wkt,
        imageId: productResult.imageId ?? null,
      } as any),
    };

    this.saveAoiAwareBasketItem(
      product,
      calculatedTotalPrice,
      false,
      intersection.wkt,
    );
  }

  private saveAoiAwareBasketItem(
    product: ProductModel,
    totalPrice: number,
    closeRequestPanelAfterSave: boolean,
    requestWkt: string,
  ): void {
    const currentUser = this.authService.currentUserValue;
    const productSnapshot = product as any;

    const data: BasketModel = {
      id: 0,
      userId: Number(currentUser?.id ?? 0),
      productId: product.id ?? 0,
      product,
      isDeleted: false,
      totalPrice,
      numberOf: 1,
      ...({
        aoiId: productSnapshot.aoiId ?? null,
        aoiName: productSnapshot.aoiName ?? null,
        aoiWkt: productSnapshot.aoiWkt ?? null,
        requestWkt,
        intersectionWkt: requestWkt,
        requestAreaKm2: productSnapshot.requestAreaKm2 ?? 0,
        unitPrice: productSnapshot.unitPrice ?? 0,
        baseTotalPrice: productSnapshot.baseTotalPrice ?? 0,
        processingOptions: productSnapshot.processingOptions ?? [],
        processingTotalPrice: productSnapshot.processingTotalPrice ?? 0,
        calculatedTotalPrice: totalPrice,
        itemType: "satelliteImage",
      } as any),
    };

    if (currentUser) {
      this.isSmartProductRequestLoading = closeRequestPanelAfterSave;
      this.basketManagementService.save(data).subscribe({
        next: (result) => {
          if (!result.isSuccess) {
            this.alertService.createAlert(
              "danger",
              this.translate.instant("MESSAGES.ERROR"),
            );
            return;
          }

          this.alertService.createAlert(
            "success",
            this.translate.instant("MESSAGES.ADD_TO_CART_SUCCESS"),
          );
          this.basketService.loadBasketFromDb();
          if (closeRequestPanelAfterSave) this.closeSmartProductRequestPanel();
        },
        error: (error) => {
          console.error("AOI bazlı ürün sepete eklenirken hata oluştu:", error);
          this.alertService.createAlert(
            "danger",
            this.translate.instant("MESSAGES.ERROR"),
          );
        },
        complete: () => {
          this.isSmartProductRequestLoading = false;
        },
      });
      return;
    }

    const basket = (JSON.parse(localStorage.getItem("basket") || "[]") || []) as BasketModel[];
    if (basket.length >= 15) {
      this.alertService.createAlert(
        "warning",
        this.translate.instant("MESSAGES.LOGIN_REQUIRED_FOR_MORE_PRODUCTS"),
      );
      return;
    }

    basket.push(data);
    this.basketService.setBasket(basket);
    this.alertService.createAlert(
      "success",
      this.translate.instant("MESSAGES.ADD_TO_CART_WITHOUT_LOGIN_SUCCESS"),
    );
    if (closeRequestPanelAfterSave) this.closeSmartProductRequestPanel();
  }

  private getSelectedAoiCartContext(): {
    id: string;
    name: string;
    wkt: string;
    areaKm2: number;
  } | null {
    const selectedAoi = this.aoiItems.find((item) => item.id === this.selectedAoiId);
    const wkt = this.getSelectedAoiWkt();
    if (!selectedAoi || !wkt) return null;

    return {
      id: selectedAoi.id,
      name: selectedAoi.name || "İlgi Alanı",
      wkt,
      areaKm2: this.roundArea(selectedAoi.areaM2 / 1_000_000),
    };
  }

  private calculateProductAoiIntersection(
    product: ProductSmartFilterResult,
    aoiWkt: string,
  ): { areaKm2: number; wkt: string } | null {
    try {
      const format = new WKT();
      const productFeature = this.createSmartProductFeature(product);
      const aoiFeature = format.readFeature(aoiWkt, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }) as Feature<Geometry>;

      const productGeometry = productFeature?.getGeometry()?.clone();
      const aoiGeometry = aoiFeature.getGeometry()?.clone();
      if (!productGeometry || !aoiGeometry) return null;

      productGeometry.transform("EPSG:3857", "EPSG:4326");
      const productTurf = this.toTurfPolygon(productGeometry);
      const aoiTurf = this.toTurfPolygon(aoiGeometry);
      if (!productTurf || !aoiTurf) return null;

      const intersection = intersect(featureCollection([productTurf, aoiTurf]));
      if (!intersection?.geometry) return null;

      const areaKm2 = this.roundArea(area(intersection) / 1_000_000);
      const intersectionFeature = new GeoJSON().readFeature(intersection, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }) as Feature<Geometry>;
      const wkt = format.writeFeature(intersectionFeature, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      });

      return { areaKm2, wkt };
    } catch (error) {
      console.error("Görüntü/AOI kesişimi hesaplanamadı:", error);
      return null;
    }
  }

  private toTurfPolygon(geometry: Geometry): any | null {
    if (geometry instanceof Polygon) {
      return polygon(geometry.getCoordinates());
    }
    if (geometry instanceof MultiPolygon) {
      return multiPolygon(geometry.getCoordinates());
    }
    return null;
  }

  private buildSelectedProcessingOptions(
    source: Partial<ProductModel> | ProductSmartFilterResult | any,
    requestAreaKm2: number,
  ): Array<{
    key: "orthorectification" | "pansharpening" | "ndvi" | "classification";
    name: string;
    unitPrice: number;
    areaKm2: number;
    totalPrice: number;
  }> {
    const definitions = [
      {
        key: "orthorectification" as const,
        name: "Ortorektifikasyon",
        selected: source?.isOrthorectified === true,
        unitPrice: this.processingServiceUnitPricesTryPerKm2["ortorektifikasyon"],
      },
      {
        key: "pansharpening" as const,
        name: "Pansharpening",
        selected: source?.isPansharpened === true,
        unitPrice: this.processingServiceUnitPricesTryPerKm2["pansharpening"],
      },
      {
        key: "ndvi" as const,
        name: "NDVI Analizi",
        selected: source?.isNVDIAnalysis === true,
        unitPrice: this.processingServiceUnitPricesTryPerKm2["ndvi"],
      },
      {
        key: "classification" as const,
        name: "Sınıflama",
        selected: source?.isClassified === true,
        unitPrice: this.processingServiceUnitPricesTryPerKm2["siniflama"],
      },
    ];

    return definitions
      .filter((definition) => definition.selected)
      .map((definition) => ({
        key: definition.key,
        name: definition.name,
        unitPrice: definition.unitPrice,
        areaKm2: requestAreaKm2,
        totalPrice: this.roundMoney(requestAreaKm2 * definition.unitPrice),
      }));
  }

  private getProcessingServiceUnitPrice(serviceName: string): number {
    const normalized = serviceName
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");

    const matchedKey = Object.keys(this.processingServiceUnitPricesTryPerKm2)
      .find((key) => normalized.includes(key));
    return matchedKey
      ? this.processingServiceUnitPricesTryPerKm2[matchedKey]
      : 250;
  }

  private roundArea(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  openSmartProductMetadata(payload: {
    product: ProductSmartFilterResult;
    anchorRect: DOMRect;
  }): void {
    const { product, anchorRect } = payload;
    const metadataUrl = (product as any).metadataUrl;

    this.setSmartMetadataPanelPosition(anchorRect);
    this.isSmartAdvancedFilterPanelOpen = false;
    this.isMetadataPanelOpen = true;
    this.isMetadataLoading = true;
    this.selectedMetadataProductName = product.imageId || product.name || "-";
    this.metadataRows = [];
    this.metadataRawText = "";

    if (!metadataUrl) {
      this.isMetadataLoading = false;
      this.alertService.createAlert("warning", "Metadata URL bulunamadı.");
      return;
    }

    this.http.get(metadataUrl, { responseType: "text" }).subscribe({
      next: (text) => {
        this.metadataRawText = text ?? "";
        this.metadataRows = this.parseMetadataText(this.metadataRawText);
      },
      error: (error) => {
        console.error("Metadata okunamadı:", error);
        this.alertService.createAlert("danger", "Metadata okunamadı.");
        this.metadataRows = [];
        this.metadataRawText = "";
      },
      complete: () => {
        this.isMetadataLoading = false;
      },
    });
  }

  private setSmartMetadataPanelPosition(anchorRect: DOMRect): void {
    const panelWidth = Math.min(420, Math.max(300, window.innerWidth - 24));
    const panelHeight = Math.min(500, Math.max(320, window.innerHeight - 24));
    const gap = 8;
    const viewportPadding = 12;

    let left = anchorRect.right + gap;
    if (left + panelWidth > window.innerWidth - viewportPadding) {
      left = anchorRect.left - panelWidth - gap;
    }

    this.smartMetadataPanelPosition = {
      top: Math.max(
        viewportPadding,
        Math.min(anchorRect.top, window.innerHeight - panelHeight - viewportPadding),
      ),
      left: Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - panelWidth - viewportPadding),
      ),
    };
  }

  closeMetadataPanel(): void {
    this.isMetadataPanelOpen = false;
    this.isMetadataLoading = false;
    this.selectedMetadataProductName = "";
    this.metadataRows = [];
    this.metadataRawText = "";
    this.resetPanelState("metadata");
  }

  private parseMetadataText(text: string): MetadataRow[] {
    return (text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = this.getMetadataSeparatorIndex(line);

        if (separatorIndex === -1) {
          return {
            key: "Info",
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
    const separators = [":", "=", "\t"];

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
    this.selectedSmartProductResultSource.addFeature(
      feature as Feature<Geometry>,
    );

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
    this.smartProductIntersectionSource.clear();

    const selectedIds = new Set(
      this.selectedSmartProducts.map((product) => product.id),
    );
    const productsToHighlight = this.getUniqueSmartProducts([
      ...this.selectedSmartProducts,
      ...(this.hoveredSmartProduct ? [this.hoveredSmartProduct] : []),
    ]);

    const features = productsToHighlight
      .map((product) => {
        const feature = this.createSmartProductFeature(product);
        if (!feature) return null;

        feature.set(
          "highlightType",
          selectedIds.has(product.id) ? "selected" : "hover",
        );
        return feature;
      })
      .filter((feature): feature is Feature<Geometry> => !!feature);

    if (this.selectedSmartProducts.length) {
      this.renderSelectedProductPreviewImages(this.selectedSmartProducts);
    } else {
      this.clearSelectedProductPreviewImages();
    }

    if (!features.length) return;

    this.selectedSmartProductResultSource.addFeatures(features);
    this.renderSmartProductAoiIntersectionLines(features);
  }

  private renderSmartProductAoiIntersectionLines(
    footprintFeatures: Feature<Geometry>[],
  ): void {
    this.smartProductIntersectionSource.clear();

    const aoiFeatures = this.selectedAoiId
      ? this.getAoiFeatures(this.selectedAoiId)
      : [];

    const aoiGeometries = aoiFeatures
      .map((feature) => feature.getGeometry())
      .filter(
        (geometry): geometry is Polygon | MultiPolygon =>
          geometry instanceof Polygon || geometry instanceof MultiPolygon,
      );

    // Yalnızca seçili ilgi alanı ile kesişim çizilir.
    if (!aoiGeometries.length) return;

    const overlapLines: Feature<LineString>[] = [];
    const lineKeys = new Set<string>();

    footprintFeatures
      .filter((feature) => feature.get("highlightType") === "selected")
      .forEach((feature) => {
        const footprintGeometry = feature.getGeometry();
        if (
          !(footprintGeometry instanceof Polygon) &&
          !(footprintGeometry instanceof MultiPolygon)
        ) {
          return;
        }

        /*
         * Kesişim alanının dış çerçevesi iki parçadan oluşur:
         * 1) Footprint sınırının AOI içinde kalan parçaları
         * 2) AOI sınırının footprint içinde kalan parçaları
         *
         * Sadece ilkini çizmek, dikdörtgen kesişimlerde üst/alt yeşil çizgilerin
         * eksik kalmasına; yanlış içeride kontrolü ise footprint'in tamamının
         * yeşil görünmesine neden oluyordu.
         */
        this.collectBoundarySegmentsInsideGeometries(
          footprintGeometry,
          aoiGeometries,
          overlapLines,
          lineKeys,
        );

        this.collectBoundarySegmentsInsideGeometries(
          aoiGeometries,
          [footprintGeometry],
          overlapLines,
          lineKeys,
        );
      });

    if (overlapLines.length) {
      this.smartProductIntersectionSource.addFeatures(overlapLines);
    }
  }

  private collectBoundarySegmentsInsideGeometries(
    subjectGeometry: Polygon | MultiPolygon | Array<Polygon | MultiPolygon>,
    clippingGeometries: Array<Polygon | MultiPolygon>,
    target: Feature<LineString>[],
    lineKeys: Set<string>,
  ): void {
    const subjectGeometries = Array.isArray(subjectGeometry)
      ? subjectGeometry
      : [subjectGeometry];

    const clippingRings = clippingGeometries.flatMap((geometry) =>
      this.getPolygonBoundaryRings(geometry),
    );

    subjectGeometries.forEach((geometry) => {
      const subjectRings = this.getPolygonBoundaryRings(geometry);

      subjectRings.forEach((subjectRing) => {
        for (
          let segmentIndex = 0;
          segmentIndex < subjectRing.length - 1;
          segmentIndex += 1
        ) {
          const segmentStart = subjectRing[segmentIndex];
          const segmentEnd = subjectRing[segmentIndex + 1];
          const splitRatios = [0, 1];

          clippingRings.forEach((clippingRing) => {
            for (
              let clippingIndex = 0;
              clippingIndex < clippingRing.length - 1;
              clippingIndex += 1
            ) {
              const ratio = this.getSegmentIntersectionRatio(
                segmentStart,
                segmentEnd,
                clippingRing[clippingIndex],
                clippingRing[clippingIndex + 1],
              );

              if (ratio !== null) splitRatios.push(ratio);
            }
          });

          const orderedRatios = Array.from(
            new Set(splitRatios.map((ratio) => Number(ratio.toFixed(10)))),
          ).sort((first, second) => first - second);

          for (
            let ratioIndex = 0;
            ratioIndex < orderedRatios.length - 1;
            ratioIndex += 1
          ) {
            const fromRatio = orderedRatios[ratioIndex];
            const toRatio = orderedRatios[ratioIndex + 1];
            if (toRatio - fromRatio < 1e-9) continue;

            const middlePoint = this.interpolateCoordinate(
              segmentStart,
              segmentEnd,
              (fromRatio + toRatio) / 2,
            );

            const isInsideClippingGeometry = clippingGeometries.some(
              (clippingGeometry) =>
                this.isCoordinateInsidePolygonGeometry(
                  middlePoint,
                  clippingGeometry,
                ),
            );

            if (!isInsideClippingGeometry) continue;

            const lineStart = this.interpolateCoordinate(
              segmentStart,
              segmentEnd,
              fromRatio,
            );
            const lineEnd = this.interpolateCoordinate(
              segmentStart,
              segmentEnd,
              toRatio,
            );

            const key = this.getNormalizedLineKey(lineStart, lineEnd);
            if (lineKeys.has(key)) continue;

            lineKeys.add(key);
            target.push(new Feature(new LineString([lineStart, lineEnd])));
          }
        }
      });
    });
  }

  private getNormalizedLineKey(start: Coordinate, end: Coordinate): string {
    const first = `${start[0].toFixed(3)}:${start[1].toFixed(3)}`;
    const second = `${end[0].toFixed(3)}:${end[1].toFixed(3)}`;
    return first < second ? `${first}-${second}` : `${second}-${first}`;
  }

  /**
   * OpenLayers intersectsCoordinate sınır üzerindeki ve bazı çoklu polygon
   * durumlarında beklenen sonucu vermeyebildiği için inclusive point-in-polygon
   * kontrolünü burada yapıyoruz. Böylece footprint sınırının AOI içinde kalan
   * tüm parçaları eksiksiz biçimde yeşil çizilir.
   */
  private isCoordinateInsidePolygonGeometry(
    coordinate: Coordinate,
    geometry: Polygon | MultiPolygon,
  ): boolean {
    // Burada yalnızca gerçek polygon içi kontrol edilir. Önceki inclusive
    // ray-casting kontrolü bazı uzun/dar footprintlerde dış segmentleri de
    // içeride kabul ederek footprintin tamamını yeşile boyayabiliyordu.
    if (geometry.intersectsCoordinate(coordinate)) {
      return true;
    }

    // Tam sınır üzerinde çakışan çizgiler için çok küçük toleranslı kontrol.
    // Bu yalnızca gerçekten sınırın üzerinde olan koordinatları kabul eder.
    return this.getPolygonBoundaryRings(geometry).some((ring) => {
      for (let index = 0; index < ring.length - 1; index += 1) {
        if (
          this.isCoordinateOnSegment(coordinate, ring[index], ring[index + 1])
        ) {
          return true;
        }
      }
      return false;
    });
  }

  private isCoordinateInsidePolygonCoordinates(
    coordinate: Coordinate,
    rings: Coordinate[][],
  ): boolean {
    if (!rings.length) return false;

    // Dış ring sınırı dahil olmalıdır.
    if (!this.isCoordinateInsideRingInclusive(coordinate, rings[0])) {
      return false;
    }

    // Hole sınırında veya hole içinde kalan noktalar polygonun içinde sayılmaz.
    for (let index = 1; index < rings.length; index += 1) {
      if (this.isCoordinateInsideRingInclusive(coordinate, rings[index])) {
        return false;
      }
    }

    return true;
  }

  private isCoordinateInsideRingInclusive(
    coordinate: Coordinate,
    ring: Coordinate[],
  ): boolean {
    if (ring.length < 3) return false;

    const [x, y] = coordinate;
    let inside = false;

    for (
      let currentIndex = 0, previousIndex = ring.length - 1;
      currentIndex < ring.length;
      previousIndex = currentIndex++
    ) {
      const current = ring[currentIndex];
      const previous = ring[previousIndex];

      if (this.isCoordinateOnSegment(coordinate, previous, current)) {
        return true;
      }

      const crossesHorizontalRay =
        current[1] > y !== previous[1] > y &&
        x <
          ((previous[0] - current[0]) * (y - current[1])) /
            (previous[1] - current[1]) +
            current[0];

      if (crossesHorizontalRay) inside = !inside;
    }

    return inside;
  }

  private isCoordinateOnSegment(
    coordinate: Coordinate,
    start: Coordinate,
    end: Coordinate,
  ): boolean {
    const segmentLength = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const tolerance = Math.max(0.01, segmentLength * 1e-9);

    const cross =
      (coordinate[0] - start[0]) * (end[1] - start[1]) -
      (coordinate[1] - start[1]) * (end[0] - start[0]);

    if (Math.abs(cross) > tolerance * Math.max(1, segmentLength)) {
      return false;
    }

    const dot =
      (coordinate[0] - start[0]) * (end[0] - start[0]) +
      (coordinate[1] - start[1]) * (end[1] - start[1]);

    if (dot < -tolerance) return false;

    const squaredLength = (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2;

    return dot <= squaredLength + tolerance;
  }

  private getSegmentIntersectionRatio(
    firstStart: Coordinate,
    firstEnd: Coordinate,
    secondStart: Coordinate,
    secondEnd: Coordinate,
  ): number | null {
    const firstDx = firstEnd[0] - firstStart[0];
    const firstDy = firstEnd[1] - firstStart[1];
    const secondDx = secondEnd[0] - secondStart[0];
    const secondDy = secondEnd[1] - secondStart[1];
    const denominator = firstDx * secondDy - firstDy * secondDx;

    if (Math.abs(denominator) < 1e-9) return null;

    const offsetX = secondStart[0] - firstStart[0];
    const offsetY = secondStart[1] - firstStart[1];
    const firstRatio = (offsetX * secondDy - offsetY * secondDx) / denominator;
    const secondRatio = (offsetX * firstDy - offsetY * firstDx) / denominator;

    if (
      firstRatio < -1e-9 ||
      firstRatio > 1 + 1e-9 ||
      secondRatio < -1e-9 ||
      secondRatio > 1 + 1e-9
    ) {
      return null;
    }

    return Math.max(0, Math.min(1, firstRatio));
  }

  private interpolateCoordinate(
    start: Coordinate,
    end: Coordinate,
    ratio: number,
  ): Coordinate {
    return [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ];
  }

  private getPolygonBoundaryRings(
    geometry: Polygon | MultiPolygon,
  ): Coordinate[][] {
    if (geometry instanceof Polygon) {
      return geometry.getCoordinates();
    }

    return geometry.getCoordinates().flat();
  }

  private getUniqueSmartProducts(
    products: ProductSmartFilterResult[],
  ): ProductSmartFilterResult[] {
    const uniqueProducts = new globalThis.Map<
      number,
      ProductSmartFilterResult
    >();

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

    this.activeTool = "coordinate";
  }

  closeGoToCoordinatePanel(): void {
    this.isGoToCoordinatePanelOpen = false;
    this.resetPanelState("coordinate");
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

    this.activeTool = this.isGoToCoordinatePanelOpen ? "coordinate" : null;
  }

  openExportPanel(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = true;

    this.activeTool = "export";
  }

  closeExportPanel(): void {
    this.isExportPanelOpen = false;
    this.resetPanelState("export");
    this.activeTool = null;
  }

  toggleExportPanel(): void {
    this.clearMeasure();
    this.stopPolygonDraw(true);

    this.isLayerManagerOpen = false;
    this.isSearchPanelOpen = false;
    this.isGoToCoordinatePanelOpen = false;

    this.isExportPanelOpen = !this.isExportPanelOpen;

    this.activeTool = this.isExportPanelOpen ? "export" : null;
  }

  exportMap(options: MapExportOptions): void {
    if (!this.map) return;

    this.clearMeasure();
    this.stopPolygonDraw(true);
    this.isExportPanelOpen = false;
    this.resetPanelState("export");
    this.activeTool = null;

    this.map.once("rendercomplete", () => {
      if (!this.map) return;

      const sourceCanvas = this.createMapExportCanvas();
      if (!sourceCanvas) return;

      const targetWidth =
        options.fileType === "image/jpeg" && options.x
          ? options.x
          : sourceCanvas.width;

      const targetHeight =
        options.fileType === "image/jpeg" && options.y
          ? options.y
          : sourceCanvas.height;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = targetWidth;
      exportCanvas.height = targetHeight;

      const exportContext = exportCanvas.getContext("2d");
      if (!exportContext) return;

      // JPG çıktıda şeffaf alanların siyah görünmesini engeller.
      exportContext.fillStyle = "#ffffff";
      exportContext.fillRect(0, 0, targetWidth, targetHeight);
      exportContext.drawImage(
        sourceCanvas,
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height,
        0,
        0,
        targetWidth,
        targetHeight,
      );

      if (options.fileType === "print") {
        this.printMapCanvas(exportCanvas);
        return;
      }

      const fileName = options.fileName || "map";

      if (options.fileType === "pdf") {
        const pdf = new jsPDF({
          orientation:
            exportCanvas.width > exportCanvas.height ? "landscape" : "portrait",
          unit: "px",
          format: [exportCanvas.width, exportCanvas.height],
        });

        pdf.addImage(
          exportCanvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          0,
          0,
          exportCanvas.width,
          exportCanvas.height,
        );

        pdf.save(`${fileName}.pdf`);
        return;
      }

      const link = document.createElement("a");
      link.href = exportCanvas.toDataURL("image/jpeg", 0.95);
      link.download = `${fileName}.jpg`;
      link.click();
    });

    this.map.renderSync();
  }

  private createMapExportCanvas(): HTMLCanvasElement | null {
    if (!this.map) return null;

    const mapSize = this.map.getSize();
    if (!mapSize) return null;

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = mapSize[0];
    sourceCanvas.height = mapSize[1];

    const sourceContext = sourceCanvas.getContext("2d");
    if (!sourceContext) return null;

    sourceContext.fillStyle = "#ffffff";
    sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);

    const canvases = this.map
      .getViewport()
      .querySelectorAll<HTMLCanvasElement>(".ol-layer canvas, canvas.ol-layer");

    canvases.forEach((canvas) => {
      if (canvas.width <= 0 || canvas.height <= 0) return;

      const opacity =
        canvas.parentElement?.style.opacity || canvas.style.opacity || "1";

      sourceContext.globalAlpha = Number(opacity);

      const transform = canvas.style.transform;

      if (transform) {
        const matrix = transform
          .match(/^matrix\(([^\)]*)\)$/)?.[1]
          .split(",")
          .map(Number);

        if (matrix?.length === 6) {
          sourceContext.setTransform(
            matrix[0],
            matrix[1],
            matrix[2],
            matrix[3],
            matrix[4],
            matrix[5],
          );
        }
      }

      sourceContext.drawImage(canvas, 0, 0);
    });

    sourceContext.setTransform(1, 0, 0, 1, 0, 0);
    sourceContext.globalAlpha = 1;

    return sourceCanvas;
  }

  private printMapCanvas(canvas: HTMLCanvasElement): void {
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      this.alertService.createAlert(
        "warning",
        this.translate.instant("MAP.EXPORT.POPUP_BLOCKED"),
      );
      return;
    }

    const imageUrl = canvas.toDataURL("image/jpeg", 0.95);
    const isLandscape = canvas.width > canvas.height;

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${this.translate.instant("MAP.EXPORT.PRINT")}</title>
          <style>
            @page {
              size: ${isLandscape ? "landscape" : "portrait"};
              margin: 0;
            }

            html,
            body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: #fff;
            }

            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            img {
              display: block;
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <img src="${imageUrl}" alt="Map" />
          <script>
            const image = document.querySelector('img');
            image.addEventListener('load', () => {
              window.focus();
              window.print();
              window.onafterprint = () => window.close();
            });
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
    this.resetPanelState("coordinate");
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
      this.currentCoordinateText = "-";
      return;
    }

    const [lon, lat] = this.currentLonLat;
    const labels = this.getCoordinateLabels();

    if (this.coordinateFormat === "dms") {
      this.currentCoordinateText = `${labels.lat}: ${this.toDms(
        lat,
        "lat",
      )}, ${labels.lng}: ${this.toDms(lon, "lon")}`;
      return;
    }

    this.currentCoordinateText = `${labels.lat}: ${lat.toFixed(
      6,
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
          (mapLayer) => mapLayer !== existingLayer,
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

  private normalizeDegree(degree: number): number {
    const normalized = degree % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }

  private initMap(): void {
    this.map = new Map({
      target: "mapCanvas",
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
      layers: [
        this.smartProductResultLayer,
        this.selectedSmartProductResultLayer,
        this.userAreaLayer,
        this.smartProductIntersectionLayer,
        this.measureLayer,
        this.askHighlightLayer,
      ],
      view: new View({
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        maxResolution: this.maxScaleDistanceMeters / this.scaleBarWidthPx,
        projection: "EPSG:3857",
      }),
    });

    this.updateCustomScaleBar();
  }

  private registerMapEvents(): void {
    this.map?.on("pointermove", (event) => {
      this.setCoordinate(event.coordinate);
    });

    this.map?.on("click", (event) => {
      this.setCoordinate(event.coordinate);
      this.isCoordinateMenuOpen = false;

      if (this.activeTool === "ask") {
        this.queryFootprintsAtCoordinate(event.coordinate);
      }
    });

    this.map?.getView().on("change:resolution", () => {
      this.updateCustomScaleBar();
    });

    this.map?.getView().on("change:rotation", () => {
      const rotationRadian = this.map?.getView().getRotation() ?? 0;
      this.mapRotationDegree = this.normalizeDegree(
        (rotationRadian * 180) / Math.PI,
      );
    });
  }

  private startMeasure(mode: MeasureMode): void {
    if (!this.map) return;

    this.stopLengthMeasure(true);

    this.measureMode = mode;
    this.isLengthMeasureActive = true;
    this.lengthMeasureText = "";
    this.measureSource.clear();
    this.createMeasureTooltips();

    this.measureDraw = new Draw({
      source: this.measureSource,
      type: mode === "distance" ? "LineString" : "Polygon",
      style: new Style({
        stroke: new Stroke({ color: this.drawColor, width: 3 }),
        fill: new Fill({ color: this.drawFillColor }),
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: this.drawColor }),
          stroke: new Stroke({ color: "#ffffff", width: 2 }),
        }),
      }),
    });

    this.measureDraw.on("drawstart", (event) => {
      const feature = event.feature as Feature<Geometry>;

      this.measureGeometryChangeKey = feature
        .getGeometry()
        ?.on("change", (geometryEvent) => {
          const geometry = geometryEvent.target as Geometry;
          this.renderMeasureLabels(geometry, mode);
        });
    });

    this.measureDraw.on("drawend", (event) => {
      const geometry = (event.feature as Feature<Geometry>).getGeometry();

      if (geometry) {
        this.renderMeasureLabels(geometry, mode);
      }

      if (this.measureGeometryChangeKey) {
        unByKey(this.measureGeometryChangeKey);
        this.measureGeometryChangeKey = undefined;
      }

      this.stopLengthMeasure(false);
      this.activeTool = null;
    });

    this.map.addInteraction(this.measureDraw);
  }

  private renderMeasureLabels(geometry: Geometry, mode: MeasureMode): void {
    if (mode === "distance" && geometry instanceof LineString) {
      const coordinates = geometry.getCoordinates();
      if (coordinates.length < 2) return;

      const start = coordinates[coordinates.length - 2];
      const end = coordinates[coordinates.length - 1];
      const lastSegment = new LineString([start, end]);

      const segmentText = this.formatLength(
        getLength(lastSegment, { projection: "EPSG:3857" }),
      );
      const totalText = this.formatLength(
        getLength(geometry, { projection: "EPSG:3857" }),
      );

      this.lengthMeasureText = `Toplam: ${totalText}`;

      this.updateMeasureTooltip(
        this.measureSegmentTooltipElement,
        this.measureSegmentTooltipOverlay,
        segmentText,
        this.getCoordinateMidpoint(start, end),
      );

      this.updateMeasureTooltip(
        this.measureTotalTooltipElement,
        this.measureTotalTooltipOverlay,
        `Toplam: ${totalText}`,
        end,
      );

      return;
    }

    if (mode === "area" && geometry instanceof Polygon) {
      const ring = geometry.getCoordinates()[0] ?? [];
      if (ring.length < 4) return;

      // Son eleman polygonun kapanış noktasıdır. Son çizilen gerçek kenar,
      // kapanış noktasından önceki son iki koordinat arasındadır.
      const effectiveRing = ring.slice(0, -1);
      if (effectiveRing.length < 2) return;

      const start = effectiveRing[effectiveRing.length - 2];
      const end = effectiveRing[effectiveRing.length - 1];
      const lastSegment = new LineString([start, end]);

      const segmentText = this.formatLength(
        getLength(lastSegment, { projection: "EPSG:3857" }),
      );
      const areaText = this.formatArea(
        getArea(geometry, { projection: "EPSG:3857" }),
      );

      this.lengthMeasureText = `Alan: ${areaText}`;

      this.updateMeasureTooltip(
        this.measureSegmentTooltipElement,
        this.measureSegmentTooltipOverlay,
        segmentText,
        this.getCoordinateMidpoint(start, end),
      );

      this.updateMeasureTooltip(
        this.measureTotalTooltipElement,
        this.measureTotalTooltipOverlay,
        `Alan: ${areaText}`,
        geometry.getInteriorPoint().getCoordinates(),
      );
    }
  }

  private getCoordinateMidpoint(
    start: Coordinate,
    end: Coordinate,
  ): Coordinate {
    return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
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
    this.measureMode = null;

    if (clearResult) {
      this.lengthMeasureText = "";
      this.measureSource.clear();
      this.removeMeasureTooltips();
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
      type: "Polygon",
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
    extension: SupportedAreaFileExtension,
  ): Promise<Feature<Geometry>[]> {
    if (extension === "zip") {
      const arrayBuffer = await file.arrayBuffer();
      const geoJsonResult = await shp(arrayBuffer);

      if (Array.isArray(geoJsonResult)) {
        return geoJsonResult.flatMap((geoJson) =>
          this.readGeoJsonFeatures(geoJson),
        );
      }

      return this.readGeoJsonFeatures(geoJsonResult);
    }

    if (extension === "kmz") {
      const zip = await JSZip.loadAsync(file);

      const kmlEntry = Object.values(zip.files).find(
        (entry) => !entry.dir && entry.name.toLowerCase().endsWith(".kml"),
      );

      if (!kmlEntry) {
        throw new Error("KMZ içerisinde KML bulunamadı.");
      }

      const kmlText = await kmlEntry.async("text");

      return new KML({
        extractStyles: false,
      }).readFeatures(kmlText, {
        featureProjection: "EPSG:3857",
      }) as Feature<Geometry>[];
    }

    const text = await file.text();

    if (extension === "geojson" || extension === "json") {
      const parsedGeoJson = JSON.parse(text);

      return this.readGeoJsonFeatures(parsedGeoJson);
    }

    if (extension === "kml") {
      return new KML({
        extractStyles: false,
      }).readFeatures(text, {
        featureProjection: "EPSG:3857",
      }) as Feature<Geometry>[];
    }

    return [];
  }

  private readGeoJsonFeatures(geoJson: any): Feature<Geometry>[] {
    if (!this.isValidGeoJsonObject(geoJson)) {
      throw new Error("Geçersiz GeoJSON formatı");
    }

    return new GeoJSON().readFeatures(geoJson, {
      featureProjection: "EPSG:3857",
    }) as Feature<Geometry>[];
  }

  private isValidGeoJsonObject(value: any): boolean {
    if (!value || typeof value !== "object") return false;

    return [
      "FeatureCollection",
      "Feature",
      "Polygon",
      "MultiPolygon",
      "GeometryCollection",
    ].includes(value.type);
  }

  private getAreaFileExtension(fileName: string): string | null {
    const extension = fileName.split(".").pop()?.toLowerCase();

    return extension || null;
  }

  private isSupportedAreaFileExtension(
    extension: string,
  ): extension is SupportedAreaFileExtension {
    return this.supportedAreaFileExtensions.includes(
      extension as SupportedAreaFileExtension,
    );
  }

  private showUploadWarning(translationKey: string): void {
    this.alertService.createAlert(
      "warning",
      this.translate.instant(translationKey),
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
    this.isAskPanelOpen = false;
    this.isAskLoading = false;
    this.askFootprints = [];
    this.askHighlightSource.clear();
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

    const wkt = this.getSelectedAoiWkt();

    if (!wkt) {
      this.showUploadWarning("MAP.SMART_FILTER.AOI_REQUIRED");
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
        // Sonuçlar yalnızca birleşik panelde listelenir; harita katmanına basılmaz.
        this.smartProductResultSource.clear();
        this.selectedSmartProductResultSource.clear();
        this.smartProductIntersectionSource.clear();
        this.clearSelectedProductPreviewImages();
      },
      error: (error) => {
        console.error(
          "Smart product filter çalıştırılırken hata oluştu:",
          error,
        );
        this.smartFilterResults = [];
        this.selectedSmartProducts = [];
        this.hoveredSmartProduct = null;
        this.smartProductResultSource.clear();
        this.selectedSmartProductResultSource.clear();
        this.smartProductIntersectionSource.clear();
        this.alertService.createAlert(
          "danger",
          this.translate.instant("MAP.SMART_FILTER.LOAD_ERROR"),
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
    results: ProductSmartFilterResult[],
  ): void {
    this.smartProductResultSource.clear();

    const features = (results ?? [])
      .map((product) => this.createSmartProductFeature(product))
      .filter((feature): feature is Feature<Geometry> => !!feature);

    if (!features.length) return;

    this.smartProductResultSource.addFeatures(features);
  }

  private renderSelectedProductPreviewImages(
    products: ProductSmartFilterResult[],
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
          projection: "EPSG:3857",
          crossOrigin: "anonymous",
        }),
        opacity: 0.88,
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
    product: ProductSmartFilterResult,
  ): string | null {
    const imageUrl = product.previewUrl || null;

    if (!imageUrl) return null;

    return imageUrl;
  }

  private createSmartProductFeature(
    product: ProductSmartFilterResult,
  ): Feature<Geometry> | null {
    if (product.wkt) {
      try {
        const feature = new WKT().readFeature(product.wkt, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }) as Feature<Geometry>;

        feature.set("product", product);
        return feature;
      } catch (error) {
        console.warn("Ürün WKT okunamadı:", error, product);
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

    const min = fromLonLat([
      Number(product.bboxMinX),
      Number(product.bboxMinY),
    ]);
    const max = fromLonLat([
      Number(product.bboxMaxX),
      Number(product.bboxMaxY),
    ]);

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
    feature.set("product", product);

    return feature;
  }

  getAoiWkt(): string | null {
    const features = this.userAreaSource
      .getFeatures()
      .filter((feature) => this.isPolygonFeature(feature));

    if (!features.length) {
      return null;
    }

    const geoJson = new GeoJSON().writeFeaturesObject(features, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    }) as any;

    if (features.length === 1) {
      return new WKT().writeFeature(features[0], {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      });
    }

    const polygons = geoJson.features
      ?.map((feature: any) => feature.geometry)
      ?.filter(
        (geometry: any) =>
          geometry?.type === "Polygon" || geometry?.type === "MultiPolygon",
      );

    if (!polygons?.length) {
      return null;
    }

    const multiPolygonCoordinates = polygons.flatMap((geometry: any) => {
      if (geometry.type === "Polygon") {
        return [geometry.coordinates];
      }

      return geometry.coordinates;
    });

    return new WKT().writeGeometry(
      new MultiPolygon(multiPolygonCoordinates).transform(
        "EPSG:4326",
        "EPSG:3857",
      ),
      {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      },
    );
  }

  private renderPreviewWktIfNeeded(): void {
    if (!this.previewMode || !this.map) return;

    this.stopLengthMeasure(true);
    this.stopPolygonDraw(true);
    this.clearSmartFilterResults();
    this.userAreaSource.clear();
    this.userAreaOrigin = null;

    const wkt = (this.previewWkt || "").trim();

    if (!wkt) return;

    try {
      const feature = new WKT().readFeature(wkt, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }) as Feature<Geometry>;

      if (!this.isPolygonFeature(feature)) return;

      this.userAreaSource.addFeature(feature);
      this.fitToUserAreas();
      this.calculateSelectedArea();
      this.clearAreaTooltips();
    } catch (error) {
      console.warn("Preview WKT okunamadı:", error, wkt);
    }
  }

  private registerCurrentAoi(
    origin: Exclude<UserAreaOrigin, null>,
    preferredName?: string,
  ): void {
    const id = this.createAoiId();
    const unassignedFeatures = this.userAreaSource
      .getFeatures()
      .filter((feature) => !feature.get("aoiId"));

    unassignedFeatures.forEach((feature) => feature.set("aoiId", id));

    const areaM2 = this.calculateAreaForAoi(id);
    this.aoiItems = [
      ...this.aoiItems,
      {
        id,
        origin,
        name: preferredName?.trim() || this.createAoiName(origin),
        areaM2,
        areaText: this.formatAoiArea(areaM2),
      },
    ];

    this.selectedAoiId = id;
    this.hoveredAoiId = null;
    this.userAreaLayer.changed();
    this.calculateSelectedArea();
  }

  selectAoi(area: MapAoiItem): void {
    if (this.selectedAoiId === area.id) return;
    this.selectedAoiId = area.id;
    this.hoveredAoiId = null;
    this.userAreaLayer.changed();
    this.calculateSelectedArea();
    this.smartFilterRequest = {
      ...this.smartFilterRequest,
      wkt: this.getSelectedAoiWkt(),
      pageNumber: 1,
    };
    this.runSmartProductFilter();
  }

  hoverAoi(area: MapAoiItem | null): void {
    this.hoveredAoiId = area?.id ?? null;
    this.userAreaLayer.changed();
  }

  private getSelectedAoiWkt(): string | null {
    if (!this.selectedAoiId) return null;
    const features = this.getAoiFeatures(this.selectedAoiId).filter((f) =>
      this.isPolygonFeature(f),
    );
    if (!features.length) return null;
    if (features.length === 1)
      return new WKT().writeFeature(features[0], {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      });
    const geoms = features
      .map((f) => f.getGeometry())
      .filter(
        (g): g is Polygon | MultiPolygon =>
          g instanceof Polygon || g instanceof MultiPolygon,
      );
    const coords = geoms.flatMap((g) =>
      g instanceof Polygon
        ? [g.clone().transform("EPSG:3857", "EPSG:4326").getCoordinates()]
        : g.clone().transform("EPSG:3857", "EPSG:4326").getCoordinates(),
    );
    return new WKT().writeGeometry(new MultiPolygon(coords));
  }

  private syncAoiMetric(): void {
    this.aoiItems = this.aoiItems.map((area) => {
      const areaM2 = this.calculateAreaForAoi(area.id);
      return {
        ...area,
        areaM2,
        areaText: this.formatAoiArea(areaM2),
      };
    });
  }

  private calculateAreaForAoi(aoiId: string): number {
    return this.getAoiFeatures(aoiId).reduce((total, feature) => {
      const geometry = feature.getGeometry();
      if (!(geometry instanceof Polygon || geometry instanceof MultiPolygon)) {
        return total;
      }
      return total + getArea(geometry, { projection: "EPSG:3857" });
    }, 0);
  }

  private getAoiFeatures(aoiId: string): Feature<Geometry>[] {
    return this.userAreaSource
      .getFeatures()
      .filter((feature) => feature.get("aoiId") === aoiId);
  }

  private createAoiId(): string {
    this.aoiCounter += 1;
    return `aoi-${Date.now()}-${this.aoiCounter}`;
  }

  private createAoiName(origin: Exclude<UserAreaOrigin, null>): string {
    if (origin === "polygon" || origin === "rectangle") {
      const drawingCount = this.aoiItems.filter(
        (item) => item.origin === "polygon" || item.origin === "rectangle",
      ).length;
      return `Area ${drawingCount + 1}`;
    }

    const names: Record<"upload" | "search", string> = {
      upload: "Yüklenen Alan",
      search: "Arama Alanı",
    };

    const sameOriginCount = this.aoiItems.filter(
      (item) => item.origin === origin,
    ).length;
    return `${names[origin]} ${sameOriginCount + 1}`;
  }

  private formatAoiArea(areaM2: number): string {
    if (areaM2 >= 1_000_000) {
      return `${(areaM2 / 1_000_000).toFixed(2).replace(".", ",")} km²`;
    }

    if (areaM2 >= 10_000) {
      return `${(areaM2 / 10_000).toFixed(2).replace(".", ",")} ha`;
    }

    return `${areaM2.toFixed(2).replace(".", ",")} m²`;
  }

  private scheduleAoiResultRefresh(immediately = false): void {
    if (this.aoiRefreshTimer) {
      clearTimeout(this.aoiRefreshTimer);
    }

    this.aoiRefreshTimer = setTimeout(
      () => {
        const shouldRefresh =
          this.isSmartFilterPanelOpen ||
          this.smartFilterResults.length > 0 ||
          this.isSmartProductRequestPanelOpen;

        if (!shouldRefresh) return;

        const keepRequestPanelOpen = this.isSmartProductRequestPanelOpen;
        this.runSmartProductFilter(keepRequestPanelOpen);
      },
      immediately ? 0 : 450,
    );
  }

  private removeFileExtension(fileName: string): string {
    return fileName.replace(/\\.[^/.]+$/, "");
  }

  private getSearchAreaName(result: MapSearchResult): string | undefined {
    const candidate = result as MapSearchResult & {
      address?: string;
      displayName?: string;
      display_name?: string;
      formattedAddress?: string;
      formatted_address?: string;
      fullAddress?: string;
      placeName?: string;
      text?: string;
      name?: string;
      label?: string;
      title?: string;
      properties?: {
        address?: string;
        displayName?: string;
        display_name?: string;
        formattedAddress?: string;
        formatted_address?: string;
        fullAddress?: string;
        placeName?: string;
        text?: string;
        name?: string;
        label?: string;
        title?: string;
      };
    };

    const properties = candidate.properties;

    const addressName =
      candidate.address ||
      candidate.formattedAddress ||
      candidate.formatted_address ||
      candidate.fullAddress ||
      candidate.displayName ||
      candidate.display_name ||
      candidate.placeName ||
      candidate.label ||
      candidate.title ||
      candidate.name ||
      candidate.text ||
      properties?.address ||
      properties?.formattedAddress ||
      properties?.formatted_address ||
      properties?.fullAddress ||
      properties?.displayName ||
      properties?.display_name ||
      properties?.placeName ||
      properties?.label ||
      properties?.title ||
      properties?.name ||
      properties?.text;

    return addressName?.trim() || undefined;
  }

  private exportCurrentAoiAsKml(area: MapAoiItem): void {
    const features = this.getAoiFeatures(area.id);
    if (!features.length) return;
    const areaName = area.name;

    const kml = new KML({ extractStyles: false }).writeFeatures(features, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });

    saveAs(
      new Blob([kml], {
        type: "application/vnd.google-earth.kml+xml;charset=utf-8",
      }),
      `${this.safeFileName(areaName)}.kml`,
    );
  }

  private async exportCurrentAoiAsShp(area: MapAoiItem): Promise<void> {
    const features = this.getAoiFeatures(area.id);
    if (!features.length) return;
    const areaName = area.name;

    const geoJson = new GeoJSON().writeFeaturesObject(features, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });

    const shpWrite = await import("@mapbox/shp-write");
    const zipResult = (await shpWrite.zip(geoJson as any, {
      folder: this.safeFileName(areaName),
      types: { polygon: this.safeFileName(areaName) },
      compression: "DEFLATE",
      outputType: "blob",
    })) as unknown;

    if (zipResult instanceof Blob) {
      saveAs(zipResult, `${this.safeFileName(areaName)}.zip`);
      return;
    }

    if (zipResult instanceof ArrayBuffer) {
      saveAs(
        new Blob([zipResult], { type: "application/zip" }),
        `${this.safeFileName(areaName)}.zip`,
      );
      return;
    }

    const base64 = String(zipResult).replace(/^data:.*;base64,/, "");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    saveAs(
      new Blob([bytes], { type: "application/zip" }),
      `${this.safeFileName(areaName)}.zip`,
    );
  }

  private safeFileName(value: string): string {
    return (
      value
        .trim()
        .replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]+/g, "_")
        .replace(/^_+|_+$/g, "") || "ilgi_alani"
    );
  }

  private calculateSelectedArea(): void {
    const features = this.selectedAoiId
      ? this.getAoiFeatures(this.selectedAoiId)
      : [];

    this.totalSelectedAreaM2 = features.reduce((total, feature) => {
      const geometry = feature.getGeometry();
      if (geometry instanceof Polygon || geometry instanceof MultiPolygon) {
        return total + getArea(geometry, { projection: "EPSG:3857" });
      }
      return total;
    }, 0);

    this.syncAoiMetric();
  }

  private clearSmartFilterResults(): void {
    this.totalSelectedAreaM2 = 0;
    this.smartFilterResults = [];
    this.selectedSmartProducts = [];
    this.hoveredSmartProduct = null;
    this.smartProductResultSource.clear();
    this.selectedSmartProductResultSource.clear();
    this.smartProductIntersectionSource.clear();
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
      return `${(length / 1000).toFixed(2).replace(".", ",")} km`;
    }

    return `${length.toFixed(2).replace(".", ",")} m`;
  }

  private updateCustomScaleBar(): void {
    if (!this.map) return;

    const resolution = this.map.getView().getResolution();

    if (!resolution) {
      this.customScaleText = "3000 km";
      return;
    }

    const distanceMeters = resolution * this.scaleBarWidthPx;
    const limitedDistanceMeters = Math.min(
      distanceMeters,
      this.maxScaleDistanceMeters,
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
    const lang = (
      this.translate.currentLang ||
      this.translate.defaultLang ||
      "en"
    ).toLowerCase();

    if (lang.startsWith("tr")) {
      return {
        lat: "E",
        lng: "B",
      };
    }

    return {
      lat: "Lat",
      lng: "Lng",
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
        this.smartProductIntersectionLayer.setZIndex(10000);
        this.measureLayer.setZIndex(10001);
      },
      error: (error) => {
        console.error("Harita katmanları yüklenirken hata oluştu:", error);
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
        layer.type === LayerType.Wmts,
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
        crossOrigin: "anonymous",
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
          VERSION: layer.version || "1.1.1",
          FORMAT: layer.format || "image/png",
          TRANSPARENT: true,
        },
        serverType: "geoserver",
        crossOrigin: "anonymous",
      }),
    });
  }

  private createWfsLayer(layer: LayerModel): VectorLayer<VectorSource> | null {
    if (!layer.url || !layer.layerName) return null;

    const separator = layer.url.includes("?") ? "&" : "?";

    const wfsUrl =
      `${layer.url}${separator}` +
      `service=WFS&version=${layer.version || "1.0.0"}` +
      `&request=GetFeature` +
      `&typeName=${encodeURIComponent(layer.layerName)}` +
      `&outputFormat=${encodeURIComponent(layer.format || "application/json")}`;

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
      -20037508.342789244, -20037508.342789244, 20037508.342789244,
      20037508.342789244,
    ];

    const maxResolution = 156543.03392804097;
    const resolutions = Array.from(
      { length: 19 },
      (_, z) => maxResolution / Math.pow(2, z),
    );
    const matrixIds = Array.from({ length: 19 }, (_, z) => z.toString());

    return new TileLayer({
      opacity: this.normalizeOpacity(layer.opacity),
      visible: layer.isVisible === true,
      zIndex: layer.orderNo ?? 0,
      source: new WMTS({
        url: layer.url,
        layer: layer.layerName,
        matrixSet: "EPSG:3857",
        format: layer.format || "image/png",
        projection: "EPSG:3857",
        style: "default",
        tileGrid: new WMTSTileGrid({
          origin: [projectionExtent[0], projectionExtent[3]],
          resolutions,
          matrixIds,
        }),
        wrapX: true,
        crossOrigin: "anonymous",
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
      !this.map
        .getLayers()
        .getArray()
        .includes(this.smartProductIntersectionLayer)
    ) {
      this.map.addLayer(this.smartProductIntersectionLayer);
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
      layer.id ??
      layer.layerName ??
      layer.name ??
      `${layer.type}-${layer.orderNo}`
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

  private toDms(value: number, type: "lat" | "lon"): string {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    const direction =
      type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";

    return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`;
  }

  private createMeasureTooltips(): void {
    if (!this.map) return;

    this.removeMeasureTooltips();

    const segmentTooltip = this.createMeasureTooltipOverlay(
      "map-measure-tooltip map-measure-tooltip--segment",
      [0, -10],
      "bottom-center",
    );
    this.measureSegmentTooltipElement = segmentTooltip.element;
    this.measureSegmentTooltipOverlay = segmentTooltip.overlay;

    const totalTooltip = this.createMeasureTooltipOverlay(
      "map-measure-tooltip map-measure-tooltip--total",
      [10, -10],
      "bottom-left",
    );
    this.measureTotalTooltipElement = totalTooltip.element;
    this.measureTotalTooltipOverlay = totalTooltip.overlay;
  }

  private createMeasureTooltipOverlay(
    className: string,
    offset: [number, number],
    positioning: "bottom-center" | "bottom-left" | "center-center",
  ): { element: HTMLDivElement; overlay: Overlay } {
    const element = document.createElement("div");
    element.className = className;
    element.innerHTML = '<div class="map-measure-tooltip__value"></div>';

    const overlay = new Overlay({
      element,
      offset,
      positioning,
      stopEvent: false,
      insertFirst: false,
    });

    this.map?.addOverlay(overlay);

    return { element, overlay };
  }

  private updateMeasureTooltip(
    element: HTMLDivElement | undefined,
    overlay: Overlay | undefined,
    text: string,
    coordinate: Coordinate,
  ): void {
    if (!element || !overlay) return;

    const valueElement = element.querySelector(".map-measure-tooltip__value");
    if (valueElement) {
      valueElement.textContent = text;
    }

    overlay.setPosition(coordinate);
  }

  private removeMeasureTooltips(): void {
    if (this.measureSegmentTooltipOverlay) {
      this.map?.removeOverlay(this.measureSegmentTooltipOverlay);
    }

    if (this.measureTotalTooltipOverlay) {
      this.map?.removeOverlay(this.measureTotalTooltipOverlay);
    }

    this.measureSegmentTooltipElement = undefined;
    this.measureSegmentTooltipOverlay = undefined;
    this.measureTotalTooltipElement = undefined;
    this.measureTotalTooltipOverlay = undefined;
  }

  toggleRectangleDraw(keepSmartPanelOpen = false): void {
    if (this.previewMode) return;

    if (this.activeTool === "rectangle" || this.polygonDraw) {
      this.cancelAreaCreationTool();
      return;
    }

    this.clearMeasure();

    // Çizim başladığında smart panel görünürlüğü saklanır, paneller geçici
    // olarak kapatılır ve alan oluşturma hint mesajı gösterilir.
    this.hideSmartPanelsForAreaDrawing();

    this.disableAreaModify();

    // Yeni dikdörtgen mevcut AOI geometrilerini ve alan listesini silmez.
    this.clearAreaTooltips();

    this.activeTool = "rectangle";
    this.startRectangleDraw();
  }

  private startRectangleDraw(): void {
    if (!this.map) return;

    this.stopPolygonDraw(true);

    this.polygonDraw = new Draw({
      source: this.userAreaSource,
      type: "Circle",
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
        color: this.drawColor,
        width: 3,
      }),
      fill: new Fill({
        color: "rgba(38, 54, 133, 0.22)",
      }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: this.drawColor,
        }),
        stroke: new Stroke({
          color: "#ffffff",
          width: 2,
        }),
      }),
    });
  }

  private bindAreaDrawEvents(): void {
    if (!this.polygonDraw) return;

    this.polygonDraw.on("drawstart", (event) => {
      const feature = event.feature as Feature<Polygon>;

      this.clearAreaTooltips();

      this.areaGeometryChangeKey = feature
        .getGeometry()
        ?.on("change", (geometryEvent) => {
          const geometry = geometryEvent.target as Polygon;
          this.renderAreaTooltips(geometry);
        });
    });

    this.polygonDraw.on("drawend", (event) => {
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
        const origin: Exclude<UserAreaOrigin, null> =
          this.activeTool === "rectangle" ? "rectangle" : "polygon";

        this.userAreaOrigin = origin;
        this.stopPolygonDraw(false);
        this.disableAreaModify();
        this.fitToUserAreas();
        this.calculateSelectedArea();
        this.registerCurrentAoi(origin);
        this.clearAreaTooltips();
        this.restoreAreaDrawPanels();
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

  private enableAreaModify(aoiId?: string): void {
    if (!this.map || this.previewMode || this.userAreaSource.isEmpty()) return;

    this.disableAreaModify();
    const editableFeatures = aoiId
      ? this.getAoiFeatures(aoiId)
      : this.userAreaSource.getFeatures();
    if (!editableFeatures.length) return;

    this.areaModify = new Modify({
      features: new Collection(editableFeatures),
      style: this.getAreaModifyStyle(),
      pixelTolerance: 30,
    });

    this.areaSnap = new Snap({
      source: this.userAreaSource,
      pixelTolerance: 30,
    });

    this.areaModify.on("modifystart", (event) => {
      this.unbindAreaModifyGeometryChanges();

      event.features.forEach((feature) => {
        const geometry = (feature as Feature<Geometry>).getGeometry();
        if (!geometry) return;

        const key = geometry.on("change", () => {
          this.calculateSelectedArea();
          this.syncAoiMetric();
          this.clearAreaTooltips();
          this.scheduleAoiResultRefresh();
        });

        this.areaModifyGeometryChangeKeys.push(key);
      });
    });

    this.areaModify.on("modifyend", () => {
      this.unbindAreaModifyGeometryChanges();
      this.calculateSelectedArea();
      this.syncAoiMetric();
      this.clearAreaTooltips();

      this.smartFilterRequest = {
        ...this.smartFilterRequest,
        wkt: this.getSelectedAoiWkt(),
        pageNumber: 1,
        pageSize: this.smartFilterRequest.pageSize ?? 100,
      };

      // Düzenleme tamamlanınca paneli yeniden aç ve seçili AOI sonuçlarını yenile.
      setTimeout(() => this.stopAoiUpdateMode(true));
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
          color: "#ffffff",
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

  private renderAreaTooltips(
    geometry: Polygon,
    clearBeforeRender = true,
  ): void {
    if (clearBeforeRender) {
      this.clearAreaTooltips();
    }

    const ring = geometry.getCoordinates()[0] ?? [];
    if (ring.length < 3) return;

    const area = getArea(geometry, {
      projection: "EPSG:3857",
    });

    this.addAreaTooltip(
      `Alan: ${this.formatArea(area)}`,
      geometry.getInteriorPoint().getCoordinates(),
      "area",
    );

    if (this.activeTool === "rectangle") {
      this.renderRectangleEdgeTooltips(ring);
      return;
    }

    this.renderLastPolygonEdgeTooltip(ring);
  }

  /**
   * Alan Oluştur (Çokgen): sadece kullanıcının anlık çizdiği son gerçek
   * kenarı etiketler. Ring'in son koordinatı kapanış koordinatıdır.
   */
  private renderLastPolygonEdgeTooltip(ring: Coordinate[]): void {
    const effectiveRing = ring.slice(0, -1);
    if (effectiveRing.length < 2) return;

    const start = effectiveRing[effectiveRing.length - 2];
    const end = effectiveRing[effectiveRing.length - 1];

    this.addEdgeLengthTooltip(start, end);
  }

  /**
   * Dikdörtgen Çiz: ekran kirliliğini önlemek için dört kenarın tamamı yerine
   * yalnızca birbirine komşu bir kısa ve bir uzun kenarı etiketler.
   */
  private renderRectangleEdgeTooltips(ring: Coordinate[]): void {
    const corners = ring.slice(0, -1);
    if (corners.length < 4) return;

    // createBox() çıktısında ilk iki kenar birbirine komşudur ve dikdörtgenin
    // kısa/uzun kenar çiftini temsil eder. Böylece karşı kenarlar tekrarlanmaz.
    this.addEdgeLengthTooltip(corners[0], corners[1]);
    this.addEdgeLengthTooltip(corners[1], corners[2]);
  }

  private addEdgeLengthTooltip(start: Coordinate, end: Coordinate): void {
    const line = new LineString([start, end]);
    const length = getLength(line, {
      projection: "EPSG:3857",
    });

    this.addAreaTooltip(
      `Kenar: ${this.formatLength(length)}`,
      this.getCoordinateMidpoint(start, end),
      "segment",
    );
  }

  private addAreaTooltip(
    text: string,
    coordinate: Coordinate,
    type: "area" | "segment",
  ): void {
    if (!this.map) return;

    const element = document.createElement("div");
    element.className = `map-area-tooltip map-area-tooltip--${type}`;
    element.textContent = text;

    const overlay = new Overlay({
      element,
      position: coordinate,
      positioning: "bottom-center",
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
      return `${(areaM2 / 1_000_000).toFixed(2).replace(".", ",")} km²`;
    }

    return `${areaM2.toFixed(2).replace(".", ",")} m²`;
  }
}

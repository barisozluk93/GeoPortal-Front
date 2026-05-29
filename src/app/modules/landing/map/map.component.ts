import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { jsPDF } from 'jspdf';

import Map from 'ol/Map';
import View from 'ol/View';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';
import WMTS from 'ol/source/WMTS';
import VectorSource from 'ol/source/Vector';

import WMTSTileGrid from 'ol/tilegrid/WMTS';
import GeoJSON from 'ol/format/GeoJSON';

import Draw from 'ol/interaction/Draw';
import Feature from 'ol/Feature';
import { LineString } from 'ol/geom';
import { getLength } from 'ol/sphere';
import { Style, Stroke, Circle as CircleStyle, Fill } from 'ol/style';

import { defaults as defaultControls, ScaleLine } from 'ol/control';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Extent } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';

import { LayerModel } from '../../map-management/models/layer.model';
import { LayerGroupModel } from '../../map-management/models/layergroup.model';
import { LayerType } from '../../map-management/models/layertype.model';
import { MapService } from './map.service';
import { MapExportOptions } from './export-panel/map-export-panel.component';

type OlMapLayer = TileLayer<any> | VectorLayer<VectorSource>;
type CoordinateFormat = 'dd' | 'dms';

type ActiveTool =
  | 'layer-manager'
  | 'coordinate'
  | 'measure'
  | 'export'
  | null;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  coordinateFormat: CoordinateFormat = 'dd';
  currentCoordinateText = '-';
  isCoordinateMenuOpen = false;

  isLayerManagerOpen = false;
  isGoToCoordinatePanelOpen = false;
  isExportPanelOpen = false;

  selectedLegendLayer?: LayerModel;
  selectedFilterLayer?: LayerModel;

  activeTool: ActiveTool = null;

  layerGroups: LayerGroupModel[] = [];
  baseMapOpacity = 1;

  isLengthMeasureActive = false;
  lengthMeasureText = '';

  private readonly defaultCenter = fromLonLat([35.2433, 38.9637]);
  private readonly defaultZoom = 6;

  private map?: Map;
  private dynamicLayers: OlMapLayer[] = [];
  private layerRegistry = new globalThis.Map<number | string, OlMapLayer>();
  private currentLonLat?: [number, number];

  private measureDraw?: Draw;
  private measureSource = new VectorSource();

  private measureLayer = new VectorLayer({
    source: this.measureSource,
    zIndex: 9999,
    style: new Style({
      stroke: new Stroke({
        color: '#50cd89',
        width: 3,
      }),
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({
          color: '#50cd89',
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 2,
        }),
      }),
    }),
  });

  constructor(private mapService: MapService) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.registerMapEvents();
    this.loadLayers();
  }

  ngOnDestroy(): void {
    this.stopLengthMeasure(true);
    this.map?.setTarget(undefined);
    this.clearDynamicLayers();
  }

  zoomIn(): void {
    this.clearMeasure();

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

    view.animate({
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      rotation: 0,
      duration: 300,
    });

    this.isCoordinateMenuOpen = false;
    this.isLayerManagerOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = undefined;
    this.activeTool = null;
  }

  toggleLengthMeasure(): void {
    if (this.isLengthMeasureActive || this.lengthMeasureText) {
      this.stopLengthMeasure(true);
      this.activeTool = null;
      return;
    }

    this.isLayerManagerOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = undefined;

    this.activeTool = 'measure';

    this.startLengthMeasure();
  }

  openLayerManager(): void {
    this.clearMeasure();

    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isLayerManagerOpen = true;

    this.activeTool = 'layer-manager';
  }

  closeLayerManager(): void {
    this.isLayerManagerOpen = false;
    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = undefined;
    this.activeTool = null;
  }

  toggleLayerManager(): void {
    this.clearMeasure();

    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.isLayerManagerOpen = !this.isLayerManagerOpen;

    this.activeTool = this.isLayerManagerOpen ? 'layer-manager' : null;

    if (!this.isLayerManagerOpen) {
      this.selectedLegendLayer = undefined;
      this.selectedFilterLayer = undefined;
    }
  }

  openGoToCoordinatePanel(): void {
    this.clearMeasure();

    this.isLayerManagerOpen = false;
    this.isExportPanelOpen = false;
    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = undefined;
    this.isGoToCoordinatePanelOpen = true;

    this.activeTool = 'coordinate';
  }

  closeGoToCoordinatePanel(): void {
    this.isGoToCoordinatePanelOpen = false;
    this.activeTool = null;
  }

  toggleGoToCoordinatePanel(): void {
    this.clearMeasure();

    this.isLayerManagerOpen = false;
    this.isExportPanelOpen = false;
    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = undefined;

    this.isGoToCoordinatePanelOpen = !this.isGoToCoordinatePanelOpen;

    this.activeTool = this.isGoToCoordinatePanelOpen ? 'coordinate' : null;
  }

  openExportPanel(): void {
    this.clearMeasure();

    this.isLayerManagerOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = undefined;
    this.isExportPanelOpen = true;

    this.activeTool = 'export';
  }

  closeExportPanel(): void {
    this.isExportPanelOpen = false;
    this.activeTool = null;
  }

  toggleExportPanel(): void {
    this.clearMeasure();

    this.isLayerManagerOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = undefined;

    this.isExportPanelOpen = !this.isExportPanelOpen;

    this.activeTool = this.isExportPanelOpen ? 'export' : null;
  }

  openLayerFilter(layer: LayerModel): void {
    this.clearMeasure();

    this.isLayerManagerOpen = true;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;

    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = layer;

    this.activeTool = 'layer-manager';
  }

  closeLayerFilter(): void {
    this.selectedFilterLayer = undefined;
  }

  applyLayerFilter(layer: LayerModel, cqlFilter: string): void {
    const key = this.getLayerKey(layer);
    const existingLayer = this.layerRegistry.get(key);

    if (!existingLayer) return;

    const source = existingLayer.getSource();

    if (source instanceof TileWMS) {
      source.updateParams({
        CQL_FILTER: cqlFilter,
      });
    }
  }

  clearLayerFilter(layer: LayerModel): void {
    const key = this.getLayerKey(layer);
    const existingLayer = this.layerRegistry.get(key);

    if (!existingLayer) return;

    const source = existingLayer.getSource();

    if (source instanceof TileWMS) {
      source.updateParams({
        CQL_FILTER: null,
      });
    }
  }

  openLayerLegend(layer: LayerModel): void {
    this.clearMeasure();

    this.isLayerManagerOpen = true;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;

    this.selectedFilterLayer = undefined;
    this.selectedLegendLayer = layer;

    this.activeTool = 'layer-manager';
  }

  closeLayerLegend(): void {
    this.selectedLegendLayer = undefined;
  }

  openLayerInfo(layer: LayerModel): void {
    this.clearMeasure();
    console.log('Layer info:', layer);
  }

  exportMap(options: MapExportOptions): void {
    if (!this.map) return;

    this.clearMeasure();
    this.isExportPanelOpen = false;
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
        .querySelectorAll<HTMLCanvasElement>('.ol-layer canvas, canvas.ol-layer');

      canvases.forEach((canvas) => {
        if (canvas.width <= 0 || canvas.height <= 0) return;

        const opacity = canvas.parentElement?.style.opacity || canvas.style.opacity || '1';
        sourceContext.globalAlpha = Number(opacity);

        const transform = canvas.style.transform;

        if (transform) {
          const matrix = transform
            .match(/^matrix\(([^\)]*)\)$/)?.[1]
            .split(',')
            .map(Number);

          if (matrix && matrix.length === 6) {
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
        options.fileType === 'image/png' && options.x ? options.x : sourceCanvas.width;

      const targetHeight =
        options.fileType === 'image/png' && options.y ? options.y : sourceCanvas.height;

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
          orientation: exportCanvas.width > exportCanvas.height ? 'landscape' : 'portrait',
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

      const link = document.createElement('a');
      link.href = exportCanvas.toDataURL('image/png');
      link.download = `${options.fileName}.png`;
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
    this.activeTool = null;
  }

  toggleCoordinateMenu(): void {
    this.clearMeasure();

    this.isLayerManagerOpen = false;
    this.isGoToCoordinatePanelOpen = false;
    this.isExportPanelOpen = false;
    this.selectedLegendLayer = undefined;
    this.selectedFilterLayer = undefined;
    this.activeTool = null;

    this.isCoordinateMenuOpen = !this.isCoordinateMenuOpen;
  }

  setCoordinateFormat(format: CoordinateFormat): void {
    this.clearMeasure();

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

    if (this.coordinateFormat === 'dms') {
      this.currentCoordinateText = `${this.toDms(lat, 'lat')}, ${this.toDms(lon, 'lon')}`;
      return;
    }

    this.currentCoordinateText = `${lat.toFixed(6)}°, ${lon.toFixed(6)}°`;
  }

  setBaseMapOpacity(opacity: number): void {
    this.clearMeasure();

    this.baseMapOpacity = this.normalizeOpacity(opacity);

    this.getBaseMapLayers().forEach((layer) => {
      layer.setOpacity(this.baseMapOpacity);
    });
  }

  setLayerVisibility(layer: LayerModel, visible: boolean): void {
    this.clearMeasure();

    layer.isVisible = visible;

    const key = this.getLayerKey(layer);
    const existingLayer = this.layerRegistry.get(key);

    if (!visible) {
      if (existingLayer) {
        this.map?.removeLayer(existingLayer);
        this.dynamicLayers = this.dynamicLayers.filter((mapLayer) => mapLayer !== existingLayer);
        this.layerRegistry.delete(key);
      }

      if (this.selectedLegendLayer === layer) {
        this.selectedLegendLayer = undefined;
      }

      if (this.selectedFilterLayer === layer) {
        this.selectedFilterLayer = undefined;
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

  setLayerOpacity(layer: LayerModel, opacity: number): void {
    this.clearMeasure();

    const normalizedOpacity = this.normalizeOpacity(opacity);
    layer.opacity = normalizedOpacity;

    const key = this.getLayerKey(layer);
    const existingLayer = this.layerRegistry.get(key);

    if (existingLayer) {
      existingLayer.setOpacity(normalizedOpacity);
      return;
    }

    const olLayer = this.createOpenLayersLayer(layer);
    if (!olLayer) return;

    olLayer.setOpacity(normalizedOpacity);
    olLayer.setVisible(layer.isVisible === true);

    this.map?.addLayer(olLayer);
    this.dynamicLayers.push(olLayer);
    this.layerRegistry.set(key, olLayer);
  }

  private initMap(): void {
    this.map = new Map({
      target: 'mapCanvas',
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }).extend([
        new ScaleLine({
          units: 'metric',
          minWidth: 110,
        }),
      ]),
      layers: [this.measureLayer],
      view: new View({
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        projection: 'EPSG:3857',
      }),
    });
  }

  private registerMapEvents(): void {
    this.map?.on('pointermove', (event) => {
      this.setCoordinate(event.coordinate);
    });

    this.map?.on('click', (event) => {
      this.setCoordinate(event.coordinate);
      this.isCoordinateMenuOpen = false;
    });
  }

  private startLengthMeasure(): void {
    if (!this.map) return;

    this.stopLengthMeasure(true);

    this.isLengthMeasureActive = true;
    this.lengthMeasureText = '';
    this.measureSource.clear();

    this.measureDraw = new Draw({
      source: this.measureSource,
      type: 'LineString',
      maxPoints: 2,
      style: new Style({
        stroke: new Stroke({
          color: '#50cd89',
          width: 3,
        }),
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: '#50cd89',
          }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 2,
          }),
        }),
      }),
    });

    this.measureDraw.on('drawend', (event) => {
      const feature = event.feature as Feature<LineString>;
      const geometry = feature.getGeometry();

      if (!geometry) return;

      const length = getLength(geometry, {
        projection: 'EPSG:3857',
      });

      this.lengthMeasureText = this.formatLength(length);
      this.stopLengthMeasure(false);
    });

    this.map.addInteraction(this.measureDraw);
  }

  private stopLengthMeasure(clearResult: boolean): void {
    if (this.measureDraw && this.map) {
      this.map.removeInteraction(this.measureDraw);
    }

    this.measureDraw = undefined;
    this.isLengthMeasureActive = false;

    if (clearResult) {
      this.lengthMeasureText = '';
      this.measureSource.clear();
    }
  }

  private clearMeasure(): void {
    if (this.isLengthMeasureActive || this.lengthMeasureText) {
      this.stopLengthMeasure(true);
    }
  }

  private formatLength(length: number): string {
    if (length >= 1000) {
      return `${(length / 1000).toFixed(2).replace('.', ',')} km`;
    }

    return `${length.toFixed(2).replace('.', ',')} m`;
  }

  private setCoordinate(coordinate: Coordinate): void {
    const [lon, lat] = toLonLat(coordinate);

    this.currentLonLat = [lon, lat];
    this.updateCoordinateText();
  }

  private loadLayers(): void {
    this.mapService.allLayers().subscribe({
      next: (response) => {
        const groups = response?.data ?? [];

        this.layerGroups = groups;
        this.clearDynamicLayers();

        this.getVisibleLayers(groups).forEach((layer) => {
          const olLayer = this.createOpenLayersLayer(layer);
          if (!olLayer) return;

          olLayer.setVisible(layer.isVisible === true);
          olLayer.setOpacity(this.normalizeOpacity(layer.opacity));

          this.map?.addLayer(olLayer);
          this.dynamicLayers.push(olLayer);
          this.layerRegistry.set(this.getLayerKey(layer), olLayer);
        });

        this.measureLayer.setZIndex(9999);
      },
      error: (error) => {
        console.error('Harita katmanları yüklenirken hata oluştu:', error);
      },
    });
  }

  private getVisibleLayers(groups: LayerGroupModel[]): LayerModel[] {
    return groups
      .filter((group) => !group.isDeleted)
      .reduce((acc, group) => acc.concat(group.layers ?? []), [] as LayerModel[])
      .filter((layer) => !layer.isDeleted && layer.isVisible === true)
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));
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
      `&outputFormat=${encodeURIComponent(layer.format || 'application/json')}`;

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
    const resolutions = Array.from({ length: 19 }, (_, z) => maxResolution / Math.pow(2, z));
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

    if (this.map && !this.map.getLayers().getArray().includes(this.measureLayer)) {
      this.map.addLayer(this.measureLayer);
    }
  }

  private getLayerKey(layer: LayerModel): number | string {
    return layer.id ?? layer.layerName ?? layer.name ?? `${layer.type}-${layer.orderNo}`;
  }

  private getBaseMapLayers(): OlMapLayer[] {
    return this.layerGroups
      .reduce((layers: LayerModel[], group) => layers.concat(group.layers ?? []), [])
      .filter((layer) => layer.type === 1)
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
}
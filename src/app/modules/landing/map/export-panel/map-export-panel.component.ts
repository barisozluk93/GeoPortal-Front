import { Component, EventEmitter, Input, Output } from '@angular/core';

export type MapExportFileType = 'pdf' | 'image/png' | 'image/jpeg';

export interface MapExportOptions {
  fileName: string;
  fileType: MapExportFileType;
  dpi?: number;
  x?: number;
  y?: number;
}

@Component({
  selector: 'app-map-export-panel',
  templateUrl: './map-export-panel.component.html',
  styleUrls: ['./map-export-panel.component.scss'],
})
export class MapExportPanelComponent {
  @Input() mapWidth = 0;
  @Input() mapHeight = 0;

  @Output() exportRequested = new EventEmitter<MapExportOptions>();

  submitted = false;

  fileName = '';
  fileType: MapExportFileType | '' = '';
  dpi: number | null = null;
  x: number | null = null;
  y: number | null = null;

  readonly screenDpi = 96;

  fileTypes = [
    {
      label: 'PDF',
      value: 'pdf',
    },
    {
      label: 'PNG',
      value: 'image/png',
    },
    {
      label: 'JPEG',
      value: 'image/jpeg',
    },
  ];

  dpiOptions = [
    {
      label: '72 DPI',
      value: 72,
    },
    {
      label: '96 DPI',
      value: 96,
    },
    {
      label: '150 DPI',
      value: 150,
    },
    {
      label: '300 DPI',
      value: 300,
    },
    {
      label: '600 DPI',
      value: 600,
    },
  ];

  get isImage(): boolean {
    return this.fileType === 'image/png' || this.fileType === 'image/jpeg';
  }

  get isFileNameInvalid(): boolean {
    return this.submitted && !this.fileName.trim();
  }

  get isFileTypeInvalid(): boolean {
    return this.submitted && !this.fileType;
  }

  get isDpiInvalid(): boolean {
    return this.submitted && this.isImage && (!this.dpi || this.dpi <= 0);
  }

  get isXInvalid(): boolean {
    return this.submitted && this.isImage && (!this.x || this.x <= 0);
  }

  get isYInvalid(): boolean {
    return this.submitted && this.isImage && (!this.y || this.y <= 0);
  }

  onFileNameInput(event: Event): void {
    this.fileName = (event.target as HTMLInputElement).value;
  }

  onFileTypeChange(value: MapExportFileType | ''): void {
    this.fileType = value;

    if (!this.isImage) {
      this.dpi = null;
      this.x = null;
      this.y = null;
      return;
    }

    this.dpi = this.dpi || this.screenDpi;
    this.updateSizeByDpi();
  }

  onDpiChange(value: number | null): void {
    this.dpi = Number(value);

    if (!this.isImage) return;

    this.updateSizeByDpi();
  }

  onXInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.x = Number.isFinite(value) ? value : null;
  }

  onYInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.y = Number.isFinite(value) ? value : null;
  }

  submit(): void {
    this.submitted = true;

    if (this.isImage) {
      this.dpi = this.dpi || this.screenDpi;
      this.updateSizeByDpi();
    }

    if (
      this.isFileNameInvalid ||
      this.isFileTypeInvalid ||
      this.isDpiInvalid ||
      this.isXInvalid ||
      this.isYInvalid
    ) {
      return;
    }

    this.exportRequested.emit({
      fileName: this.normalizeFileName(this.fileName),
      fileType: this.fileType as MapExportFileType,
      dpi: this.isImage ? Number(this.dpi) : undefined,
      x: this.isImage ? Number(this.x) : undefined,
      y: this.isImage ? Number(this.y) : undefined,
    });
  }

  private updateSizeByDpi(): void {
    const dpi = this.dpi || this.screenDpi;
    const width = this.mapWidth > 0 ? this.mapWidth : 1920;
    const height = this.mapHeight > 0 ? this.mapHeight : 1080;
    const scale = dpi / this.screenDpi;

    this.x = Math.round(width * scale);
    this.y = Math.round(height * scale);
  }

  private normalizeFileName(value: string): string {
    return value.trim().replace(/[\\/:*?"<>|]/g, '-');
  }
}

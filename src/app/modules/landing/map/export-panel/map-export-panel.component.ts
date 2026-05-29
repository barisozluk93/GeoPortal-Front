import { Component, EventEmitter, Output } from '@angular/core';

export type MapExportFileType = 'pdf' | 'image/png';

export interface MapExportOptions {
  fileName: string;
  fileType: MapExportFileType;
  x?: number;
  y?: number;
}

@Component({
  selector: 'app-map-export-panel',
  templateUrl: './map-export-panel.component.html',
  styleUrls: ['./map-export-panel.component.scss'],
})
export class MapExportPanelComponent {
  @Output() exportRequested = new EventEmitter<MapExportOptions>();

  submitted = false;

  fileName = '';
  fileType: MapExportFileType | '' = '';
  x: number | null = null;
  y: number | null = null;

  fileTypes = [
    {
      label: 'PDF',
      value: 'pdf',
    },
    {
      label: 'PNG',
      value: 'image/png',
    },
  ];

  get isPng(): boolean {
    return this.fileType === 'image/png';
  }

  get isFileNameInvalid(): boolean {
    return this.submitted && !this.fileName.trim();
  }

  get isFileTypeInvalid(): boolean {
    return this.submitted && !this.fileType;
  }

  get isXInvalid(): boolean {
    return this.submitted && this.isPng && (!this.x || this.x <= 0);
  }

  get isYInvalid(): boolean {
    return this.submitted && this.isPng && (!this.y || this.y <= 0);
  }

  onFileNameInput(event: Event): void {
    this.fileName = (event.target as HTMLInputElement).value;
  }

  onFileTypeChange(event: Event): void {
    this.fileType = (event.target as HTMLSelectElement).value as MapExportFileType;

    if (!this.isPng) {
      this.x = null;
      this.y = null;
    }
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

    if (
      this.isFileNameInvalid ||
      this.isFileTypeInvalid ||
      this.isXInvalid ||
      this.isYInvalid
    ) {
      return;
    }

    this.exportRequested.emit({
      fileName: this.normalizeFileName(this.fileName),
      fileType: this.fileType as MapExportFileType,
      x: this.isPng ? Number(this.x) : undefined,
      y: this.isPng ? Number(this.y) : undefined,
    });
  }

  private normalizeFileName(value: string): string {
    return value.trim().replace(/[\\/:*?"<>|]/g, '-');
  }
}
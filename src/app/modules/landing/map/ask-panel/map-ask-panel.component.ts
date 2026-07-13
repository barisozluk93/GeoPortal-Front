import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";

export interface AskFootprintResult {
  id: number | string;
  name?: string;
  imageId?: string;
  productName?: string;
  acquisitionDate?: string | Date | null;
  propertyUrl?: string;
  geometry?: unknown;
  wkt?: string | null;
  attributes: Record<string, unknown>;
  attributesLoading?: boolean;
  attributesError?: string | null;
}

@Component({
  selector: "app-map-ask-panel",
  templateUrl: "./map-ask-panel.component.html",
  styleUrls: ["./map-ask-panel.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapAskPanelComponent {
  @Input() loading = false;
  @Input() coordinateText = "";
  @Input() footprints: AskFootprintResult[] = [];
  @Input() activeIndex = 0;

  @Output() tabSelected = new EventEmitter<number>();
  @Output() zoomRequested = new EventEmitter<AskFootprintResult>();

  get activeFootprint(): AskFootprintResult | null {
    return this.footprints[this.activeIndex] ?? null;
  }

  get activeAttributeRows(): Array<{ key: string; value: unknown }> {
    const attributes = this.activeFootprint?.attributes ?? {};

    return Object.keys(attributes).map((key) => ({
      key,
      value: attributes[key],
    }));
  }

  selectTab(index: number): void {
    if (
      index < 0 ||
      index >= this.footprints.length ||
      index === this.activeIndex
    ) {
      return;
    }

    this.tabSelected.emit(index);
  }

  formatAttributeValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "-";
    if (value instanceof Date) return value.toLocaleString("tr-TR");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  trackByFootprint(index: number, item: AskFootprintResult): number | string {
    return item?.id ?? index;
  }

  trackByAttribute(index: number, row: { key: string }): string {
    return row.key || String(index);
  }
}

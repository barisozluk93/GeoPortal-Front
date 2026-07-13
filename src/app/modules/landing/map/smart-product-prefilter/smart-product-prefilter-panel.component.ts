import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from "@angular/core";

import {
  ProductAcquisitionDateRange,
  ProductSmartFilterRequest,
} from "../smart-filter/models/product-smart-filter.model";

export type SmartPrefilterAoiOrigin = "polygon" | "rectangle" | "upload" | "search";
export type SmartPrefilterExportFormat = "shp" | "kml";
export type SmartPrefilterNewAreaAction = "polygon" | "rectangle" | "upload";
export type SmartPrefilterAreaUnit = "m2" | "km2" | "dekar" | "hektar";

export interface SmartPrefilterAoiItem {
  id: string;
  name: string;
  areaM2: number;
  areaText: string;
  origin: SmartPrefilterAoiOrigin;
}

export interface SmartPrefilterAoiExportEvent {
  area: SmartPrefilterAoiItem;
  format: SmartPrefilterExportFormat;
}

export interface SmartPrefilterAoiRenameEvent {
  area: SmartPrefilterAoiItem;
  name: string;
}

@Component({
  selector: "app-smart-product-prefilter-panel",
  templateUrl: "./smart-product-prefilter-panel.component.html",
  styleUrls: ["./smart-product-prefilter-panel.component.scss"],
})
export class SmartProductPrefilterPanelComponent implements OnChanges, OnDestroy {
  @Input() request: ProductSmartFilterRequest = { pageNumber: 1, pageSize: 100 };
  @Input() acquisitionDateRange: ProductAcquisitionDateRange | null = null;
  @Input() loading = false;
  @Input() areas: SmartPrefilterAoiItem[] = [];
  @Input() editingAreaId: string | null = null;
  @Input() selectedAreaId: string | null = null;
  @Input() resultsCollapsed = false;

  @Output() searchClicked = new EventEmitter<ProductSmartFilterRequest>();
  @Output() closeClicked = new EventEmitter<void>();
  @Output() editAreaClicked = new EventEmitter<SmartPrefilterAoiItem>();
  @Output() removeAreaClicked = new EventEmitter<SmartPrefilterAoiItem>();
  @Output() exportAreaClicked = new EventEmitter<SmartPrefilterAoiExportEvent>();
  @Output() newAreaClicked = new EventEmitter<SmartPrefilterNewAreaAction>();
  @Output() renameAreaClicked = new EventEmitter<SmartPrefilterAoiRenameEvent>();
  @Output() areaSelected = new EventEmitter<SmartPrefilterAoiItem>();
  @Output() areaHovered = new EventEmitter<SmartPrefilterAoiItem | null>();
  @Output() resultsPanelToggled = new EventEmitter<void>();
  @Output() prefilterPanelToggled = new EventEmitter<void>();
  @Output() newRequestClicked = new EventEmitter<SmartPrefilterAoiItem>();

  draft: ProductSmartFilterRequest = { pageNumber: 1, pageSize: 100 };
  openedMenuAreaId: string | null = null;
  isNewAreaMenuOpen = false;
  renamingAreaId: string | null = null;
  renameDraft = "";
  internalSelectedAreaId: string | null = null;
  selectedAreaUnit: SmartPrefilterAreaUnit = "km2";

  readonly areaUnits: Array<{ label: string; value: SmartPrefilterAreaUnit }> = [
    { label: "m²", value: "m2" },
    { label: "km²", value: "km2" },
    { label: "da", value: "dekar" },
    { label: "ha", value: "hektar" },
  ];

  private dateFilterTimer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["request"] || changes["acquisitionDateRange"]) this.resetForm();

    if (changes["selectedAreaId"]) {
      this.internalSelectedAreaId = this.selectedAreaId;
    }

    if (changes["areas"] && this.openedMenuAreaId) {
      if (!this.areas.some((area) => area.id === this.openedMenuAreaId)) {
        this.openedMenuAreaId = null;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.dateFilterTimer) clearTimeout(this.dateFilterTimer);
  }

  onPanelClick(event: MouseEvent): void {
    event.stopPropagation();
    this.closeAreaMenu();
    this.isNewAreaMenuOpen = false;
  }

  stopEvent(event: Event): void { event.stopPropagation(); }

  toggleNewAreaMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeAreaMenu();
    this.isNewAreaMenuOpen = !this.isNewAreaMenuOpen;
  }

  selectNewAreaAction(action: SmartPrefilterNewAreaAction, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isNewAreaMenuOpen = false;
    this.newAreaClicked.emit(action);
  }

  toggleAreaMenu(areaId: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isNewAreaMenuOpen = false;
    this.openedMenuAreaId = this.openedMenuAreaId === areaId ? null : areaId;
  }

  closeAreaMenu(): void { this.openedMenuAreaId = null; }

  togglePrefilter(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeAreaMenu();
    this.prefilterPanelToggled.emit();
  }

  toggleResults(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeAreaMenu();
    this.resultsPanelToggled.emit();
  }


  selectArea(area: SmartPrefilterAoiItem, event?: Event): void {
    event?.stopPropagation();

    if (this.internalSelectedAreaId === area.id) return;

    // Parent sorgusu tamamlanmadan önce seçim işaretini anlık göster.
    this.internalSelectedAreaId = area.id;
    this.areaSelected.emit(area);
  }

  hoverArea(area: SmartPrefilterAoiItem): void {
    this.areaHovered.emit(area);
  }

  leaveArea(): void {
    this.areaHovered.emit(null);
  }

  editArea(area: SmartPrefilterAoiItem): void {
    this.closeAreaMenu();
    this.editAreaClicked.emit(area);
  }

  createNewRequest(area: SmartPrefilterAoiItem, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeAreaMenu();

    if (this.internalSelectedAreaId !== area.id) {
      this.internalSelectedAreaId = area.id;
      this.areaSelected.emit(area);
    }

    this.newRequestClicked.emit(area);
  }

  beginRename(area: SmartPrefilterAoiItem, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeAreaMenu();
    this.renamingAreaId = area.id;
    this.renameDraft = area.name;
  }

  saveRename(area: SmartPrefilterAoiItem, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const name = this.renameDraft.trim();
    if (name && name !== area.name) this.renameAreaClicked.emit({ area, name });
    this.cancelRename();
  }

  cancelRename(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.renamingAreaId = null;
    this.renameDraft = "";
  }

  removeArea(area: SmartPrefilterAoiItem): void {
    this.closeAreaMenu();
    this.removeAreaClicked.emit(area);
  }

  exportArea(area: SmartPrefilterAoiItem, format: SmartPrefilterExportFormat): void {
    this.closeAreaMenu();
    this.exportAreaClicked.emit({ area, format });
  }

  onStartDateChange(value: string | null): void {
    const startDate = this.toDateInputValue(value);
    const endDate = this.toDateInputValue(this.draft.acquisitionEndDate);
    this.draft.acquisitionStartDate = startDate;
    if (startDate && endDate && startDate > endDate) this.draft.acquisitionEndDate = startDate;
    this.scheduleAutomaticFilter();
  }

  onEndDateChange(value: string | null): void {
    const startDate = this.toDateInputValue(this.draft.acquisitionStartDate);
    const endDate = this.toDateInputValue(value);
    this.draft.acquisitionEndDate = endDate;
    if (startDate && endDate && endDate < startDate) this.draft.acquisitionStartDate = endDate;
    this.scheduleAutomaticFilter();
  }

  trackByAreaId(_index: number, area: SmartPrefilterAoiItem): string { return area.id; }

  formatArea(areaM2: number): string {
    const safeAreaM2 = Number.isFinite(areaM2) ? areaM2 : 0;

    let value = safeAreaM2;

    switch (this.selectedAreaUnit) {
      case "km2":
        value = safeAreaM2 / 1_000_000;
        break;
      case "dekar":
        value = safeAreaM2 / 1_000;
        break;
      case "hektar":
        value = safeAreaM2 / 10_000;
        break;
      default:
        value = safeAreaM2;
        break;
    }

    const maximumFractionDigits = this.selectedAreaUnit === "m2" ? 0 : 2;

    return value.toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    });
  }


  getAreaIcon(area: SmartPrefilterAoiItem): string {
    switch (area.origin) {
      case "rectangle": return "fa-vector-square";
      case "upload": return "fa-file-arrow-up";
      case "search": return "fa-magnifying-glass-location";
      default: return "fa-draw-polygon";
    }
  }

  private scheduleAutomaticFilter(): void {
    if (this.dateFilterTimer) clearTimeout(this.dateFilterTimer);
    this.dateFilterTimer = setTimeout(() => {
      if (!this.loading && this.areas.length) {
        this.searchClicked.emit(this.normalizeRequest(this.draft));
      }
    }, 450);
  }

  private resetForm(): void {
    /*
     * İlk açılışta request tarihleri ProductAcquisitionDateRange modelinden
     * parent tarafından doldurulur. Kullanıcı prefilter tarihlerini değiştirip
     * sorgu yaptıktan sonra ise güncel request tarihleri önceliklidir.
     * Böylece request değişiminde alanlar ilk min/max değerlere geri dönmez.
     */
    const requestStartDate = this.toDateInputValue(
      this.request?.acquisitionStartDate,
    );
    const requestEndDate = this.toDateInputValue(
      this.request?.acquisitionEndDate,
    );

    this.draft = {
      ...this.request,
      acquisitionStartDate:
        requestStartDate ??
        this.toDateInputValue(
          this.acquisitionDateRange?.acquisitionStartDate,
        ),
      acquisitionEndDate:
        requestEndDate ??
        this.toDateInputValue(
          this.acquisitionDateRange?.acquisitionEndDate,
        ),
      pageNumber: this.request?.pageNumber ?? 1,
      pageSize: this.request?.pageSize ?? 100,
    };

    this.ensureValidDateRange();
  }

  private ensureValidDateRange(): void {
    const startDate = this.toDateInputValue(this.draft.acquisitionStartDate);
    const endDate = this.toDateInputValue(this.draft.acquisitionEndDate);
    this.draft.acquisitionStartDate = startDate;
    this.draft.acquisitionEndDate = endDate;
    if (startDate && endDate && startDate > endDate) this.draft.acquisitionEndDate = startDate;
  }

  private normalizeRequest(request: ProductSmartFilterRequest): ProductSmartFilterRequest {
    return {
      ...request,
      acquisitionStartDate: this.emptyToNull(request.acquisitionStartDate),
      acquisitionEndDate: this.emptyToNull(request.acquisitionEndDate),
      pageNumber: 1,
      pageSize: request.pageSize ?? 100,
    };
  }

  private emptyToNull(value: string | null | undefined): string | null {
    return value === undefined || value === "" ? null : value;
  }

  private toDateInputValue(value: string | Date | null | undefined): string | null {
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
}

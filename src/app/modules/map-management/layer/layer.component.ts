import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ColumnModel } from 'src/app/models/column-model';
import { PaginationModel } from 'src/app/models/pagination.model';
import { LayerModel } from '../models/layer.model';
import { LayerEditSaveComponent } from './edit-save/edit-save.component';
import { ConfirmationComponent } from '../../confirmation/confirmation.component';
import { PermissionEnum } from 'src/app/enums/permission.enum';
import { AuthService } from '../../auth';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { MapManagementService } from '../map-management.service';
import { HttpParams } from '@angular/common/http';
import { MapComponent } from '../../landing/map/map.component';
import { RoleEnum } from 'src/app/enums/role.enum';

@Component({
  selector: 'app-layer',
  templateUrl: './layer.component.html',
  styleUrls: ['./layer.component.scss'],
})
export class LayerComponent implements OnInit, OnDestroy {
  @ViewChild('editSaveComponent') private editSaveComponent: LayerEditSaveComponent;
  @ViewChild('confirmationComponent') private confirmationComponent: ConfirmationComponent;
  @ViewChild('map') private mapComponent: MapComponent;

  hasEditPermission = true;
  hasDeletePermission = true;
  hasNewRecordPermission = true;
  hasPreviewMapPermission = true;
  hasExportPermission = true;

  filterModel: Record<string, any> = {};
  isMapPreviewDrawerOpen = false;

  constructor(
    private mapManagementService: MapManagementService,
    private authService: AuthService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  tableName = '';
  columnList: ColumnModel[] = [];

  columnListTr: ColumnModel[] = [
    { name: 'Id', index: 'id', visibility: false },
    { name: 'Ad', index: 'name', visibility: true },
    { name: 'Tip', index: 'type', visibility: true },
    { name: 'Katman Adı', index: 'layerName', visibility: true },
    { name: 'Görünür Mü?', index: 'isVisible', visibility: true },
    { name: 'Katman Grubu', index: 'layerGroupName', visibility: true },
    { name: 'Sıra', index: 'orderNo', visibility: true },
    { name: 'Aktif Mi?', index: 'isDeleted', visibility: true },
    { name: 'İşlemler', index: null, visibility: true },
  ];

  columnListEn: ColumnModel[] = [
    { name: 'Id', index: 'id', visibility: false },
    { name: 'Name', index: 'name', visibility: true },
    { name: 'Type', index: 'type', visibility: true },
    { name: 'Layer Name', index: 'layerName', visibility: true },
    { name: 'Visible', index: 'isVisible', visibility: true },
    { name: 'Layer Group', index: 'layerGroupName', visibility: true },
    { name: 'Order No', index: 'orderNo', visibility: true },
    { name: 'Is Active?', index: 'isDeleted', visibility: true },
    { name: 'Actions', index: null, visibility: true },
  ];

  dataSource: LayerModel[] = [];
  totalCount = 0;
  paginationModel: PaginationModel;

  controlPermissions() {
    this.authService.currentUserSubject.asObservable().subscribe(result => {
      if (result?.permissions) {
        const permissionList = JSON.parse(result.permissions) as number[];
        this.hasDeletePermission = permissionList.includes(PermissionEnum['UserScene.Delete.Permission']);
        this.hasEditPermission = permissionList.includes(PermissionEnum['UserScene.Edit.Permission']);
        this.hasNewRecordPermission = permissionList.includes(PermissionEnum['UserScene.Save.Permission']);
        this.hasExportPermission = permissionList.includes(PermissionEnum['Table.Export.Permission']);
        this.hasPreviewMapPermission = result.roles.includes(RoleEnum.SuperAdmin);
      }
    });
  }

  delete(event: number) {
    this.mapManagementService.layerDelete(event).subscribe(result => {
      if (result.isSuccess) {
        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        this.loadData();
        this.mapComponent.refreshMap();
      } else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  isSuccess(_: boolean) {
    this.loadData();
    this.mapComponent.refreshMap();
  }

  loadData() {
    var filterParams = this.buildFilterQueryParams(this.filterModel);

    this.mapManagementService
      .layerPaging(this.paginationModel.pageNumber, this.paginationModel.pageSize, filterParams)
      .subscribe(result => {
        if (result.isSuccess) {
          result.data.items.forEach(item => {
            item.layerGroupName = item.layerGroup?.name;
          });

          this.dataSource = result.data.items;
          this.totalCount = result.data.totalCount;
        } else {
          this.dataSource = [];
          this.totalCount = 0;
        }
      });
  }

  ngOnInit(): void {
    this.controlPermissions();
    this.paginationModel = { pageNumber: 1, pageSize: 10 } as PaginationModel;
    this.loadData();

    this.translate.onLangChange.subscribe(() => {
      this.translate.get('LAYERS').subscribe((translation) => {
        this.tableName = translation;
      });

      this.translate.get('LANG').subscribe((translation: string) => {
        this.columnList = translation === 'tr' ? this.columnListTr : this.columnListEn;
      });
    });

    this.translate.get('LAYERS').subscribe((translation) => {
      this.tableName = translation;
    });

    this.translate.get('LANG').subscribe((translation: string) => {
      this.columnList = translation === 'tr' ? this.columnListTr : this.columnListEn;
    });
  }

  ngOnDestroy() { }
  
  openDeleteModal(event: number) {
    let deleteText = '';
    this.translate.get('DELETE').subscribe((translation) => {
      deleteText = translation;
    });
    this.confirmationComponent.openModal(deleteText, event);
  }

  openEditModal(event: number) {
    this.editSaveComponent.openModal(event);
  }

  openSaveModal(_: boolean) {
    this.editSaveComponent.openModal(undefined);
  }

  openMapPreviewDrawer(_: boolean = true) {
    this.isMapPreviewDrawerOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeMapPreviewDrawer() {
    this.isMapPreviewDrawerOpen = false;
    document.body.style.overflow = '';
  }

  toggleMapPreviewDrawer(event: boolean) {
    if (this.isMapPreviewDrawerOpen) {
      this.closeMapPreviewDrawer();
      return;
    }

    this.openMapPreviewDrawer(true);
  }

  @HostListener('document:keydown.escape')
  onEscapePressed() {
    if (this.isMapPreviewDrawerOpen) {
      this.closeMapPreviewDrawer();
    }
  }

  paginationModelChange(event: PaginationModel) {
    this.paginationModel = event;
    this.loadData();
  }

  onFilterModelChange(filter: Record<string, any>) {
    this.filterModel = filter ?? {};
    this.paginationModel.pageNumber = 1;
    this.loadData();
  }

  buildFilterQueryParams(filterModel: Record<string, any>): HttpParams {
    let params = new HttpParams();

    Object.entries(filterModel || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  exportExcel(event: boolean) {
    this.mapManagementService.exportLayerExcel().subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          return;
        }

        const fileName = this.getFileNameFromHeader(response.headers.get('content-disposition')) || 'Katmanlar.xlsx';
        this.downloadBlob(blob, fileName);
      },
      error: (err) => {
        console.error('Excel export hatası:', err);
      }
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  private getFileNameFromHeader(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;

    const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
    return match?.[1] ?? null;
  }
}
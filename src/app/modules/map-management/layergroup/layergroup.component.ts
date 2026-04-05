import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ColumnModel } from 'src/app/models/column-model';
import { PaginationModel } from 'src/app/models/pagination.model';
import { LayerGroupModel } from '../models/layergroup.model';
import { LayerGroupEditSaveComponent } from './edit-save/edit-save.component';
import { ConfirmationComponent } from '../../confirmation/confirmation.component';
import { PermissionEnum } from 'src/app/enums/permission.enum';
import { AuthService } from '../../auth';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { MapManagementService } from '../map-management.service';
import { HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-layergroup',
  templateUrl: './layergroup.component.html',
  styleUrls: ['./layergroup.component.scss'],
})
export class LayerGroupComponent implements OnInit, OnDestroy {
  @ViewChild('editSaveComponent') private editSaveComponent: LayerGroupEditSaveComponent;
  @ViewChild('confirmationComponent') private confirmationComponent: ConfirmationComponent;

  hasEditPermission = true;
  hasDeletePermission = true;
  hasNewRecordPermission = true;

  filterModel: Record<string, any> = {};

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
    { name: 'Sıra', index: 'orderNo', visibility: true },
    { name: 'Aktif Mi?', index: 'isDeleted', visibility: true },
    { name: 'İşlemler', index: null, visibility: true },
  ];
  columnListEn: ColumnModel[] = [
    { name: 'Id', index: 'id', visibility: false },
    { name: 'Name', index: 'name', visibility: true },
    { name: 'Order No', index: 'orderNo', visibility: true },
    { name: 'Is Active?', index: 'isDeleted', visibility: true },
    { name: 'Actions', index: null, visibility: true },
  ];

  dataSource: LayerGroupModel[] = [];
  totalCount = 0;
  paginationModel: PaginationModel;

  controlPermissions() {
    this.authService.currentUserSubject.asObservable().subscribe(result => {
      if (result?.permissions) {
        const permissionList = JSON.parse(result.permissions) as number[];
        this.hasDeletePermission = permissionList.includes(PermissionEnum['RoleScene.Delete.Permission']);
        this.hasEditPermission = permissionList.includes(PermissionEnum['RoleScene.Edit.Permission']);
        this.hasNewRecordPermission = permissionList.includes(PermissionEnum['RoleScene.Save.Permission']);
      }
    });
  }

  delete(event: number) {
    this.mapManagementService.layerGroupDelete(event).subscribe(result => {
      if (result.isSuccess) {
        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        this.loadData();
      } else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  isSuccess(_: boolean) {
    this.loadData();
  }

  loadData() {
    var filterParams = this.buildFilterQueryParams(this.filterModel);

    this.mapManagementService.layerGroupPaging(this.paginationModel.pageNumber, this.paginationModel.pageSize, filterParams)
      .subscribe(result => {
        if (result.isSuccess) {
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
      this.translate.get('LAYER_GROUPS').subscribe((translation: string) => {
        this.tableName = translation;
      });
      this.translate.get('LANG').subscribe((translation: string) => {
        this.columnList = translation === 'tr' ? this.columnListTr : this.columnListEn;
      });
    });

    this.translate.get('LAYER_GROUPS').subscribe((translation: string) => {
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
}

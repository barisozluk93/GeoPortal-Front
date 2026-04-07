import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ColumnModel } from 'src/app/models/column-model';
import { PaginationModel } from 'src/app/models/pagination.model';
import { UserManagementService } from '../user-management.service';
import { UserModel } from '../models/user.model';
import { UserEditSaveComponent } from './edit-save/edit-save.component';
import { ConfirmationComponent } from '../../confirmation/confirmation.component';
import { PermissionEnum } from 'src/app/enums/permission.enum';
import { AuthService } from '../../auth';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent implements OnInit, OnDestroy {

  @ViewChild('editSaveComponent') private editSaveComponent: UserEditSaveComponent;
  @ViewChild('confirmationComponent') private confirmationComponent: ConfirmationComponent;

  hasEditPermission: boolean;
  hasDeletePermission: boolean;
  hasNewRecordPermission: boolean;
  hasExportPermission: boolean;
  
  filterModel: Record<string, any> = {};

  constructor(
    private userManagementService: UserManagementService,
    private authService: AuthService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  tableName: string = "";
  columnList: ColumnModel[] = []

  columnListTr: ColumnModel[] = [
    { name: "Id", index: "id", visibility: false },
    { name: "Adı Soyadı", index: "nameSurname", visibility: true },
    { name: "Kullanıcı Adı", index: "username", visibility: true },
    { name: "E-posta", index: "email", visibility: true },
    { name: "Telefon Numarası", index: "phone", visibility: true },
    { name: "Aktif Mi?", index: "isDeleted", visibility: true },
    { name: "İşlemler", index: null, visibility: true }
  ]

  columnListEn: ColumnModel[] = [
    { name: "Id", index: "id", visibility: false },
    { name: "Name Surname", index: "nameSurname", visibility: true },
    { name: "User Name", index: "username", visibility: true },
    { name: "E-mail", index: "email", visibility: true },
    { name: "Phone Number", index: "phone", visibility: true },
    { name: "Is Active?", index: "isDeleted", visibility: true },
    { name: "Actions", index: null, visibility: true }
  ]

  dataSource: UserModel[];
  totalCount: number;
  paginationModel: PaginationModel;

  controlPermissions() {
    this.authService.currentUserSubject.asObservable().subscribe(result => {
      if (result?.permissions) {
        let permissionList = (JSON.parse(result?.permissions) as number[]);

        if (permissionList.includes(PermissionEnum['UserScene.Delete.Permission'])) {
          this.hasDeletePermission = true;
        }
        else {
          this.hasDeletePermission = false;
        }

        if (permissionList.includes(PermissionEnum['UserScene.Edit.Permission'])) {
          this.hasEditPermission = true;
        }
        else {
          this.hasEditPermission = false;
        }

        if (permissionList.includes(PermissionEnum['UserScene.Save.Permission'])) {
          this.hasNewRecordPermission = true;
        }
        else {
          this.hasNewRecordPermission = false;
        }

        this.hasExportPermission = permissionList.includes(PermissionEnum['Table.Export.Permission']);

      }
    });
  }

  delete(event: number) {
    this.userManagementService.userDelete(event).subscribe(result => {
      if (result.isSuccess) {
        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        this.loadData();
      }
      else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    })
  }

  isSuccess(event: boolean) {
    this.loadData();
  }

  loadData() {
    const filterParams = this.buildFilterQueryParams(this.filterModel);

    this.userManagementService.userPaging(this.paginationModel.pageNumber, this.paginationModel.pageSize, filterParams)
      .subscribe(result => {
        if (result.isSuccess) {
          result.data.items.forEach(item => {
            item.nameSurname = item.name + " " + item.surname;
          })

          this.dataSource = result.data.items;
          this.totalCount = result.data.totalCount;
        }
        else {
          this.dataSource = [];
          this.totalCount = 0;
        }
      })
  }

  ngOnInit(): void {
    this.controlPermissions();
    this.paginationModel = { pageNumber: 1, pageSize: 10 } as PaginationModel;
    this.loadData();

    this.translate.onLangChange.subscribe(() => {
      this.translate.get("USERS").subscribe((translation) => {
        this.tableName = translation
      })

      this.translate.get('LANG').subscribe((translation: string) => {
        if (translation === "tr") {
          this.columnList = this.columnListTr
        } else {
          this.columnList = this.columnListEn
        }
      });
    });

    this.translate.get("USERS").subscribe((translation) => {
      this.tableName = translation
    })

    this.translate.get('LANG').subscribe((translation: string) => {
      if (translation === "tr") {
        this.columnList = this.columnListTr
      } else {
        this.columnList = this.columnListEn
      }
    });

  }

  ngOnDestroy() {
  }

  openDeleteModal(event: number) {
    var deleteText = "";
    this.translate.get('DELETE').subscribe((translation) => {
      deleteText = translation
    })
    this.confirmationComponent.openModal(deleteText, event);
  }

  openEditModal(event: number) {
    this.editSaveComponent.openModal(event);
  }

  openSaveModal(event: boolean) {
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

  exportExcel(event: boolean) {
    this.userManagementService.exportUserExcel().subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          return;
        }

        const fileName = this.getFileNameFromHeader(response.headers.get('content-disposition')) || 'Kullanıcılar.xlsx';
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

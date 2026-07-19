import { formatDate } from '@angular/common';
import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ColumnModel } from 'src/app/models/column-model';
import { PaginationModel } from 'src/app/models/pagination.model';
import { AuditLogManagementService } from './audit-log-management.service';
import { AuditLogModel } from './models/audit-log.model';

@Component({
  selector: 'app-audit-log-management',
  templateUrl: './audit-log-management.component.html',
  styleUrls: ['./audit-log-management.component.scss'],
})
export class AuditLogManagementComponent implements OnInit, OnDestroy {
  tableName = '';
  filterModel: Record<string, any> = {};

  dataSource: AuditLogModel[] = [];
  totalCount = 0;
  paginationModel: PaginationModel = {
    pageNumber: 1,
    pageSize: 10,
  } as PaginationModel;

  columnList: ColumnModel[] = [];

  readonly columnListTR: ColumnModel[] = [
    { name: 'Id', index: 'id', visibility: false },
    { name: 'Tarih / Saat', index: 'timestampUtc', visibility: true },
    { name: 'Kullanıcı', index: 'userName', visibility: true },
    { name: 'Servis', index: 'serviceName', visibility: true },
    { name: 'İşlem Türü', index: 'actionType', visibility: true },
    { name: 'HTTP Metodu', index: 'httpMethod', visibility: true },
    { name: 'Endpoint', index: 'path', visibility: true },
    { name: 'Durum', index: 'resultText', visibility: true },
    { name: 'Hata Mesajı', index: 'errorMessage', visibility: true},
    { name: 'Süre (ms)', index: 'durationMs', visibility: true },
    { name: 'IP Adresi', index: 'ipAddress', visibility: true },
    { name: 'Correlation Id', index: 'correlationId', visibility: true },
  ];

  readonly columnListEN: ColumnModel[] = [
    { name: 'Id', index: 'id', visibility: false },
    { name: 'Date / Time', index: 'timestampUtc', visibility: true },
    { name: 'User', index: 'userName', visibility: true },
    { name: 'Service', index: 'serviceName', visibility: true },
    { name: 'Action Type', index: 'actionType', visibility: true },
    { name: 'HTTP Method', index: 'httpMethod', visibility: true },
    { name: 'Endpoint', index: 'path', visibility: true },
    { name: 'Result', index: 'resultText', visibility: true },
    { name: 'Error Message', index: 'errorMessage', visibility: true},
    { name: 'Duration (ms)', index: 'durationMs', visibility: true },
    { name: 'IP Address', index: 'ipAddress', visibility: true },
    { name: 'Correlation Id', index: 'correlationId', visibility: true },
  ];

  private langChangeSubscription?: Subscription;

  constructor(
    private auditLogManagementService: AuditLogManagementService,
    private translate: TranslateService,
    @Inject(LOCALE_ID) public locale: string,
  ) { }

  ngOnInit(): void {
    this.updateTranslationsAndColumns();

    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.updateTranslationsAndColumns();
      this.loadData();
    });

    this.loadData();
  }

  ngOnDestroy(): void {
    this.langChangeSubscription?.unsubscribe();
  }

  loadData(): void {
  const filterParams = this.buildFilterQueryParams(this.filterModel);

  this.auditLogManagementService
    .paging(
      this.paginationModel.pageNumber,
      this.paginationModel.pageSize,
      filterParams,
    )
    .subscribe({
      next: (result) => {
        if (result.isSuccess && result.data) {
          const isTurkish =
            this.translate.currentLang === 'tr' ||
            this.translate.currentLang?.startsWith('tr');

          this.dataSource = (result.data.items ?? []).map(item => ({
            ...item,

            timestampUtc: item.timestampUtc
              ? formatDate(
                  item.timestampUtc,
                  'dd/MM/yyyy HH:mm:ss',
                  this.locale,
                )
              : '-',

            resultText: item.isSuccess
              ? (isTurkish ? 'Başarılı' : 'Successful')
              : (isTurkish ? 'Başarısız' : 'Failed'),

            userName: item.userName || '-',
            serviceName: item.serviceName || '-',
            actionType: item.actionType || '-',
            httpMethod: item.httpMethod || '-',
            path: item.path || '-',
            ipAddress: item.ipAddress || '-',
            correlationId: item.correlationId || '-',
            errorMessage: item.errorMessage || '-',
          }));

          this.totalCount = result.data.totalCount ?? 0;
        } else {
          this.dataSource = [];
          this.totalCount = 0;
        }
      },
      error: (error) => {
        console.error('Audit log kayıtları alınamadı:', error);

        this.dataSource = [];
        this.totalCount = 0;
      },
    });
}

  paginationModelChange(event: PaginationModel): void {
    this.paginationModel = event;
    this.loadData();
  }

  onFilterModelChange(filter: Record<string, any>): void {
    this.filterModel = filter ?? {};
    this.paginationModel.pageNumber = 1;
    this.loadData();
  }

  private updateTranslationsAndColumns(): void {
    this.translate.get('AUDIT_LOGS').subscribe((translation: string) => {
      this.tableName = translation === 'AUDIT_LOGS' ? 'Audit Logları' : translation;
    });

    this.translate.get('LANG').subscribe((language: string) => {
      this.columnList = language === 'tr' ? this.columnListTR : this.columnListEN;
    });
  }

  private buildFilterQueryParams(filterModel: Record<string, any>): HttpParams {
    let params = new HttpParams();

    Object.entries(filterModel || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(this.mapFilterKey(key), String(value));
      }
    });

    return params;
  }

  private mapFilterKey(key: string): string {
    const keyMap: Record<string, string> = {
      timestampUtc: 'StartUtc',
      userId: 'UserId',
      userName: 'UserName',
      serviceName: 'ServiceName',
      actionType: 'ActionType',
      isSuccess: 'IsSuccess',
      resultText: 'IsSuccess',
      correlationId: 'CorrelationId',
    };

    return keyMap[key] ?? key;
  }
}

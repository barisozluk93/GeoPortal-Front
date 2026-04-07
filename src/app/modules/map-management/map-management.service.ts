import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import { LayerModel } from './models/layer.model';
import { LayerGroupModel } from './models/layergroup.model';

const API_MAP_URL = `${environment.apiUrl}/Map`;

@Injectable({
  providedIn: 'root',
})
export class MapManagementService {
  constructor(private http: HttpClient) {}

  layerPaging(pageNumber: number, pageSize: number, filterParams?: HttpParams
      ): Observable<ResultModel<PagingResult<LayerModel[]>>> {
  
    let params = filterParams ?? new HttpParams();
    params = params
      .set('PageNumber', pageNumber)
      .set('PageSize', pageSize);

    return this.http.get<ResultModel<PagingResult<LayerModel[]>>>(`${API_MAP_URL}/PaginateLayer`, { params });
  }

  getLayerById(id: number): Observable<ResultModel<LayerModel>> {
    return this.http.get<ResultModel<LayerModel>>(`${API_MAP_URL}/GetLayer/${id}`);
  }

  layerSave(model: LayerModel): Observable<ResultModel<LayerModel>> {
    return this.http.post<ResultModel<LayerModel>>(`${API_MAP_URL}/SaveLayer`, model);
  }

  layerEdit(model: LayerModel): Observable<ResultModel<LayerModel>> {
    return this.http.post<ResultModel<LayerModel>>(`${API_MAP_URL}/EditLayer`, model);
  }

  layerDelete(id: number): Observable<ResultModel<boolean>> {
    return this.http.delete<ResultModel<boolean>>(`${API_MAP_URL}/DeleteLayer/${id}`);
  }

  exportLayerExcel(): Observable<HttpResponse<Blob>> {
    return this.http.post(`${API_MAP_URL}/ExportLayer/Excel`, null, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  allLayerGroups(): Observable<ResultModel<LayerGroupModel[]>> {
    return this.http.get<ResultModel<LayerGroupModel[]>>(`${API_MAP_URL}/GetLayerGroups`);
  }

  layerGroupPaging(pageNumber: number, pageSize: number, filterParams?: HttpParams
      ): Observable<ResultModel<PagingResult<LayerGroupModel[]>>> {
  
    let params = filterParams ?? new HttpParams();
    params = params
      .set('PageNumber', pageNumber)
      .set('PageSize', pageSize);

    return this.http.get<ResultModel<PagingResult<LayerGroupModel[]>>>(`${API_MAP_URL}/PaginateLayerGroup`, { params });
  }

  getLayerGroupById(id: number): Observable<ResultModel<LayerGroupModel>> {
    return this.http.get<ResultModel<LayerGroupModel>>(`${API_MAP_URL}/GetLayerGroupById/${id}`);
  }

  layerGroupSave(model: LayerGroupModel): Observable<ResultModel<LayerGroupModel>> {
    return this.http.post<ResultModel<LayerGroupModel>>(`${API_MAP_URL}/SaveLayerGroup`, model);
  }

  layerGroupEdit(model: LayerGroupModel): Observable<ResultModel<LayerGroupModel>> {
    return this.http.post<ResultModel<LayerGroupModel>>(`${API_MAP_URL}/EditLayerGroup`, model);
  }

  layerGroupDelete(id: number): Observable<ResultModel<boolean>> {
    return this.http.delete<ResultModel<boolean>>(`${API_MAP_URL}/DeleteLayerGroup/${id}`);
  }

  exportLayerGroupExcel(): Observable<HttpResponse<Blob>> {
    return this.http.post(`${API_MAP_URL}/ExportLayerGroup/Excel`, null, {
      responseType: 'blob',
      observe: 'response'
    });
  }
}
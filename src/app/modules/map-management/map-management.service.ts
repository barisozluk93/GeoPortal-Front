import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import { LayerModel } from './models/layer.model';

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
}
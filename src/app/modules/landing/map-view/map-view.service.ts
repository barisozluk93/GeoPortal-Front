import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import LayerGroup from 'ol/layer/Group';
import { LayerGroupModel } from './models/layerGroup.model';


const API_USER_MAP_URL = `${environment.apiUrl}/Map`;

@Injectable({
    providedIn: 'root',
})
export class MapService {

    constructor(private http: HttpClient) { }

    allLayers(): Observable<ResultModel<LayerGroupModel[]>> {
        return this.http.get<ResultModel<LayerGroupModel[]>>(`${API_USER_MAP_URL}/LayerList`);
    }

    
}

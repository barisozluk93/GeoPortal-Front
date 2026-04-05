import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { LayerGroupModel } from '../../map-management/models/layergroup.model';


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

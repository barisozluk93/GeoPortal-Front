import { LayerGroupModel } from "./layerGroup.model";

export class LayerModel {
    id: number;
    name: string;
    url: string;
    price?: number;
    isDeleted: boolean;
    isBaseMap: boolean;
    layerGroup: LayerGroupModel;
    layerGroupId: number;
  }
  
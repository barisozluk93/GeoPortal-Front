import { LayerModel } from "./layer.model";

export interface LayerGroupModel {
  id: number;
  name: string;
  orderNo: number;
  isDeleted: boolean;
  layers?: LayerModel[];
}

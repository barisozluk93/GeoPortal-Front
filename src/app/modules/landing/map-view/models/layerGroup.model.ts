import { LayerModel } from "./layer.model";

export class LayerGroupModel {
    id: number;
    name: string;
    isDeleted: boolean;
    layers?: LayerModel[];
  }
  
import { LayerType } from './layertype.model';

export interface LayerModel {
  id: number;
  name: string;
  type: LayerType;
  url: string;
  layerName?: string | null;
  format?: string | null;
  version?: string | null;
  isVisible: boolean;
  opacity: number;
  orderNo: number;
  createdAt?: string;
  isDeleted: boolean;
}

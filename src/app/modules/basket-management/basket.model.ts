import { ProductModel } from '../../landing/marketplace/models/product.model';

export interface BasketProcessingOption {
  key: 'orthorectification' | 'pansharpening' | 'ndvi' | 'classification';
  name: string;
  unitPrice: number;
  areaKm2: number;
  totalPrice: number;
}

export class BasketModel {
  id: number;
  basketItemId?: number;
  productId?: number;
  product?: ProductModel;
  userId: number;
  isDeleted: boolean;
  numberOf?: number;
  totalPrice?: number;
  fileResult?: any;

  aoiId?: string | null;
  aoiName?: string | null;
  aoiWkt?: string | null;
  requestWkt?: string | null;
  intersectionWkt?: string | null;
  requestAreaKm2?: number | null;
  unitPrice?: number | null;
  baseTotalPrice?: number | null;
  processingOptions?: BasketProcessingOption[];
  processingTotalPrice?: number | null;
  calculatedTotalPrice?: number | null;
  itemType?: 'satelliteImage' | 'processingService';
}

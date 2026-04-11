import { ProductClassModel } from "./productclass.model";

export class ProductModel {
  id: number;
  name: string;
  downloadLink?: string;
  price: number;
  priceStr?: string;
  userId: number;
  isDeleted: boolean;
  categoryId: number;
  city?: string;
  district?: string;
  acquisitionDate?: string;
  provider?: string;
  resolution?: number;
  cloudRate?: number;
  areaKm2?: number;
  currency?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  description?: string;
  isOrthorectified?: boolean;
  isPansharpened?: boolean;
  isClassified?: boolean;
  classes?: ProductClassModel[];

  geometry?: any;
  wkt?: string;
  bbox?: number[];
  sourceType?: number;
  sourceLabel?: string;
  requestHash?: string;
  isCustomArea?: boolean;
  isInMarket?: boolean;
}

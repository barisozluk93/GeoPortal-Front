import { ProductClassModel } from './productclass.model';

export class ProductModel {
  id!: number;

  name!: string;
  imageId?: string | null;

  // Files
  footprintPath?: string | null;
  geoTiffPath?: string | null;
  previewPath?: string | null;
  quicklookPath?: string | null;
  metadataPath?: string | null;

  downloadLink?: string | null;

  // Geo
  geometry?: any | null;
  wkt?: string | null;

  bboxMinX?: number | null;
  bboxMinY?: number | null;
  bboxMaxX?: number | null;
  bboxMaxY?: number | null;

  bbox?: number[] | null;
  areaKm2?: number | null;

  city?: string | null;
  district?: string | null;

  // Metadata
  acquisitionDate?: string | null;
  resolution?: number | null;
  cloudRate?: number | null;

  sunElevation?: number | null;
  sunAzimuth?: number | null;
  offNadirAngle?: number | null;

  satellite?: string | null;
  sensor?: string | null;
  processingLevel?: string | null;

  sourceLabel?: string | null;
  provider?: string | null;

  isOrthorectified?: boolean | null;
  isPansharpened?: boolean | null;
  isClassified?: boolean | null;

  thumbnailUrl?: string | null;
  previewUrl?: string | null;

  // Price
  price!: number;
  priceStr?: string | null;
  currency?: string | null;

  isDeleted?: boolean;
  isInMarket?: boolean;
  isCustomArea?: boolean;

  categoryId?: number;

  description?: string | null;

  // Relations
  classes?: ProductClassModel[] | null;

  // Frontend/local basket helper only; backend Product.cs currently has no UserId field.
  userId?: number | null;

  // Optional frontend helpers, not present in backend Product.cs.
  sourceType?: number | null;
  requestHash?: string | null;
}

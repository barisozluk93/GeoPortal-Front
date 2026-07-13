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

  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  metadataUrl?: string | null;

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

  // Basic metadata
  acquisitionDate?: string | null;
  acquisitionStartDate?: string | null;
  acquisitionEndDate?: string | null;

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

  // Satellite / product details
  orderId?: string | null;
  stripId?: string | null;
  catalogId?: string | null;
  imageDescriptor?: string | null;
  imageType?: 'Mono' | 'Stereo' | null;
  sensorMode?: string | null;
  bandId?: string | null;
  productType?: string | null;
  productLevel?: string | null;
  radiometricLevel?: string | null;
  outputFormat?: string | null;
  spatialReference?: string | null;
  scanDirection?: string | null;
  dataOwner?: string | null;

  isOrthorectified?: boolean | null;
  isPansharpened?: boolean | null;
  isClassified?: boolean | null;
  isNVDIAnalysis?: boolean | null;
  
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

  // Frontend/local helpers
  userId?: number | null;
  sourceType?: number | null;
  requestHash?: string | null;
}
export interface ProductAcquisitionDateRange {
  acquisitionStartDate: string | null;
  acquisitionEndDate: string | null;
}

export interface ProductSmartFilterRequest {
  wkt?: string | null;
  imageType?: string | null;
  provider?: string | null;
  satellite?: string | null;
  
  acquisitionStartDate?: string | null;
  acquisitionEndDate?: string | null;

  minCloudRate?: number | null;
  maxCloudRate?: number | null;

  minOffNadir?: number | null;
  maxOffNadir?: number | null;

  minResolution?: number | null;
  maxResolution?: number | null;

  spectralResolution?: string | null;

  pageNumber?: number;
  pageSize?: number;
}

export interface ProductSmartFilterResult {
  id: number;
  name: string;

  imageId?: string | null;
  sensorMode?: string | null;
  provider?: string | null;
  satellite?: string | null;
  
  acquisitionStartDate?: string | null;
  acquisitionEndDate?: string | null;
  acquisitionDate?: string | null;
  
  resolution?: number | null;
  spectralResolution?: string | null;

  cloudRate?: number | null;
  nadirAngle?: number | null;

  sunAzimuth?: number | null;
  sunElevation?: number | null;

  bboxMinX?: number | null;
  bboxMinY?: number | null;
  bboxMaxX?: number | null;
  bboxMaxY?: number | null;

  previewUrl?: string | null;
  thumbnailUrl?: string | null;

  wkt?: string | null;
  price?: number | null;
  propertyUrl?: string | null;
}
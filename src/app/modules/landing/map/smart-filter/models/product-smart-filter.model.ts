export interface ProductSmartFilterRequest {
  imageType?: string | null;
  provider?: string | null;

  acquisitionStartDate?: string | null;
  acquisitionEndDate?: string | null;

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

  acquisitionDate?: string | null;

  resolution?: number | null;
  spectralResolution?: string | null;

  cloudRate?: number | null;
  nadirAngle?: number | null;

  bboxMinX?: number | null;
  bboxMinY?: number | null;
  bboxMaxX?: number | null;
  bboxMaxY?: number | null;

  previewUrl?: string | null;
  thumbnailUrl?: string | null;

  wkt?: string | null;
}
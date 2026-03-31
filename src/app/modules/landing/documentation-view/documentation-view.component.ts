import { Component } from '@angular/core';

interface DocNavItem {
  id: string;
  labelKey: string;
}

interface DocEndpoint {
  id: string;
  titleKey: string;
  method: 'GET' | 'POST';
  path: string;
  descriptionKey: string;
  authKey: string;
  requestHeaders: { key: string; value: string; required: boolean }[];
  requestBody?: string;
  responseBody?: string;
  notesKeys?: string[];
  curlExample?: string;
}

@Component({
  selector: 'app-documentation-view',
  templateUrl: './documentation-view.component.html',
  styleUrls: ['./documentation-view.component.css']
})
export class DocumentationViewComponent {
  readonly baseUrl = 'http://178.251.42.243';

  readonly navItems: DocNavItem[] = [
    { id: 'overview', labelKey: 'API_DOC.NAV.OVERVIEW' },
    { id: 'authentication', labelKey: 'API_DOC.NAV.AUTHENTICATION' },
    { id: 'response-format', labelKey: 'API_DOC.NAV.RESPONSE_FORMAT' },
    { id: 'endpoint-1', labelKey: 'API_DOC.NAV.SATELLITE_DATA' },
    { id: 'endpoint-2', labelKey: 'API_DOC.NAV.START_PROCESSING' },
    { id: 'endpoint-3', labelKey: 'API_DOC.NAV.PROCESS_STATUS' },
    { id: 'endpoint-4', labelKey: 'API_DOC.NAV.PROCESSED_RESULT' },
    { id: 'product-model', labelKey: 'API_DOC.NAV.PRODUCT_MODEL' },
    { id: 'error-codes', labelKey: 'API_DOC.NAV.ERROR_CODES' }
  ];

  readonly endpoints: DocEndpoint[] = [
    {
      id: 'endpoint-1',
      titleKey: 'API_DOC.ENDPOINTS.SATELLITE_DATA.TITLE',
      method: 'POST',
      path: '/geoportalApi/map/getSatelliteDatas',
      descriptionKey: 'API_DOC.ENDPOINTS.SATELLITE_DATA.DESCRIPTION',
      authKey: 'API_DOC.COMMON.APIKEY_REQUIRED',
      requestHeaders: [
        { key: 'Content-Type', value: 'application/json', required: true },
        { key: 'x-api-key', value: 'YOUR_API_KEY', required: true }
      ],
      requestBody: `{
  "polygon": [
    [29.0123, 41.0456],
    [29.0523, 41.0456],
    [29.0523, 41.0156],
    [29.0123, 41.0156],
    [29.0123, 41.0456]
  ]
}`,
      responseBody: `{
  "isSuccess": true,
  "message": "Satellite data listed successfully.",
  "data": [
    {
      "id": 101,
      "name": "Istanbul Satellite Image - 2026-03-20",
      "isDeleted": false,
      "city": "Istanbul",
      "district": "Besiktas",
      "acquisitionDate": "2026-03-20T00:00:00",
      "provider": "GeoPortal",
      "resolution": 0.5,
      "cloudRate": 12,
      "areaKm2": 18.7,
      "thumbnailUrl": "https://example.com/thumb.jpg",
      "previewUrl": "https://example.com/preview.jpg",
      "description": "Satellite image matched with requested polygon.",
      "isOrthorectified": true,
      "isPansharpened": true,
      "isClassified": false,
      "classes": []
    }
  ]
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.SATELLITE_DATA.NOTES.0',
        'API_DOC.ENDPOINTS.SATELLITE_DATA.NOTES.1',
        'API_DOC.ENDPOINTS.SATELLITE_DATA.NOTES.2'
      ],
      curlExample: `curl -X POST "http://178.251.42.243/geoportalApi/map/getSatelliteDatas" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "polygon": [
      [29.0123, 41.0456],
      [29.0523, 41.0456],
      [29.0523, 41.0156],
      [29.0123, 41.0156],
      [29.0123, 41.0456]
    ]
  }'`
    },
    {
      id: 'endpoint-2',
      titleKey: 'API_DOC.ENDPOINTS.START_PROCESSING.TITLE',
      method: 'POST',
      path: '/geoportalApi/map/startImageProcessing',
      descriptionKey: 'API_DOC.ENDPOINTS.START_PROCESSING.DESCRIPTION',
      authKey: 'API_DOC.COMMON.APIKEY_REQUIRED',
      requestHeaders: [
        { key: 'Content-Type', value: 'application/json', required: true },
        { key: 'x-api-key', value: 'YOUR_API_KEY', required: true }
      ],
      requestBody: `{
  "productId": 101,
  "operations": {
    "orthorectification": true,
    "pansharpen": true,
    "classification": true
  }
}`,
      responseBody: `{
  "isSuccess": true,
  "message": "Image processing started successfully.",
  "data": {
    "processId": "PROC-20260401-0001",
    "productId": 101,
    "status": "Queued",
    "createdAt": "2026-04-01T11:25:00"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.START_PROCESSING.NOTES.0',
        'API_DOC.ENDPOINTS.START_PROCESSING.NOTES.1',
        'API_DOC.ENDPOINTS.START_PROCESSING.NOTES.2'
      ],
      curlExample: `curl -X POST "http://178.251.42.243/geoportalApi/map/startImageProcessing" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "productId": 101,
    "operations": {
      "orthorectification": true,
      "pansharpen": true,
      "classification": true
    }
  }'`
    },
    {
      id: 'endpoint-3',
      titleKey: 'API_DOC.ENDPOINTS.PROCESS_STATUS.TITLE',
      method: 'GET',
      path: '/geoportalApi/map/getImageProcessingStatus/{processId}',
      descriptionKey: 'API_DOC.ENDPOINTS.PROCESS_STATUS.DESCRIPTION',
      authKey: 'API_DOC.COMMON.APIKEY_REQUIRED',
      requestHeaders: [
        { key: 'x-api-key', value: 'YOUR_API_KEY', required: true }
      ],
      responseBody: `{
  "isSuccess": true,
  "message": "Processing status retrieved successfully.",
  "data": {
    "processId": "PROC-20260401-0001",
    "productId": 101,
    "status": "Processing",
    "progress": 65,
    "startedAt": "2026-04-01T11:25:00",
    "completedAt": null
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.PROCESS_STATUS.NOTES.0',
        'API_DOC.ENDPOINTS.PROCESS_STATUS.NOTES.1',
        'API_DOC.ENDPOINTS.PROCESS_STATUS.NOTES.2'
      ],
      curlExample: `curl -X GET "http://178.251.42.243/geoportalApi/map/getImageProcessingStatus/PROC-20260401-0001" \\
  -H "x-api-key: YOUR_API_KEY"`
    },
    {
      id: 'endpoint-4',
      titleKey: 'API_DOC.ENDPOINTS.PROCESSED_RESULT.TITLE',
      method: 'GET',
      path: '/geoportalApi/map/getProcessedSatelliteImage/{processId}',
      descriptionKey: 'API_DOC.ENDPOINTS.PROCESSED_RESULT.DESCRIPTION',
      authKey: 'API_DOC.COMMON.APIKEY_REQUIRED',
      requestHeaders: [
        { key: 'x-api-key', value: 'YOUR_API_KEY', required: true }
      ],
      responseBody: `{
  "isSuccess": true,
  "message": "Processed satellite image retrieved successfully.",
  "data": {
    "processId": "PROC-20260401-0001",
    "productId": 101,
    "status": "Completed",
    "processedImageUrl": "https://example.com/results/processed-image.tif",
    "previewUrl": "https://example.com/results/processed-preview.jpg",
    "classificationGeoJsonUrl": "https://example.com/results/classification.geojson",
    "downloadUrl": "https://example.com/results/package.zip"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.PROCESSED_RESULT.NOTES.0',
        'API_DOC.ENDPOINTS.PROCESSED_RESULT.NOTES.1',
        'API_DOC.ENDPOINTS.PROCESSED_RESULT.NOTES.2'
      ],
      curlExample: `curl -X GET "http://178.251.42.243/geoportalApi/map/getProcessedSatelliteImage/PROC-20260401-0001" \\
  -H "x-api-key: YOUR_API_KEY"`
    }
  ];

  readonly productModelExample = `{
  "id": 101,
  "name": "Istanbul Satellite Image - 2026-03-20",
  "downloadLink": null,
  "city": "Istanbul",
  "district": "Besiktas",
  "acquisitionDate": "2026-03-20T00:00:00",
  "provider": "GeoPortal",
  "resolution": 0.5,
  "cloudRate": 12,
  "areaKm2": 18.7,
  "currency": "TRY",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "previewUrl": "https://example.com/preview.jpg",
  "description": "Satellite image matched with requested polygon.",
  "isOrthorectified": true,
  "isPansharpened": true,
  "isClassified": false,
  "classes": [
    {
      "className": "Forest",
      "pixelCount": 154230,
      "colorHex": "#2E8B57"
    }
  ]
}`;

  scrollTo(id: string): void {
    const element = document.getElementById(id);
    if (!element) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  getMethodClass(method: 'GET' | 'POST'): string {
    return method === 'GET'
      ? 'method-badge method-badge--get'
      : 'method-badge method-badge--post';
  }
}
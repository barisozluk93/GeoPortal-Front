import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';

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
  selector: 'app-documentation',
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss']
})
export class DocumentationComponent {
  readonly baseUrl = environment.appUrl;

  readonly navItems: DocNavItem[] = [
    { id: 'overview', labelKey: 'API_DOC.NAV.OVERVIEW' },
    { id: 'authentication', labelKey: 'API_DOC.NAV.AUTHENTICATION' },
    { id: 'response-format', labelKey: 'API_DOC.NAV.RESPONSE_FORMAT' },
    { id: 'endpoint-1', labelKey: 'API_DOC.NAV.SATELLITE_DATA' },
    { id: 'endpoint-2', labelKey: 'API_DOC.NAV.PROCESS_STATUS' },
    { id: 'endpoint-3', labelKey: 'API_DOC.NAV.PROCESSED_RESULT' },
    { id: 'product-model', labelKey: 'API_DOC.NAV.PRODUCT_MODEL' },
    { id: 'error-codes', labelKey: 'API_DOC.NAV.ERROR_CODES' }
  ];

  readonly endpoints: DocEndpoint[] = [
    {
      id: 'endpoint-1',
      titleKey: 'API_DOC.ENDPOINTS.SATELLITE_DATA.TITLE',
      method: 'POST',
      path: '/taiearthApi/map/getSatelliteDatas',
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
  "message": "Satellite data retrieved and processing started successfully.",
  "data": {
    "processId": "PROC-20260401-0001",
    "status": "Queued"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.SATELLITE_DATA.NOTES.0',
        'API_DOC.ENDPOINTS.SATELLITE_DATA.NOTES.1',
        'API_DOC.ENDPOINTS.SATELLITE_DATA.NOTES.2'
      ],
      curlExample: `curl -X POST "${this.baseUrl}/taiearthApi/map/getSatelliteDatas" \\
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
      titleKey: 'API_DOC.ENDPOINTS.PROCESS_STATUS.TITLE',
      method: 'GET',
      path: '/taiearthApi/map/getStatus/{processId}',
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
    "status": "Processing"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.PROCESS_STATUS.NOTES.0',
        'API_DOC.ENDPOINTS.PROCESS_STATUS.NOTES.1',
        'API_DOC.ENDPOINTS.PROCESS_STATUS.NOTES.2'
      ],
      curlExample: `curl -X GET "${this.baseUrl}/taiearthApi/map/getStatus/PROC-20260401-0001" \\
  -H "x-api-key: YOUR_API_KEY"`
    },
    {
      id: 'endpoint-3',
      titleKey: 'API_DOC.ENDPOINTS.PROCESSED_RESULT.TITLE',
      method: 'GET',
      path: '/taiearthApi/map/getProcessedSatelliteImage/{processId}',
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
    "status": "Completed",
    "processedImageUrl": "https://example.com/results/processed-image.tif",
    "previewUrl": "https://example.com/results/processed-preview.jpg",
    "downloadUrl": "https://example.com/results/package.zip"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.PROCESSED_RESULT.NOTES.0',
        'API_DOC.ENDPOINTS.PROCESSED_RESULT.NOTES.1',
        'API_DOC.ENDPOINTS.PROCESSED_RESULT.NOTES.2'
      ],
      curlExample: `curl -X GET "${this.baseUrl}/taiearthApi/map/getProcessedSatelliteImage/PROC-20260401-0001" \\
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
  "currency": "₺",
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

  if (!element) {
    return;
  }

  const headerOffset = 110;
  const scrollParent = this.getScrollParent(element);

  if (scrollParent === window) {
    const top = element.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top,
      behavior: 'smooth'
    });

    return;
  }

  const container = scrollParent as HTMLElement;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  container.scrollTo({
    top: container.scrollTop + elementRect.top - containerRect.top - headerOffset,
    behavior: 'smooth'
  });
}

private getScrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;

    const isScrollable =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight;

    if (isScrollable) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
}

  getMethodClass(method: 'GET' | 'POST'): string {
    return method === 'GET'
      ? 'badge badge-light-success fw-bold px-4 py-3'
      : 'badge badge-light-danger fw-bold px-4 py-3';
  }
}
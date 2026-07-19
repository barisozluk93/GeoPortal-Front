import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { environment } from 'src/environments/environment';

interface DocNavItem {
  id: string;
  labelKey: string;
}

interface DocEndpoint {
  id: string;
  groupKey: string;
  titleKey: string;
  method: 'GET' | 'POST';
  path: string;
  descriptionKey: string;
  requestBody?: string;
  responseBody: string;
  notesKeys: string[];
  curlExample: string;
}

@Component({
  selector: 'app-documentation',
  templateUrl: './documentation.component.html',
  styleUrls: ['./documentation.component.scss']
})
export class DocumentationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroSection')
  heroSection!: ElementRef<HTMLElement>;

  hideScrollCue = false;
  private observer?: IntersectionObserver;

  readonly baseUrl = `${environment.appUrl}/geoportal-public-api/v1`;

  readonly navItems: DocNavItem[] = [
    { id: 'overview', labelKey: 'API_DOC.NAV.OVERVIEW' },
    { id: 'business-model', labelKey: 'API_DOC.NAV.BUSINESS_MODEL' },
    { id: 'authentication', labelKey: 'API_DOC.NAV.AUTHENTICATION' },
    { id: 'response-format', labelKey: 'API_DOC.NAV.RESPONSE_FORMAT' },
    { id: 'catalog-options', labelKey: 'API_DOC.NAV.CATALOG_OPTIONS' },
    { id: 'imagery-search', labelKey: 'API_DOC.NAV.IMAGERY_SEARCH' },
    { id: 'imagery-detail', labelKey: 'API_DOC.NAV.IMAGERY_DETAIL' },
    { id: 'pricing-quote', labelKey: 'API_DOC.NAV.PRICING_QUOTE' },
    { id: 'archive-order', labelKey: 'API_DOC.NAV.ARCHIVE_ORDER' },
    { id: 'acquisition-order', labelKey: 'API_DOC.NAV.ACQUISITION_ORDER' },
    { id: 'order-status', labelKey: 'API_DOC.NAV.ORDER_STATUS' },
    { id: 'order-delivery', labelKey: 'API_DOC.NAV.ORDER_DELIVERY' },
    { id: 'errors', labelKey: 'API_DOC.NAV.ERRORS' }
  ];

  readonly endpoints: DocEndpoint[] = [
    {
      id: 'catalog-options',
      groupKey: 'API_DOC.GROUPS.CATALOG',
      titleKey: 'API_DOC.ENDPOINTS.CATALOG_OPTIONS.TITLE',
      method: 'GET',
      path: '/catalog/options',
      descriptionKey: 'API_DOC.ENDPOINTS.CATALOG_OPTIONS.DESCRIPTION',
      responseBody: `{
  "isSuccess": true,
  "data": {
    "providers": ["GeoPortal"],
    "satellites": ["MSP1", "MSP2", "MSP3", "MSP4"],
    "imageTypes": ["Mono", "Stereo"],
    "processingOptions": [
      { "code": "ORTHO", "name": "Orthorectification", "unitPrice": 35.00 },
      { "code": "PAN", "name": "PanSharpening", "unitPrice": 20.00 },
      { "code": "CLASS", "name": "Classification", "unitPrice": 45.00 },
      { "code": "NDVI", "name": "NDVI Analysis", "unitPrice": 18.00 }
    ]
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.CATALOG_OPTIONS.NOTES.0',
        'API_DOC.ENDPOINTS.CATALOG_OPTIONS.NOTES.1'
      ],
      curlExample: `curl -X GET "${this.baseUrl}/catalog/options" \\
  -H "x-api-key: YOUR_API_KEY"`
    },
    {
      id: 'imagery-search',
      groupKey: 'API_DOC.GROUPS.IMAGERY',
      titleKey: 'API_DOC.ENDPOINTS.IMAGERY_SEARCH.TITLE',
      method: 'POST',
      path: '/imagery/search',
      descriptionKey: 'API_DOC.ENDPOINTS.IMAGERY_SEARCH.DESCRIPTION',
      requestBody: `{
  "wkt": "POLYGON((29.01 41.04,29.05 41.04,29.05 41.01,29.01 41.01,29.01 41.04))",
  "imageType": "Mono",
  "satellite": "MSP2",
  "acquisitionStartDate": "2026-01-01",
  "acquisitionEndDate": "2026-12-31",
  "maxCloudRate": 15,
  "maxOffNadir": 25,
  "minResolution": 0.3,
  "maxResolution": 1.0,
  "pageNumber": 1,
  "pageSize": 20
}`,
      responseBody: `{
  "isSuccess": true,
  "data": {
    "totalCount": 2,
    "items": [
      {
        "id": 101,
        "imageId": "IMG-2026-000101",
        "name": "Istanbul Archive Image",
        "satellite": "MSP2",
        "acquisitionDate": "2026-03-20T00:00:00Z",
        "resolution": 0.5,
        "cloudRate": 8.2,
        "offNadirAngle": 12.4,
        "areaKm2": 18.7,
        "thumbnailUrl": "https://.../thumbnail.jpg",
        "previewUrl": "https://.../preview.jpg",
        "wkt": "POLYGON((...))"
      }
    ]
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.IMAGERY_SEARCH.NOTES.0',
        'API_DOC.ENDPOINTS.IMAGERY_SEARCH.NOTES.1',
        'API_DOC.ENDPOINTS.IMAGERY_SEARCH.NOTES.2'
      ],
      curlExample: `curl -X POST "${this.baseUrl}/imagery/search" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"wkt":"POLYGON((...))","maxCloudRate":15,"pageNumber":1,"pageSize":20}'`
    },
    {
      id: 'imagery-detail',
      groupKey: 'API_DOC.GROUPS.IMAGERY',
      titleKey: 'API_DOC.ENDPOINTS.IMAGERY_DETAIL.TITLE',
      method: 'GET',
      path: '/imagery/{imageId}',
      descriptionKey: 'API_DOC.ENDPOINTS.IMAGERY_DETAIL.DESCRIPTION',
      responseBody: `{
  "isSuccess": true,
  "data": {
    "id": 101,
    "imageId": "IMG-2026-000101",
    "satellite": "MSP2",
    "sensor": "MSI",
    "acquisitionDate": "2026-03-20T00:00:00Z",
    "resolution": 0.5,
    "cloudRate": 8.2,
    "offNadirAngle": 12.4,
    "sunElevation": 54.1,
    "sunAzimuth": 163.4,
    "processingLevel": "L2A",
    "outputFormat": "GeoTIFF",
    "spatialReference": "EPSG:4326",
    "areaKm2": 18.7,
    "unitPrice": 100.00,
    "thumbnailUrl": "https://.../thumbnail.jpg",
    "previewUrl": "https://.../preview.jpg",
    "metadataUrl": "https://.../metadata.json",
    "wkt": "POLYGON((...))"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.IMAGERY_DETAIL.NOTES.0',
        'API_DOC.ENDPOINTS.IMAGERY_DETAIL.NOTES.1'
      ],
      curlExample: `curl -X GET "${this.baseUrl}/imagery/IMG-2026-000101" \\
  -H "x-api-key: YOUR_API_KEY"`
    },
    {
      id: 'pricing-quote',
      groupKey: 'API_DOC.GROUPS.COMMERCE',
      titleKey: 'API_DOC.ENDPOINTS.PRICING_QUOTE.TITLE',
      method: 'POST',
      path: '/pricing/quote',
      descriptionKey: 'API_DOC.ENDPOINTS.PRICING_QUOTE.DESCRIPTION',
      requestBody: `{
  "orderType": "Archive",
  "imageId": "IMG-2026-000101",
  "requestWkt": "POLYGON((...))",
  "processingOptionCodes": ["ORTHO", "CLASS"]
}`,
      responseBody: `{
  "isSuccess": true,
  "data": {
    "quoteId": "Q-20260719-00001",
    "currency": "TRY",
    "totalImageAreaKm2": 18.7,
    "imageUnitPrice": 100.00,
    "imageTotalPrice": 1870.00,
    "processingItems": [
      {
        "code": "ORTHO",
        "unitPrice": 35.00,
        "totalPrice": 654.50
      },
      {
        "code": "CLASS",
        "unitPrice": 45.00,
        "totalPrice": 841.50
      }
    ],
    "processingTotalPrice": 1496.00,
    "grandTotal": 3366.00,
    "expiresAt": "2026-07-19T20:00:00Z"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.PRICING_QUOTE.NOTES.0',
        'API_DOC.ENDPOINTS.PRICING_QUOTE.NOTES.1',
        'API_DOC.ENDPOINTS.PRICING_QUOTE.NOTES.2'
      ],
      curlExample: `curl -X POST "${this.baseUrl}/pricing/quote" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"orderType":"Archive","imageId":"IMG-2026-000101","processingOptionCodes":["ORTHO","CLASS"]}'`
    },
    {
      id: 'archive-order',
      groupKey: 'API_DOC.GROUPS.ORDERS',
      titleKey: 'API_DOC.ENDPOINTS.ARCHIVE_ORDER.TITLE',
      method: 'POST',
      path: '/orders/archive',
      descriptionKey: 'API_DOC.ENDPOINTS.ARCHIVE_ORDER.DESCRIPTION',
      requestBody: `{
  "quoteId": "Q-20260719-00001",
  "customerReference": "PROJECT-ALPHA-42"
}`,
      responseBody: `{
  "isSuccess": true,
  "data": {
    "orderId": "ORD-20260719-00042",
    "orderType": "Archive",
    "status": "WaitingPayment",
    "paymentStatus": "Pending",
    "grandTotal": 3366.00,
    "currency": "TRY",
    "paymentUrl": "https://geoportal.example.com/payment/ORD-20260719-00042"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.ARCHIVE_ORDER.NOTES.0',
        'API_DOC.ENDPOINTS.ARCHIVE_ORDER.NOTES.1',
        'API_DOC.ENDPOINTS.ARCHIVE_ORDER.NOTES.2'
      ],
      curlExample: `curl -X POST "${this.baseUrl}/orders/archive" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"quoteId":"Q-20260719-00001","customerReference":"PROJECT-ALPHA-42"}'`
    },
    {
      id: 'acquisition-order',
      groupKey: 'API_DOC.GROUPS.ORDERS',
      titleKey: 'API_DOC.ENDPOINTS.ACQUISITION_ORDER.TITLE',
      method: 'POST',
      path: '/orders/acquisition',
      descriptionKey: 'API_DOC.ENDPOINTS.ACQUISITION_ORDER.DESCRIPTION',
      requestBody: `{
  "requestWkt": "POLYGON((...))",
  "imageType": "Mono",
  "priority": "High",
  "gsd": 0.5,
  "acquisitionStartDate": "2026-08-01",
  "acquisitionEndDate": "2026-08-31",
  "maxCloudRate": 10,
  "maxOffNadir": 20,
  "satellite": "MSP3",
  "processingOptionCodes": ["ORTHO", "PAN"],
  "customerReference": "TASKING-2026-18"
}`,
      responseBody: `{
  "isSuccess": true,
  "data": {
    "orderId": "ORD-20260719-00043",
    "orderType": "Acquisition",
    "status": "WaitingPayment",
    "paymentStatus": "Pending",
    "grandTotal": 12500.00,
    "currency": "TRY",
    "paymentUrl": "https://geoportal.example.com/payment/ORD-20260719-00043"
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.ACQUISITION_ORDER.NOTES.0',
        'API_DOC.ENDPOINTS.ACQUISITION_ORDER.NOTES.1',
        'API_DOC.ENDPOINTS.ACQUISITION_ORDER.NOTES.2'
      ],
      curlExample: `curl -X POST "${this.baseUrl}/orders/acquisition" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"requestWkt":"POLYGON((...))","imageType":"Mono","priority":"High","gsd":0.5,"maxCloudRate":10}'`
    },
    {
      id: 'order-status',
      groupKey: 'API_DOC.GROUPS.ORDERS',
      titleKey: 'API_DOC.ENDPOINTS.ORDER_STATUS.TITLE',
      method: 'GET',
      path: '/orders/{orderId}',
      descriptionKey: 'API_DOC.ENDPOINTS.ORDER_STATUS.DESCRIPTION',
      responseBody: `{
  "isSuccess": true,
  "data": {
    "orderId": "ORD-20260719-00042",
    "orderType": "Archive",
    "status": "Preparing",
    "paymentStatus": "Paid",
    "createdAt": "2026-07-19T17:30:00Z",
    "updatedAt": "2026-07-19T17:42:00Z",
    "deliveryReady": false
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.ORDER_STATUS.NOTES.0',
        'API_DOC.ENDPOINTS.ORDER_STATUS.NOTES.1'
      ],
      curlExample: `curl -X GET "${this.baseUrl}/orders/ORD-20260719-00042" \\
  -H "x-api-key: YOUR_API_KEY"`
    },
    {
      id: 'order-delivery',
      groupKey: 'API_DOC.GROUPS.ORDERS',
      titleKey: 'API_DOC.ENDPOINTS.ORDER_DELIVERY.TITLE',
      method: 'GET',
      path: '/orders/{orderId}/delivery',
      descriptionKey: 'API_DOC.ENDPOINTS.ORDER_DELIVERY.DESCRIPTION',
      responseBody: `{
  "isSuccess": true,
  "data": {
    "orderId": "ORD-20260719-00042",
    "status": "Completed",
    "expiresAt": "2026-07-22T17:30:00Z",
    "files": [
      {
        "name": "imagery-package.zip",
        "contentType": "application/zip",
        "sizeBytes": 1845493760,
        "downloadUrl": "https://downloads.example.com/signed/..."
      }
    ]
  }
}`,
      notesKeys: [
        'API_DOC.ENDPOINTS.ORDER_DELIVERY.NOTES.0',
        'API_DOC.ENDPOINTS.ORDER_DELIVERY.NOTES.1',
        'API_DOC.ENDPOINTS.ORDER_DELIVERY.NOTES.2'
      ],
      curlExample: `curl -X GET "${this.baseUrl}/orders/ORD-20260719-00042/delivery" \\
  -H "x-api-key: YOUR_API_KEY"`
    }
  ];

  getMethodClass(method: 'GET' | 'POST'): string {
    return method === 'GET'
      ? 'badge badge-light-success fw-bold px-4 py-3'
      : 'badge badge-light-danger fw-bold px-4 py-3';
  }

  scrollTo(id: string): void {
    this.scrollToTarget(id);
  }

  ngAfterViewInit(): void {
    if (!this.heroSection?.nativeElement) {
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.hideScrollCue = entry.intersectionRatio < 0.8;
      },
      { threshold: [0, 0.8, 1] }
    );

    this.observer.observe(this.heroSection.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  scrollToSection(id: string): void {
    this.scrollToTarget(id);
  }

  private scrollToTarget(id: string): void {
    if (!id) {
      return;
    }

    requestAnimationFrame(() => {
      const element = document.getElementById(id);

      if (!element) {
        console.warn(`[Documentation] Scroll target not found: ${id}`);
        return;
      }

      // scrollIntoView, window dışında scroll edilen layout container'larında da çalışır.
      // Header boşluğu SCSS'teki scroll-margin-top ile uygulanır.
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    });
  }
}

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DashboardFilters, DashboardOverview } from './dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  getOverview(filters?: DashboardFilters): Observable<DashboardOverview> {
    console.log('Dashboard filters => ', filters);

    return of({
      kpis: {
        totalRevenue: 2854300,
        marketplaceRevenue: 1240000,
        apiRevenue: 980000,
        activeApiSubscriptions: 84,
        pendingOrders: 37,
        readyOrders: 19,
        individualMembers: 1482,
        corporateMembers: 126,
        regionalDemandCount: 63,
        totalApiCallsToday: 84231,
      },
      revenueTrend: [
        { date: '01 Apr', totalRevenue: 84000, marketplaceRevenue: 42000, apiRevenue: 26000 },
        { date: '02 Apr', totalRevenue: 92000, marketplaceRevenue: 45000, apiRevenue: 30000 },
        { date: '03 Apr', totalRevenue: 78000, marketplaceRevenue: 36000, apiRevenue: 25000 },
        { date: '04 Apr', totalRevenue: 98000, marketplaceRevenue: 50000, apiRevenue: 32000 },
        { date: '05 Apr', totalRevenue: 110000, marketplaceRevenue: 58000, apiRevenue: 34000 },
        { date: '06 Apr', totalRevenue: 103000, marketplaceRevenue: 54000, apiRevenue: 31000 },
        { date: '07 Apr', totalRevenue: 117000, marketplaceRevenue: 61000, apiRevenue: 36000 },
      ],
      revenueBreakdown: [
        { label: 'Marketplace', value: 1240000 },
        { label: 'API', value: 980000 },
        { label: 'Kurumsal Özel Talep', value: 634300 },
      ],
      apiUsageTrend: [
        { date: '01 Apr', calls: 64000 },
        { date: '02 Apr', calls: 71000 },
        { date: '03 Apr', calls: 68500 },
        { date: '04 Apr', calls: 74400 },
        { date: '05 Apr', calls: 80100 },
        { date: '06 Apr', calls: 79500 },
        { date: '07 Apr', calls: 84231 },
      ],
      orderPipeline: [
        { status: 'Talep Oluşturuldu', count: 14 },
        { status: 'Dış Sisteme İletildi', count: 11 },
        { status: 'Uydu Planlamasında', count: 8 },
        { status: 'Görüntü Alındı', count: 6 },
        { status: 'İşleniyor', count: 12 },
        { status: 'Hazır', count: 19 },
        { status: 'Teslim Edildi', count: 54 },
        { status: 'Başarısız', count: 3 },
      ],
      membershipDistribution: [
        { type: 'Bireysel', value: 1482 },
        { type: 'Kurumsal', value: 126 },
      ],
      recentOrders: [
        {
          id: 'ORD-1001',
          customerName: 'GeoMap Teknoloji',
          customerType: 'Kurumsal',
          sourceType: 'API',
          region: 'Ankara / Polatlı',
          createdAt: '2026-04-07 10:12',
          amount: 42500,
          status: 'İşleniyor',
        },
        {
          id: 'ORD-1002',
          customerName: 'Ahmet Yılmaz',
          customerType: 'Bireysel',
          sourceType: 'Marketplace',
          region: 'İzmir / Menemen',
          createdAt: '2026-04-07 09:45',
          amount: 1850,
          status: 'Hazır',
        },
        {
          id: 'ORD-1003',
          customerName: 'Atlas Savunma',
          customerType: 'Kurumsal',
          sourceType: 'Özel Talep',
          region: 'Konya / Karapınar',
          createdAt: '2026-04-07 09:20',
          amount: 78000,
          status: 'Uydu Planlamasında',
        },
        {
          id: 'ORD-1004',
          customerName: 'Elif Kaya',
          customerType: 'Bireysel',
          sourceType: 'Marketplace',
          region: 'Muğla / Bodrum',
          createdAt: '2026-04-07 08:55',
          amount: 2400,
          status: 'Teslim Edildi',
        },
      ],
      regionalDemands: [
        {
          id: 'DEM-201',
          customerName: 'GeoMap Teknoloji',
          regionName: 'Ankara / Gölbaşı',
          requestedAt: '2026-04-07 10:10',
          areaKm2: 148,
          status: 'Dış Sisteme İletildi',
        },
        {
          id: 'DEM-202',
          customerName: 'Atlas Savunma',
          regionName: 'Şanlıurfa / Siverek',
          requestedAt: '2026-04-07 09:40',
          areaKm2: 320,
          status: 'Uydu Bekleniyor',
        },
        {
          id: 'DEM-203',
          customerName: 'Mehmet Arslan',
          regionName: 'Antalya / Aksu',
          requestedAt: '2026-04-07 08:30',
          areaKm2: 42,
          status: 'İşleniyor',
        },
      ],
      systemHealth: [
        {
          name: 'Marketplace',
          status: 'Healthy',
          description: 'Sipariş akışı normal çalışıyor',
        },
        {
          name: 'API Gateway',
          status: 'Healthy',
          description: 'Ortalama yanıt süresi 182 ms',
        },
        {
          name: 'Dış Entegrasyon',
          status: 'Warning',
          description: 'Talep iletiminde gecikme artışı var',
        },
        {
          name: 'Görüntü İşleme',
          status: 'Healthy',
          description: 'İşlem kuyruğu stabil',
        },
      ],
    });
  }
}
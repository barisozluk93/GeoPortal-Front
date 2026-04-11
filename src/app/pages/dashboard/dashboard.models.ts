import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

export type CustomerType = 'Bireysel' | 'Kurumsal';
export type SourceType = 'Marketplace' | 'API' | 'Özel Talep';

export type OrderStatus =
  | 'Talep Oluşturuldu'
  | 'Dış Sisteme İletildi'
  | 'Uydu Planlamasında'
  | 'Görüntü Alındı'
  | 'İşleniyor'
  | 'Hazır'
  | 'Teslim Edildi'
  | 'Başarısız';

export type DemandStatus =
  | 'Bekliyor'
  | 'Dış Sisteme İletildi'
  | 'Uydu Bekleniyor'
  | 'Görüntü Geldi'
  | 'İşleniyor'
  | 'Hazır'
  | 'Başarısız';

export type HealthStatus = 'Healthy' | 'Warning' | 'Critical';
export type QuickRangeType = '7d' | '30d' | '3m' | '6m';

export interface DashboardFilters {
  startDate: string | null;
  endDate: string | null;
  customerType: CustomerType | 'Tümü';
  channel: SourceType | 'Tümü';
}

export interface DashboardKpis {
  totalRevenue: number;
  marketplaceRevenue: number;
  apiRevenue: number;
  activeApiSubscriptions: number;
  pendingOrders: number;
  readyOrders: number;
  individualMembers: number;
  corporateMembers: number;
  regionalDemandCount: number;
  totalApiCallsToday: number;
}

export interface RevenueTrendItem {
  date: string;
  totalRevenue: number;
  marketplaceRevenue: number;
  apiRevenue: number;
}

export interface RevenueBreakdownItem {
  label: string;
  value: number;
}

export interface ApiUsageTrendItem {
  date: string;
  calls: number;
}

export interface OrderPipelineItem {
  status: string;
  count: number;
}

export interface MembershipDistributionItem {
  type: string;
  value: number;
}

export interface RecentOrder {
  id: string;
  customerName: string;
  customerType: CustomerType;
  sourceType: SourceType;
  region: string;
  createdAt: string;
  amount: number;
  status: OrderStatus;
}

export interface RegionalDemand {
  id: string;
  customerName: string;
  regionName: string;
  requestedAt: string;
  areaKm2: number;
  status: DemandStatus;
}

export interface SystemHealthItem {
  name: string;
  status: HealthStatus;
  description: string;
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  revenueTrend: RevenueTrendItem[];
  revenueBreakdown: RevenueBreakdownItem[];
  apiUsageTrend: ApiUsageTrendItem[];
  orderPipeline: OrderPipelineItem[];
  membershipDistribution: MembershipDistributionItem[];
  recentOrders: RecentOrder[];
  regionalDemands: RegionalDemand[];
  systemHealth: SystemHealthItem[];
}

export type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  fill: ApexFill;
  grid: ApexGrid;
  markers: ApexMarkers;
  colors?: string[];
};

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  colors?: string[];
};

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  responsive: ApexResponsive[];
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  colors?: string[];
};
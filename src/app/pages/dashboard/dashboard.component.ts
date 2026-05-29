import { Component, HostListener, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import {
  BarChartOptions,
  DashboardFilters,
  DashboardOverview,
  DonutChartOptions,
  LineChartOptions,
  QuickRangeType,
} from './dashboard.models';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  loading = true;

  filters: DashboardFilters = {
    startDate: null,
    endDate: null,
    customerType: 'Tümü',
    channel: 'Tümü',
  };

  overview!: DashboardOverview;

  revenueChart!: Partial<LineChartOptions>;
  apiUsageChart!: Partial<LineChartOptions>;
  revenueBreakdownChart!: Partial<DonutChartOptions>;
  orderPipelineChart!: Partial<BarChartOptions>;
  membershipChart!: Partial<DonutChartOptions>;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  @HostListener('window:resize')
  handleResize(): void {
    if (!this.loading && this.overview) {
      this.buildCharts();
    }
  }

  loadDashboard(): void {
    this.loading = true;

    this.dashboardService
      .getOverview(this.filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: DashboardOverview) => {
          this.overview = response;
          this.buildCharts();
        },
        error: (error) => {
          console.error('Dashboard verisi alınamadı:', error);
        },
      });
  }

  resetFilters(): void {
    this.filters = {
      startDate: null,
      endDate: null,
      customerType: 'Tümü',
      channel: 'Tümü',
    };

    this.loadDashboard();
  }

  applyQuickRange(type: QuickRangeType): void {
    const today = new Date();

    switch (type) {
      case '7d': {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        this.filters.startDate = this.formatDateInput(start);
        this.filters.endDate = this.formatDateInput(today);
        break;
      }

      case '30d': {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        this.filters.startDate = this.formatDateInput(start);
        this.filters.endDate = this.formatDateInput(today);
        break;
      }

      case '3m': {
        const start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        start.setDate(start.getDate() + 1);
        this.filters.startDate = this.formatDateInput(start);
        this.filters.endDate = this.formatDateInput(today);
        break;
      }

      case '6m': {
        const start = new Date(today);
        start.setMonth(today.getMonth() - 6);
        start.setDate(start.getDate() + 1);
        this.filters.startDate = this.formatDateInput(start);
        this.filters.endDate = this.formatDateInput(today);
        break;
      }
    }

    this.loadDashboard();
  }

  formatNumber(value: number): string {
    return value.toLocaleString('tr-TR');
  }

  private buildCharts(): void {
    const mobile = this.isMobile();

    const primary = this.getCssVar('--bs-primary') || '#009ef7';
    const success = this.getCssVar('--bs-success') || '#50cd89';
    const warning = this.getCssVar('--bs-warning') || '#ffc700';
    const info = this.getCssVar('--bs-info') || '#7239ea';
    const textMuted = this.getCssVar('--bs-gray-600') || '#7e8299';
    const borderColor = this.getCssVar('--bs-border-color') || '#eff2f5';
    const cardBg = this.getCssVar('--bs-card-bg') || '#ffffff';
    const tooltipTheme = this.isDarkTheme() ? 'dark' : 'light';

    const revenueDates = this.overview.revenueTrend.map((x) => x.date);
    const apiUsageDates = this.overview.apiUsageTrend.map((x) => x.date);
    const pipelineStatuses = this.overview.orderPipeline.map((x) => x.status);

    this.revenueChart = {
      series: [
        {
          name: 'Toplam Gelir',
          data: this.overview.revenueTrend.map((x) => x.totalRevenue),
        },
        {
          name: 'API',
          data: this.overview.revenueTrend.map((x) => x.apiRevenue),
        },
      ],
      colors: [primary, success],
      chart: {
        type: 'area',
        height: mobile ? 280 : 340,
        toolbar: { show: false },
        zoom: { enabled: false },
        foreColor: textMuted,
      },
      xaxis: {
        categories: revenueDates,
        labels: {
          style: {
            colors: Array(revenueDates.length).fill(textMuted),
          },
        },
        axisBorder: { color: borderColor },
        axisTicks: { color: borderColor },
      },
      yaxis: {
        labels: {
          style: {
            colors: [textMuted],
          },
          formatter: (value: number) =>
            `₺${Math.round(value).toLocaleString('tr-TR')}`,
        },
      },
      stroke: {
        curve: 'smooth',
        width: [3, 3],
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.28,
          opacityTo: 0.04,
        },
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: true,
        labels: {
          colors: textMuted,
        },
      },
      tooltip: {
        theme: tooltipTheme,
        y: {
          formatter: (value: number) => `₺${value.toLocaleString('tr-TR')}`,
        },
      },
      grid: {
        borderColor,
        strokeDashArray: 4,
      },
      markers: {
        size: mobile ? 3 : 4,
        strokeWidth: 0,
        hover: {
          size: mobile ? 5 : 6,
        },
      },
    };

    this.apiUsageChart = {
      series: [
        {
          name: 'API Çağrısı',
          data: this.overview.apiUsageTrend.map((x) => x.calls),
        },
      ],
      colors: [info],
      chart: {
        type: 'line',
        height: mobile ? 260 : 320,
        toolbar: { show: false },
        zoom: { enabled: false },
        foreColor: textMuted,
      },
      xaxis: {
        categories: apiUsageDates,
        labels: {
          style: {
            colors: Array(apiUsageDates.length).fill(textMuted),
          },
        },
        axisBorder: { color: borderColor },
        axisTicks: { color: borderColor },
      },
      yaxis: {
        labels: {
          style: {
            colors: [textMuted],
          },
          formatter: (value: number) =>
            `${Math.round(value).toLocaleString('tr-TR')}`,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 3,
        colors: [info],
      },
      fill: {
        type: 'solid',
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      tooltip: {
        theme: tooltipTheme,
        y: {
          formatter: (value: number) =>
            `${value.toLocaleString('tr-TR')} çağrı`,
        },
      },
      grid: {
        borderColor,
        strokeDashArray: 4,
      },
      markers: {
        size: mobile ? 3 : 4,
        colors: [info],
        strokeWidth: 0,
        hover: {
          size: mobile ? 5 : 6,
        },
      },
    };

    this.revenueBreakdownChart = {
      series: this.overview.revenueBreakdown.map((x) => x.value),
      colors: [primary, success],
      chart: {
        type: 'donut',
        height: mobile ? 260 : 320,
        foreColor: textMuted,
      },
      labels: this.overview.revenueBreakdown.map((x) => x.label),
      legend: {
        position: 'bottom',
        labels: {
          colors: textMuted,
        },
      },
      dataLabels: {
        enabled: true,
      },
      plotOptions: {
        pie: {
          donut: {
            size: mobile ? '62%' : '66%',
          },
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 250,
            },
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
      tooltip: {
        theme: tooltipTheme,
        y: {
          formatter: (value: number) => `₺${value.toLocaleString('tr-TR')}`,
        },
      },
      stroke: {
        colors: [cardBg],
        width: 3,
      },
    };

    this.orderPipelineChart = {
      series: [
        {
          name: 'Sipariş',
          data: this.overview.orderPipeline.map((x) => x.count),
        },
      ],
      colors: [primary],
      chart: {
        type: 'bar',
        height: mobile ? 300 : 350,
        toolbar: { show: false },
        foreColor: textMuted,
      },
      xaxis: {
        categories: pipelineStatuses,
        labels: {
          style: {
            colors: Array(pipelineStatuses.length).fill(textMuted),
          },
        },
        axisBorder: { color: borderColor },
        axisTicks: { color: borderColor },
      },
      yaxis: {
        labels: {
          style: {
            colors: [textMuted],
          },
          formatter: (value: number) => `${Math.round(value)}`,
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 7,
          barHeight: mobile ? '48%' : '56%',
        },
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        theme: tooltipTheme,
        y: {
          formatter: (value: number) => `${value} sipariş`,
        },
      },
      grid: {
        borderColor,
        strokeDashArray: 4,
      },
    };

    this.membershipChart = {
      series: this.overview.membershipDistribution.map((x) => x.value),
      colors: [primary, success],
      chart: {
        type: 'donut',
        height: mobile ? 250 : 300,
        foreColor: textMuted,
      },
      labels: this.overview.membershipDistribution.map((x) => x.type),
      legend: {
        position: 'bottom',
        labels: {
          colors: textMuted,
        },
      },
      dataLabels: {
        enabled: true,
      },
      plotOptions: {
        pie: {
          donut: {
            size: mobile ? '58%' : '62%',
          },
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 240,
            },
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
      tooltip: {
        theme: tooltipTheme,
        y: {
          formatter: (value: number) =>
            `${value.toLocaleString('tr-TR')} kullanıcı`,
        },
      },
      stroke: {
        colors: [cardBg],
        width: 3,
      },
    };
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 576;
  }

  private isDarkTheme(): boolean {
    return document.documentElement.getAttribute('data-bs-theme') === 'dark';
  }

  private getCssVar(name: string): string {
    if (typeof window === 'undefined') {
      return '';
    }

    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  private formatDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');

    return `${y}-${m}-${d}`;
  }
}
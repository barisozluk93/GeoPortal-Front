import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

type FilterQuickRangeType = '7d' | '30d' | '3m' | '6m';

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss'],
})
export class FilterBarComponent implements OnInit, OnDestroy {
  @Input() filters: any;
  @Output() filter = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() quickRange = new EventEmitter<FilterQuickRangeType>();

  customerTypeItems: Array<{ label: string; value: string }> = [];
  channelItems: Array<{ label: string; value: string }> = [];
  activeRange: FilterQuickRangeType | null = null;
  quickRanges: Array<{ value: FilterQuickRangeType; label: string }> = [
    { value: '7d', label: 'DASHBOARD.FILTER.QUICK_LAST_7_DAYS' },
    { value: '30d', label: 'DASHBOARD.FILTER.QUICK_LAST_30_DAYS' },
    { value: '3m', label: 'DASHBOARD.FILTER.QUICK_LAST_3_MONTHS' },
    { value: '6m', label: 'DASHBOARD.FILTER.QUICK_LAST_6_MONTHS' },
  ];

  private langChangeSub?: Subscription;

  constructor(private translate: TranslateService) { }

  ngOnInit(): void {
    this.buildSelectItems();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.buildSelectItems();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  onFilter(): void {
    this.filter.emit();
  }

  onReset(): void {
    this.activeRange = null;
    this.reset.emit();
  }

  onQuickRange(range: FilterQuickRangeType): void {
    this.activeRange = range;
    this.quickRange.emit(range);
  }

  clearActiveRange(): void {
    this.activeRange = null;
  }

  private buildSelectItems(): void {
    this.customerTypeItems = [
      {
        label: this.translate.instant('DASHBOARD.FILTER.OPTIONS.ALL'),
        value: 'Tümü',
      },
      {
        label: this.translate.instant('DASHBOARD.FILTER.OPTIONS.INDIVIDUAL'),
        value: 'Bireysel',
      },
      {
        label: this.translate.instant('DASHBOARD.FILTER.OPTIONS.CORPORATE'),
        value: 'Kurumsal',
      },
    ];

    this.channelItems = [
      {
        label: this.translate.instant('DASHBOARD.FILTER.OPTIONS.ALL'),
        value: 'Tümü',
      },
      // {
      //   label: this.translate.instant('DASHBOARD.FILTER.OPTIONS.MARKETPLACE'),
      //   value: 'Marketplace',
      // },
      {
        label: this.translate.instant('DASHBOARD.FILTER.OPTIONS.API'),
        value: 'API',
      },
      {
        label: this.translate.instant('DASHBOARD.FILTER.OPTIONS.SPECIAL_REQUEST'),
        value: 'Özel Talep',
      },
    ];
  }

  onStartDateChange(value: string): void {
    this.clearActiveRange();

    if (!value) {
      this.filters.startDate = null;
      return;
    }

    if (!this.filters.endDate) {
      this.filters.startDate = value;
      return;
    }

    const start = this.parseDate(value);
    const end = this.parseDate(this.filters.endDate);

    if (!start || !end || start.getTime() >= end.getTime()) {
      return;
    }

    this.filters.startDate = value;
  }

  onEndDateChange(value: string): void {
    this.clearActiveRange();

    if (!value) {
      this.filters.endDate = null;
      return;
    }

    if (!this.filters.startDate) {
      this.filters.endDate = value;
      return;
    }

    const start = this.parseDate(this.filters.startDate);
    const end = this.parseDate(value);

    if (!start || !end || end.getTime() <= start.getTime()) {
      return;
    }

    this.filters.endDate = value;
  }

  getMinEndDate(): string | null {
    if (!this.filters?.startDate) {
      return null;
    }

    return this.addDays(this.filters.startDate, 1);
  }

  getMaxStartDate(): string | null {
    if (!this.filters?.endDate) {
      return null;
    }

    return this.addDays(this.filters.endDate, -1);
  }

  private addDays(value: string, days: number): string {
    const date = this.parseDate(value)!;

    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const parts = value.split('-').map(Number);

    if (parts.length !== 3) {
      return null;
    }

    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
}
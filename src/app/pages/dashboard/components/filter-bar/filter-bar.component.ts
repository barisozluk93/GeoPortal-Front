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

  private langChangeSub?: Subscription;

  constructor(private translate: TranslateService) {}

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
}
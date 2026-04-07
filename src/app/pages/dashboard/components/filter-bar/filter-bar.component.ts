import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DashboardFilters, QuickRangeType } from '../../dashboard.models';

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss'],
})
export class FilterBarComponent {
  @Input() filters!: DashboardFilters;

  @Output() filter = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() quickRange = new EventEmitter<QuickRangeType>();

  onQuickRange(type: QuickRangeType): void {
    this.quickRange.emit(type);
  }

  onFilter(): void {
    this.filter.emit();
  }

  onReset(): void {
    this.reset.emit();
  }
}
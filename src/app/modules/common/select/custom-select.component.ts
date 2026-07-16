import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

@Component({
  selector: 'app-custom-select',
  templateUrl: './custom-select.component.html',
  styleUrls: ['./custom-select.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true
    }
  ]
})
export class CustomSelectComponent implements ControlValueAccessor, OnDestroy, AfterViewInit {
  @Input() items: any[] = [];
  @Input() bindLabel: string = 'name';
  @Input() bindValue: string = 'id';
  @Input() placeholder: string = 'Seçiniz';
  @Input() invalid: boolean = false;
  @Input() disabled: boolean = false;
  @Input() multiple: boolean = false;
  @Input() clearable: boolean = true;
  @Input() size: 'sm' | 'lg' | null = null;

  @ViewChild('trigger', { static: true }) triggerRef!: ElementRef<HTMLElement>;

  isOpen = false;
  value: any = null;

  private dropdownEl: HTMLElement | null = null;
  private scrollParents: HTMLElement[] = [];
  private removeScrollListeners: Array<() => void> = [];
  private removeOutsideListeners: Array<() => void> = [];
  private openDirection: 'up' | 'down' = 'down';

  onChange: any = () => {};
  onTouched: any = () => {};

  ngAfterViewInit(): void {
    this.scrollParents = this.getScrollParents(this.triggerRef.nativeElement);
  }

  get selectedItem() {
    if (this.multiple) return null;
    return this.items ? this.items.find(x => x[this.bindValue] == this.value) : null;
  }

  get selectedItems() {
    if (!this.multiple) return [];
    if (!Array.isArray(this.value)) return [];
    return this.items.filter(x => this.value.includes(x[this.bindValue]));
  }

  get selectedItemsText(): string {
    if (!this.multiple) return '';

    return this.selectedItems
      .map(item => item?.[this.bindLabel])
      .filter(value => value != null && value !== '')
      .join(', ');
  }

  writeValue(value: any): void {
    if (this.multiple) {
      this.value = Array.isArray(value) ? [...value] : [];
    } else {
      this.value = value ?? null;
    }

    this.refreshDropdown();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle(event?: MouseEvent): void {
    event?.stopPropagation();

    if (this.disabled) return;

    this.onTouched();

    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown(): void {
    if (this.isOpen || this.disabled) return;

    this.isOpen = true;
    this.createDropdown();
    this.bindScrollListeners();
    this.bindOutsideListeners();

    this.positionDropdown();
    requestAnimationFrame(() => this.positionDropdown());
    setTimeout(() => this.positionDropdown(), 0);
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.unbindScrollListeners();
    this.unbindOutsideListeners();

    if (this.dropdownEl) {
      this.dropdownEl.remove();
      this.dropdownEl = null;
    }
  }

  clear(event?: MouseEvent): void {
    event?.stopPropagation();

    if (this.disabled) return;

    this.value = this.multiple ? [] : null;
    this.onChange(this.value);
    this.onTouched();
    this.refreshDropdown();
  }

  select(item: any): void {
    if (this.disabled) return;

    const val = item[this.bindValue];

    if (this.multiple) {
      if (!Array.isArray(this.value)) {
        this.value = [];
      }

      const index = this.value.indexOf(val);

      if (index > -1) {
        this.value = this.value.filter((x: any) => x !== val);
      } else {
        this.value = [...this.value, val];
      }

      this.onChange([...this.value]);
      this.onTouched();
      this.refreshDropdown();
      return;
    }

    if (this.clearable && this.value == val) {
      this.value = null;
    } else {
      this.value = val;
    }

    this.onChange(this.value);
    this.onTouched();
    this.refreshDropdown();
    this.closeDropdown();
  }

  private createDropdown(): void {
    if (this.dropdownEl) {
      this.dropdownEl.remove();
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown py-2 w-100';

    const list = document.createElement('div');
    list.className = 'custom-select-dropdown-list';

    if (!this.items || this.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'custom-select-dropdown-empty';
      empty.textContent = 'Kayıt bulunamadı';
      list.appendChild(empty);
    } else {
      this.items.forEach(item => {
        list.appendChild(this.createOptionElement(item));
      });
    }

    dropdown.appendChild(list);
    document.body.appendChild(dropdown);
    this.dropdownEl = dropdown;
  }

  private refreshDropdown(): void {
    if (!this.dropdownEl) return;

    const list = this.dropdownEl.querySelector('.custom-select-dropdown-list');
    if (!list) return;

    list.innerHTML = '';

    if (!this.items || this.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'custom-select-dropdown-empty';
      empty.textContent = 'Kayıt bulunamadı';
      list.appendChild(empty);
    } else {
      this.items.forEach(item => {
        list.appendChild(this.createOptionElement(item));
      });
    }

    this.positionDropdown();
    requestAnimationFrame(() => this.positionDropdown());
  }

  private createOptionElement(item: any): HTMLElement {
    const option = document.createElement('div');

    const isActive = this.multiple
      ? Array.isArray(this.value) && this.value.includes(item[this.bindValue])
      : item[this.bindValue] == this.value;

    option.className = `custom-select-dropdown-item px-5 py-3${isActive ? ' active' : ''}`;
    option.innerHTML = `
      <span class="custom-select-dropdown-item__label">${this.escapeHtml(item[this.bindLabel] ?? '')}</span>
      ${isActive ? '<span class="custom-select-dropdown-item__check">✓</span>' : ''}
    `;

    option.addEventListener('click', (e) => {
      e.stopPropagation();
      this.select(item);
    });

    return option;
  }

  private positionDropdown(): void {
    if (!this.dropdownEl || !this.triggerRef?.nativeElement) return;

    const trigger = this.triggerRef.nativeElement;
    const rect = trigger.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) return;

    const gap = 8;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const optionHeight = 42;
    const paddingHeight = 16;
    const dropdownContentHeight = Math.min(Math.max(this.items.length * optionHeight + paddingHeight, 120), 260);

    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    const openUp = spaceBelow < dropdownContentHeight && spaceAbove > spaceBelow;
    this.openDirection = openUp ? 'up' : 'down';

    const availableHeight = Math.max(120, openUp ? spaceAbove : spaceBelow);
    const actualHeight = Math.min(dropdownContentHeight, availableHeight);

    let top = openUp
      ? rect.top - actualHeight - gap
      : rect.bottom + gap;

    let left = rect.left;
    let width = rect.width;

    if (left + width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - width - 8);
    }

    top = Math.max(8, Math.min(top, viewportHeight - actualHeight - 8));
    left = Math.max(8, left);
    width = Math.max(160, Math.min(width, viewportWidth - left - 8));

    this.dropdownEl.classList.remove('is-open-up', 'is-open-down');
    this.dropdownEl.classList.add(openUp ? 'is-open-up' : 'is-open-down');

    this.dropdownEl.style.position = 'fixed';
    this.dropdownEl.style.top = `${top}px`;
    this.dropdownEl.style.left = `${left}px`;
    this.dropdownEl.style.width = `${width}px`;
    this.dropdownEl.style.maxHeight = `${actualHeight}px`;
    this.dropdownEl.style.zIndex = '999999';
  }

  private bindScrollListeners(): void {
    this.unbindScrollListeners();

    this.scrollParents = this.getScrollParents(this.triggerRef.nativeElement);

    this.scrollParents.forEach(parent => {
      const handler = () => this.positionDropdown();
      parent.addEventListener('scroll', handler, { passive: true });
      this.removeScrollListeners.push(() => parent.removeEventListener('scroll', handler));
    });
  }

  private unbindScrollListeners(): void {
    this.removeScrollListeners.forEach(remove => remove());
    this.removeScrollListeners = [];
  }

  private bindOutsideListeners(): void {
    this.unbindOutsideListeners();

    const handler = (event: Event) => {
      if (!this.isOpen) return;

      const target = event.target as Node | null;
      if (!target) return;

      if (this.triggerRef?.nativeElement.contains(target)) return;
      if (this.dropdownEl?.contains(target)) return;

      this.closeDropdown();
    };

    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);

    this.removeOutsideListeners.push(() =>
      document.removeEventListener('mousedown', handler, true)
    );
    this.removeOutsideListeners.push(() =>
      document.removeEventListener('touchstart', handler, true)
    );
  }

  private unbindOutsideListeners(): void {
    this.removeOutsideListeners.forEach(remove => remove());
    this.removeOutsideListeners = [];
  }

  private getScrollParents(element: HTMLElement): HTMLElement[] {
    const parents: HTMLElement[] = [];
    let parent = element.parentElement;

    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const isScrollable =
        /(auto|scroll|overlay)/.test(overflowY) ||
        /(auto|scroll|overlay)/.test(overflowX);

      if (isScrollable) {
        parents.push(parent);
      }

      parent = parent.parentElement;
    }

    return parents;
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isOpen) {
      event.preventDefault();
      this.closeDropdown();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isOpen) {
      this.positionDropdown();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isOpen) {
      this.positionDropdown();
    }
  }

  ngOnDestroy(): void {
    this.closeDropdown();
  }
}
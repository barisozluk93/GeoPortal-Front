import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface SavedPanelLayout {
  version: 3;
  positioned: boolean;
  pinned: boolean;
  left: number | null;
  top: number | null;
  width: number | null;
  height: number | null;
}

@Component({
  selector: 'app-map-panel-shell',
  templateUrl: './map-panel-shell.component.html',
  styleUrls: ['./map-panel-shell.component.scss'],
})
export class MapPanelShellComponent implements AfterViewInit, OnDestroy {
  @Input() panelId = '';
  @Input() isHeaderExist = true;
  @Input() showHeader = true;
  @Input() title = '';
  @Input() icon = 'fa-solid fa-window-maximize';
  @Input() panelClass = '';
  @Input() minimized = false;
  @Input() maximized = false;
  @Input() draggable = true;
  @Input() resizable = true;
  @Input() dockable = true;

  @Output() closeClicked = new EventEmitter<MouseEvent>();
  @Output() minimizeClicked = new EventEmitter<MouseEvent>();
  @Output() maximizeClicked = new EventEmitter<MouseEvent>();

  positioned = false;
  pinned = false;
  left: number | null = null;
  top: number | null = null;
  width: number | null = null;
  height: number | null = null;

  private pointerDown = false;
  private dragging = false;
  private resizing = false;
  private pointerId: number | null = null;
  private startClientX = 0;
  private startClientY = 0;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private initialRect: DOMRect | null = null;
  private resizeDirection: ResizeDirection | null = null;
  private resizeObserver?: ResizeObserver;

  private readonly minWidth = 255;
  private readonly minHeight = 120;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    // Her panel her açılışta kendi HTML/SCSS başlangıç konumu ve boyutuyla başlar.
    // Önceki oturumdan kalan kullanıcı yerleşimi özellikle geri yüklenmez.
    this.resetToInitialLayout(false);

    const shell = this.getShellElement();
    if (shell && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.positioned || this.dragging || this.resizing || this.maximized || this.minimized) return;

        const rect = shell.getBoundingClientRect();
        this.width = Math.round(rect.width);
        this.height = Math.round(rect.height);
      });
      this.resizeObserver.observe(shell);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.clearInteractionState();
  }

  get shellStyle(): Record<string, string | null> {
    if (this.maximized || !this.positioned) {
      return { left: null, top: null, width: null, height: null };
    }

    return {
      left: this.left === null ? null : `${this.left}px`,
      top: this.top === null ? null : `${this.top}px`,
      width: this.width === null ? null : `${this.width}px`,
      // Collapse durumunda inline height uygulamayarak yalnızca header'ın görünmesini sağla.
      height: this.minimized || this.height === null ? null : `${this.height}px`,
    };
  }

  startDrag(event: PointerEvent): void {
    if (!this.draggable || this.pinned || this.maximized || this.resizing || event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest(this.nonDraggableSelector)) return;

    const shell = this.getShellElement();
    if (!shell) return;

    this.pointerDown = true;
    this.dragging = false;
    this.pointerId = event.pointerId;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;
    this.initialRect = shell.getBoundingClientRect();
    this.dragOffsetX = event.clientX - this.initialRect.left;
    this.dragOffsetY = event.clientY - this.initialRect.top;
  }

  startResize(event: PointerEvent, direction: ResizeDirection): void {
    if (!this.resizable || this.pinned || this.maximized || this.minimized || event.button !== 0) return;

    const shell = this.getShellElement();
    if (!shell) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = shell.getBoundingClientRect();

    // İlk resize işleminde mevcut görsel konum ve boyutu aynen koruyarak floating moda geç.
    this.positioned = true;
    this.left = Math.round(rect.left);
    this.top = Math.round(rect.top);
    this.width = Math.round(rect.width);
    this.height = Math.round(rect.height);

    this.pointerDown = true;
    this.resizing = true;
    this.dragging = false;
    this.pointerId = event.pointerId;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;
    this.initialRect = rect;
    this.resizeDirection = direction;

    document.body.classList.add('map-panel-is-resizing');
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.pointerDown || this.pointerId !== event.pointerId || !this.initialRect) return;

    if (this.resizing && this.resizeDirection) {
      this.performResize(event);
      return;
    }

    const distanceX = Math.abs(event.clientX - this.startClientX);
    const distanceY = Math.abs(event.clientY - this.startClientY);

    if (!this.dragging && Math.max(distanceX, distanceY) < 5) return;

    if (!this.dragging) {
      this.dragging = true;
      this.positioned = true;
      this.left = Math.round(this.initialRect.left);
      this.top = Math.round(this.initialRect.top);
      this.width = Math.round(this.initialRect.width);
      this.height = Math.round(this.initialRect.height);
      document.body.classList.add('map-panel-is-dragging');
    }

    const panelWidth = this.width ?? this.initialRect.width;
    const maxLeft = Math.max(0, window.innerWidth - panelWidth);
    const maxTop = Math.max(0, window.innerHeight - 38);

    this.left = Math.min(Math.max(0, event.clientX - this.dragOffsetX), maxLeft);
    this.top = Math.min(Math.max(0, event.clientY - this.dragOffsetY), maxTop);

    event.preventDefault();
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('window:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  stopInteraction(event: PointerEvent): void {
    if (!this.pointerDown) return;

    // Bazı panel wrapper'ları pointerup olayını durdurabiliyor. Etkileşim aktifse
    // pointer kimliği farklı gelse bile mouse/pointer bırakıldığında temizle.
    if (this.pointerId !== null && event.pointerId !== this.pointerId && event.type === 'pointerup') {
      return;
    }

    const changed = this.dragging || this.resizing;
    this.clearInteractionState();

    if (changed) this.captureLayoutAndSave();
  }

  @HostListener('window:blur')
  cancelInteraction(): void {
    if (!this.pointerDown) return;
    this.clearInteractionState();
  }

  @HostListener('window:resize')
  keepInsideViewport(): void {
    if (!this.positioned) return;

    const shell = this.getShellElement();
    const rect = shell?.getBoundingClientRect();
    const panelWidth = rect?.width ?? this.width ?? 280;

    if (this.left !== null) {
      this.left = Math.min(Math.max(0, this.left), Math.max(0, window.innerWidth - panelWidth));
    }
    if (this.top !== null) {
      this.top = Math.min(Math.max(0, this.top), Math.max(0, window.innerHeight - 38));
    }
  }

  togglePin(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.dockable) return;

    if (!this.pinned) {
      const rect = this.getShellElement()?.getBoundingClientRect();
      if (rect) {
        // Sabitleme herhangi bir yöne taşımaz; panel tam bulunduğu yerde kilitlenir.
        this.positioned = true;
        this.left = Math.round(rect.left);
        this.top = Math.round(rect.top);
        this.width = Math.round(rect.width);
        this.height = Math.round(rect.height);
      }
      this.pinned = true;
    } else {
      this.pinned = false;
    }

    this.saveLayout();
  }

  resetLayout(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.resetToInitialLayout(true);
  }

  onClose(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.captureLayoutAndSave();
    this.closeClicked.emit(event);
  }

  onMinimize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.minimizeClicked.emit(event);
  }

  onMaximize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.maximizeClicked.emit(event);
  }

  private performResize(event: PointerEvent): void {
    if (!this.initialRect || !this.resizeDirection) return;

    const dx = event.clientX - this.startClientX;
    const dy = event.clientY - this.startClientY;

    let left = this.initialRect.left;
    let top = this.initialRect.top;
    let width = this.initialRect.width;
    let height = this.initialRect.height;

    if (this.resizeDirection.includes('e')) {
      width = Math.max(this.minWidth, this.initialRect.width + dx);
    }
    if (this.resizeDirection.includes('s')) {
      height = Math.max(this.minHeight, this.initialRect.height + dy);
    }
    if (this.resizeDirection.includes('w')) {
      const requestedWidth = this.initialRect.width - dx;
      width = Math.max(this.minWidth, requestedWidth);
      left = this.initialRect.right - width;
    }
    if (this.resizeDirection.includes('n')) {
      const requestedHeight = this.initialRect.height - dy;
      height = Math.max(this.minHeight, requestedHeight);
      top = this.initialRect.bottom - height;
    }

    left = Math.max(0, left);
    top = Math.max(0, top);
    width = Math.min(width, window.innerWidth - left);
    height = Math.min(height, window.innerHeight - top);

    this.left = Math.round(left);
    this.top = Math.round(top);
    this.width = Math.round(width);
    this.height = Math.round(height);

    event.preventDefault();
  }

  private clearInteractionState(): void {
    this.pointerDown = false;
    this.dragging = false;
    this.resizing = false;
    this.pointerId = null;
    this.initialRect = null;
    this.resizeDirection = null;
    document.body.classList.remove('map-panel-is-dragging');
    document.body.classList.remove('map-panel-is-resizing');
  }

  private get nonDraggableSelector(): string {
    return [
      'button', 'a', 'input', 'select', 'textarea', 'option', 'label',
      '[contenteditable="true"]', '[role="button"]', '.no-panel-drag',
      '.dropdown-menu', '.menu', '.form-control', '.form-select',
      '.ol-viewport', 'canvas', 'svg', '.map-panel-resize-zone'
    ].join(',');
  }

  private getShellElement(): HTMLElement | null {
    return this.elementRef.nativeElement.querySelector('.map-panel-shell');
  }

  private captureLayoutAndSave(): void {
    if (this.positioned) {
      const rect = this.getShellElement()?.getBoundingClientRect();
      if (rect) {
        this.left = Math.round(rect.left);
        this.top = Math.round(rect.top);
        this.width = Math.round(rect.width);
        if (!this.minimized) this.height = Math.round(rect.height);
      }
    }
    this.saveLayout();
  }

  private resetToInitialLayout(removeStoredLayout: boolean): void {
    this.clearInteractionState();
    this.positioned = false;
    this.pinned = false;
    this.left = null;
    this.top = null;
    this.width = null;
    this.height = null;

    if (!removeStoredLayout) return;

    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // localStorage kapalıysa panel yine başlangıç düzenine döner.
    }
  }

  private get storageKey(): string {
    const id = this.panelId || this.panelClass || this.title || 'panel';
    return `geoportal.map.panel.v3.${id}`;
  }

  private saveLayout(): void {
    const layout: SavedPanelLayout = {
      version: 3,
      positioned: this.positioned,
      pinned: this.pinned,
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(layout));
    } catch {
      // localStorage kapalıysa panel davranışı çalışmaya devam eder.
    }
  }

  private restoreLayout(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;

      const saved = JSON.parse(raw) as Partial<SavedPanelLayout>;
      if (saved.version !== 3) return;

      this.positioned = saved.positioned === true;
      this.pinned = saved.pinned === true;
      this.left = saved.left ?? null;
      this.top = saved.top ?? null;
      this.width = saved.width ?? null;
      this.height = saved.height ?? null;

      this.keepInsideViewport();
    } catch {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {
        // noop
      }
    }
  }
}

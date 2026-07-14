import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-map-toolbar',
  templateUrl: './map-toolbar.component.html',
  styleUrls: ['./map-toolbar.component.scss'],
})
export class MapToolbarComponent {
  constructor(private hostElement: ElementRef<HTMLElement>) {}
  @ViewChild('compassElement')
  compassElement?: ElementRef<HTMLButtonElement>;

  @Input() side: 'left' | 'right' = 'left';
  @Input() measureText = '';
  @Input() mapRotationDegree = 0;

  @Input()
  activeTool:
    | 'layer-manager'
    | 'coordinate'
    | 'measure'
    | 'export'
    | 'polygon'
    | 'rectangle'
    | 'upload'
    | 'search'
    | 'smart-filter'
    | 'ask'
    | null = null;

  @Output() layerManagerHovered = new EventEmitter<void>();
  @Output() layerManagerClicked = new EventEmitter<void>();

  @Output() searchClicked = new EventEmitter<void>();
  @Output() askClicked = new EventEmitter<void>();
  @Output() polygonClicked = new EventEmitter<void>();
  @Output() rectangleClicked = new EventEmitter<void>();
  @Output() uploadClicked = new EventEmitter<void>();

  @Output() measureDistanceClicked = new EventEmitter<void>();
  @Output() measureAreaClicked = new EventEmitter<void>();

  @Output() goToCoordinateHovered = new EventEmitter<void>();
  @Output() goToCoordinateClicked = new EventEmitter<void>();

  @Output() exportClicked = new EventEmitter<void>();
  @Output() resetClicked = new EventEmitter<void>();

  @Output() zoomInClicked = new EventEmitter<void>();
  @Output() zoomOutClicked = new EventEmitter<void>();

  @Output() rotationChanged = new EventEmitter<number>();
  @Output() northResetClicked = new EventEmitter<void>();

  isCompassOpen = false;
  isCompassDragging = false;

  private compassCenterX = 0;
  private compassCenterY = 0;


  toggleCompass(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isCompassOpen = !this.isCompassOpen;
  }

  closeCompass(): void {
    this.isCompassOpen = false;
    this.isCompassDragging = false;
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.isCompassOpen) return;

    const target = event.target as Node | null;
    if (target && this.hostElement.nativeElement.contains(target)) return;

    this.closeCompass();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.closeCompass();
  }

  onCompassPointerDown(event: PointerEvent): void {
    const compass = this.compassElement?.nativeElement;
    if (!compass) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = compass.getBoundingClientRect();
    this.compassCenterX = rect.left + rect.width / 2;
    this.compassCenterY = rect.top + rect.height / 2;
    this.isCompassOpen = true;
    this.isCompassDragging = true;

    compass.setPointerCapture?.(event.pointerId);
    this.updateCompassRotation(event.clientX, event.clientY);
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent): void {
    if (!this.isCompassDragging) return;

    event.preventDefault();
    this.updateCompassRotation(event.clientX, event.clientY);
  }

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(event: PointerEvent): void {
    if (!this.isCompassDragging) return;

    this.isCompassDragging = false;
    const compass = this.compassElement?.nativeElement;

    if (compass?.hasPointerCapture?.(event.pointerId)) {
      compass.releasePointerCapture(event.pointerId);
    }
  }

  @HostListener('window:pointercancel', ['$event'])
  onWindowPointerCancel(event: PointerEvent): void {
    this.onWindowPointerUp(event);
  }

  onCompassKeyDown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 15 : 5;
    let degree = this.normalizedRotationDegree;

    if (event.key === 'ArrowLeft') degree -= step;
    else if (event.key === 'ArrowRight') degree += step;
    else if (event.key === 'ArrowUp' || event.key === 'Home') degree = 0;
    else return;

    event.preventDefault();
    event.stopPropagation();
    this.rotationChanged.emit(this.normalizeDegree(degree));
  }

  resetNorth(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.northResetClicked.emit();
  }

  get normalizedRotationDegree(): number {
    return this.normalizeDegree(this.mapRotationDegree);
  }

  get compassNeedleTransform(): string {
    return `rotate(${this.normalizedRotationDegree}deg)`;
  }

  private updateCompassRotation(clientX: number, clientY: number): void {
    const deltaX = clientX - this.compassCenterX;
    const deltaY = clientY - this.compassCenterY;

    const degree = this.normalizeDegree(
      (Math.atan2(deltaY, deltaX) * 180) / Math.PI + 90
    );

    this.rotationChanged.emit(degree);
  }

  private normalizeDegree(degree: number): number {
    const normalized = degree % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }
}

import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  Renderer2,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { finalize } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { BasketService } from 'src/app/_metronic/partials/layout/basket/basket.service';
import { AuthService } from '../../auth';
import { BasketManagementService } from '../../basket-management/basket-management.service';
import { BasketModel } from '../../basket-management/models/basket.model';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { MarketplaceService } from './marketplace.service';
import { ProductModel } from './models/product.model';

@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.scss']
})
export class MarketplaceComponent implements AfterViewInit, OnDestroy {
  private readonly marketplaceService = inject(MarketplaceService);
  readonly basketManagementService = inject(BasketManagementService);
  readonly basketService = inject(BasketService);
  readonly authService = inject(AuthService);
  readonly alertService = inject(AlertService);
  readonly translate = inject(TranslateService);

  @ViewChild('filterSidebar') filterSidebarRef?: ElementRef<HTMLDivElement>;
  @ViewChild('filterSidebarWrapper') filterSidebarWrapperRef?: ElementRef<HTMLDivElement>;

  readonly items = signal<ProductModel[]>([]);
  readonly selectedItem = signal<ProductModel | null>(null);
  readonly selectedMapItem = signal<ProductModel | null>(null);
  readonly mapPanelOpen = signal(false);

  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly errorMessage = signal('');
  readonly detailErrorMessage = signal('');

  readonly searchText = signal('');
  readonly maxCloudRate = signal(100);
  readonly maxPrice = signal(100000);

  totalCount = 0;

  paginationModel = {
    pageNumber: 1,
    pageSize: 9
  };

  isFilterFixed = false;
  filterSidebarWidth: number | null = null;
  filterSidebarHeight = 0;
  filterSidebarLeft = 0;
  filterTopOffset = 90;

  private readonly defaultFilterTopOffset = 90;
  private readonly footerSafeGap = 24;

  private filterInitialTop = 0;

  private map?: Map;
  private markerLayer?: VectorLayer<VectorSource>;

  private readonly renderer = inject(Renderer2);

  constructor() {
    this.loadItems();
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.calculateFilterStickyStart();
      this.updateFilterStickyState();
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateFilterStickyState();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.calculateFilterStickyStart();
    this.updateFilterStickyState();
  }

  readonly filteredItems = computed(() => {
    const text = this.searchText().trim().toLocaleLowerCase('tr-TR');
    const maxCloud = this.maxCloudRate();
    const maxPrice = this.maxPrice();

    return this.items().filter((item) => {
      const name = (item.name ?? '').toLocaleLowerCase('tr-TR');
      const city = (item.city ?? '').toLocaleLowerCase('tr-TR');
      const district = (item.district ?? '').toLocaleLowerCase('tr-TR');
      const provider = (item.provider ?? '').toLocaleLowerCase('tr-TR');

      const textMatch =
        !text ||
        name.includes(text) ||
        city.includes(text) ||
        district.includes(text) ||
        provider.includes(text);

      const cloudMatch = (item.cloudRate ?? 0) <= maxCloud;
      const priceMatch = (item.price ?? 0) <= maxPrice;

      return textMatch && cloudMatch && priceMatch;
    });
  });

  readonly resultCount = computed(() => this.filteredItems().length);

  private calculateFilterStickyStart(): void {
    const wrapper = this.filterSidebarWrapperRef?.nativeElement;
    const sidebar = this.filterSidebarRef?.nativeElement;
    if (!wrapper || !sidebar) return;

    const wrapperRect = wrapper.getBoundingClientRect();

    this.filterInitialTop = window.scrollY + wrapperRect.top;
    this.filterSidebarWidth = wrapperRect.width;
    this.filterSidebarLeft = wrapperRect.left;
    this.filterSidebarHeight = sidebar.offsetHeight;
  }

  private getFooterElement(): HTMLElement | null {
    const selectors = ['#kt_app_footer', 'app-footer', '.app-footer', '.footer', 'footer'];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        return element;
      }
    }

    return null;
  }

  private getRightColumnElement(): HTMLElement | null {
    const wrapper = this.filterSidebarWrapperRef?.nativeElement;
    if (!wrapper) return null;

    const row = wrapper.closest('.row');
    if (!row) return null;

    const columns = Array.from(row.children) as HTMLElement[];
    const rightCol = columns.find((col) => col !== wrapper.parentElement);

    return rightCol ?? null;
  }

  private clearSidebarInlineStyles(): void {
    const wrapper = this.filterSidebarWrapperRef?.nativeElement;
    const sidebar = this.filterSidebarRef?.nativeElement;
    if (!wrapper || !sidebar) return;

    this.renderer.removeStyle(wrapper, 'position');
    this.renderer.removeStyle(wrapper, 'min-height');

    this.renderer.removeStyle(sidebar, 'position');
    this.renderer.removeStyle(sidebar, 'top');
    this.renderer.removeStyle(sidebar, 'bottom');
    this.renderer.removeStyle(sidebar, 'left');
    this.renderer.removeStyle(sidebar, 'right');
    this.renderer.removeStyle(sidebar, 'width');
    this.renderer.removeStyle(sidebar, 'z-index');
  }

  private applySidebarStatic(): void {
    this.isFilterFixed = false;
    this.filterSidebarWidth = null;
    this.filterSidebarLeft = 0;
    this.filterSidebarHeight = 0;
    this.filterTopOffset = this.defaultFilterTopOffset;
    this.clearSidebarInlineStyles();
  }

  private applySidebarFixed(): void {
    const wrapper = this.filterSidebarWrapperRef?.nativeElement;
    const sidebar = this.filterSidebarRef?.nativeElement;
    if (!wrapper || !sidebar) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const sidebarHeight = sidebar.offsetHeight;

    this.isFilterFixed = true;
    this.filterSidebarWidth = wrapperRect.width;
    this.filterSidebarLeft = wrapperRect.left;
    this.filterSidebarHeight = sidebarHeight;
    this.filterTopOffset = this.defaultFilterTopOffset;

    this.renderer.setStyle(wrapper, 'position', 'relative');
    this.renderer.setStyle(wrapper, 'min-height', `${sidebarHeight}px`);

    this.renderer.setStyle(sidebar, 'position', 'fixed');
    this.renderer.setStyle(sidebar, 'top', `${this.defaultFilterTopOffset}px`);
    this.renderer.setStyle(sidebar, 'left', `${wrapperRect.left}px`);
    this.renderer.setStyle(sidebar, 'width', `${wrapperRect.width}px`);
    this.renderer.setStyle(sidebar, 'bottom', 'auto');
    this.renderer.setStyle(sidebar, 'right', 'auto');
    this.renderer.setStyle(sidebar, 'z-index', '110');
  }

  private applySidebarLocked(absoluteTop: number, lockHeight: number): void {
    const wrapper = this.filterSidebarWrapperRef?.nativeElement;
    const sidebar = this.filterSidebarRef?.nativeElement;
    if (!wrapper || !sidebar) return;

    const sidebarHeight = sidebar.offsetHeight;

    this.isFilterFixed = false;
    this.filterSidebarWidth = null;
    this.filterSidebarLeft = 0;
    this.filterSidebarHeight = sidebarHeight;
    this.filterTopOffset = this.defaultFilterTopOffset;

    this.renderer.setStyle(wrapper, 'position', 'relative');
    this.renderer.setStyle(wrapper, 'min-height', `${Math.max(lockHeight, sidebarHeight)}px`);

    this.renderer.setStyle(sidebar, 'position', 'absolute');
    this.renderer.setStyle(sidebar, 'top', `${Math.max(0, absoluteTop)}px`);
    this.renderer.setStyle(sidebar, 'left', '0');
    this.renderer.setStyle(sidebar, 'right', '0');
    this.renderer.setStyle(sidebar, 'bottom', 'auto');
    this.renderer.setStyle(sidebar, 'width', '100%');
    this.renderer.setStyle(sidebar, 'z-index', '10');
  }

  private updateFilterStickyState(): void {
    const wrapper = this.filterSidebarWrapperRef?.nativeElement;
    const sidebar = this.filterSidebarRef?.nativeElement;
    if (!wrapper || !sidebar) return;

    if (window.innerWidth < 1200) {
      this.applySidebarStatic();
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const wrapperTopAbsolute = window.scrollY + wrapperRect.top;
    const sidebarHeight = sidebar.offsetHeight;

    this.filterInitialTop = wrapperTopAbsolute;
    this.filterSidebarWidth = wrapperRect.width;
    this.filterSidebarLeft = wrapperRect.left;
    this.filterSidebarHeight = sidebarHeight;

    const shouldFix = window.scrollY + this.defaultFilterTopOffset >= this.filterInitialTop;

    if (!shouldFix) {
      this.applySidebarStatic();
      return;
    }

    const rightColumn = this.getRightColumnElement();
    const footerElement = this.getFooterElement();

    let bottomBoundaryAbsolute: number | null = null;

    if (rightColumn) {
      const rightRect = rightColumn.getBoundingClientRect();
      bottomBoundaryAbsolute = window.scrollY + rightRect.bottom;
    } else if (footerElement) {
      const footerRect = footerElement.getBoundingClientRect();
      bottomBoundaryAbsolute = window.scrollY + footerRect.top - this.footerSafeGap;
    }

    if (!bottomBoundaryAbsolute) {
      this.applySidebarFixed();
      return;
    }

    const fixedBottomAbsolute =
      window.scrollY + this.defaultFilterTopOffset + sidebarHeight;

    const shouldLock = fixedBottomAbsolute >= bottomBoundaryAbsolute;

    if (!shouldLock) {
      this.applySidebarFixed();
      return;
    }

    const absoluteTop = bottomBoundaryAbsolute - sidebarHeight - wrapperTopAbsolute;
    const lockHeight = bottomBoundaryAbsolute - wrapperTopAbsolute;

    this.applySidebarLocked(absoluteTop, lockHeight);
  }

  loadItems(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.marketplaceService
      .paging(
        this.paginationModel.pageNumber,
        this.paginationModel.pageSize,
        this.searchText(),
        this.maxPrice(),
        this.maxCloudRate()
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.items.set(response.data.items ?? []);
          this.totalCount = response.data.totalCount ?? 0;

          setTimeout(() => {
            this.calculateFilterStickyStart();
            this.updateFilterStickyState();
          }, 0);
        },
        error: (error) => {
          console.error('Marketplace list data could not be loaded.', error);
          this.items.set([]);
          this.totalCount = 0;
          this.errorMessage.set('MARKETPLACE.ERRORS.LOAD_LIST');
        }
      });
  }

  setSearchText(value: string): void {
    this.searchText.set(value ?? '');
    this.paginationModel.pageNumber = 1;
  }

  setMaxCloudRate(value: number): void {
    this.maxCloudRate.set(Number(value));
    this.paginationModel.pageNumber = 1;
  }

  setMaxPrice(value: number): void {
    this.maxPrice.set(Number(value));
    this.paginationModel.pageNumber = 1;
  }

  applyFilters(): void {
    this.paginationModel.pageNumber = 1;
    this.loadItems();
  }

  resetFilters(): void {
    this.searchText.set('');
    this.maxCloudRate.set(100);
    this.maxPrice.set(100000);
    this.paginationModel.pageNumber = 1;
    this.loadItems();
  }

  openDetail(item: ProductModel): void {
    this.selectedItem.set(item);
    this.detailLoading.set(true);
    this.detailErrorMessage.set('');
    this.renderer.addClass(document.body, 'overflow-hidden');

    this.marketplaceService
      .getById(item.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.selectedItem.set(response.data);
        },
        error: (error) => {
          console.error('Marketplace detail data could not be loaded.', error);
          this.detailErrorMessage.set('MARKETPLACE.ERRORS.LOAD_DETAIL');
        }
      });
  }

  closeDetail(): void {
    this.selectedItem.set(null);
    this.detailLoading.set(false);
    this.detailErrorMessage.set('');
    this.renderer.removeClass(document.body, 'overflow-hidden');
  }

  openMapPreview(item: ProductModel): void {
    this.selectedMapItem.set(item);
    this.mapPanelOpen.set(true);

    setTimeout(() => {
      this.initializeMap();
      this.renderSelectedItemOnMap(item);
    }, 150);
  }

  closeMapPreview(): void {
    this.mapPanelOpen.set(false);
    this.selectedMapItem.set(null);

    if (this.map) {
      this.map.setTarget(undefined);
    }
  }

  private initializeMap(): void {
    if (this.map) {
      this.map.setTarget('marketplace-map');
      this.map.updateSize();
      return;
    }

    this.markerLayer = new VectorLayer({
      source: new VectorSource()
    });

    this.map = new Map({
      target: 'marketplace-map',
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        this.markerLayer
      ],
      view: new View({
        center: fromLonLat([35.2433, 38.9637]),
        zoom: 5
      })
    });

    setTimeout(() => {
      this.map?.updateSize();
    }, 120);
  }

  private renderSelectedItemOnMap(item: ProductModel): void {
    if (!this.map || !this.markerLayer) {
      return;
    }

    const source = this.markerLayer.getSource();
    source?.clear();

    const coordinates = this.getRepresentativeCoordinates(item);

    const feature = new Feature({
      geometry: new Point(fromLonLat(coordinates))
    });

    feature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#2c63ff' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      })
    );

    source?.addFeature(feature);

    this.map.getView().animate({
      center: fromLonLat(coordinates),
      zoom: 9,
      duration: 500
    });

    this.map.updateSize();
  }

  private getRepresentativeCoordinates(item: ProductModel): [number, number] {
    const city = (item.city || '').toLocaleLowerCase('tr-TR');

    const cityCoordinates: Record<string, [number, number]> = {
      istanbul: [28.9784, 41.0082],
      ankara: [32.8597, 39.9334],
      izmir: [27.1428, 38.4237],
      bursa: [29.0601, 40.1885],
      antalya: [30.7133, 36.8969],
      konya: [32.4846, 37.8746],
      adana: [35.3213, 37.0],
      trabzon: [39.72, 41.0027],
      erzurum: [41.2769, 39.9043],
      gaziantep: [37.3781, 37.0662],
      kayseri: [35.4954, 38.7312]
    };

    return cityCoordinates[city] ?? [35.2433, 38.9637];
  }

  trackByItem(_: number, item: ProductModel): number {
    return item.id;
  }

  canViewAddToCart(item: ProductModel): boolean {
    const basket = this.basketService.basket;

    if (basket) {
      return !basket.some((f) => f.productId === item.id);
    }

    return true;
  }

  addToCart(item: ProductModel): void {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      const data: BasketModel = {
        id: 0,
        userId: Number(currentUser.id),
        productId: item.id,
        isDeleted: false,
        product: undefined,
        totalPrice: undefined,
        numberOf: undefined
      };

      this.basketManagementService.save(data).subscribe((result) => {
        if (result.isSuccess) {
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
          this.basketService.loadBasketFromDb();
        } else {
          this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
        }
      });

      return;
    }

    const product: ProductModel = {
      categoryId: 1,
      id: item.id,
      name: item.name,
      price: item.price ?? 0,
      isDeleted: false,
      userId: 0
    };

    let basket = JSON.parse(localStorage.getItem('basket') as string) as BasketModel[] | null;

    if (basket?.length) {
      if (basket.length < 15) {
        basket.push({
          id: 0,
          userId: 0,
          product: product,
          productId: product.id,
          isDeleted: false,
          numberOf: 0,
          totalPrice: 0
        });
      } else {
        this.alertService.createAlert(
          'warning',
          this.translate.instant('MESSAGES.LOGIN_REQUIRED_FOR_MORE_PRODUCTS')
        );
        return;
      }
    } else {
      basket = [
        {
          id: 0,
          userId: 0,
          product: product,
          productId: product.id,
          isDeleted: false,
          numberOf: 0,
          totalPrice: 0
        }
      ];
    }

    this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
    this.basketService.setBasket(basket);
  }

  onPageChanges(): void {
    this.loadItems();
  }

  getCloudBadgeText(item: ProductModel): string {
    return `%${item.cloudRate ?? 0} ${this.translate.instant('MARKETPLACE.CARD.CLOUD')}`;
  }

  getResolutionBadgeText(item: ProductModel): string {
    return `${item.resolution ?? 0}m`;
  }

  getClassTagClass(name: string | undefined | null): string {
    if (!name) return 'class-tag--default';

    const value = name.toLocaleLowerCase('tr-TR');

    if (
      value.includes('tarım') ||
      value.includes('agri') ||
      value.includes('agriculture') ||
      value.includes('crop')
    ) {
      return 'class-tag--agriculture';
    }

    if (
      value.includes('su') ||
      value.includes('water') ||
      value.includes('göl') ||
      value.includes('nehir')
    ) {
      return 'class-tag--water';
    }

    if (
      value.includes('şehir') ||
      value.includes('kent') ||
      value.includes('urban') ||
      value.includes('city') ||
      value.includes('yerleşim')
    ) {
      return 'class-tag--urban';
    }

    return 'class-tag--default';
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'overflow-hidden');
    this.clearSidebarInlineStyles();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.selectedItem()) {
      this.closeDetail();
    }
  }
}
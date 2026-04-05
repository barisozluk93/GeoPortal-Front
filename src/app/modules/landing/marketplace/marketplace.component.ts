import { AfterViewInit, Component, computed, inject, signal } from '@angular/core';
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
export class MarketplaceComponent implements AfterViewInit {
  private readonly marketplaceService = inject(MarketplaceService);
  readonly basketManagementService = inject(BasketManagementService);
  readonly basketService = inject(BasketService);
  readonly authService = inject(AuthService);
  readonly alertService = inject(AlertService);
  readonly translate = inject(TranslateService);

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

  private map?: Map;
  private markerLayer?: VectorLayer<VectorSource>;

  constructor() {
    this.loadItems();
  }

  ngAfterViewInit(): void {
    // drawer açılınca map initialize ediliyor
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

  addToCart(item: ProductModel): void {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      const data: BasketModel = {
        id: 0,
        userId: currentUser.id,
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

    // DEFAULT
    return 'class-tag--default';
  }
}
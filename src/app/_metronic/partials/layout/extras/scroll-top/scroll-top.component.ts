import {
  AfterViewInit,
  Component,
  NgZone,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'app-scroll-top',
  templateUrl: './scroll-top.component.html',
  styleUrls: ['./scroll-top.component.scss'],
})
export class LayoutScrollTopComponent implements AfterViewInit, OnDestroy {
  isVisible = false;

  private readonly scrollThreshold = 250;
  private readonly onScroll = (): void => {
    const scrollTop = this.getCurrentScrollTop();

    this.ngZone.run(() => {
      this.isVisible = scrollTop > this.scrollThreshold;
    });
  };

  constructor(private readonly ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      // Capture=true sayesinde window yerine Metronic content container'ı
      // scroll olsa bile event yakalanır.
      document.addEventListener('scroll', this.onScroll, true);
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });

    this.onScroll();
  }

  scrollToTop(): void {
    const scrollContainer = this.getScrollContainer();

    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onScroll, true);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
  }

  private getCurrentScrollTop(): number {
    const container = this.getScrollContainer();

    return Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0,
      container?.scrollTop || 0
    );
  }

  private getScrollContainer(): HTMLElement | null {
    const selectors = [
      '#kt_app_content_container',
      '#kt_app_content',
      '#kt_content_container',
      '#kt_content',
      '.app-content',
      '.content',
      '[data-kt-scroll="true"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element && element.scrollHeight > element.clientHeight) {
        return element;
      }
    }

    return null;
  }
}

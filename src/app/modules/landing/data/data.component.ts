import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss']
})
export class DataComponent implements AfterViewInit, OnDestroy {

  @ViewChild('heroSection')
  heroSection!: ElementRef<HTMLElement>;

  hideScrollCue = false;

  private observer!: IntersectionObserver;

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        // Hero görünmeye devam ediyorsa buton görünür.
        this.hideScrollCue = entry.intersectionRatio < 0.8;
      },
      {
        threshold: [0, 0.8, 1]
      }
    );

    this.observer.observe(this.heroSection.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

}
import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnInit } from '@angular/core';

@Component({
  selector: 'scroll-top',
  templateUrl: './scroll-top.component.html',
  styleUrls: ['./scroll-top.component.scss']
})
export class AppScrollTopComponent implements OnInit {
  windowScrolled = false;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngOnInit(): void {
    this.checkScrollPosition();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.checkScrollPosition();
  }

  private checkScrollPosition(): void {
    const scrollTop =
      window.pageYOffset ||
      this.document.documentElement.scrollTop ||
      this.document.body.scrollTop ||
      0;

    this.windowScrolled = scrollTop > 160;
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
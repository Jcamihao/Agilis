import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

const TYPEWRITER_TEXT =
  'Que bom te ver por aqui. Times organizados tendem a nos encontrar. O que vamos organizar hoje?';
const TYPE_SPEED_MS = 38;
const TYPE_START_DELAY_MS = 500;
const SCRUB_SENSITIVITY = 0.8;

@Component({
  selector: 'ag-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') private videoRef?: ElementRef<HTMLVideoElement>;

  readonly typedText = signal('');
  readonly showCursor = signal(true);

  private readonly zone = inject(NgZone);

  private typeTimeoutId?: ReturnType<typeof setTimeout>;
  private typeIntervalId?: ReturnType<typeof setInterval>;

  private targetTime = 0;
  private isSeeking = false;
  private prevX: number | null = null;
  private onMouseMove?: (e: MouseEvent) => void;
  private onTouchMove?: (e: TouchEvent) => void;
  private onTouchEnd?: () => void;
  private onLoadedMetadata?: () => void;
  private onSeeked?: () => void;

  ngAfterViewInit(): void {
    this.setupVideoScrub();
    this.startTypewriter();
  }

  ngOnDestroy(): void {
    clearTimeout(this.typeTimeoutId);
    clearInterval(this.typeIntervalId);
    this.teardownVideoScrub();
  }

  private startTypewriter(): void {
    this.typeTimeoutId = setTimeout(() => {
      let charIndex = 0;
      this.typeIntervalId = setInterval(() => {
        if (charIndex < TYPEWRITER_TEXT.length) {
          this.typedText.update((t) => t + TYPEWRITER_TEXT.charAt(charIndex));
          charIndex++;
        } else {
          clearInterval(this.typeIntervalId);
          this.showCursor.set(false);
        }
      }, TYPE_SPEED_MS);
    }, TYPE_START_DELAY_MS);
  }

  // Outside Angular's zone — fires on every mousemove across the whole page
  // and only mutates the video element's currentTime, so it shouldn't churn
  // change detection on every pixel of mouse movement.
  private setupVideoScrub(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    const performSeek = () => {
      if (!video.duration) return;
      if (!this.isSeeking && Math.abs(video.currentTime - this.targetTime) > 0.02) {
        this.isSeeking = true;
        video.currentTime = this.targetTime;
      }
    };

    this.onLoadedMetadata = () => {
      this.targetTime = video.currentTime || 0;
    };
    this.onSeeked = () => {
      this.isSeeking = false;
      if (Math.abs(video.currentTime - this.targetTime) > 0.02) performSeek();
    };
    this.onMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      if (this.prevX !== null && video.duration) {
        const delta = currentX - this.prevX;
        const timeOffset = (delta / window.innerWidth) * SCRUB_SENSITIVITY * video.duration;
        this.targetTime = Math.min(Math.max(this.targetTime + timeOffset, 0), video.duration);
        performSeek();
      }
      this.prevX = currentX;
    };
    this.onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && video.duration) {
        const currentX = e.touches[0].clientX;
        if (this.prevX !== null) {
          const delta = currentX - this.prevX;
          const timeOffset = (delta / window.innerWidth) * SCRUB_SENSITIVITY * video.duration;
          this.targetTime = Math.min(Math.max(this.targetTime + timeOffset, 0), video.duration);
          performSeek();
        }
        this.prevX = currentX;
      }
    };
    this.onTouchEnd = () => {
      this.prevX = null;
    };

    this.zone.runOutsideAngular(() => {
      video.addEventListener('loadedmetadata', this.onLoadedMetadata!);
      video.addEventListener('seeked', this.onSeeked!);
      window.addEventListener('mousemove', this.onMouseMove!);
      window.addEventListener('touchmove', this.onTouchMove!, { passive: true });
      window.addEventListener('touchend', this.onTouchEnd!);
    });
  }

  private teardownVideoScrub(): void {
    const video = this.videoRef?.nativeElement;
    if (video && this.onLoadedMetadata) video.removeEventListener('loadedmetadata', this.onLoadedMetadata);
    if (video && this.onSeeked) video.removeEventListener('seeked', this.onSeeked);
    if (this.onMouseMove) window.removeEventListener('mousemove', this.onMouseMove);
    if (this.onTouchMove) window.removeEventListener('touchmove', this.onTouchMove);
    if (this.onTouchEnd) window.removeEventListener('touchend', this.onTouchEnd);
  }
}

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
import { RouterLink } from '@angular/router';

const TYPEWRITER_TEXT =
  'Que bom te ver por aqui. Times organizados tendem a nos encontrar. O que vamos organizar hoje?';
const TYPE_SPEED_MS = 38;
const TYPE_START_DELAY_MS = 600;
const PILLS_REVEAL_DELAY_MS = 400;
const COPY_TOOLTIP_DURATION_MS = 1800;
const CONTACT_EMAIL = 'contato@agilis.app';

@Component({
  selector: 'ag-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgVideo') private videoRef!: ElementRef<HTMLVideoElement>;

  readonly typedText = signal('');
  readonly showCursor = signal(true);
  readonly pillsVisible = signal(false);
  readonly menuOpen = signal(false);
  readonly copied = signal(false);
  readonly contactEmail = CONTACT_EMAIL;

  private readonly zone = inject(NgZone);

  private typeTimeoutId?: ReturnType<typeof setTimeout>;
  private typeIntervalId?: ReturnType<typeof setInterval>;
  private pillsTimeoutId?: ReturnType<typeof setTimeout>;
  private copiedTimeoutId?: ReturnType<typeof setTimeout>;

  private reverseRafId?: number;
  private onEnded?: () => void;

  ngAfterViewInit(): void {
    this.setupBoomerangVideo();
    this.startTypewriter();
    this.pillsTimeoutId = setTimeout(() => this.pillsVisible.set(true), PILLS_REVEAL_DELAY_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.typeTimeoutId);
    clearInterval(this.typeIntervalId);
    clearTimeout(this.pillsTimeoutId);
    clearTimeout(this.copiedTimeoutId);
    this.teardownBoomerangVideo();
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  copyEmail(): void {
    const finish = () => {
      this.copied.set(true);
      clearTimeout(this.copiedTimeoutId);
      this.copiedTimeoutId = setTimeout(() => this.copied.set(false), COPY_TOOLTIP_DURATION_MS);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.contactEmail).then(finish).catch(() => {
        prompt('Copiar email:', this.contactEmail);
      });
    } else {
      prompt('Copiar email:', this.contactEmail);
    }
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

  // Plays forward natively, then "rewinds" by hand-stepping currentTime
  // backwards via requestAnimationFrame (browsers don't support a native
  // negative playbackRate), then plays forward again — a boomerang loop
  // instead of a hard cut back to frame 0.
  private setupBoomerangVideo(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    this.onEnded = () => this.zone.runOutsideAngular(() => this.reverseVideo(video));

    this.zone.runOutsideAngular(() => {
      video.addEventListener('ended', this.onEnded!);
    });
  }

  private reverseVideo(video: HTMLVideoElement): void {
    video.pause();
    let lastTs: number | null = null;

    const step = (ts: number) => {
      if (lastTs === null) lastTs = ts;
      const deltaSeconds = (ts - lastTs) / 1000;
      lastTs = ts;

      video.currentTime = Math.max(0, video.currentTime - deltaSeconds);

      if (video.currentTime > 0.03) {
        this.reverseRafId = requestAnimationFrame(step);
      } else {
        video.currentTime = 0;
        video.play().catch(() => {
          // Autoplay can be blocked before any user gesture — harmless here,
          // the video simply stays on its first frame until one occurs.
        });
      }
    };

    this.reverseRafId = requestAnimationFrame(step);
  }

  private teardownBoomerangVideo(): void {
    if (this.reverseRafId) cancelAnimationFrame(this.reverseRafId);
    const video = this.videoRef?.nativeElement;
    if (video && this.onEnded) video.removeEventListener('ended', this.onEnded);
  }
}

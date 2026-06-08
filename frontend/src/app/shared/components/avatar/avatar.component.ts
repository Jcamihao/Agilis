import { Component, Input, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-12 h-12 text-base',
};

@Component({
  selector: 'ag-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex flex-shrink-0" [title]="name()">
      <div [class]="containerClass()"
           style="background: linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)">
        @if (src()) {
          <img [src]="src()" [alt]="name()" class="w-full h-full object-cover rounded-full" />
        } @else {
          <span class="text-white font-semibold uppercase select-none">{{ initials() }}</span>
        }
      </div>
      @if (online() !== undefined) {
        <span class="absolute bottom-0 right-0 rounded-full border-2 border-white"
              [class]="dotClass()">
        </span>
      }
    </div>
  `
})
export class AvatarComponent {
  readonly name   = input<string>('');
  readonly src    = input<string | null | undefined>(undefined);
  readonly size   = input<AvatarSize>('md');
  readonly online = input<boolean | undefined>(undefined);

  initials = computed(() => {
    const n = this.name().trim();
    if (!n) return '?';
    const parts = n.split(' ').filter(Boolean);
    return parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0].slice(0, 2);
  });

  containerClass = computed(() =>
    `rounded-full flex items-center justify-center overflow-hidden color-white ${SIZE_CLASSES[this.size()]}`
  );

  dotClass = computed(() => {
    const base = 'w-2.5 h-2.5';
    return this.online() ? `${base} bg-emerald-500` : `${base} bg-slate-400`;
  });
}

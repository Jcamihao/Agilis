import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'ag-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-white text-sm font-medium shadow-lg animate-slide-in min-w-[260px] max-w-[360px]"
             [class]="toastClass(toast.type)">
          <span class="material-symbols-rounded text-base flex-shrink-0">{{ toastIcon(toast.type) }}</span>
          <span class="flex-1 leading-snug">{{ toast.message }}</span>
          <button (click)="toastSvc.dismiss(toast.id)"
                  class="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 -mr-1">
            <span class="material-symbols-rounded text-base">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(100%) scale(0.95); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }
    .animate-slide-in { animation: slide-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  `]
})
export class ToastContainerComponent {
  readonly toastSvc = inject(ToastService);

  toastClass(type: string): string {
    const map: Record<string, string> = {
      success: 'bg-emerald-600',
      error:   'bg-red-600',
      info:    'bg-blue-600',
      warning: 'bg-amber-500',
    };
    return map[type] ?? 'bg-slate-700';
  }

  toastIcon(type: string): string {
    const map: Record<string, string> = {
      success: 'check_circle',
      error:   'error',
      info:    'info',
      warning: 'warning',
    };
    return map[type] ?? 'notifications';
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../../core/services/confirm.service';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'ag-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (svc.visible()) {
      <div class="fixed inset-0 z-[9998] flex items-center justify-center p-4"
           (click)="svc.resolve(false)">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in"
             (click)="$event.stopPropagation()">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 [class]="svc.opts().danger ? 'bg-red-100' : 'bg-amber-100'">
              <span class="material-symbols-rounded text-base"
                    [class]="svc.opts().danger ? 'text-red-600' : 'text-amber-600'">
                {{ svc.opts().danger ? 'delete' : 'help' }}
              </span>
            </div>
            <div>
              <h3 class="text-[15px] font-semibold text-slate-800 leading-tight">
                {{ svc.opts().title ?? 'Confirmar ação' }}
              </h3>
              <p class="text-sm text-slate-500 mt-1 leading-relaxed">{{ svc.opts().message }}</p>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button (click)="svc.resolve(false)" class="ag-btn ag-btn--secondary ag-btn--sm">
              {{ svc.opts().cancelLabel ?? 'Cancelar' }}
            </button>
            <button (click)="svc.resolve(true)"
                    class="ag-btn ag-btn--sm"
                    [class]="svc.opts().danger ? 'ag-btn--danger' : 'ag-btn--primary'">
              {{ svc.opts().confirmLabel ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes scale-in {
      from { opacity: 0; transform: scale(0.95) translateY(4px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-scale-in { animation: scale-in 180ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  `]
})
export class ConfirmDialogComponent {
  readonly svc = inject(ConfirmService);
}

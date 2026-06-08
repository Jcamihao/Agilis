import { Injectable, signal } from '@angular/core';
import { ConfirmOptions } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type Resolver = (result: boolean) => void;

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly visible = signal(false);
  readonly opts    = signal<ConfirmOptions>({ message: '' });

  private resolver: Resolver | null = null;

  open(options: ConfirmOptions): Promise<boolean> {
    this.opts.set(options);
    this.visible.set(true);
    return new Promise<boolean>((resolve) => { this.resolver = resolve; });
  }

  resolve(result: boolean) {
    this.visible.set(false);
    this.resolver?.(result);
    this.resolver = null;
  }
}

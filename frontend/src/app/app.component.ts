import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'ag-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent],
  template: `<router-outlet /><ag-toast-container /><ag-confirm-dialog />`,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  // Injected solely so the constructor runs on bootstrap and applies the
  // saved theme (data-theme attribute) before the first route renders.
  private readonly theme = inject(ThemeService);
}

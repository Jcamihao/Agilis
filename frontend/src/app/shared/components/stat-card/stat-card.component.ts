import { Component, input } from '@angular/core';

@Component({
  selector: 'agilis-stat-card',
  standalone: true,
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string>();
  readonly helper = input<string>('');
  readonly icon = input<string>('monitoring');
  readonly accent = input<'teal' | 'sky' | 'gold' | 'rose'>('teal');
}

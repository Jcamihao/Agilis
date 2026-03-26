import { Component, input } from '@angular/core';

@Component({
  selector: 'agilis-section-header',
  standalone: true,
  templateUrl: './section-header.component.html',
  styleUrl: './section-header.component.scss',
})
export class SectionHeaderComponent {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}

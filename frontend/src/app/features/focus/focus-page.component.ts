import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Task, TaskLogAction, TaskPriorityLabel } from '../../core/models/task.model';
import { WorkAssistantOverview } from '../../core/models/work-assistant.model';
import { WorkAssistantService } from '../../core/services/work-assistant.service';
import { materialImports } from '../../shared/material/material.imports';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'agilis-focus-page',
  standalone: true,
  imports: [RouterLink, ...materialImports, SectionHeaderComponent, StatCardComponent],
  templateUrl: './focus-page.component.html',
  styleUrl: './focus-page.component.scss',
})
export class FocusPageComponent {
  private readonly workAssistantService = inject(WorkAssistantService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly overview = signal<WorkAssistantOverview | null>(null);
  protected readonly focusTasks = computed(() => this.overview()?.myFocusToday.tasks ?? []);
  protected readonly priorityTasks = computed(
    () => this.overview()?.priorityEngine.topTasks ?? [],
  );
  protected readonly collectionItems = computed(
    () => this.overview()?.collectionCenter.items ?? [],
  );
  protected readonly recentEvents = computed(
    () => this.overview()?.collectionCenter.recentEvents ?? [],
  );

  constructor() {
    this.workAssistantService
      .getOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  protected trackTask(_: number, task: Task): string {
    return task.id;
  }

  protected trackEvent(
    _: number,
    event: WorkAssistantOverview['collectionCenter']['recentEvents'][number],
  ): string {
    return event.id;
  }

  protected trackCollectionItem(
    _: number,
    item: WorkAssistantOverview['collectionCenter']['items'][number],
  ): string {
    return item.task.id;
  }

  protected priorityLabel(priority: TaskPriorityLabel): string {
    switch (priority) {
      case 'CRITICAL':
        return 'Critica';
      case 'HIGH':
        return 'Alta';
      case 'MEDIUM':
        return 'Media';
      default:
        return 'Baixa';
    }
  }

  protected priorityClass(priority: TaskPriorityLabel): string {
    switch (priority) {
      case 'CRITICAL':
        return 'focus-page__priority--critical';
      case 'HIGH':
        return 'focus-page__priority--high';
      case 'MEDIUM':
        return 'focus-page__priority--medium';
      default:
        return 'focus-page__priority--low';
    }
  }

  protected eventLabel(action: TaskLogAction): string {
    switch (action) {
      case 'AUTO_ESCALATED':
        return 'Escalonamento';
      case 'AUTO_REMINDER_SENT':
        return 'Cobranca';
      default:
        return 'Evento';
    }
  }
}

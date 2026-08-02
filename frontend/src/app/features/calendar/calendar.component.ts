import {
  Component, signal, inject, OnInit, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarService } from '../../core/services/calendar.service';
import { AuthService } from '../../core/services/auth.service';
import { Task, PRIORITY_CONFIG, TASK_STATUS_CONFIG } from '../../core/models';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  format, addMonths, subMonths, addWeeks, subWeeks,
  startOfDay, endOfDay, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

@Component({
  selector: 'ag-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  private readonly calendarService = inject(CalendarService);
  private readonly auth = inject(AuthService);

  readonly PRIORITY_CONFIG = PRIORITY_CONFIG;
  readonly STATUS_CONFIG = TASK_STATUS_CONFIG;
  readonly format = format;
  readonly ptBR = ptBR;
  readonly parseISO = parseISO;
  readonly isSameDay = isSameDay;

  loading = signal(true);
  currentView = signal<CalendarView>('month');
  currentDate = signal(new Date());
  selectedDate = signal(new Date());
  allTasks = signal<Task[]>([]);
  upcomingTasks = signal<Task[]>([]);

  views: { key: CalendarView; label: string }[] = [
    { key: 'month', label: 'Mês' },
    { key: 'week',  label: 'Semana' },
    { key: 'day',   label: 'Dia' },
  ];

  weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  headerLabel = computed(() => {
    const d = this.currentDate();
    const view = this.currentView();
    if (view === 'month') return format(d, "MMMM 'de' yyyy", { locale: ptBR });
    if (view === 'week') {
      const start = startOfWeek(d, { weekStartsOn: 0 });
      const end   = endOfWeek(d,   { weekStartsOn: 0 });
      return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
    }
    return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
  });

  monthCells = computed<CalendarCell[]>(() => {
    const d = this.currentDate();
    const monthStart = startOfMonth(d);
    const monthEnd   = endOfMonth(d);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calStart, end: calEnd }).map((date) => ({
      date,
      isCurrentMonth: isSameMonth(date, d),
      isToday: isToday(date),
      tasks: this.getTasksForDay(date),
    }));
  });

  weekCells = computed<CalendarCell[]>(() => {
    const d = this.currentDate();
    const start = startOfWeek(d, { weekStartsOn: 0 });
    const end   = endOfWeek(d,   { weekStartsOn: 0 });

    return eachDayOfInterval({ start, end }).map((date) => ({
      date,
      isCurrentMonth: true,
      isToday: isToday(date),
      tasks: this.getTasksForDay(date),
    }));
  });

  dayTasks = computed(() => this.getTasksForDay(this.selectedDate()));

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const companyId = this.auth.currentCompanyId();
    if (!companyId) { this.loading.set(false); return; }

    const d = this.currentDate();
    let start: Date, end: Date;

    if (this.currentView() === 'month') {
      start = startOfWeek(startOfMonth(d), { weekStartsOn: 0 });
      end   = endOfWeek(endOfMonth(d),     { weekStartsOn: 0 });
    } else if (this.currentView() === 'week') {
      start = startOfWeek(d, { weekStartsOn: 0 });
      end   = endOfWeek(d,   { weekStartsOn: 0 });
    } else {
      start = startOfDay(d);
      end   = endOfDay(d);
    }

    this.calendarService
      .getRange(companyId, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
      .subscribe({
        next: (data) => {
          this.allTasks.set(data.tasks);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    // Load upcoming (independent)
    this.calendarService.getUpcoming(companyId, 7).subscribe({
      next: (tasks) => this.upcomingTasks.set(tasks),
    });
  }

  navigate(dir: 1 | -1) {
    const d = this.currentDate();
    if (this.currentView() === 'month') {
      this.currentDate.set(dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    } else if (this.currentView() === 'week') {
      this.currentDate.set(dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    } else {
      this.currentDate.set(new Date(d.getTime() + dir * 86_400_000));
      this.selectedDate.set(this.currentDate());
    }
    this.load();
  }

  goToToday() {
    this.currentDate.set(new Date());
    this.selectedDate.set(new Date());
    this.load();
  }

  selectDay(date: Date) {
    this.selectedDate.set(date);
    if (this.currentView() === 'month') {
      this.currentDate.set(date);
      this.currentView.set('day');
      this.load();
    }
  }

  downloadIcal() {
    const companyId = this.auth.currentCompanyId();
    if (companyId) this.calendarService.downloadIcal(companyId);
  }

  private getTasksForDay(date: Date): Task[] {
    return this.allTasks().filter((t) => {
      if (!t.dueDate) return false;
      return isSameDay(parseISO(t.dueDate), date);
    });
  }

  getTaskColor(task: Task): string {
    return task.project?.color ?? PRIORITY_CONFIG[task.priority].color;
  }
}

import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { DashboardWidget, WidgetType } from '../models';

export interface UpdateWidgetDto {
  position?: number;
  colSpan?: number;
  rowSpan?: number;
  isActive?: boolean;
  config?: any;
}

@Injectable({ providedIn: 'root' })
export class DashboardWidgetsService {
  private readonly api = inject(ApiService);

  getWidgets() {
    return this.api.get<DashboardWidget[]>('/dashboard-widgets');
  }

  updateWidget(widgetType: WidgetType, dto: UpdateWidgetDto) {
    return this.api.put<DashboardWidget>(`/dashboard-widgets/${widgetType}`, dto);
  }

  reorder(order: { widgetType: WidgetType; position: number }[]) {
    return this.api.post<DashboardWidget[]>('/dashboard-widgets/reorder', { order });
  }

  reset() {
    return this.api.delete<DashboardWidget[]>('/dashboard-widgets/reset');
  }

  getWidgetData(widgetType: WidgetType, companyId: string) {
    return this.api.get<any>(`/dashboard-widgets/${widgetType}/data`, { companyId });
  }
}

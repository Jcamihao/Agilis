import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Task, KanbanBoard } from '../models';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly api = inject(ApiService);

  getKanban(projectId: string) { return this.api.get<KanbanBoard>(`/tasks/kanban/${projectId}`); }
  getMyTasks(companyId?: string) { return this.api.get<Task[]>('/tasks/my-tasks', companyId ? { companyId } : {}); }
  getOne(id: string) { return this.api.get<Task>(`/tasks/${id}`); }

  create(data: Partial<Task>) { return this.api.post<Task>('/tasks', data); }
  update(id: string, data: Partial<Task>) { return this.api.put<Task>(`/tasks/${id}`, data); }

  moveTask(id: string, status: string, position: number) {
    return this.api.patch<Task>(`/tasks/${id}/move`, { status, position });
  }

  delete(id: string) { return this.api.delete<Task>(`/tasks/${id}`); }

  addParticipant(taskId: string, participantId: string) {
    return this.api.post<Task>(`/tasks/${taskId}/participants/${participantId}`, {});
  }

  removeParticipant(taskId: string, participantId: string) {
    return this.api.delete<Task>(`/tasks/${taskId}/participants/${participantId}`);
  }

  // Subtasks
  listSubtasks(taskId: string) { return this.api.get<Task[]>(`/tasks/${taskId}/subtasks`); }
  createSubtask(taskId: string, data: { title: string; description?: string; priority?: string; assigneeId?: string }) {
    return this.api.post<Task>(`/tasks/${taskId}/subtasks`, data);
  }
  deleteSubtask(parentId: string, subtaskId: string) {
    return this.api.delete<void>(`/tasks/${parentId}/subtasks/${subtaskId}`);
  }

  // Dependencies
  listDependencies(taskId: string) { return this.api.get<{ blockedBy: any[]; blocking: any[] }>(`/tasks/${taskId}/dependencies`); }
  addDependency(taskId: string, dependsOnId: string, type = 'BLOCKS') {
    return this.api.post<any>(`/tasks/${taskId}/dependencies`, { dependsOnId, type });
  }
  removeDependency(taskId: string, dependsOnId: string) {
    return this.api.delete<void>(`/tasks/${taskId}/dependencies/${dependsOnId}`);
  }
}

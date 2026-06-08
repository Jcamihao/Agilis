export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  telegramChatId?: string;
  cpfCnpj?: string;
  cep?: string;
  uf?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  createdAt: string;
  companies?: UserCompany[];
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { teams: number; projects: number; users: number };
}

export interface UserCompany {
  id: string;
  userId: string;
  companyId: string;
  role: UserRole;
  company: Company;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Team {
  id: string;
  name: string;
  color: string;
  companyId: string;
  createdAt: string;
  members?: TeamMember[];
  _count?: { projects: number; members: number };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: UserRole;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: UserRole;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  companyId: string;
  teamId?: string;
  isArchived: boolean;
  createdAt: string;
  team?: Pick<Team, 'id' | 'name' | 'color'>;
  company?: Pick<Company, 'id' | 'name'>;
  members?: ProjectMember[];
  _count?: { tasks: number; members: number };
}

export type TaskStatus = 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status: SprintStatus;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  position: number;
  startDate?: string;
  dueDate?: string;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  sprintId?: string;
  project?: Pick<Project, 'id' | 'name' | 'color'>;
  assignee?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  creator?: Pick<User, 'id' | 'name'>;
  sprint?: Pick<Sprint, 'id' | 'name' | 'status' | 'startDate' | 'endDate'>;
  _count?: { comments: number; subtasks?: number; timeEntries?: number };
}

export interface KanbanBoard {
  BACKLOG: Task[];
  IN_PROGRESS: Task[];
  IN_REVIEW: Task[];
  DONE: Task[];
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeProjects: number;
  recentActivities: Activity[];
}

export interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  userId: string;
  taskId?: string;
  createdAt: string;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; icon: string; class: string }
> = {
  BACKLOG: {
    label: 'Backlog',
    color: '#94a3b8',
    icon: 'circle',
    class: 'ag-status--backlog',
  },
  IN_PROGRESS: {
    label: 'Em Andamento',
    color: '#3b82f6',
    icon: 'autorenew',
    class: 'ag-status--progress',
  },
  IN_REVIEW: {
    label: 'Em Revisão',
    color: '#8b5cf6',
    icon: 'rate_review',
    class: 'ag-status--review',
  },
  DONE: {
    label: 'Concluído',
    color: '#10b981',
    icon: 'check_circle',
    class: 'ag-status--done',
  },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; icon: string; class: string }
> = {
  LOW: {
    label: 'Baixa',
    color: '#94a3b8',
    icon: 'arrow_downward',
    class: 'ag-priority--low',
  },
  MEDIUM: {
    label: 'Média',
    color: '#3b82f6',
    icon: 'drag_handle',
    class: 'ag-priority--medium',
  },
  HIGH: {
    label: 'Alta',
    color: '#f97316',
    icon: 'arrow_upward',
    class: 'ag-priority--high',
  },
  CRITICAL: {
    label: 'Crítica',
    color: '#ef4444',
    icon: 'priority_high',
    class: 'ag-priority--critical',
  },
};

// ─── V2 Models ───────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  mentions?: Mention[];
}

export interface Mention {
  id: string;
  commentId: string;
  mentionedId: string;
  mentioned: Pick<User, 'id' | 'name'>;
}

export interface Attachment {
  id: string;
  taskId: string;
  uploadedById: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENTED'
  | 'TASK_MENTIONED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_STATUS_CHANGED'
  | 'PROJECT_INVITE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface NotificationsPage {
  items: Notification[];
  total: number;
  unread: number;
  page: number;
  limit: number;
}

export type WidgetType =
  | 'MY_TASKS'
  | 'OVERDUE_TASKS'
  | 'COMPLETED_TASKS'
  | 'ACTIVE_PROJECTS'
  | 'PRODUCTIVITY_CHART'
  | 'RECENT_ACTIVITY'
  | 'TEAM_WORKLOAD';

export interface DashboardWidget {
  id: string;
  userId: string;
  widgetType: WidgetType;
  position: number;
  colSpan: number;
  rowSpan: number;
  isActive: boolean;
  config?: any;
}

export interface CalendarDay {
  date: string;
  tasks: Task[];
}

export interface CalendarRange {
  start: string;
  end: string;
  tasks: Task[];
  grouped: Record<string, Task[]>;
}

export const NOTIFICATION_CONFIG: Record<
  NotificationType,
  { icon: string; color: string }
> = {
  TASK_ASSIGNED: { icon: 'assignment_ind', color: '#6366f1' },
  TASK_COMMENTED: { icon: 'chat_bubble', color: '#3b82f6' },
  TASK_MENTIONED: { icon: 'alternate_email', color: '#8b5cf6' },
  TASK_DUE_SOON: { icon: 'schedule', color: '#f59e0b' },
  TASK_OVERDUE: { icon: 'warning', color: '#ef4444' },
  TASK_STATUS_CHANGED: { icon: 'swap_horiz', color: '#10b981' },
  PROJECT_INVITE: { icon: 'group_add', color: '#14b8a6' },
};

export const WIDGET_CONFIG: Record<
  WidgetType,
  { label: string; icon: string; description: string }
> = {
  MY_TASKS: {
    label: 'Minhas Tarefas',
    icon: 'task_alt',
    description: 'Tarefas atribuídas a você',
  },
  OVERDUE_TASKS: {
    label: 'Tarefas Atrasadas',
    icon: 'schedule',
    description: 'Tarefas com prazo vencido',
  },
  COMPLETED_TASKS: {
    label: 'Concluídas',
    icon: 'check_circle',
    description: 'Total de tarefas concluídas',
  },
  ACTIVE_PROJECTS: {
    label: 'Projetos Ativos',
    icon: 'folder_open',
    description: 'Projetos em andamento',
  },
  PRODUCTIVITY_CHART: {
    label: 'Produtividade',
    icon: 'insights',
    description: 'Tarefas concluídas por dia',
  },
  RECENT_ACTIVITY: {
    label: 'Atividade Recente',
    icon: 'history',
    description: 'Últimas ações da equipe',
  },
  TEAM_WORKLOAD: {
    label: 'Carga da Equipe',
    icon: 'group',
    description: 'Tarefas por membro',
  },
};

export type InsightType = 'RISK' | 'BOTTLENECK' | 'DELAY_PREDICTION' | 'RECOMMENDATION' | 'ACHIEVEMENT';
export type InsightSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProcessStepType = 'DOCUMENTATION' | 'CHECKLIST' | 'TASK' | 'APPROVAL';
export type ProcessStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface HealthScore {
  id: string;
  entityType: 'COMPANY' | 'TEAM' | 'PROJECT';
  entityId: string;
  companyId: string;
  score: number;
  breakdown: Record<string, number>;
  trend?: any;
  calculatedAt: string;
  label: string;
  color: string;
}

export interface HealthScoreOverview {
  company: HealthScore;
  teams: Array<{ team: Team; score: number; breakdown: any; label: string; color: string }>;
  projects: Array<{ project: Project; score: number; breakdown: any; label: string; color: string }>;
}

export interface Insight {
  id: string;
  companyId: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  isRead: boolean;
  isDismissed: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface ProcessStep {
  id: string;
  title: string;
  description?: string;
  type: ProcessStepType;
  order: number;
  content?: any;
  isRequired: boolean;
  estimatedMin?: number;
  checklistItems?: Array<{ id: string; label: string; isRequired: boolean; order: number }>;
}

export interface Process {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  teamId?: string;
  status: ProcessStatus;
  icon: string;
  color: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  steps?: ProcessStep[];
  _count?: { steps: number; instances: number };
}

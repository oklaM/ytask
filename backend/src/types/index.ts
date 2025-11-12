export interface Task {
  id: string;
  name: string;
  description?: string;
  type: 'http' | 'command' | 'script';
  config: Record<string, any>;
  triggerType: 'cron' | 'interval' | 'date';
  triggerConfig: {
    cron?: string;
    interval?: number; // milliseconds
    date?: string; // ISO string
  };
  status: 'active' | 'paused' | 'completed';
  category?: string;
  tags?: string[];
  maxRetries: number;
  retryInterval: number;
  timeout: number;
  createdAt: string;
  updatedAt: string;
  nextExecutionTime?: string;
  lastExecutionTime?: string;
}

export interface ExecutionLog {
  id: string;
  taskId: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  result?: any;
  error?: string;
  retryCount: number;
}

export interface TaskCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface SystemStats {
  totalTasks: number;
  activeTasks: number;
  pausedTasks: number;
  completedTasks: number;
  successRate: number;
  avgExecutionTime: number;
  recentExecutions: number;
}
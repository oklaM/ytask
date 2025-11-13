export interface Task {
  id: string;
  name: string;
  description?: string;
  type: 'http' | 'command' | 'script';
  config: Record<string, any>;
  triggerType: 'cron' | 'interval' | 'date' | 'visual' | 'lunar' | 'countdown' | 'conditional';
  triggerConfig: {
    // 基础定时配置
    cron?: string;
    interval?: number; // milliseconds
    date?: string; // ISO string
    
    // 可视化定时配置
    visualType?: 'once' | 'minute' | 'hour' | 'day' | 'week' | 'month';
    visualValue?: number; // 间隔值
    visualTime?: string; // 具体时间 (HH:mm)
    visualDays?: number[]; // 周几执行 (0-6, 0=周日)
    visualDate?: number; // 每月几号执行 (1-31)
    
    // 农历定时配置
    lunarYear?: number; // 农历年
    lunarMonth?: number; // 农历月
    lunarDay?: number; // 农历日
    lunarRepeat?: boolean; // 是否每年重复
    lunarFestival?: string; // 节日名称
    
    // 倒计时配置
    countdownHours?: number;
    countdownMinutes?: number;
    countdownSeconds?: number;
    countdownStartTime?: string; // 开始时间
    
    // 条件触发配置
    conditionType?: 'system_startup' | 'system_resume' | 'cpu_usage' | 'memory_usage' | 'network_activity';
    conditionValue?: number; // 条件值 (CPU使用率阈值等)
    conditionDelay?: number; // 延迟时间 (毫秒)
    conditionThreshold?: number; // 阈值
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
  taskName?: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  result?: any;
  error?: string;
  retryCount: number;
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

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
}
import axios from 'axios';
import { message } from 'antd';
import { Task, ExecutionLog, SystemStats, ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API请求错误:', error);
    message.error(error.response?.data?.error || '网络请求失败');
    return Promise.reject(error);
  }
);

export const taskApi = {
  // 获取任务列表
  getTasks: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    category?: string;
  }): Promise<ApiResponse<Task[]>> => {
    return api.get('/tasks', { params });
  },

  // 获取任务详情
  getTask: (id: string): Promise<Task> => {
    return api.get(`/tasks/${id}`);
  },

  // 创建任务
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    return api.post('/tasks', task);
  },

  // 更新任务
  updateTask: (id: string, task: Partial<Task>): Promise<Task> => {
    return api.put(`/tasks/${id}`, task);
  },

  // 删除任务
  deleteTask: (id: string): Promise<void> => {
    return api.delete(`/tasks/${id}`);
  },

  // 批量操作
  batchOperate: (action: 'start' | 'pause' | 'delete', taskIds: string[]): Promise<void> => {
    return api.post('/tasks/batch', { action, taskIds });
  },

  // 预执行任务
  previewTask: (taskData: any): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    message: string;
  }> => {
    return api.post('/tasks/preview', taskData);
  },
};

export const logsApi = {
  // 获取执行日志
  getLogs: (params?: {
    taskId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<ExecutionLog[]>> => {
    return api.get('/logs', { params });
  },
};

export const statsApi = {
  // 获取系统统计
  getStats: (): Promise<SystemStats> => {
    return api.get('/stats');
  },

  // 获取执行趋势
  getExecutionTrend: (days?: number): Promise<Array<{
    date: string;
    success: number;
    failed: number;
    total: number;
  }>> => {
    return api.get('/stats/execution-trend', { params: { days } });
  },
};

export default api;
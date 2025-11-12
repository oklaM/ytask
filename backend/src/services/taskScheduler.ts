import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/database.js';
import { Task, ExecutionLog } from '../types/index.js';
import logger from '../utils/logger.js';

class TaskScheduler {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private runningTasks: Map<string, NodeJS.Timeout> = new Map();

  async initialize() {
    logger.info('初始化任务调度器...');
    
    // 从数据库加载所有激活的任务
    const db = getDatabase();
    const activeTasks = await db.all<Task[]>(
      'SELECT * FROM tasks WHERE status = ?',
      ['active']
    );

    for (const task of activeTasks) {
      await this.scheduleTask(task);
    }

    logger.info(`已加载 ${activeTasks.length} 个激活任务`);
  }

  async scheduleTask(task: Task) {
    try {
      // 停止已存在的任务（如果存在）
      await this.stopTask(task.id);

      let scheduledTask: cron.ScheduledTask | null = null;

      if (task.triggerType === 'cron' && task.triggerConfig.cron) {
        // Cron表达式调度
        scheduledTask = cron.schedule(task.triggerConfig.cron, () => {
          this.executeTask(task);
        }, {
          scheduled: false,
          timezone: 'Asia/Shanghai'
        });

        scheduledTask.start();
        this.scheduledTasks.set(task.id, scheduledTask);

      } else if (task.triggerType === 'interval' && task.triggerConfig.interval) {
        // 间隔调度
        const timeoutId = setInterval(() => {
          this.executeTask(task);
        }, task.triggerConfig.interval);

        this.runningTasks.set(task.id, timeoutId);
      } else if (task.triggerType === 'date' && task.triggerConfig.date) {
        // 特定时间点调度
        const targetTime = new Date(task.triggerConfig.date).getTime();
        const now = Date.now();
        
        if (targetTime > now) {
          const delay = targetTime - now;
          const timeoutId = setTimeout(() => {
            this.executeTask(task);
          }, delay);

          this.runningTasks.set(task.id, timeoutId);
        }
      }

      logger.info(`任务 ${task.name} (${task.id}) 已调度`);
      return true;
    } catch (error) {
      logger.error(`调度任务失败: ${task.id}`, error);
      return false;
    }
  }

  async stopTask(taskId: string) {
    // 停止Cron任务
    const cronTask = this.scheduledTasks.get(taskId);
    if (cronTask) {
      cronTask.stop();
      this.scheduledTasks.delete(taskId);
    }

    // 停止定时器任务
    const timeoutTask = this.runningTasks.get(taskId);
    if (timeoutTask) {
      clearTimeout(timeoutTask);
      this.runningTasks.delete(taskId);
    }

    logger.info(`任务 ${taskId} 已停止`);
  }

  async executeTask(task: Task) {
    const executionId = uuidv4();
    const db = getDatabase();

    try {
      // 记录开始执行
      await db.run(
        'INSERT INTO execution_logs (id, task_id, status, started_at, retry_count) VALUES (?, ?, ?, ?, ?)',
        [executionId, task.id, 'running', new Date().toISOString(), 0]
      );

      // 更新任务信息
      await db.run(
        'UPDATE tasks SET last_execution_time = ?, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), new Date().toISOString(), task.id]
      );

      logger.info(`开始执行任务: ${task.name} (${task.id})`);

      // 模拟任务执行
      const result = await this.executeTaskLogic(task);

      // 记录执行成功
      await db.run(
        'UPDATE execution_logs SET status = ?, finished_at = ?, duration = ?, result = ? WHERE id = ?',
        ['success', new Date().toISOString(), Date.now() - new Date().getTime(), JSON.stringify(result), executionId]
      );

      logger.info(`任务执行成功: ${task.name} (${task.id})`);

    } catch (error) {
      // 记录执行失败
      await db.run(
        'UPDATE execution_logs SET status = ?, finished_at = ?, duration = ?, error = ? WHERE id = ?',
        ['failed', new Date().toISOString(), Date.now() - new Date().getTime(), (error as Error).message, executionId]
      );

      logger.error(`任务执行失败: ${task.name} (${task.id})`, error);

      // 重试逻辑
      await this.handleRetry(task, executionId, error as Error);
    }
  }

  private async executeTaskLogic(task: Task): Promise<any> {
    // 模拟不同类型的任务执行
    switch (task.type) {
      case 'http':
        // 模拟HTTP请求
        const response = await fetch(task.config.url, {
          method: task.config.method || 'GET',
          headers: task.config.headers || {},
          body: task.config.body ? JSON.stringify(task.config.body) : undefined
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();

      case 'command':
        // 模拟命令执行
        const { exec } = await import('child_process');
        return new Promise((resolve, reject) => {
          exec(task.config.command, (error, stdout, stderr) => {
            if (error) {
              reject(new Error(stderr || error.message));
            } else {
              resolve({ stdout, stderr });
            }
          });
        });

      case 'script':
        // 模拟脚本执行
        // 这里可以实现具体的脚本执行逻辑
        return { message: '脚本执行完成', task: task.name };

      default:
        throw new Error(`不支持的任务类型: ${task.type}`);
    }
  }

  private async handleRetry(task: Task, executionId: string, error: Error) {
    const db = getDatabase();
    
    // 获取当前重试次数
    const log = await db.get<ExecutionLog>(
      'SELECT * FROM execution_logs WHERE id = ?',
      [executionId]
    );

    if (log && log.retryCount < task.maxRetries) {
      // 记录重试
      await db.run(
        'UPDATE execution_logs SET retry_count = ? WHERE id = ?',
        [log.retryCount + 1, executionId]
      );

      logger.info(`任务 ${task.name} 将在 ${task.retryInterval}ms 后重试 (${log.retryCount + 1}/${task.maxRetries})`);

      // 安排重试
      setTimeout(() => {
        this.executeTask(task);
      }, task.retryInterval);
    } else {
      logger.error(`任务 ${task.name} 达到最大重试次数，停止重试`);
    }
  }

  async shutdown() {
    logger.info('正在关闭任务调度器...');

    // 停止所有Cron任务
    for (const [taskId, task] of this.scheduledTasks.entries()) {
      task.stop();
      logger.info(`已停止Cron任务: ${taskId}`);
    }
    this.scheduledTasks.clear();

    // 清除所有定时器
    for (const [taskId, timeout] of this.runningTasks.entries()) {
      clearTimeout(timeout);
      logger.info(`已停止定时器任务: ${taskId}`);
    }
    this.runningTasks.clear();

    logger.info('任务调度器已关闭');
  }
}

export const taskScheduler = new TaskScheduler();
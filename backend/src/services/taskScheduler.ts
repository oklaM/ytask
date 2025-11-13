import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/database.js';
import { Task, ExecutionLog } from '../types/index.js';
import { sandboxExecutor } from './sandboxExecutor.js';
import logger from '../utils/logger.js';

class TaskScheduler {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private runningTasks: Map<string, NodeJS.Timeout> = new Map();

  async initialize() {
    logger.info('初始化任务调度器...');
    
    // 从数据库加载所有激活的任务
    const db = getDatabase();
    const activeTasks = await db.all<Task[]>(`SELECT 
      id, name, description, type, config, trigger_type as triggerType, 
      trigger_config as triggerConfig, status, category, tags, 
      max_retries as maxRetries, retry_interval as retryInterval, timeout,
      created_at as createdAt, updated_at as updatedAt,
      next_execution_time as nextExecutionTime, last_execution_time as lastExecutionTime
    FROM tasks WHERE status = ?`, ['active']);

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
      let nextExecutionTime: string | null = null;

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
        
        // 计算下次执行时间
        nextExecutionTime = this.calculateNextExecutionTime(task);

      } else if (task.triggerType === 'interval' && task.triggerConfig.interval) {
        // 间隔调度
        const timeoutId = setInterval(() => {
          this.executeTask(task);
        }, task.triggerConfig.interval);

        this.runningTasks.set(task.id, timeoutId);
        
        // 计算下次执行时间
        nextExecutionTime = new Date(Date.now() + task.triggerConfig.interval).toISOString();
        
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
          nextExecutionTime = task.triggerConfig.date;
        }
      }

      // 更新下次执行时间到数据库
      if (nextExecutionTime) {
        const db = getDatabase();
        await db.run(
          'UPDATE tasks SET next_execution_time = ?, updated_at = ? WHERE id = ?',
          [nextExecutionTime, new Date().toISOString(), task.id]
        );
      }

      logger.info(`任务 ${task.name} (${task.id}) 已调度，下次执行时间: ${nextExecutionTime || '无'}`);
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

    // 清除下次执行时间
    const db = getDatabase();
    await db.run(
      'UPDATE tasks SET next_execution_time = NULL, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), taskId]
    );

    logger.info(`任务 ${taskId} 已停止`);
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecutionTime(task: Task): string | null {
    try {
      if (task.triggerType === 'cron' && task.triggerConfig.cron) {
        // 使用cron库计算下次执行时间
        const cronParser = require('cron-parser');
        const interval = cronParser.parseExpression(task.triggerConfig.cron, {
          tz: 'Asia/Shanghai'
        });
        const nextDate = interval.next();
        return nextDate.toISOString();
      } else if (task.triggerType === 'interval' && task.triggerConfig.interval) {
        // 间隔调度：当前时间 + 间隔时间
        const nextTime = Date.now() + task.triggerConfig.interval;
        return new Date(nextTime).toISOString();
      } else if (task.triggerType === 'date' && task.triggerConfig.date) {
        // 特定时间点调度：只执行一次，所以下次执行时间为空
        const targetTime = new Date(task.triggerConfig.date).getTime();
        const now = Date.now();
        
        if (targetTime > now) {
          return task.triggerConfig.date;
        }
        return null;
      }
      
      return null;
    } catch (error) {
      logger.error(`计算下次执行时间失败: ${task.id}`, error);
      return null;
    }
  }

  async executeTask(task: Task) {
    const executionId = uuidv4();
    const db = getDatabase();
    const startedAt = new Date();

    try {
      // 记录开始执行
      await db.run(
        'INSERT INTO execution_logs (id, task_id, status, started_at, retry_count) VALUES (?, ?, ?, ?, ?)',
        [executionId, task.id, 'running', startedAt.toISOString(), 0]
      );

      // 更新任务信息
      await db.run(
        'UPDATE tasks SET last_execution_time = ?, updated_at = ? WHERE id = ?',
        [startedAt.toISOString(), startedAt.toISOString(), task.id]
      );

      logger.info(`开始执行任务: ${task.name} (${task.id})`);

      // 模拟任务执行
      const result = await this.executeTaskLogic(task);

      // 记录执行成功
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();
      await db.run(
        'UPDATE execution_logs SET status = ?, finished_at = ?, duration = ?, result = ? WHERE id = ?',
        ['success', finishedAt.toISOString(), duration, JSON.stringify(result), executionId]
      );

      logger.info(`任务执行成功: ${task.name} (${task.id})`);

    } catch (error) {
      // 记录执行失败
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();
      await db.run(
        'UPDATE execution_logs SET status = ?, finished_at = ?, duration = ?, error = ? WHERE id = ?',
        ['failed', finishedAt.toISOString(), duration, (error as Error).message, executionId]
      );

      logger.error(`任务执行失败: ${task.name} (${task.id})`, error);

      // 重试逻辑
      await this.handleRetry(task, executionId, error as Error);
    }
  }

  async executeTaskLogic(task: Task): Promise<any> {
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
        // 使用沙盒执行器安全地执行命令
        const command = task.config.command;
        if (!command || typeof command !== 'string') {
          throw new Error('命令配置无效: command 必须是字符串');
        }
        
        const result = await sandboxExecutor.executeCommand(command, task.id, {
          timeout: task.timeout
        });
        
        if (!result.success) {
          throw new Error(`命令执行失败: ${result.stderr || '未知错误'}`);
        }
        
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code,
          duration: result.duration
        };

      case 'script':
        // 使用沙盒执行器安全地执行脚本
        const scriptContent = task.config.script;
        const language = task.config.language || 'javascript';
        
        if (!scriptContent || typeof scriptContent !== 'string') {
          throw new Error('脚本配置无效: script 必须是字符串');
        }
        
        const scriptResult = await sandboxExecutor.executeScript(scriptContent, language, task.id, {
          timeout: task.timeout
        });
        
        if (!scriptResult.success) {
          throw new Error(`脚本执行失败: ${scriptResult.stderr || '未知错误'}`);
        }
        
        return {
          stdout: scriptResult.stdout,
          stderr: scriptResult.stderr,
          code: scriptResult.code,
          duration: scriptResult.duration,
          language: language
        };

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
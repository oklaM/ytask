import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/database.js';
import { taskScheduler } from '../services/taskScheduler.js';
import { Task } from '../types/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: 获取任务列表
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 任务状态过滤
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类过滤
 *     responses:
 *       200:
 *         description: 任务列表
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, category } = req.query;
    const db = getDatabase();
    
    // 明确指定字段名，包括时间字段并转换为驼峰命名
    let query = `SELECT 
      id, name, description, type, config, trigger_type as triggerType, 
      trigger_config as triggerConfig, status, category, tags, 
      max_retries as maxRetries, retry_interval as retryInterval, timeout,
      created_at as createdAt, updated_at as updatedAt,
      next_execution_time as nextExecutionTime, last_execution_time as lastExecutionTime
    FROM tasks WHERE 1=1`;
    
    const params: any[] = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    
    const tasks = await db.all<Task[]>(query, params);
    const total = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM tasks WHERE 1=1',
      []
    );
    
    res.json({
      data: tasks,
      pagination: {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        total: total?.count || 0
      }
    });
  } catch (error) {
    logger.error('获取任务列表失败', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: 获取任务详情
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 任务详情
 *       404:
 *         description: 任务不存在
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const task = await db.get<Task>(`SELECT 
      id, name, description, type, config, trigger_type as triggerType, 
      trigger_config as triggerConfig, status, category, tags, 
      max_retries as maxRetries, retry_interval as retryInterval, timeout,
      created_at as createdAt, updated_at as updatedAt,
      next_execution_time as nextExecutionTime, last_execution_time as lastExecutionTime
    FROM tasks WHERE id = ?`, [id]);
    
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    res.json(task);
  } catch (error) {
    logger.error('获取任务详情失败', error);
    res.status(500).json({ error: '获取任务详情失败' });
  }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: 创建新任务
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       201:
 *         description: 任务创建成功
 */
router.post('/', async (req, res) => {
  try {
    const taskData = req.body;
    const db = getDatabase();
    
    const taskId = uuidv4();
    const now = new Date().toISOString();
    
    const task: Task = {
      id: taskId,
      name: taskData.name,
      description: taskData.description,
      type: taskData.type,
      config: taskData.config,
      triggerType: taskData.triggerType,
      triggerConfig: taskData.triggerConfig,
      status: 'active',
      category: taskData.category,
      tags: taskData.tags,
      maxRetries: taskData.maxRetries || 3,
      retryInterval: taskData.retryInterval || 5000,
      timeout: taskData.timeout || 30000,
      createdAt: now,
      updatedAt: now
    };
    
    await db.run(
      `INSERT INTO tasks (
        id, name, description, type, config, trigger_type, trigger_config, 
        status, category, tags, max_retries, retry_interval, timeout, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id, task.name, task.description, task.type, JSON.stringify(task.config),
        task.triggerType, JSON.stringify(task.triggerConfig), task.status,
        task.category, JSON.stringify(task.tags || []), task.maxRetries,
        task.retryInterval, task.timeout, task.createdAt, task.updatedAt
      ]
    );
    
    // 调度任务
    await taskScheduler.scheduleTask(task);
    
    res.status(201).json(task);
  } catch (error) {
    logger.error('创建任务失败', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: 更新任务
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       200:
 *         description: 任务更新成功
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const taskData = req.body;
    const db = getDatabase();
    
    const existingTask = await db.get<Task>(`SELECT 
      id, name, description, type, config, trigger_type as triggerType, 
      trigger_config as triggerConfig, status, category, tags, 
      max_retries as maxRetries, retry_interval as retryInterval, timeout,
      created_at as createdAt, updated_at as updatedAt,
      next_execution_time as nextExecutionTime, last_execution_time as lastExecutionTime
    FROM tasks WHERE id = ?`, [id]);
    if (!existingTask) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    const updatedTask: Task = {
      ...existingTask,
      ...taskData,
      updatedAt: new Date().toISOString()
    };
    
    await db.run(
      `UPDATE tasks SET 
        name = ?, description = ?, type = ?, config = ?, trigger_type = ?, 
        trigger_config = ?, status = ?, category = ?, tags = ?, 
        max_retries = ?, retry_interval = ?, timeout = ?, updated_at = ?
      WHERE id = ?`,
      [
        updatedTask.name, updatedTask.description, updatedTask.type, 
        JSON.stringify(updatedTask.config), updatedTask.triggerType,
        JSON.stringify(updatedTask.triggerConfig), updatedTask.status,
        updatedTask.category, JSON.stringify(updatedTask.tags || []),
        updatedTask.maxRetries, updatedTask.retryInterval, updatedTask.timeout,
        updatedTask.updatedAt, id
      ]
    );
    
    // 重新调度任务
    if (updatedTask.status === 'active') {
      await taskScheduler.scheduleTask(updatedTask);
    } else {
      await taskScheduler.stopTask(id);
    }
    
    res.json(updatedTask);
  } catch (error) {
    logger.error('更新任务失败', error);
    res.status(500).json({ error: '更新任务失败' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: 删除任务
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 任务删除成功
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    await taskScheduler.stopTask(id);
    await db.run('DELETE FROM tasks WHERE id = ?', [id]);
    
    res.json({ message: '任务删除成功' });
  } catch (error) {
    logger.error('删除任务失败', error);
    res.status(500).json({ error: '删除任务失败' });
  }
});

/**
 * @swagger
 * /api/tasks/batch:
 *   post:
 *     summary: 批量操作任务
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [start, pause, delete]
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 批量操作成功
 */
router.post('/batch', async (req, res) => {
  try {
    const { action, taskIds } = req.body;
    const db = getDatabase();
    
    for (const taskId of taskIds) {
      if (action === 'delete') {
        await taskScheduler.stopTask(taskId);
        await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
      } else {
        const newStatus = action === 'start' ? 'active' : 'paused';
        await db.run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', 
          [newStatus, new Date().toISOString(), taskId]);
        
        if (newStatus === 'active') {
          const task = await db.get<Task>(`SELECT 
      id, name, description, type, config, trigger_type as triggerType, 
      trigger_config as triggerConfig, status, category, tags, 
      max_retries as maxRetries, retry_interval as retryInterval, timeout,
      created_at as createdAt, updated_at as updatedAt,
      next_execution_time as nextExecutionTime, last_execution_time as lastExecutionTime
    FROM tasks WHERE id = ?`, [taskId]);
          if (task) {
            await taskScheduler.scheduleTask(task);
          }
        } else {
          await taskScheduler.stopTask(taskId);
        }
      }
    }
    
    res.json({ message: `批量${action === 'start' ? '启动' : action === 'pause' ? '暂停' : '删除'}操作成功` });
  } catch (error) {
    logger.error('批量操作失败', error);
    res.status(500).json({ error: '批量操作失败' });
  }
});

/**
 * @swagger
 * /api/tasks/preview:
 *   post:
 *     summary: 预执行任务
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [http, command, script]
 *               config:
 *                 type: object
 *               triggerType:
 *                 type: string
 *                 enum: [cron, interval, date]
 *               triggerConfig:
 *                 type: object
 *               maxRetries:
 *                 type: number
 *               retryInterval:
 *                 type: number
 *               timeout:
 *                 type: number
 *     responses:
 *       200:
 *         description: 预执行结果
 *       400:
 *         description: 参数错误
 */
router.post('/preview', async (req, res) => {
  try {
    const taskData = req.body;
    
    // 验证必填参数
    if (!taskData.name || !taskData.type || !taskData.config) {
      return res.status(400).json({ error: '任务名称、类型和配置是必填项' });
    }
    
    // 创建模拟任务对象用于预执行
    const previewTask: Task = {
      id: 'preview-' + Date.now(),
      name: taskData.name,
      description: taskData.description,
      type: taskData.type,
      config: taskData.config,
      triggerType: taskData.triggerType || 'cron',
      triggerConfig: taskData.triggerConfig || {},
      status: 'active',
      category: taskData.category,
      tags: taskData.tags || [],
      maxRetries: taskData.maxRetries || 3,
      retryInterval: taskData.retryInterval || 5000,
      timeout: taskData.timeout || 30000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 执行任务逻辑（不记录到数据库）
    const result = await taskScheduler.executeTaskLogic(previewTask);
    
    res.json({
      success: true,
      data: result,
      message: '预执行成功'
    });
    
  } catch (error) {
    logger.error('预执行失败', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message,
      message: '预执行失败'
    });
  }
});

export default router;
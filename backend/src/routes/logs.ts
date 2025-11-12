import express from 'express';
import { getDatabase } from '../database/database.js';
import { ExecutionLog } from '../types/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: 获取执行日志
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *         description: 任务ID过滤
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态过滤
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期
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
 *     responses:
 *       200:
 *         description: 执行日志列表
 */
router.get('/', async (req, res) => {
  try {
    const { taskId, status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    const db = getDatabase();
    
    let query = `
      SELECT l.*, t.name as task_name 
      FROM execution_logs l 
      LEFT JOIN tasks t ON l.task_id = t.id 
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (taskId) {
      query += ' AND l.task_id = ?';
      params.push(taskId);
    }
    
    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    
    if (startDate) {
      query += ' AND l.started_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND l.started_at <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY l.started_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize as string), (parseInt(page as string) - 1) * parseInt(pageSize as string));
    
    const logs = await db.all<ExecutionLog[]>(query, params);
    const total = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM execution_logs WHERE 1=1',
      []
    );
    
    res.json({
      data: logs,
      pagination: {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        total: total?.count || 0
      }
    });
  } catch (error) {
    logger.error('获取执行日志失败', error);
    res.status(500).json({ error: '获取执行日志失败' });
  }
});

export default router;
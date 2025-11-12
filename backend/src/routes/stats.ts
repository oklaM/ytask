import express from 'express';
import { getDatabase } from '../database/database.js';
import { SystemStats } from '../types/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: 获取系统统计信息
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: 系统统计信息
 */
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 获取任务统计
    const taskStats = await db.get<{ 
      total: number, 
      active: number, 
      paused: number, 
      completed: number 
    }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks`
    );
    
    // 获取执行统计
    const executionStats = await db.get<{ 
      success: number, 
      failed: number, 
      total: number,
      avgDuration: number
    }>(
      `SELECT 
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total,
        AVG(duration) as avgDuration
      FROM execution_logs 
      WHERE started_at >= datetime('now', '-24 hours')`
    );
    
    // 计算成功率
    const successRate = executionStats && executionStats.total > 0 
      ? (executionStats.success / executionStats.total) * 100 
      : 0;
    
    const stats: SystemStats = {
      totalTasks: taskStats?.total || 0,
      activeTasks: taskStats?.active || 0,
      pausedTasks: taskStats?.paused || 0,
      completedTasks: taskStats?.completed || 0,
      successRate: Math.round(successRate * 100) / 100,
      avgExecutionTime: Math.round((executionStats?.avgDuration || 0) * 100) / 100,
      recentExecutions: executionStats?.total || 0
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('获取统计信息失败', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

/**
 * @swagger
 * /api/stats/execution-trend:
 *   get:
 *     summary: 获取执行趋势数据
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: 天数 (默认7天)
 *     responses:
 *       200:
 *         description: 执行趋势数据
 */
router.get('/execution-trend', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const db = getDatabase();
    
    const trendData = await db.all<{
      date: string,
      success: number,
      failed: number,
      total: number
    }>(
      `SELECT 
        DATE(started_at) as date,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM execution_logs 
      WHERE started_at >= date('now', ?)
      GROUP BY DATE(started_at)
      ORDER BY date DESC`,
      [`-${days} days`]
    );
    
    res.json(Array.isArray(trendData) ? trendData.reverse() : []);
  } catch (error) {
    logger.error('获取执行趋势失败', error);
    res.status(500).json({ error: '获取执行趋势失败' });
  }
});

export default router;
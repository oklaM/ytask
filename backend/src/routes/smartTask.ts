import express from 'express';
import { chineseTimeParser } from '../services/chineseTimeParser.js';
import { taskTypeIdentifier } from '../services/taskTypeIdentifier.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/smart/parse-time:
 *   post:
 *     summary: 解析中文时间描述
 *     tags: [SmartTask]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: 中文时间描述
 *                 example: "每天上午9点"
 *     responses:
 *       200:
 *         description: 解析成功
 *       400:
 *         description: 参数错误
 */
router.post('/parse-time', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: '请输入有效的文本描述' 
      });
    }
    
    const result = chineseTimeParser.parse(text);
    
    res.json({
      success: result.success,
      data: result.success ? {
        cronExpression: result.cronExpression,
        description: result.description,
        confidence: result.confidence,
        parsedData: result.parsedData
      } : null,
      error: result.error
    });
    
  } catch (error) {
    logger.error('解析时间描述失败', error);
    res.status(500).json({ 
      success: false, 
      error: '解析时间描述失败' 
    });
  }
});

/**
 * @swagger
 * /api/smart/identify-task:
 *   post:
 *     summary: 识别任务类型
 *     tags: [SmartTask]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: 任务描述
 *                 example: "发送日报邮件到团队"
 *     responses:
 *       200:
 *         description: 识别成功
 *       400:
 *         description: 参数错误
 */
router.post('/identify-task', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: '请输入有效的任务描述' 
      });
    }
    
    const result = taskTypeIdentifier.identify(text);
    
    res.json({
      success: true,
      data: {
        type: result.type,
        confidence: result.confidence,
        config: result.config,
        suggestions: result.suggestions,
        error: result.error
      }
    });
    
  } catch (error) {
    logger.error('识别任务类型失败', error);
    res.status(500).json({ 
      success: false, 
      error: '识别任务类型失败' 
    });
  }
});

/**
 * @swagger
 * /api/smart/parse-complete:
 *   post:
 *     summary: 完整解析任务描述
 *     tags: [SmartTask]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: 完整的任务描述
 *                 example: "每天上午9点帮我发送日报邮件"
 *     responses:
 *       200:
 *         description: 解析成功
 *       400:
 *         description: 参数错误
 */
router.post('/parse-complete', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: '请输入有效的任务描述' 
      });
    }
    
    // 分离时间描述和任务内容
    const timeMatch = text.match(/每天\s*(.*?)\s*帮我\s*(.*)/);
    
    if (!timeMatch) {
      return res.status(400).json({ 
        success: false, 
        error: '请使用格式：每天[时间]帮我[任务内容]' 
      });
    }
    
    const timeDescription = timeMatch[1];
    const taskDescription = timeMatch[2];
    
    // 解析时间
    const timeResult = chineseTimeParser.parse(timeDescription);
    
    if (!timeResult.success) {
      return res.json({
        success: false,
        error: `时间解析失败: ${timeResult.error}`,
        suggestions: [
          '请确保时间格式正确，例如：上午9点、下午3点半',
          '支持的时间格式：每天/每周/每月/特定时间'
        ]
      });
    }
    
    // 识别任务类型
    const taskResult = taskTypeIdentifier.identify(taskDescription);
    
    res.json({
      success: true,
      data: {
        time: {
          description: timeDescription,
          cronExpression: timeResult.cronExpression,
          humanReadable: timeResult.description,
          confidence: timeResult.confidence,
          parsedData: timeResult.parsedData
        },
        task: {
          description: taskDescription,
          type: taskResult.type,
          confidence: taskResult.confidence,
          config: taskResult.config,
          suggestions: taskResult.suggestions
        }
      }
    });
    
  } catch (error) {
    logger.error('完整解析任务失败', error);
    res.status(500).json({ 
      success: false, 
      error: '完整解析任务失败' 
    });
  }
});

/**
 * @swagger
 * /api/smart/templates:
 *   get:
 *     summary: 获取任务模板
 *     tags: [SmartTask]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: 任务类型过滤
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/templates', async (req, res) => {
  try {
    const { type } = req.query;
    
    const templates = taskTypeIdentifier.getTaskTemplates(type as string);
    
    res.json({
      success: true,
      data: templates
    });
    
  } catch (error) {
    logger.error('获取任务模板失败', error);
    res.status(500).json({ 
      success: false, 
      error: '获取任务模板失败' 
    });
  }
});

/**
 * @swagger
 * /api/smart/validate-cron:
 *   post:
 *     summary: 验证cron表达式
 *     tags: [SmartTask]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cronExpression:
 *                 type: string
 *                 description: cron表达式
 *                 example: "0 9 * * *"
 *     responses:
 *       200:
 *         description: 验证结果
 */
router.post('/validate-cron', async (req, res) => {
  try {
    const { cronExpression } = req.body;
    
    if (!cronExpression || typeof cronExpression !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: '请输入有效的cron表达式' 
      });
    }
    
    const isValid = chineseTimeParser.validateCronExpression(cronExpression);
    const description = chineseTimeParser.getCronDescription(cronExpression);
    
    res.json({
      success: true,
      data: {
        isValid,
        description,
        cronExpression
      }
    });
    
  } catch (error) {
    logger.error('验证cron表达式失败', error);
    res.status(500).json({ 
      success: false, 
      error: '验证cron表达式失败' 
    });
  }
});

/**
 * @swagger
 * /api/smart/parse-examples:
 *   get:
 *     summary: 获取解析示例
 *     tags: [SmartTask]
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/parse-examples', async (req, res) => {
  try {
    const examples = [
      {
        input: "每天上午9点帮我发送日报邮件",
        time: "每天上午9点",
        task: "发送日报邮件",
        expected: {
          cron: "0 9 * * *",
          type: "notification",
          description: "每天 9:00 执行"
        }
      },
      {
        input: "每周三下午3点检查服务器状态",
        time: "每周三下午3点",
        task: "检查服务器状态",
        expected: {
          cron: "0 15 * * 3",
          type: "command",
          description: "每周三 15:00 执行"
        }
      },
      {
        input: "每月15号上午10点备份数据库",
        time: "每月15号上午10点",
        task: "备份数据库",
        expected: {
          cron: "0 10 15 * *",
          type: "script",
          description: "每月15号 10:00 执行"
        }
      },
      {
        input: "每30分钟检查一次API健康状态",
        time: "每30分钟",
        task: "检查API健康状态",
        expected: {
          cron: "*/30 * * * *",
          type: "http",
          description: "每30分钟执行一次"
        }
      }
    ];
    
    res.json({
      success: true,
      data: examples
    });
    
  } catch (error) {
    logger.error('获取解析示例失败', error);
    res.status(500).json({ 
      success: false, 
      error: '获取解析示例失败' 
    });
  }
});

export default router;
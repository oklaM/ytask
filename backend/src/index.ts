import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { initializeDatabase } from './database/database.js';
import { taskScheduler } from './services/taskScheduler.js';
import { swaggerSpec } from './config/swagger.js';
import taskRoutes from './routes/tasks.js';
import logRoutes from './routes/logs.js';
import statsRoutes from './routes/stats.js';
import logger from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API路由
app.use('/api/tasks', taskRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/stats', statsRoutes);

// API文档
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('服务器错误:', err);
  res.status(500).json({ 
    error: '内部服务器错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请联系管理员'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

async function startServer() {
  try {
    // 初始化数据库
    await initializeDatabase();
    logger.info('数据库初始化完成');

    // 初始化任务调度器
    await taskScheduler.initialize();
    logger.info('任务调度器初始化完成');

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器启动成功，端口: ${PORT}`);
      logger.info(`API文档地址: http://localhost:${PORT}/api/docs`);
      logger.info(`健康检查: http://localhost:${PORT}/health`);
    });

    // 优雅关闭处理
    process.on('SIGINT', async () => {
      logger.info('接收到 SIGINT 信号，正在关闭服务器...');
      await taskScheduler.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('接收到 SIGTERM 信号，正在关闭服务器...');
      await taskScheduler.shutdown();
      process.exit(0);
    });

  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
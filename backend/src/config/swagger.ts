import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '定时任务管理系统 API',
      version: '1.0.0',
      description: '功能完善的定时任务管理系统 API 文档',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器',
      },
    ],
    components: {
      schemas: {
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            name: { type: 'string', example: '数据备份任务' },
            description: { type: 'string', example: '每天凌晨执行数据库备份' },
            type: { type: 'string', enum: ['http', 'command', 'script'], example: 'command' },
            config: { type: 'object', example: { command: 'backup.sh' } },
            triggerType: { type: 'string', enum: ['cron', 'interval', 'date'], example: 'cron' },
            triggerConfig: { type: 'object', example: { cron: '0 0 * * *' } },
            status: { type: 'string', enum: ['active', 'paused', 'completed'], example: 'active' },
            category: { type: 'string', example: 'backup' },
            tags: { type: 'array', items: { type: 'string' }, example: ['daily', 'important'] },
            maxRetries: { type: 'integer', example: 3 },
            retryInterval: { type: 'integer', example: 5000 },
            timeout: { type: 'integer', example: 30000 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ExecutionLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            taskId: { type: 'string' },
            status: { type: 'string', enum: ['success', 'failed', 'running'] },
            startedAt: { type: 'string', format: 'date-time' },
            finishedAt: { type: 'string', format: 'date-time' },
            duration: { type: 'integer' },
            result: { type: 'object' },
            error: { type: 'string' },
            retryCount: { type: 'integer' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // 扫描路由文件生成文档
};

export const swaggerSpec = swaggerJSDoc(options);
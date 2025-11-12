# 定时任务管理器 API 文档

## 概述

定时任务管理器提供了一套完整的 RESTful API 接口，用于管理定时任务的创建、调度、监控和日志记录。

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **文档地址**: `http://localhost:3000/api/docs`
- **健康检查**: `GET /health`

## 认证

当前版本无需认证，所有API接口公开访问。

## 任务管理 API

### 获取任务列表

```http
GET /tasks
```

**查询参数:**
- `page` (可选): 页码，默认1
- `pageSize` (可选): 每页数量，默认10
- `status` (可选): 任务状态筛选 (active/paused/completed)
- `category` (可选): 分类筛选

**响应示例:**
```json
{
  "data": [
    {
      "id": "task-uuid",
      "name": "任务名称",
      "description": "任务描述",
      "type": "http",
      "status": "active",
      "category": "系统",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "nextExecutionTime": "2024-01-02T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 50
  }
}
```

### 获取任务详情

```http
GET /tasks/{id}
```

**路径参数:**
- `id`: 任务ID

### 创建任务

```http
POST /tasks
```

**请求体:**
```json
{
  "name": "任务名称",
  "description": "任务描述",
  "type": "http",
  "triggerType": "cron",
  "triggerConfig": {
    "cron": "0 0 * * *"
  },
  "config": {
    "url": "https://api.example.com/endpoint",
    "method": "GET",
    "headers": {},
    "body": {}
  },
  "category": "系统",
  "maxRetries": 3,
  "retryInterval": 5000,
  "timeout": 30000
}
```

### 更新任务

```http
PUT /tasks/{id}
```

**路径参数:**
- `id`: 任务ID

### 删除任务

```http
DELETE /tasks/{id}
```

**路径参数:**
- `id`: 任务ID

### 批量操作

```http
POST /tasks/batch
```

**请求体:**
```json
{
  "action": "start",
  "taskIds": ["id1", "id2"]
}
```

**支持的批量操作:**
- `start`: 启动任务
- `pause`: 暂停任务
- `delete`: 删除任务

## 日志管理 API

### 获取执行日志

```http
GET /logs
```

**查询参数:**
- `taskId` (可选): 任务ID筛选
- `status` (可选): 执行状态筛选 (success/failed/running)
- `startDate` (可选): 开始时间筛选
- `endDate` (可选): 结束时间筛选
- `page` (可选): 页码
- `pageSize` (可选): 每页数量

**响应示例:**
```json
{
  "data": [
    {
      "id": "log-uuid",
      "taskId": "task-uuid",
      "taskName": "任务名称",
      "status": "success",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "finishedAt": "2024-01-01T00:00:05.000Z",
      "duration": 5000,
      "result": "执行结果",
      "retryCount": 0
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

## 统计信息 API

### 获取系统统计

```http
GET /stats
```

**响应示例:**
```json
{
  "totalTasks": 50,
  "activeTasks": 25,
  "pausedTasks": 10,
  "completedTasks": 15,
  "successRate": 95.5,
  "avgExecutionTime": 1200,
  "recentExecutions": 100
}
```

### 获取执行趋势

```http
GET /stats/execution-trend
```

**查询参数:**
- `days` (可选): 天数，默认7天

**响应示例:**
```json
[
  {
    "date": "2024-01-01",
    "success": 10,
    "failed": 2,
    "total": 12
  }
]
```

## 错误处理

所有API接口在发生错误时返回统一格式：

```json
{
  "error": "错误类型",
  "message": "详细错误信息"
}
```

**常见错误码:**
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

## 数据模型

### Task 对象

```typescript
interface Task {
  id: string;
  name: string;
  description?: string;
  type: 'http' | 'command' | 'script';
  config: Record<string, any>;
  triggerType: 'cron' | 'interval' | 'date';
  triggerConfig: {
    cron?: string;
    interval?: number;
    date?: string;
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
```

### ExecutionLog 对象

```typescript
interface ExecutionLog {
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
```

## 集成示例

### JavaScript/Node.js

```javascript
const API_BASE = 'http://localhost:3001/api';

// 获取任务列表
async function getTasks() {
  const response = await fetch(`${API_BASE}/tasks`);
  return await response.json();
}

// 创建任务
async function createTask(taskData) {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });
  return await response.json();
}
```

### Python

```python
import requests

API_BASE = "http://localhost:3001/api"

def get_tasks():
    response = requests.get(f"{API_BASE}/tasks")
    return response.json()

def create_task(task_data):
    response = requests.post(f"{API_BASE}/tasks", json=task_data)
    return response.json()
```

## 使用限制

- API请求频率限制：无限制
- 单次请求最大数据量：10MB
- 支持的最大并发任务数：取决于服务器配置

## 版本历史

- v1.0.0 (2024-01-01): 初始版本发布
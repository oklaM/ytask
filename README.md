# 🚀 定时任务管理器

一个功能完善的定时任务管理系统，支持任务全生命周期管理、多模式触发机制、完整执行日志记录和实时监控看板。

## ✨ 功能特性

- **任务全生命周期管理**: 创建、编辑、删除、查看任务
- **多模式触发机制**: 支持Cron表达式、固定间隔、特定时间点
- **完整的执行日志记录**: 记录每次执行的详细结果和错误信息
- **实时任务状态监控**: 可视化看板展示系统运行状态
- **异常自动报警**: 失败任务自动重试和报警机制
- **现代化UI界面**: 基于Ant Design的响应式设计
- **批量操作支持**: 支持批量启动、暂停、删除任务
- **任务分类管理**: 支持任务分类和标签管理

## 🏗️ 技术架构

### 前端技术栈
- React 18 + TypeScript
- Ant Design 5.x UI组件库
- Vite 构建工具
- Axios HTTP客户端
- React Router 路由管理

### 后端技术栈
- Node.js + Express
- TypeScript
- SQLite 数据库
- node-cron 定时任务调度
- Winston 日志管理

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装依赖

```bash
# 安装根项目依赖
npm install

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 启动开发服务器

```bash
# 在项目根目录下执行
npm run dev
```

这将同时启动后端API服务器 (端口3001) 和前端开发服务器 (端口5173)。

### 构建生产版本

```bash
# 构建前端和后端
npm run build

# 启动生产服务器
npm start
```

## 📁 项目结构

```
task-scheduler/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── config/          # 配置文件
│   │   ├── database/        # 数据库相关
│   │   ├── routes/          # API路由
│   │   ├── services/        # 业务逻辑
│   │   ├── types/           # 类型定义
│   │   ├── utils/           # 工具函数
│   │   └── index.ts         # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # 前端代码
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   ├── pages/           # 页面组件
│   │   ├── services/         # API服务
│   │   ├── types/           # 类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── package.json
└── README.md
```

## 🎯 使用指南

### 创建定时任务

1. 点击"创建任务"按钮
2. 填写任务基本信息（名称、描述、分类）
3. 配置触发方式（Cron表达式、固定间隔、特定时间点）
4. 选择任务类型（HTTP请求、命令执行、脚本执行）
5. 设置高级参数（重试次数、超时时间等）
6. 保存任务

### 任务管理

- **任务列表**: 查看所有任务，支持搜索和筛选
- **任务状态**: 实时查看任务运行状态
- **批量操作**: 支持批量启动、暂停、删除任务
- **任务编辑**: 随时修改任务配置

### 监控和日志

- **系统监控看板**: 实时查看系统运行状态统计
- **执行日志**: 查看每次任务执行的详细记录
- **错误追踪**: 快速定位任务执行失败原因

## 🔧 配置说明

### 后端配置

后端配置文件位于 `backend/src/config/` 目录：

- 数据库配置: SQLite数据库文件位于 `backend/data/tasks.db`
- 端口配置: 默认端口3001，可通过环境变量 `PORT` 修改
- 日志配置: 日志文件位于 `backend/logs/` 目录

### 前端配置

前端配置文件位于 `frontend/` 目录：

- API地址: 开发环境自动代理到后端服务器
- 构建配置: Vite配置文件 `vite.config.ts`

## 📊 API文档

详细的API接口文档可在系统启动后访问：

- **API文档**: http://localhost:3001/api/docs
- **健康检查**: http://localhost:3001/health

## 🐛 故障排除

### 常见问题

1. **端口冲突**
   - 后端默认端口: 3001
   - 前端默认端口: 5173
   - 可通过环境变量修改端口

2. **数据库连接失败**
   - 检查SQLite数据库文件权限
   - 确保data目录存在且可写

3. **前端无法访问后端API**
   - 检查后端服务是否正常启动
   - 确认API地址配置正确

### 日志查看

- 后端日志: `backend/logs/` 目录
- 前端日志: 浏览器开发者工具Console

## 🤝 贡献指南

我们欢迎任何形式的贡献！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的支持：

- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)

---

**定时任务管理器** - 让定时任务管理变得简单高效！ 🎉
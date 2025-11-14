import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Space, Button, Alert } from 'antd';
import { useRequest } from 'ahooks';
import { statsApi } from '../services/api';
import { taskApi } from '../services/api';
import { SystemStats, Task } from '../types';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalTasks: 0,
    activeTasks: 0,
    pausedTasks: 0,
    completedTasks: 0,
    successRate: 0,
    avgExecutionTime: 0,
    recentExecutions: 0
  });

  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  // 获取系统统计
  const { data: statsData, loading: statsLoading } = useRequest(statsApi.getStats, {
    pollingInterval: 5000, // 5秒轮询
  });

  // 获取最近任务
  const { data: tasksData, loading: tasksLoading } = useRequest(() => 
    taskApi.getTasks({ page: 1, pageSize: 5 })
  );

  useEffect(() => {
    if (statsData) {
      setStats(statsData);
    }
  }, [statsData]);

  useEffect(() => {
    if (tasksData) {
      setRecentTasks(tasksData.data);
    }
  }, [tasksData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const taskColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'active' ? '运行中' : status === 'paused' ? '已暂停' : '已完成'}
        </Tag>
      ),
    },
    {
      title: '下次执行时间',
      dataIndex: 'nextExecutionTime',
      key: 'nextExecutionTime',
      render: (time: string) => 
        time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
    {
      title: '最后执行时间',
      dataIndex: 'lastExecutionTime',
      key: 'lastExecutionTime',
      render: (time: string) => 
        time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>系统监控看板</h1>
      
      {/* 智能任务解析功能提醒 */}
      <Alert 
        message="✨ 新功能：智能任务解析" 
        description="现在可以使用自然语言描述任务，系统会自动为您配置定时规则和任务类型。体验更智能的任务创建方式！"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        action={
          <Space>
            <Button type="link" size="small" href="/smart-examples">
              查看示例
            </Button>
            <Button type="link" size="small" href="/tasks/new">
              立即体验
            </Button>
          </Space>
        }
      />
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="总任务数"
              value={stats.totalTasks}
              valueStyle={{ color: '#1890ff' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="运行中任务"
              value={stats.activeTasks}
              valueStyle={{ color: '#52c41a' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="成功率"
              value={stats.successRate}
              precision={2}
              suffix="%"
              valueStyle={{ color: stats.successRate >= 95 ? '#52c41a' : '#faad14' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="最近执行"
              value={stats.recentExecutions}
              valueStyle={{ color: '#722ed1' }}
              loading={statsLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近任务 */}
      <Card 
        title="最近任务" 
        extra={<a href="/tasks">查看全部</a>}
      >
        <Table
          columns={taskColumns}
          dataSource={recentTasks}
          rowKey="id"
          loading={tasksLoading}
          pagination={false}
          size="small"
        />
      </Card>

      {/* 系统状态指示器 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="系统状态">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>任务调度器</span>
                <Tag color="success">正常</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>数据库连接</span>
                <Tag color="success">正常</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>API服务</span>
                <Tag color="success">正常</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>最后检查时间</span>
                <span>{dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="快速操作">
            <Space direction="vertical" style={{ width: '100%' }}>
              <a href="/tasks/new" style={{ display: 'block' }}>
                📝 创建新任务
              </a>
              <a href="/tasks" style={{ display: 'block' }}>
                📋 管理任务列表
              </a>
              <a href="/logs" style={{ display: 'block' }}>
                📊 查看执行日志
              </a>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
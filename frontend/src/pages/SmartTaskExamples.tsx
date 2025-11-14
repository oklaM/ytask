import React, { useState } from 'react';
import { Card, Row, Col, Button, Space, Typography, Tag, Alert, message, Result } from 'antd';
import { RobotOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const SmartTaskExamples: React.FC = () => {
  const navigate = useNavigate();
  const [selectedExample, setSelectedExample] = useState<string>('');

  // 智能任务示例
  const taskExamples = [
    {
      category: '日常办公',
      examples: [
        {
          title: '日报邮件发送',
          description: '每天上午9点自动发送日报邮件到团队',
          input: '每天上午9点帮我发送日报邮件到团队',
          expected: {
            type: 'http',
            cron: '0 9 * * *',
            config: {
              method: 'POST',
              url: '/api/email/send',
              body: { template: 'daily-report', recipients: 'team@company.com' }
            }
          }
        },
        {
          title: '会议提醒',
          description: '每天下午5点自动发送会议提醒',
          input: '每天下午5点提醒我参加团队会议',
          expected: {
            type: 'http',
            cron: '0 17 * * *',
            config: {
              method: 'POST',
              url: '/api/notification/send',
              body: { type: 'meeting', message: '团队会议即将开始' }
            }
          }
        }
      ]
    },
    {
      category: '系统监控',
      examples: [
        {
          title: '服务器状态检查',
          description: '每周一上午8点检查服务器状态',
          input: '每周一上午8点检查服务器状态',
          expected: {
            type: 'command',
            cron: '0 8 * * 1',
            config: {
              command: 'uptime && df -h && free -m'
            }
          }
        },
        {
          title: '磁盘空间监控',
          description: '每小时检查一次磁盘空间使用情况',
          input: '每小时检查一次磁盘空间',
          expected: {
            type: 'command',
            cron: '0 * * * *',
            config: {
              command: 'df -h | grep -v tmpfs'
            }
          }
        }
      ]
    },
    {
      category: '数据备份',
      examples: [
        {
          title: '数据库备份',
          description: '每月15号上午10点执行数据库备份',
          input: '每月15号上午10点备份数据库',
          expected: {
            type: 'script',
            cron: '0 10 15 * *',
            config: {
              script: '#!/bin/bash\n# 数据库备份脚本\npg_dump -U postgres mydb > /backup/mydb_$(date +%Y%m%d).sql'
            }
          }
        },
        {
          title: '日志清理',
          description: '每周日晚上10点清理系统日志文件',
          input: '每周日晚上10点清理系统日志',
          expected: {
            type: 'command',
            cron: '0 22 * * 0',
            config: {
              command: 'find /var/log -name "*.log" -mtime +7 -delete'
            }
          }
        }
      ]
    },
    {
      category: '开发任务',
      examples: [
        {
          title: '单元测试',
          description: '每天上午8点运行单元测试',
          input: '每天上午8点运行单元测试',
          expected: {
            type: 'command',
            cron: '0 8 * * *',
            config: {
              command: 'npm test'
            }
          }
        },
        {
          title: '代码部署',
          description: '每周五晚上8点自动部署新版本',
          input: '每周五晚上8点部署新版本',
          expected: {
            type: 'script',
            cron: '0 20 * * 5',
            config: {
              script: '#!/bin/bash\n# 自动部署脚本\ngit pull origin main && npm install && npm run build'
            }
          }
        }
      ]
    }
  ];

  const handleTryExample = (example: any) => {
    setSelectedExample(example.input);
    
    // 跳转到任务创建页面，并传递示例数据
    navigate('/tasks/new', { 
      state: { 
        smartDescription: example.input,
        exampleData: example
      }
    });
  };

  const handleQuickCreate = (example: any) => {
    message.info(`正在为您创建「${example.title}」任务...`);
    
    // 模拟快速创建任务（实际项目中会调用API）
    setTimeout(() => {
      message.success(`任务「${example.title}」创建成功！`);
      navigate('/tasks');
    }, 1500);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <RobotOutlined style={{ color: '#1890ff', marginRight: 12 }} />
        智能任务示例
      </Title>
      
      <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
        查看这些智能任务示例，了解如何使用自然语言创建各种类型的定时任务。
        点击"尝试示例"可以直接在任务创建页面中体验智能解析功能。
      </Paragraph>

      <Alert 
        message="智能解析功能" 
        description="系统能够理解中文自然语言描述的时间表达和任务类型，自动生成相应的Cron表达式和任务配置。您只需用简单的语言描述您想要的任务，系统会自动完成复杂的配置工作。"
        type="info"
        style={{ marginBottom: '32px' }}
      />

      {taskExamples.map((category, categoryIndex) => (
        <Card 
          key={categoryIndex} 
          title={category.category}
          style={{ marginBottom: '24px' }}
          extra={
            <Tag color="blue">{category.examples.length} 个示例</Tag>
          }
        >
          <Row gutter={[16, 16]}>
            {category.examples.map((example, exampleIndex) => (
              <Col xs={24} sm={12} lg={8} key={exampleIndex}>
                <Card 
                  size="small"
                  hoverable
                  style={{ height: '100%' }}
                  actions={[
                    <Button 
                      type="link" 
                      icon={<RobotOutlined />}
                      onClick={() => handleTryExample(example)}
                    >
                      尝试示例
                    </Button>,
                    <Button 
                      type="primary" 
                      size="small"
                      icon={<ThunderboltOutlined />}
                      onClick={() => handleQuickCreate(example)}
                    >
                      快速创建
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={example.title}
                    description={
                      <div>
                        <div style={{ marginBottom: '8px' }}>
                          {example.description}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <strong>输入示例：</strong>
                          <br />
                          "{example.input}"
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <Tag color="green">{example.expected.type}</Tag>
                          <Tag color="orange">{example.expected.cron}</Tag>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      ))}

      <Card title="开始使用智能任务" style={{ marginTop: '32px' }}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="准备好体验智能任务解析了吗？"
          subTitle="选择上面的示例开始体验，或者直接前往任务创建页面"
          extra={[
            <Button 
              key="create" 
              type="primary" 
              size="large"
              onClick={() => navigate('/tasks/new')}
            >
              创建新任务
            </Button>,
            <Button 
              key="tasks" 
              size="large"
              onClick={() => navigate('/tasks')}
            >
              查看任务列表
            </Button>
          ]}
        />
      </Card>
    </div>
  );
};

export default SmartTaskExamples;
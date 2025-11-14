import React, { useState } from 'react';
import { Card, Input, Button, Switch, Row, Col, Alert, Typography, Tag, message, Spin, Collapse, Space } from 'antd';
import { RobotOutlined, ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { smartTaskApi } from '../services/api';

const { TextArea } = Input;
const { Panel } = Collapse;

interface SmartTaskParserProps {
  onParseComplete?: (result: any) => void;
}

const SmartTaskParser: React.FC<SmartTaskParserProps> = ({ onParseComplete }) => {
  const [smartDescription, setSmartDescription] = useState('');
  const [smartParsing, setSmartParsing] = useState(false);
  const [parsingResult, setParsingResult] = useState<any>(null);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // 智能解析示例
  const examples = [
    {
      title: '日常任务',
      examples: [
        { desc: '每天上午9点帮我发送日报邮件', prompt: '自动配置HTTP请求定时任务' },
        { desc: '每周一上午8点检查服务器状态', prompt: '自动配置命令检查任务' },
        { desc: '每月15号上午10点备份数据库', prompt: '自动配置数据库备份任务' },
        { desc: '每30分钟检查一次API健康状态', prompt: '自动配置健康检查任务' },
        { desc: '每小时清理一次临时文件', prompt: '自动配置系统清理任务' }
      ]
    },
    {
      title: '通知任务',
      examples: [
        { desc: '每天下午5点提醒我开会', prompt: '自动配置定时提醒任务' },
        { desc: '每周五提醒我写周报', prompt: '自动配置周报提醒任务' },
        { desc: '每月初提醒我交房租', prompt: '自动配置账单提醒任务' },
        { desc: '每天上午10点发送工作安排', prompt: '自动配置日程推送任务' }
      ]
    },
    {
      title: '系统任务',
      examples: [
        { desc: '每周日晚上10点清理系统日志', prompt: '自动配置日志清理任务' },
        { desc: '每天凌晨2点执行数据备份', prompt: '自动配置数据备份任务' },
        { desc: '每小时检查一次磁盘空间', prompt: '自动配置系统监控任务' },
        { desc: '每6小时重启一次服务', prompt: '自动配置服务维护任务' }
      ]
    },
    {
      title: '开发任务',
      examples: [
        { desc: '每天上午8点运行单元测试', prompt: '自动配置测试任务' },
        { desc: '每周五晚上8点部署新版本', prompt: '自动配置部署任务' },
        { desc: '每分钟检查代码仓库更新', prompt: '自动配置代码同步任务' },
        { desc: '每天中午12点生成项目报告', prompt: '自动配置报告生成任务' }
      ]
    }
  ];

  // 智能解析任务描述
  const handleSmartParse = async () => {
    if (!smartDescription.trim()) {
      message.warning('请输入任务描述');
      return;
    }

    setParsingLoading(true);
    try {
      const result = await smartTaskApi.parseComplete(smartDescription);
      
      if (result.success && result.data) {
        setParsingResult(result.data);
        
        // 调用父组件的回调函数
        if (onParseComplete) {
          onParseComplete(result.data);
        }
        
        message.success(`智能解析成功！识别为${result.data.task.type}任务`);
      } else {
        message.error(result.error || '智能解析失败');
      }
    } catch (error) {
      message.error('智能解析出错');
    } finally {
      setParsingLoading(false);
    }
  };

  // 应用示例
  const applyExample = (example: string) => {
    setSmartDescription(example);
    message.info('示例已填充，请点击"智能解析"按钮');
  };

  return (
    <Card 
      title={
        <span>
          <RobotOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          智能任务解析
        </span>
      }
      className="smart-task-parser"
      extra={
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<InfoCircleOutlined />}
            onClick={() => setShowExamples(!showExamples)}
          >
            {showExamples ? '隐藏示例' : '查看示例'}
          </Button>
          <Switch 
            checked={smartParsing} 
            onChange={setSmartParsing}
            checkedChildren="已开启"
            unCheckedChildren="已关闭"
          />
        </Space>
      }
    >
      <Alert 
        message="使用自然语言描述任务，系统将自动解析并生成任务配置" 
        type="info" 
        style={{ marginBottom: 16 }}
      />
      
      {showExamples && (
        <div style={{ marginBottom: 16 }}>
          <Collapse defaultActiveKey={['0']}>
            {examples.map((category, categoryIndex) => (
              <Panel header={category.title} key={categoryIndex}>
                <Row gutter={[8, 8]}>
                  {category.examples.map((example, exampleIndex) => (
                    <Col span={12} key={exampleIndex}>
                      <Card 
                        size="small" 
                        hoverable
                        onClick={() => applyExample(example.desc)}
                        style={{ cursor: 'pointer', height: '100%' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ThunderboltOutlined style={{ color: '#52c41a' }} />
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                              {example.desc}
                            </div>
                            <div style={{ fontSize: '10px', color: '#666' }}>
                              {example.prompt}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Panel>
            ))}
          </Collapse>
        </div>
      )}
      
      <Row gutter={16}>
        <Col span={18}>
          <TextArea
            rows={4}
            placeholder="请输入任务描述，例如：每天上午9点帮我发送日报邮件到团队"
            value={smartDescription}
            onChange={(e) => setSmartDescription(e.target.value)}
            disabled={!smartParsing}
          />
        </Col>
        <Col span={6}>
          <Button 
            type="primary" 
            icon={<RobotOutlined />} 
            loading={parsingLoading}
            onClick={handleSmartParse}
            style={{ height: '100%', width: '100%' }}
            disabled={!smartParsing}
          >
            智能解析
          </Button>
        </Col>
      </Row>
      
      {parsingLoading && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Spin size="large" />
          <div style={{ marginTop: 8, color: '#666' }}>正在智能解析中...</div>
        </div>
      )}
      
      {parsingResult && !parsingLoading && (
        <div style={{ marginTop: 16, padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
          <Typography.Text strong>解析结果：</Typography.Text>
          
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Tag color="blue">任务类型：{parsingResult.task?.type || '未知'}</Tag>
            <Tag color="green">执行时间：{parsingResult.time?.humanReadable || '未知'}</Tag>
            <Tag color="orange">置信度：{Math.round((parsingResult.time?.confidence || 0) * 100)}%</Tag>
            {parsingResult.time?.cronExpression && (
              <Tag color="purple">Cron：{parsingResult.time.cronExpression}</Tag>
            )}
          </div>
          
          {parsingResult.task?.suggestions && parsingResult.task.suggestions.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">
                建议：{parsingResult.task.suggestions.join(', ')}
              </Typography.Text>
            </div>
          )}
          
          {parsingResult.task?.config && (
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">
                配置详情：{JSON.stringify(parsingResult.task.config, null, 2)}
              </Typography.Text>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default SmartTaskParser;
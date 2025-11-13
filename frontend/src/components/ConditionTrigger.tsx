import React, { useState, useEffect } from 'react';
import { Card, Select, InputNumber, Row, Col, Typography, Tag, Space, Divider, Alert, Progress, Switch } from 'antd';
import { DesktopOutlined, PoweroffOutlined, DashboardOutlined, WifiOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface ConditionTriggerProps {
  value?: any;
  onChange?: (value: any) => void;
}

const ConditionTrigger: React.FC<ConditionTriggerProps> = ({ value = {}, onChange }) => {
  const [conditionType, setConditionType] = useState<'system_startup' | 'system_resume' | 'cpu_usage' | 'memory_usage' | 'network_activity'>(
    value.conditionType || 'system_startup'
  );
  const [conditionValue, setConditionValue] = useState<number>(value.conditionValue || 30);
  const [conditionDelay, setConditionDelay] = useState<number>(value.conditionDelay || 5000);
  const [conditionThreshold, setConditionThreshold] = useState<number>(value.conditionThreshold || 80);

  // 模拟系统状态数据
  const [systemStatus, setSystemStatus] = useState({
    cpuUsage: 45,
    memoryUsage: 65,
    networkActive: true,
    isSystemRunning: true
  });

  useEffect(() => {
    const config = {
      conditionType,
      conditionValue,
      conditionDelay,
      conditionThreshold
    };
    
    if (onChange) {
      onChange(config);
    }
  }, [conditionType, conditionValue, conditionDelay, conditionThreshold]);

  // 模拟系统状态更新
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        cpuUsage: Math.min(100, Math.max(5, prev.cpuUsage + (Math.random() - 0.5) * 20)),
        memoryUsage: Math.min(100, Math.max(10, prev.memoryUsage + (Math.random() - 0.5) * 10)),
        networkActive: prev.networkActive,
        isSystemRunning: prev.isSystemRunning
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // 检查条件是否满足
  const isConditionMet = () => {
    switch (conditionType) {
      case 'cpu_usage':
        return systemStatus.cpuUsage <= conditionValue;
      case 'memory_usage':
        return systemStatus.memoryUsage <= conditionValue;
      case 'network_activity':
        return systemStatus.networkActive;
      default:
        return true; // 对于系统启动/恢复，假设条件满足
    }
  };

  // 获取条件描述
  const getConditionDescription = () => {
    switch (conditionType) {
      case 'system_startup':
        return `系统启动后 ${conditionDelay / 1000} 秒执行`;
      case 'system_resume':
        return `系统从休眠恢复后 ${conditionDelay / 1000} 秒执行`;
      case 'cpu_usage':
        return `CPU 使用率低于 ${conditionValue}% 时执行`;
      case 'memory_usage':
        return `内存使用率低于 ${conditionValue}% 时执行`;
      case 'network_activity':
        return `网络活动检测到后执行`;
      default:
        return '请选择触发条件';
    }
  };

  // 获取当前状态描述
  const getCurrentStatus = () => {
    switch (conditionType) {
      case 'cpu_usage':
        return `当前 CPU 使用率: ${systemStatus.cpuUsage.toFixed(1)}%`;
      case 'memory_usage':
        return `当前内存使用率: ${systemStatus.memoryUsage.toFixed(1)}%`;
      case 'network_activity':
        return `当前网络状态: ${systemStatus.networkActive ? '活跃' : '闲置'}`;
      case 'system_startup':
        return `系统状态: ${systemStatus.isSystemRunning ? '运行中' : '已关机'}`;
      case 'system_resume':
        return `系统状态: ${systemStatus.isSystemRunning ? '运行中' : '休眠中'}`;
      default:
        return '状态监控中...';
    }
  };

  return (
    <Card 
      title={
        <Space>
          <DashboardOutlined />
          <span>条件触发配置</span>
          <Tag color="purple">智能监控</Tag>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* 条件类型选择 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <div>
            <Text type="secondary">触发条件类型</Text>
            <Select
              value={conditionType}
              onChange={setConditionType}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value="system_startup">
                <Space>
                  <PoweroffOutlined />
                  系统启动后执行
                </Space>
              </Option>
              <Option value="system_resume">
                <Space>
                  <DesktopOutlined />
                  休眠恢复后执行
                </Space>
              </Option>
              <Option value="cpu_usage">
                <Space>
                  <DashboardOutlined />
                  CPU使用率低时
                </Space>
              </Option>
              <Option value="memory_usage">
                <Space>
                  <DashboardOutlined />
                  内存使用率低时
                </Space>
              </Option>
              <Option value="network_activity">
                <Space>
                  <WifiOutlined />
                  网络活动时
                </Space>
              </Option>
            </Select>
          </div>
        </Col>

        {/* 条件值配置 */}
        {(conditionType === 'cpu_usage' || conditionType === 'memory_usage') && (
          <Col span={12}>
            <div>
              <Text type="secondary">
                {conditionType === 'cpu_usage' ? 'CPU使用率阈值' : '内存使用率阈值'}
              </Text>
              <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                <InputNumber
                  value={conditionValue}
                  onChange={value => setConditionValue(value || 0)}
                  min={1}
                  max={100}
                  style={{ width: '100%' }}
                  suffix="%"
                />
              </Space.Compact>
            </div>
          </Col>
        )}

        {/* 延迟时间配置 */}
        {(conditionType === 'system_startup' || conditionType === 'system_resume') && (
          <Col span={12}>
            <div>
              <Text type="secondary">延迟时间</Text>
              <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                <InputNumber
                  value={conditionDelay / 1000}
                  onChange={value => setConditionDelay((value || 0) * 1000)}
                  min={1}
                  max={300}
                  style={{ width: '100%' }}
                  prefix="延迟"
                  suffix="秒"
                />
              </Space.Compact>
            </div>
          </Col>
        )}
      </Row>

      <Divider />

      {/* 系统状态监控 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>系统状态监控</Text>
        
        {/* CPU 使用率 */}
        {(conditionType === 'cpu_usage' || conditionType === 'system_startup' || conditionType === 'system_resume') && (
          <div style={{ marginTop: 12 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text>CPU 使用率</Text>
              <Text>{systemStatus.cpuUsage.toFixed(1)}%</Text>
            </Space>
            <Progress 
              percent={systemStatus.cpuUsage} 
              status={systemStatus.cpuUsage > 80 ? 'exception' : 'active'}
              strokeColor={{
                '0%': '#87d068',
                '50%': '#108ee9',
                '100%': '#ff4d4f',
              }}
            />
          </div>
        )}

        {/* 内存使用率 */}
        {(conditionType === 'memory_usage' || conditionType === 'system_startup' || conditionType === 'system_resume') && (
          <div style={{ marginTop: 12 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text>内存使用率</Text>
              <Text>{systemStatus.memoryUsage.toFixed(1)}%</Text>
            </Space>
            <Progress 
              percent={systemStatus.memoryUsage} 
              status={systemStatus.memoryUsage > 85 ? 'exception' : 'active'}
            />
          </div>
        )}

        {/* 网络状态 */}
        {conditionType === 'network_activity' && (
          <div style={{ marginTop: 12 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text>网络状态</Text>
              <Tag color={systemStatus.networkActive ? 'green' : 'default'}>
                {systemStatus.networkActive ? '活跃' : '闲置'}
              </Tag>
            </Space>
          </div>
        )}
      </div>

      {/* 条件状态指示器 */}
      <div style={{ 
        background: isConditionMet() ? '#f6ffed' : '#fff2e8', 
        border: `1px solid ${isConditionMet() ? '#b7eb8f' : '#ffd591'}`,
        padding: 12, 
        borderRadius: 6,
        marginBottom: 16
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>
            {isConditionMet() ? '✅ 条件已满足' : '⏳ 条件未满足'}
          </Text>
          <Text type="secondary">{getCurrentStatus()}</Text>
          {isConditionMet() && conditionType.includes('_usage') && (
            <Text type="success" style={{ fontSize: 12 }}>
              当前资源使用率已达到触发条件，任务将在满足条件时执行
            </Text>
          )}
          {!isConditionMet() && conditionType.includes('_usage') && (
            <Text type="warning" style={{ fontSize: 12 }}>
              当前资源使用率尚未达到触发条件，请等待资源释放
            </Text>
          )}
        </Space>
      </div>

      {/* 定时预览 */}
      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>触发条件预览</Text>
          <Text>{getConditionDescription()}</Text>
          <Text type="secondary">
            条件状态：{isConditionMet() ? '已满足' : '未满足'}
          </Text>
        </Space>
      </div>

      {/* 使用场景说明 */}
      <Alert 
        message="使用场景"
        description={
          <div>
            <p><strong>系统启动后：</strong>适合开机自启动的初始化任务</p>
            <p><strong>休眠恢复后：</strong>适合系统唤醒后的同步任务</p>
            <p><strong>CPU/内存使用率低时：</strong>适合在系统空闲时执行资源密集型任务</p>
            <p><strong>网络活动时：</strong>适合在网络连接建立后执行网络相关任务</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Card>
  );
};

export default ConditionTrigger;
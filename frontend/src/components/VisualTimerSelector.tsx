import React, { useState, useEffect } from 'react';
import { Card, Select, InputNumber, TimePicker, Checkbox, Row, Col, Typography, Tag, Space, Divider } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, SyncOutlined, PlayCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { Text } = Typography;

interface VisualTimerSelectorProps {
  value?: any;
  onChange?: (value: any) => void;
}

const VisualTimerSelector: React.FC<VisualTimerSelectorProps> = ({ value = {}, onChange }) => {
  const [visualType, setVisualType] = useState<'once' | 'minute' | 'hour' | 'day' | 'week' | 'month'>(
    value.visualType || 'once'
  );
  const [visualValue, setVisualValue] = useState<number>(value.visualValue || 1);
  const [visualTime, setVisualTime] = useState<string>(value.visualTime || '09:00');
  const [visualDays, setVisualDays] = useState<number[]>(value.visualDays || []);
  const [visualDate, setVisualDate] = useState<number>(value.visualDate || 1);

  useEffect(() => {
    const config = {
      visualType,
      visualValue,
      visualTime,
      visualDays,
      visualDate
    };
    
    if (onChange) {
      onChange(config);
    }
  }, [visualType, visualValue, visualTime, visualDays, visualDate]);

  // 获取下一次执行时间预览
  const getNextExecutionTime = () => {
    const now = new Date();
    let nextTime = new Date(now);

    switch (visualType) {
      case 'once':
        if (visualTime) {
          const [hours, minutes] = visualTime.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
          if (nextTime <= now) {
            nextTime.setDate(nextTime.getDate() + 1);
          }
        }
        break;
      
      case 'minute':
        nextTime.setMinutes(now.getMinutes() + visualValue);
        break;
      
      case 'hour':
        nextTime.setHours(now.getHours() + visualValue);
        break;
      
      case 'day':
        nextTime.setDate(now.getDate() + visualValue);
        if (visualTime) {
          const [hours, minutes] = visualTime.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
        }
        break;
      
      case 'week':
        const currentDay = now.getDay();
        const nextDay = visualDays.length > 0 ? Math.min(...visualDays.filter(d => d > currentDay)) : currentDay;
        if (nextDay > currentDay) {
          nextTime.setDate(now.getDate() + (nextDay - currentDay));
        } else {
          nextTime.setDate(now.getDate() + (7 - currentDay + nextDay));
        }
        if (visualTime) {
          const [hours, minutes] = visualTime.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
        }
        break;
      
      case 'month':
        nextTime.setMonth(now.getMonth() + 1);
        nextTime.setDate(visualDate);
        if (visualTime) {
          const [hours, minutes] = visualTime.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
        }
        break;
    }

    return nextTime.toLocaleString('zh-CN');
  };

  // 周几选择器
  const weekDays = [
    { label: '周日', value: 0 },
    { label: '周一', value: 1 },
    { label: '周二', value: 2 },
    { label: '周三', value: 3 },
    { label: '周四', value: 4 },
    { label: '周五', value: 5 },
    { label: '周六', value: 6 }
  ];

  // 获取定时器描述
  const getTimerDescription = () => {
    switch (visualType) {
      case 'once':
        return `一次性定时：每天 ${visualTime} 执行`;
      case 'minute':
        return `每 ${visualValue} 分钟执行一次`;
      case 'hour':
        return `每 ${visualValue} 小时执行一次`;
      case 'day':
        return `每 ${visualValue} 天 ${visualTime} 执行`;
      case 'week':
        const selectedDays = visualDays.map(d => weekDays.find(w => w.value === d)?.label).join('、');
        return `每周 ${selectedDays} ${visualTime} 执行`;
      case 'month':
        return `每月 ${visualDate} 日 ${visualTime} 执行`;
      default:
        return '请选择定时类型';
    }
  };

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined />
          <span>可视化定时配置</span>
          <Tag color="blue">推荐</Tag>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* 定时类型选择 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <div>
            <Text type="secondary">定时类型</Text>
            <Select
              value={visualType}
              onChange={setVisualType}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value="once">
                <Space>
                  <PlayCircleOutlined />
                  一次性定时
                </Space>
              </Option>
              <Option value="minute">
                <Space>
                  <SyncOutlined />
                  分钟循环
                </Space>
              </Option>
              <Option value="hour">
                <Space>
                  <SyncOutlined />
                  小时循环
                </Space>
              </Option>
              <Option value="day">
                <Space>
                  <CalendarOutlined />
                  每日循环
                </Space>
              </Option>
              <Option value="week">
                <Space>
                  <CalendarOutlined />
                  每周循环
                </Space>
              </Option>
              <Option value="month">
                <Space>
                  <CalendarOutlined />
                  每月循环
                </Space>
              </Option>
            </Select>
          </div>
        </Col>

        {/* 间隔值配置 */}
        {(visualType === 'minute' || visualType === 'hour' || visualType === 'day') && (
          <Col span={8}>
            <div>
              <Text type="secondary">
                {visualType === 'minute' ? '分钟间隔' : 
                 visualType === 'hour' ? '小时间隔' : '天数间隔'}
              </Text>
              <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                <InputNumber
                  value={visualValue}
                  onChange={setVisualValue}
                  min={1}
                  max={visualType === 'minute' ? 60 : visualType === 'hour' ? 24 : 31}
                  style={{ width: '100%' }}
                  prefix={
                    visualType === 'minute' ? '分钟' : 
                    visualType === 'hour' ? '小时' : '天'
                  }
                />
              </Space.Compact>
            </div>
          </Col>
        )}

        {/* 具体时间配置 */}
        {(visualType === 'once' || visualType === 'day' || visualType === 'week' || visualType === 'month') && (
          <Col span={8}>
            <div>
              <Text type="secondary">执行时间</Text>
              <div style={{ marginTop: 8 }}>
                <TimePicker
                  value={visualTime ? dayjs(visualTime, 'HH:mm') : undefined}
                  onChange={(time, timeString) => setVisualTime(timeString)}
                  format="HH:mm"
                  style={{ width: '100%' }}
                  placeholder="选择时间"
                />
              </div>
            </div>
          </Col>
        )}
      </Row>

      {/* 周几选择（仅周循环） */}
      {visualType === 'week' && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">选择周几执行</Text>
          <div style={{ marginTop: 8 }}>
            <Checkbox.Group
              value={visualDays}
              onChange={setVisualDays}
              style={{ width: '100%' }}
            >
              <Row gutter={[8, 8]}>
                {weekDays.map(day => (
                  <Col span={8} key={day.value}>
                    <Checkbox value={day.value}>
                      {day.label}
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </div>
        </div>
      )}

      {/* 每月几号选择（仅月循环） */}
      {visualType === 'month' && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">每月几号执行</Text>
          <InputNumber
            value={visualDate}
            onChange={setVisualDate}
            min={1}
            max={31}
            style={{ width: '100%', marginTop: 8 }}
            addonBefore="每月"
            addonAfter="号"
          />
        </div>
      )}

      <Divider />

      {/* 定时预览 */}
      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>定时预览</Text>
          <Text>{getTimerDescription()}</Text>
          <Text type="secondary">
            下一次执行时间：{getNextExecutionTime()}
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default VisualTimerSelector;
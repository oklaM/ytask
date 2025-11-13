import React, { useState, useEffect } from 'react';
import { Card, InputNumber, Button, Progress, Typography, Space, Row, Col, Tag, Divider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CountdownTimerProps {
  value?: any;
  onChange?: (value: any) => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ value = {}, onChange }) => {
  const [countdownHours, setCountdownHours] = useState<number>(value.countdownHours || 0);
  const [countdownMinutes, setCountdownMinutes] = useState<number>(value.countdownMinutes || 0);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(value.countdownSeconds || 0);
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    const config = {
      countdownHours,
      countdownMinutes,
      countdownSeconds,
      countdownStartTime: startTime?.toISOString()
    };
    
    if (onChange) {
      onChange(config);
    }
  }, [countdownHours, countdownMinutes, countdownSeconds, startTime]);

  // 计算总秒数
  const getTotalSeconds = () => {
    return countdownHours * 3600 + countdownMinutes * 60 + countdownSeconds;
  };

  // 开始倒计时
  const startCountdown = () => {
    const totalSeconds = getTotalSeconds();
    if (totalSeconds <= 0) return;
    
    setIsRunning(true);
    setStartTime(new Date());
    setRemainingTime(totalSeconds);
  };

  // 暂停倒计时
  const pauseCountdown = () => {
    setIsRunning(false);
  };

  // 重置倒计时
  const resetCountdown = () => {
    setIsRunning(false);
    setStartTime(null);
    setRemainingTime(getTotalSeconds());
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 倒计时动画
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, remainingTime]);

  // 计算进度百分比
  const getProgressPercent = () => {
    const totalSeconds = getTotalSeconds();
    if (totalSeconds === 0) return 0;
    return ((totalSeconds - remainingTime) / totalSeconds) * 100;
  };

  // 获取剩余时间描述
  const getTimeDescription = () => {
    if (!isRunning && remainingTime === 0 && getTotalSeconds() > 0) {
      return '倒计时已完成';
    }
    if (!isRunning && remainingTime > 0) {
      return '倒计时已暂停';
    }
    if (isRunning) {
      return '倒计时进行中';
    }
    return '设置倒计时时间';
  };

  return (
    <Card 
      title={
        <Space>
          <PlayCircleOutlined />
          <span>倒计时触发</span>
          <Tag color="green">实时预览</Tag>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* 时间设置 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <div>
            <Text type="secondary">小时</Text>
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                value={countdownHours}
                onChange={value => setCountdownHours(value || 0)}
                min={0}
                max={23}
                style={{ width: '100%' }}
                disabled={isRunning}
                prefix="H"
              />
            </Space.Compact>
          </div>
        </Col>
        <Col span={8}>
          <div>
            <Text type="secondary">分钟</Text>
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                value={countdownMinutes}
                onChange={value => setCountdownMinutes(value || 0)}
                min={0}
                max={59}
                style={{ width: '100%' }}
                disabled={isRunning}
                prefix="M"
              />
            </Space.Compact>
          </div>
        </Col>
        <Col span={8}>
          <div>
            <Text type="secondary">秒钟</Text>
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                value={countdownSeconds}
                onChange={value => setCountdownSeconds(value || 0)}
                min={0}
                max={59}
                style={{ width: '100%' }}
                disabled={isRunning}
                prefix="S"
              />
            </Space.Compact>
          </div>
        </Col>
      </Row>

      {/* 控制按钮 */}
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col>
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={startCountdown}
            disabled={isRunning || getTotalSeconds() <= 0}
          >
            开始
          </Button>
        </Col>
        <Col>
          <Button 
            icon={<PauseCircleOutlined />}
            onClick={pauseCountdown}
            disabled={!isRunning}
          >
            暂停
          </Button>
        </Col>
        <Col>
          <Button 
            icon={<ReloadOutlined />}
            onClick={resetCountdown}
            disabled={!startTime}
          >
            重置
          </Button>
        </Col>
      </Row>

      <Divider />

      {/* 倒计时显示 */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff', marginBottom: 8 }}>
          {formatTime(remainingTime || getTotalSeconds())}
        </div>
        <Text type="secondary">{getTimeDescription()}</Text>
      </div>

      {/* 进度条 */}
      {getTotalSeconds() > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Progress 
            percent={getProgressPercent()} 
            status={isRunning ? 'active' : remainingTime === 0 ? 'success' : 'normal'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>
      )}

      {/* 定时信息预览 */}
      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>倒计时信息</Text>
          <Text>总时长：{formatTime(getTotalSeconds())}</Text>
          <Text>开始时间：{startTime ? startTime.toLocaleString('zh-CN') : '未开始'}</Text>
          {startTime && (
            <Text>
              预计结束时间：{new Date(startTime.getTime() + getTotalSeconds() * 1000).toLocaleString('zh-CN')}
            </Text>
          )}
        </Space>
      </div>

      {/* 使用说明 */}
      <div style={{ marginTop: 16, padding: 8, background: '#e6f7ff', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 倒计时功能适合需要延时执行的任务，如定时提醒、延时操作等。设置完成后点击"开始"即可启动倒计时。
        </Text>
      </div>
    </Card>
  );
};

export default CountdownTimer;
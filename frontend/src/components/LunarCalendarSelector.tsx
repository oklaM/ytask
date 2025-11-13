import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Select, Checkbox, Row, Col, Typography, Tag, Space, Divider, Alert } from 'antd';
import { CalendarOutlined, StarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { Text } = Typography;

interface LunarCalendarSelectorProps {
  value?: any;
  onChange?: (value: any) => void;
}

// 模拟农历日期计算（实际项目中可集成lunar-calendar库）
const lunarCalendar = {
  // 获取农历日期
  getLunarDate: (date: Date) => {
    // 这里使用简单的模拟数据，实际项目中应使用专业的农历计算库
    const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', 
                         '七月', '八月', '九月', '十月', '冬月', '腊月'];
    const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', 
                       '初八', '初九', '初十', '十一', '十二', '十三', '十四', 
                       '十五', '十六', '十七', '十八', '十九', '二十', '廿一', 
                       '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
    
    const month = date.getMonth();
    const day = date.getDate();
    
    return {
      lunarYear: date.getFullYear(),
      lunarMonth: month + 1,
      lunarDay: day,
      lunarMonthName: lunarMonths[month % 12],
      lunarDayName: lunarDays[(day - 1) % 30],
      festival: getFestival(date)
    };
  },
  
  // 获取节日信息
  getFestivalInfo: (date: Date) => {
    return getFestival(date);
  }
};

// 节日数据（简化版）
const festivals = {
  '0101': { name: '春节', description: '农历新年，家人团聚的日子' },
  '0115': { name: '元宵节', description: '吃元宵，赏花灯' },
  '0505': { name: '端午节', description: '吃粽子，赛龙舟' },
  '0707': { name: '七夕节', description: '中国情人节' },
  '0815': { name: '中秋节', description: '赏月，吃月饼' },
  '0909': { name: '重阳节', description: '登高，敬老' },
  '1208': { name: '腊八节', description: '喝腊八粥' },
  '1230': { name: '除夕', description: '年夜饭，守岁' }
};

function getFestival(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const key = `${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  return festivals[key as keyof typeof festivals];
}

const LunarCalendarSelector: React.FC<LunarCalendarSelectorProps> = ({ value = {}, onChange }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(value.date ? new Date(value.date) : new Date());
  const [lunarDate, setLunarDate] = useState<any>(null);
  const [lunarRepeat, setLunarRepeat] = useState<boolean>(value.lunarRepeat || false);
  const [selectedFestival, setSelectedFestival] = useState<string>(value.lunarFestival || '');

  useEffect(() => {
    if (selectedDate) {
      const lunarInfo = lunarCalendar.getLunarDate(selectedDate);
      setLunarDate(lunarInfo);
      
      if (lunarInfo.festival) {
        setSelectedFestival(lunarInfo.festival.name);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    if (onChange) {
      const config = {
        lunarYear: lunarDate?.lunarYear,
        lunarMonth: lunarDate?.lunarMonth,
        lunarDay: lunarDate?.lunarDay,
        lunarRepeat,
        lunarFestival: selectedFestival,
        date: selectedDate?.toISOString()
      };
      onChange(config);
    }
  }, [lunarDate, lunarRepeat, selectedFestival, selectedDate]);

  // 热门节日列表
  const popularFestivals = [
    { name: '春节', date: '农历正月初一', key: '0101' },
    { name: '元宵节', date: '农历正月十五', key: '0115' },
    { name: '端午节', date: '农历五月初五', key: '0505' },
    { name: '七夕节', date: '农历七月初七', key: '0707' },
    { name: '中秋节', date: '农历八月十五', key: '0815' },
    { name: '重阳节', date: '农历九月初九', key: '0909' },
    { name: '除夕', date: '农历腊月三十', key: '1230' }
  ];

  // 根据节日名称获取日期
  const getFestivalDate = (festivalName: string) => {
    const festival = popularFestivals.find(f => f.name === festivalName);
    if (festival) {
      // 简化处理：假设是当前年份的节日日期
      const currentYear = new Date().getFullYear();
      // 实际项目中应使用专业的农历转公历计算
      return new Date(currentYear, parseInt(festival.key.substring(0, 2)) - 1, 
                     parseInt(festival.key.substring(2)));
    }
    return new Date();
  };

  const handleFestivalSelect = (festivalName: string) => {
    setSelectedFestival(festivalName);
    const festivalDate = getFestivalDate(festivalName);
    setSelectedDate(festivalDate);
  };

  return (
    <Card 
      title={
        <Space>
          <CalendarOutlined />
          <span>农历定时配置</span>
          <Tag color="orange">传统节日</Tag>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* 节日快速选择 */}
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">快速选择节日</Text>
        <div style={{ marginTop: 8 }}>
          <Select
            value={selectedFestival}
            onChange={handleFestivalSelect}
            style={{ width: '100%' }}
            placeholder="选择传统节日"
          >
            {popularFestivals.map(festival => (
              <Option key={festival.key} value={festival.name}>
                <Space>
                  <StarOutlined />
                  {festival.name} ({festival.date})
                </Space>
              </Option>
            ))}
          </Select>
        </div>
      </div>

      {/* 具体日期选择 */}
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">选择具体日期</Text>
        <div style={{ marginTop: 8 }}>
          <DatePicker
            value={selectedDate ? dayjs(selectedDate) : undefined}
            onChange={(date) => date && setSelectedDate(date.toDate())}
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        </div>
      </div>

      {/* 农历日期显示 */}
      {lunarDate && (
        <div style={{ marginBottom: 16, background: '#fff9e6', padding: 12, borderRadius: 6 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>公历日期：</Text>
              <Text>{selectedDate.toLocaleDateString('zh-CN')}</Text>
            </Col>
            <Col span={12}>
              <Text strong>农历日期：</Text>
              <Text>{lunarDate.lunarMonthName}{lunarDate.lunarDayName}</Text>
            </Col>
          </Row>
          {lunarDate.festival && (
            <div style={{ marginTop: 8 }}>
              <Alert 
                message={
                  <Space>
                    <StarOutlined />
                    {lunarDate.festival.name}
                  </Space>
                }
                description={lunarDate.festival.description}
                type="info"
                showIcon
                size="small"
              />
            </div>
          )}
        </div>
      )}

      {/* 重复设置 */}
      <div style={{ marginBottom: 16 }}>
        <Checkbox
          checked={lunarRepeat}
          onChange={(e) => setLunarRepeat(e.target.checked)}
        >
          每年重复提醒
        </Checkbox>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          （每年农历同一日期自动提醒）
        </Text>
      </div>

      <Divider />

      {/* 定时预览 */}
      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>定时预览</Text>
          <Text>
            农历定时：{lunarDate ? `${lunarDate.lunarMonthName}${lunarDate.lunarDayName}` : '未选择日期'}
            {lunarRepeat && '（每年重复）'}
          </Text>
          {selectedFestival && (
            <Text type="secondary">
              节日提醒：{selectedFestival}
            </Text>
          )}
        </Space>
      </div>

      {/* 使用说明 */}
      <Alert 
        message="使用说明"
        description="农历定时功能特别适合传统节日提醒、生日提醒等场景。选择节日后会自动设置对应的农历日期，并支持每年自动重复提醒。"
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Card>
  );
};

export default LunarCalendarSelector;
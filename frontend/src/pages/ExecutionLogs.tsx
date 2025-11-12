import React, { useState } from 'react';
import { Table, Tag, DatePicker, Select, Input, Button } from 'antd';
import { useRequest } from 'ahooks';
import { logApi } from '../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

const ExecutionLogs: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    taskId: '',
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    pageSize: 20
  });

  const { data: logsData, loading } = useRequest(
    () => logApi.getLogs(searchParams),
    {
      refreshDeps: [searchParams]
    }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'processing';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '执行中';
      default:
        return status;
    }
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '结束时间',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      render: (time: string) => 
        time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
    {
      title: '持续时间',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => 
        duration ? `${(duration / 1000).toFixed(2)}秒` : '--',
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      key: 'retryCount',
      render: (count: number) => count || 0,
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (error: string) => 
        error ? (
          <span style={{ color: '#ff4d4f', maxWidth: 200, display: 'inline-block' }}>
            {error}
          </span>
        ) : '--',
    },
  ];

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setSearchParams({
        ...searchParams,
        startDate: dates[0].toISOString(),
        endDate: dates[1].toISOString(),
        page: 1
      });
    } else {
      setSearchParams({
        ...searchParams,
        startDate: '',
        endDate: '',
        page: 1
      });
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>执行日志</h1>

      {/* 搜索和筛选 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <RangePicker
          showTime
          onChange={handleDateChange}
          style={{ width: 300 }}
        />
        
        <Select
          placeholder="状态筛选"
          style={{ width: 120 }}
          allowClear
          onChange={(value) => setSearchParams({...searchParams, status: value || '', page: 1})}
        >
          <Option value="success">成功</Option>
          <Option value="failed">失败</Option>
          <Option value="running">执行中</Option>
        </Select>

        <Search
          placeholder="搜索任务名称"
          style={{ width: 200 }}
          onSearch={(value) => setSearchParams({...searchParams, taskId: value, page: 1})}
        />

        <Button 
          onClick={() => setSearchParams({
            taskId: '',
            status: '',
            startDate: '',
            endDate: '',
            page: 1,
            pageSize: 20
          })}
        >
          重置筛选
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={logsData?.data || []}
        rowKey="id"
        loading={loading}
        pagination={{
          current: searchParams.page,
          pageSize: searchParams.pageSize,
          total: logsData?.pagination?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => {
            setSearchParams({
              ...searchParams,
              page,
              pageSize: pageSize || 20
            });
          }
        }}
      />
    </div>
  );
};

export default ExecutionLogs;
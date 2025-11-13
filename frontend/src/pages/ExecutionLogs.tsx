import React, { useState } from 'react';
import { Table, Tag, Space, message, Input, Select, DatePicker, Button, Modal, Typography } from 'antd';
import { useRequest } from 'ahooks';
import { logsApi } from '../services/api';
import { ExecutionLog } from '../types';
import dayjs from 'dayjs';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

const ExecutionLogs: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    taskId: '',
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    pageSize: 20
  });

  const [logDetail, setLogDetail] = useState<ExecutionLog | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const { data: logsData, loading, run: refreshLogs } = useRequest(
    () => logsApi.getLogs(searchParams),
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

  const formatDuration = (duration: number) => {
    if (!duration) return '--';
    if (duration < 1000) {
      return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const showLogDetail = (log: ExecutionLog) => {
    setLogDetail(log);
    setDetailVisible(true);
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
      render: (name: string) => name || '--',
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
      render: (duration: number) => formatDuration(duration),
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      key: 'retryCount',
      render: (count: number) => count || 0,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ExecutionLog) => (
        <Space>
          <Button 
            type="link" 
            icon={<FileTextOutlined />}
            onClick={() => showLogDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>执行历史</h1>
      </div>

      {/* 搜索和筛选 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="任务ID"
          style={{ width: 200 }}
          value={searchParams.taskId}
          onChange={(e) => setSearchParams({...searchParams, taskId: e.target.value, page: 1})}
        />
        
        <Select
          placeholder="状态筛选"
          style={{ width: 120 }}
          allowClear
          value={searchParams.status || undefined}
          onChange={(value) => setSearchParams({...searchParams, status: value || '', page: 1})}
        >
          <Option value="success">成功</Option>
          <Option value="failed">失败</Option>
          <Option value="running">执行中</Option>
        </Select>

        <RangePicker
          showTime
          placeholder={['开始时间', '结束时间']}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
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
          }}
        />

        <Button 
          type="primary" 
          icon={<SearchOutlined />}
          onClick={() => refreshLogs()}
        >
          搜索
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

      {/* 执行详情弹窗 */}
      <Modal
        title="执行详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {logDetail && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>基本信息</Text>
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
                <div>任务名称: {logDetail.taskName || '--'}</div>
                <div>状态: <Tag color={getStatusColor(logDetail.status)}>{getStatusText(logDetail.status)}</Tag></div>
                <div>开始时间: {dayjs(logDetail.startedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                <div>结束时间: {logDetail.finishedAt ? dayjs(logDetail.finishedAt).format('YYYY-MM-DD HH:mm:ss') : '--'}</div>
                <div>持续时间: {formatDuration(logDetail.duration || 0)}</div>
                <div>重试次数: {logDetail.retryCount || 0}</div>
              </div>
            </div>

            {logDetail.error && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>错误信息</Text>
                <div style={{ 
                  marginTop: 8, 
                  padding: '8px 12px', 
                  background: '#fff2f0', 
                  border: '1px solid #ffccc7',
                  borderRadius: 4,
                  color: '#a8071a'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {logDetail.error}
                  </pre>
                </div>
              </div>
            )}

            {logDetail.result && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>执行结果</Text>
                <div style={{ 
                  marginTop: 8, 
                  padding: '8px 12px', 
                  background: '#f6ffed', 
                  border: '1px solid #b7eb8f',
                  borderRadius: 4
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {JSON.stringify(JSON.parse(logDetail.result), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExecutionLogs;
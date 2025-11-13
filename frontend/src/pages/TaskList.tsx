import React, { useState } from 'react';
import { Button, Table, Tag, Space, message, Input, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { taskApi } from '../services/api';
import { Task } from '../types';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Search } = Input;
const { Option } = Select;

const TaskList: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState({
    status: '',
    category: '',
    keyword: '',
    page: 1,
    pageSize: 10
  });

  const { data: tasksData, loading, run: refreshTasks } = useRequest(
    () => taskApi.getTasks(searchParams),
    {
      refreshDeps: [searchParams]
    }
  );

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

  const getTypeText = (type: string) => {
    switch (type) {
      case 'http':
        return 'HTTP请求';
      case 'command':
        return '命令执行';
      case 'script':
        return '脚本执行';
      default:
        return type;
    }
  };

  const handleStart = async (taskId: string) => {
    try {
      await taskApi.batchOperate('start', [taskId]);
      message.success('任务启动成功');
      refreshTasks();
    } catch (error) {
      message.error('任务启动失败');
    }
  };

  const handlePause = async (taskId: string) => {
    try {
      await taskApi.batchOperate('pause', [taskId]);
      message.success('任务暂停成功');
      refreshTasks();
    } catch (error) {
      message.error('任务暂停失败');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await taskApi.deleteTask(taskId);
      message.success('任务删除成功');
      refreshTasks();
    } catch (error) {
      message.error('任务删除失败');
    }
  };

  const handleBatchOperation = async (action: 'start' | 'pause' | 'delete') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的任务');
      return;
    }

    try {
      await taskApi.batchOperate(action, selectedRowKeys);
      message.success(`批量${action === 'start' ? '启动' : action === 'pause' ? '暂停' : '删除'}成功`);
      setSelectedRowKeys([]);
      refreshTasks();
    } catch (error) {
      message.error(`批量操作失败`);
    }
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{getTypeText(type)}</Tag>,
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
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => category || '--',
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
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Task) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => navigate(`/tasks/${record.id}/edit`)}
          >
            编辑
          </Button>
          {record.status === 'active' ? (
            <Button 
              type="link" 
              icon={<PauseCircleOutlined />} 
              onClick={() => handlePause(record.id)}
            >
              暂停
            </Button>
          ) : (
            <Button 
              type="link" 
              icon={<PlayCircleOutlined />} 
              onClick={() => handleStart(record.id)}
            >
              启动
            </Button>
          )}
          <Popconfirm
            title="确定删除这个任务吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>任务管理</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => navigate('/tasks/new')}
        >
          创建任务
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Search
          placeholder="搜索任务名称"
          style={{ width: 200 }}
          onSearch={(value) => setSearchParams({...searchParams, keyword: value, page: 1})}
        />
        <Select
          placeholder="状态筛选"
          style={{ width: 120 }}
          allowClear
          onChange={(value) => setSearchParams({...searchParams, status: value || '', page: 1})}
        >
          <Option value="active">运行中</Option>
          <Option value="paused">已暂停</Option>
          <Option value="completed">已完成</Option>
        </Select>
        
        {selectedRowKeys.length > 0 && (
          <Space>
            <Button onClick={() => handleBatchOperation('start')}>
              批量启动
            </Button>
            <Button onClick={() => handleBatchOperation('pause')}>
              批量暂停
            </Button>
            <Popconfirm
              title="确定删除选中的任务吗？"
              onConfirm={() => handleBatchOperation('delete')}
            >
              <Button danger>
                批量删除
              </Button>
            </Popconfirm>
            <span>已选择 {selectedRowKeys.length} 项</span>
          </Space>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={tasksData?.data || []}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          current: searchParams.page,
          pageSize: searchParams.pageSize,
          total: tasksData?.pagination?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => {
            setSearchParams({
              ...searchParams,
              page,
              pageSize: pageSize || 10
            });
          }
        }}
      />
    </div>
  );
};

export default TaskList;
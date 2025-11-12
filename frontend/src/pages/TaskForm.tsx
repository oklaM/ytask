import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Space, InputNumber, message, DatePicker } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { taskApi } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

const TaskForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [triggerType, setTriggerType] = useState<'cron' | 'interval' | 'date'>('cron');
  const [taskType, setTaskType] = useState<'http' | 'command' | 'script'>('command');

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      loadTask();
    }
  }, [id]);

  const loadTask = async () => {
    try {
      const task = await taskApi.getTask(id!);
      form.setFieldsValue({
        ...task,
        triggerConfig: task.triggerConfig,
        config: task.config
      });
      setTriggerType(task.triggerType);
      setTaskType(task.type);
    } catch (error) {
      message.error('加载任务失败');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const taskData = {
        ...values,
        triggerType,
        type: taskType,
        triggerConfig: getTriggerConfig(values),
        config: getTaskConfig(values)
      };

      if (isEditing) {
        await taskApi.updateTask(id!, taskData);
        message.success('任务更新成功');
      } else {
        await taskApi.createTask(taskData);
        message.success('任务创建成功');
      }
      
      navigate('/tasks');
    } catch (error) {
      message.error(isEditing ? '任务更新失败' : '任务创建失败');
    } finally {
      setLoading(false);
    }
  };

  const getTriggerConfig = (values: any) => {
    switch (triggerType) {
      case 'cron':
        return { cron: values.cronExpression };
      case 'interval':
        return { interval: values.interval * 1000 }; // 转换为毫秒
      case 'date':
        return { date: values.specificDate?.toISOString() };
      default:
        return {};
    }
  };

  const getTaskConfig = (values: any) => {
    switch (taskType) {
      case 'http':
        return {
          url: values.httpUrl,
          method: values.httpMethod,
          headers: values.httpHeaders ? JSON.parse(values.httpHeaders) : {},
          body: values.httpBody ? JSON.parse(values.httpBody) : {}
        };
      case 'command':
        return {
          command: values.command
        };
      case 'script':
        return {
          script: values.script
        };
      default:
        return {};
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>
        {isEditing ? '编辑任务' : '创建任务'}
      </h1>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: 800 }}
      >
        {/* 基本信息 */}
        <Card title="基本信息" className="task-form-section">
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="任务描述"
          >
            <TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
          >
            <Input placeholder="请输入分类（可选）" />
          </Form.Item>
        </Card>

        {/* 触发设置 */}
        <Card title="触发设置" className="task-form-section">
          <Form.Item
            name="triggerType"
            label="触发类型"
            initialValue="cron"
          >
            <Select onChange={setTriggerType}>
              <Option value="cron">Cron表达式</Option>
              <Option value="interval">固定间隔</Option>
              <Option value="date">特定时间</Option>
            </Select>
          </Form.Item>

          {triggerType === 'cron' && (
            <Form.Item
              name="cronExpression"
              label="Cron表达式"
              rules={[{ required: true, message: '请输入Cron表达式' }]}
              extra="例如：0 0 * * *（每天午夜执行）"
            >
              <Input placeholder="请输入Cron表达式" />
            </Form.Item>
          )}

          {triggerType === 'interval' && (
            <Form.Item
              name="interval"
              label="间隔时间（秒）"
              rules={[{ required: true, message: '请输入间隔时间' }]}
            >
              <InputNumber 
                min={1} 
                style={{ width: '100%' }} 
                placeholder="请输入间隔秒数" 
              />
            </Form.Item>
          )}

          {triggerType === 'date' && (
            <Form.Item
              name="specificDate"
              label="执行时间"
              rules={[{ required: true, message: '请选择执行时间' }]}
            >
              <DatePicker 
                showTime 
                style={{ width: '100%' }} 
                placeholder="请选择执行时间" 
              />
            </Form.Item>
          )}
        </Card>

        {/* 任务配置 */}
        <Card title="任务配置" className="task-form-section">
          <Form.Item
            name="type"
            label="任务类型"
            initialValue="command"
          >
            <Select onChange={setTaskType}>
              <Option value="http">HTTP请求</Option>
              <Option value="command">命令执行</Option>
              <Option value="script">脚本执行</Option>
            </Select>
          </Form.Item>

          {taskType === 'http' && (
            <>
              <Form.Item
                name="httpUrl"
                label="请求URL"
                rules={[{ required: true, message: '请输入URL' }]}
              >
                <Input placeholder="请输入请求URL" />
              </Form.Item>
              <Form.Item
                name="httpMethod"
                label="请求方法"
                initialValue="GET"
              >
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="httpHeaders"
                label="请求头（JSON格式）"
              >
                <TextArea rows={3} placeholder='{"Content-Type": "application/json"}' />
              </Form.Item>
              <Form.Item
                name="httpBody"
                label="请求体（JSON格式）"
              >
                <TextArea rows={3} placeholder='{"key": "value"}' />
              </Form.Item>
            </>
          )}

          {taskType === 'command' && (
            <Form.Item
              name="command"
              label="命令"
              rules={[{ required: true, message: '请输入命令' }]}
            >
              <TextArea rows={3} placeholder="请输入要执行的命令" />
            </Form.Item>
          )}

          {taskType === 'script' && (
            <Form.Item
              name="script"
              label="脚本内容"
              rules={[{ required: true, message: '请输入脚本内容' }]}
            >
              <TextArea rows={6} placeholder="请输入脚本内容" />
            </Form.Item>
          )}
        </Card>

        {/* 高级设置 */}
        <Card title="高级设置" className="task-form-section">
          <Form.Item
            name="maxRetries"
            label="最大重试次数"
            initialValue={3}
          >
            <InputNumber min={0} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="retryInterval"
            label="重试间隔（毫秒）"
            initialValue={5000}
          >
            <InputNumber min={1000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="timeout"
            label="超时时间（毫秒）"
            initialValue={30000}
          >
            <InputNumber min={1000} style={{ width: '100%' }} />
          </Form.Item>
        </Card>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEditing ? '更新任务' : '创建任务'}
            </Button>
            <Button onClick={() => navigate('/tasks')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default TaskForm;
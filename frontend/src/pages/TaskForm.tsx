import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Space, InputNumber, message, DatePicker, Modal, Result, Spin, Alert, Typography, Divider, Popover, Tag, Tabs, Collapse } from 'antd';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import { taskApi } from '../services/api';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import VisualTimerSelector from '../components/VisualTimerSelector';
import LunarCalendarSelector from '../components/LunarCalendarSelector';
import CountdownTimer from '../components/CountdownTimer';
import ConditionTrigger from '../components/ConditionTrigger';

const { Option } = Select;
const { TextArea } = Input;

// 常用的任务示例
const TASK_EXAMPLES = {
  cron: [
    { label: '每天午夜执行', value: '0 0 * * *', desc: '每天凌晨12点执行' },
    { label: '每小时执行', value: '0 * * * *', desc: '每小时的第0分钟执行' },
    { label: '每天上午9点', value: '0 9 * * *', desc: '每天上午9点执行' },
    { label: '每周一上午8点', value: '0 8 * * 1', desc: '每周一上午8点执行' },
    { label: '每分钟执行', value: '* * * * *', desc: '每分钟执行一次' },
    { label: '每天9点到18点每2小时', value: '0 9-18/2 * * *', desc: '每天9点到18点，每2小时执行' },
  ],
  command: [
    { label: '查看系统时间', value: 'date', desc: '显示当前系统时间' },
    { label: '查看磁盘空间', value: 'df -h', desc: '显示磁盘使用情况' },
    { label: '查看内存使用', value: 'free -h', desc: '显示内存使用情况' },
    { label: '查看进程列表', value: 'ps aux', desc: '显示运行中的进程' },
    { label: '网络连通性测试', value: 'ping -c 4 google.com', desc: '测试网络连通性' },
    { label: '清理临时文件', value: 'find /tmp -type f -mtime +7 -delete', desc: '删除7天前的临时文件' },
  ],
  http: [
    { label: '健康检查', value: 'GET', desc: '简单的GET请求' },
    { label: '数据提交', value: 'POST', desc: '提交数据的POST请求' },
    { label: '数据更新', value: 'PUT', desc: '更新数据的PUT请求' },
    { label: '数据删除', value: 'DELETE', desc: '删除数据的DELETE请求' },
  ]
};

// 禁止使用的命令
const FORBIDDEN_COMMANDS = [
  'rm -rf',
  'rm -rf /',
  'dd if=',
  ':(){ :|:& };:',
  'mkfs',
  'fdisk',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init 0',
  'init 6',
  'chmod 777',
  'chown root',
  'passwd',
];

// 安全提示
const SECURITY_TIPS = [
  '请勿使用危险命令，如rm -rf、shutdown等',
  '定期检查任务的执行日志和结果',
  '建议设置合理的超时时间和重试次数',
  '对于重要的任务，建议先进行预执行测试',
  '建议对敏感信息进行加密处理',
];

const TaskForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [triggerType, setTriggerType] = useState<'cron' | 'interval' | 'date' | 'visual' | 'lunar' | 'countdown' | 'conditional'>('visual');
  const [taskType, setTaskType] = useState<'http' | 'command' | 'script'>('command');
  const [activeTriggerTab, setActiveTriggerTab] = useState('basic');
  
  // 预执行相关状态
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      loadTask();
    }
  }, [id]);

  const loadTask = async () => {
    try {
      const task = await taskApi.getTask(id!);
      
      // 根据任务类型设置表单值
      const formValues: any = {
        name: task.name,
        description: task.description,
        category: task.category,
        maxRetries: task.maxRetries,
        retryInterval: task.retryInterval,
        timeout: task.timeout,
        type: task.type,
        // 两个触发器类型字段都需要设置，因为它们在两个不同的选项卡中
        triggerType: task.triggerType,
        triggerTypeAdvanced: task.triggerType
      };
      
      // 根据任务类型设置配置
      if (task.type === 'http') {
        formValues.httpUrl = task.config?.url || '';
        formValues.httpMethod = task.config?.method || 'GET';
        formValues.httpHeaders = task.config?.headers ? JSON.stringify(task.config.headers, null, 2) : '';
        formValues.httpBody = task.config?.body ? JSON.stringify(task.config.body, null, 2) : '';
      } else if (task.type === 'command') {
        formValues.command = task.config?.command || '';
      } else if (task.type === 'script') {
        formValues.script = task.config?.script || '';
      }
      
      // 根据触发类型设置触发配置
      if (task.triggerType === 'cron') {
        formValues.cronExpression = task.triggerConfig?.cron || '';
        setActiveTriggerTab('advanced');
      } else if (task.triggerType === 'interval') {
        formValues.interval = task.triggerConfig?.interval ? task.triggerConfig.interval / 1000 : 0; // 毫秒转秒
        setActiveTriggerTab('basic');
      } else if (task.triggerType === 'date') {
        formValues.specificDate = task.triggerConfig?.date ? dayjs(task.triggerConfig.date) : null;
        setActiveTriggerTab('basic');
      } else if (task.triggerType === 'visual') {
        formValues.visualConfig = task.triggerConfig;
        setActiveTriggerTab('basic');
      } else if (task.triggerType === 'lunar') {
        formValues.lunarConfig = task.triggerConfig;
        setActiveTriggerTab('basic');
      } else if (task.triggerType === 'countdown') {
        formValues.countdownConfig = task.triggerConfig;
        setActiveTriggerTab('basic');
      } else if (task.triggerType === 'conditional') {
        formValues.conditionalConfig = task.triggerConfig;
        setActiveTriggerTab('advanced');
      }
      
      form.setFieldsValue(formValues);
      setTriggerType(task.triggerType);
      setTaskType(task.type);
    } catch (error) {
      message.error('加载任务失败');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // 安全检查
      if (taskType === 'command' && values.command) {
        const safetyCheck = checkCommandSafety(values.command);
        if (!safetyCheck.safe) {
          message.error(safetyCheck.reason || '检测到危险命令，请检查后重试');
          setLoading(false);
          return;
        }
      }

      // 获取配置数据（从表单或自定义组件）
      const triggerConfig = getTriggerConfig(values);
      const taskConfig = getTaskConfig(values);

      const taskData = {
        ...values,
        triggerType,
        type: taskType,
        triggerConfig,
        config: taskConfig
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

  // 预执行任务
  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewResult(null);
      
      const taskData = {
        ...values,
        triggerType,
        type: taskType,
        triggerConfig: getTriggerConfig(values),
        config: getTaskConfig(values)
      };

      const result = await taskApi.previewTask(taskData);
      
      if (result.success) {
        setPreviewResult(result.data);
        setPreviewVisible(true);
        message.success('预执行成功！');
      } else {
        setPreviewError(result.error || '预执行失败');
        setPreviewVisible(true);
        message.error(result.message || '预执行失败');
      }
    } catch (error: any) {
      // 表单验证错误
      if (error.errorFields) {
        message.error('请填写完整的任务配置信息');
      } else {
        setPreviewError(error.message || '预执行失败');
        setPreviewVisible(true);
        message.error('预执行失败');
      }
    } finally {
      setPreviewLoading(false);
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
      case 'visual':
        // 从可视化选择器获取配置
        return values.visualConfig || {};
      case 'lunar':
        // 从农历选择器获取配置
        return values.lunarConfig || {};
      case 'countdown':
        // 从倒计时选择器获取配置
        return values.countdownConfig || {};
      case 'conditional':
        // 从条件触发选择器获取配置
        return values.conditionalConfig || {};
      default:
        return {};
    }
  };

  // 应用任务示例
  const applyExample = (type: string, example: any) => {
    switch (type) {
      case 'cron':
        form.setFieldsValue({ cronExpression: example.value });
        message.success(`已应用: ${example.label}`);
        break;
      case 'command':
        form.setFieldsValue({ command: example.value });
        message.success(`已应用: ${example.label}`);
        break;
      case 'http':
        form.setFieldsValue({ httpMethod: example.value });
        message.success(`已应用: ${example.label}`);
        break;
    }
  };

  // 检查命令安全性
  const checkCommandSafety = (command: string) => {
    if (!command) return true;
    
    const lowerCommand = command.toLowerCase();
    for (const forbidden of FORBIDDEN_COMMANDS) {
      if (lowerCommand.includes(forbidden.toLowerCase())) {
        return {
          safe: false,
          reason: `检测到危险命令: ${forbidden}`
        };
      }
    }
    return { safe: true };
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
          <Tabs
            activeKey={activeTriggerTab}
            onChange={setActiveTriggerTab}
            items={[
              {
                key: 'basic',
                label: '基础定时',
                children: (
                  <div>
                    <Form.Item
                      name="triggerType"
                      label="触发类型"
                      initialValue="visual"
                    >
                      <Select onChange={setTriggerType}>
                        <Option value="visual">可视化定时</Option>
                        <Option value="countdown">倒计时触发</Option>
                        <Option value="lunar">农历定时</Option>
                        <Option value="interval">固定间隔</Option>
                        <Option value="date">特定时间</Option>
                      </Select>
                    </Form.Item>

                    {triggerType === 'visual' && (
                      <Form.Item name="visualConfig">
                        <VisualTimerSelector />
                      </Form.Item>
                    )}

                    {triggerType === 'countdown' && (
                      <Form.Item name="countdownConfig">
                        <CountdownTimer />
                      </Form.Item>
                    )}

                    {triggerType === 'lunar' && (
                      <Form.Item name="lunarConfig">
                        <LunarCalendarSelector />
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
                  </div>
                )
              },
              {
                key: 'advanced',
                label: '高级选项',
                children: (
                  <div>
                    <Form.Item
                      name="triggerTypeAdvanced"
                      label="触发类型"
                      initialValue="cron"
                    >
                      <Select onChange={setTriggerType}>
                        <Option value="cron">Cron表达式</Option>
                        <Option value="conditional">条件触发</Option>
                      </Select>
                    </Form.Item>

                    {triggerType === 'cron' && (
                      <>
                        <Form.Item
                          name="cronExpression"
                          label={
                            <span>
                              Cron表达式
                              <Popover 
                                title="常用Cron表达式示例" 
                                content={
                                  <div style={{ maxWidth: 400 }}>
                                    {TASK_EXAMPLES.cron.map((example, index) => (
                                      <div key={index} style={{ marginBottom: 8 }}>
                                        <Button 
                                          type="link" 
                                          size="small" 
                                          onClick={() => applyExample('cron', example)}
                                          icon={<ThunderboltOutlined />}
                                        >
                                          {example.label}
                                        </Button>
                                        <br />
                                        <Tag color="blue">{example.value}</Tag>
                                        <span style={{ fontSize: 12, color: '#666' }}> - {example.desc}</span>
                                      </div>
                                    ))}
                                  </div>
                                }
                              >
                                <Button type="link" size="small" icon={<InfoCircleOutlined />}>
                                  查看示例
                                </Button>
                              </Popover>
                            </span>
                          }
                          rules={[{ required: true, message: '请输入Cron表达式' }]}
                          extra="例如：0 0 * * *（每天午夜执行）"
                        >
                          <Input placeholder="请输入Cron表达式" />
                        </Form.Item>
                      </>
                    )}

                    {triggerType === 'conditional' && (
                      <Form.Item name="conditionalConfig">
                        <ConditionTrigger />
                      </Form.Item>
                    )}
                  </div>
                )
              }
            ]}
          />
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
                label={
                  <span>
                    请求方法
                    <Popover 
                      title="HTTP请求方法示例" 
                      content={
                        <div style={{ maxWidth: 300 }}>
                          {TASK_EXAMPLES.http.map((example, index) => (
                            <div key={index} style={{ marginBottom: 8 }}>
                              <Button 
                                type="link" 
                                size="small" 
                                onClick={() => applyExample('http', example)}
                                icon={<ThunderboltOutlined />}
                              >
                                {example.label}
                              </Button>
                              <br />
                              <Tag color="purple">{example.value}</Tag>
                              <span style={{ fontSize: 12, color: '#666' }}> - {example.desc}</span>
                            </div>
                          ))}
                        </div>
                      }
                    >
                      <Button type="link" size="small" icon={<InfoCircleOutlined />}>
                        查看示例
                      </Button>
                    </Popover>
                  </span>
                }
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
            <>
              <Form.Item
                name="command"
                label={
                  <span>
                    命令
                    <Popover 
                      title="常用命令示例" 
                      content={
                        <div style={{ maxWidth: 400 }}>
                          {TASK_EXAMPLES.command.map((example, index) => (
                            <div key={index} style={{ marginBottom: 8 }}>
                              <Button 
n                                type="link" 
                                size="small" 
                                onClick={() => applyExample('command', example)}
                                icon={<ThunderboltOutlined />}
                              >
                                {example.label}
                              </Button>
                              <br />
                              <Tag color="green">{example.value}</Tag>
                              <span style={{ fontSize: 12, color: '#666' }}> - {example.desc}</span>
                            </div>
                          ))}
                          <Divider />
                          <Alert 
                            message="安全提示" 
                            description="请勿使用危险命令，如rm -rf、shutdown等"
                            type="warning" 
                            showIcon 
                          />
                        </div>
                      }
                    >
                      <Button type="link" size="small" icon={<InfoCircleOutlined />}>
                        查看示例
                      </Button>
                    </Popover>
                  </span>
                }
                rules={[{ 
                  required: true, 
                  message: '请输入命令' 
                }, {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const safetyCheck = checkCommandSafety(value);
                    if (!safetyCheck.safe) {
                      return Promise.reject(new Error(safetyCheck.reason));
                    }
                    return Promise.resolve();
                  }
                }]}
                extra={
                  <div>
                    <div>请输入要执行的命令</div>
                    <Alert 
                      message="安全提示" 
                      description="禁止使用危险命令，如rm -rf、shutdown、poweroff等"
                      type="warning" 
                      showIcon 
                      style={{ marginTop: 8 }}
                    />
                  </div>
                }
              >
                <TextArea rows={3} placeholder="请输入要执行的命令" />
              </Form.Item>
            </>
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

        {/* 安全提示区域 */}
        <Card title="安全提示" className="task-form-section">
          <Alert 
            message="任务安全执行指南" 
            description={
              <div>
                <p><strong>安全注意事项：</strong></p>
                <ul style={{ marginLeft: 20 }}>
                  {SECURITY_TIPS.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
                <p><strong>禁止使用的命令示例：</strong></p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {FORBIDDEN_COMMANDS.slice(0, 6).map((cmd, index) => (
                    <Tag key={index} color="red">{cmd}</Tag>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#666' }}>
                  * 系统会自动检测并阻止危险命令的执行
                </p>
              </div>
            }
            type="warning" 
            style={{ marginBottom: 16 }}
          />
        </Card>

        {/* 预执行区域 */}
        <Card title="预执行测试" className="task-form-section">
          <Alert 
            message="点击预执行按钮可以测试当前配置的任务是否能够正常执行" 
            type="info" 
            style={{ marginBottom: 16 }}
          />
          <Space>
            <Button 
              type="dashed" 
              icon={<PlayCircleOutlined />} 
              loading={previewLoading}
              onClick={handlePreview}
            >
              预执行任务
            </Button>
            {previewError && (
              <Alert 
                message={`预执行失败: ${previewError}`} 
                type="error" 
                closable
                onClose={() => setPreviewError(null)}
              />
            )}
          </Space>
        </Card>
      </Form>

      {/* 预执行结果弹窗 */}
      <Modal
        title="预执行结果"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="retry" 
            type="primary" 
            onClick={handlePreview}
            loading={previewLoading}
          >
            重新预执行
          </Button>
        ]}
        width={800}
      >
        {previewResult ? (
          <div>
            <Result
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="预执行成功"
              subTitle="任务配置正确，可以正常执行"
            />
            <Card title="执行结果详情" size="small">
              <Typography>
                <Typography.Paragraph>
                  <strong>任务类型:</strong> {taskType}
                </Typography.Paragraph>
                <Typography.Paragraph>
                  <strong>执行结果:</strong>
                </Typography.Paragraph>
                <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                  {JSON.stringify(previewResult, null, 2)}
                </pre>
              </Typography>
            </Card>
          </div>
        ) : previewError ? (
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            title="预执行失败"
            subTitle={previewError}
          />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>正在执行预执行任务...</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskForm;
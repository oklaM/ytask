import * as nodejieba from 'nodejieba';

/**
 * 任务类型识别结果
 */
export interface TaskTypeResult {
  type: 'http' | 'command' | 'script' | 'notification';
  confidence: number; // 识别置信度 0-1
  config?: Record<string, any>;
  suggestions?: string[]; // 建议配置
  error?: string;
}

/**
 * 任务类型识别关键词配置
 */
const TASK_PATTERNS = {
  http: {
    keywords: ['请求', '访问', '调用', '接口', 'API', 'GET', 'POST', 'PUT', 'DELETE', 'HTTP', 'HTTPS', '网址', '链接', 'URL'],
    urlPatterns: [
      /https?:\/\/[^\s]+/,
      /www\.[^\s]+/,
      /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/
    ],
    methodKeywords: {
      '获取': 'GET',
      '查询': 'GET',
      '提交': 'POST',
      '发送': 'POST',
      '更新': 'PUT',
      '修改': 'PUT',
      '删除': 'DELETE',
      '下载': 'GET'
    }
  },
  
  command: {
    keywords: ['执行', '运行', '命令', '脚本', '程序', '终端', '控制台', '启动', '停止', '重启', '检查', '清理', '备份', '压缩'],
    commonCommands: [
      'curl', 'wget', 'ping', 'ssh', 'scp', 'git', 'docker', 'npm', 'yarn',
      'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'find', 'grep', 'cat', 'echo'
    ]
  },
  
  script: {
    keywords: ['脚本', '代码', '程序', '算法', '函数', '逻辑', '计算', '处理', '分析', '转换', '生成'],
    languageKeywords: {
      'javascript': ['JS', 'JavaScript', 'node', 'npm'],
      'python': ['Python', 'py', 'pip'],
      'shell': ['Shell', 'bash', 'sh', 'zsh'],
      'php': ['PHP', 'php'],
      'ruby': ['Ruby', 'rb']
    }
  },
  
  notification: {
    keywords: ['通知', '提醒', '告警', '消息', '邮件', '短信', '推送', '报告', '日志', '记录', '统计'],
    notificationTypes: {
      '邮件': 'email',
      '短信': 'sms',
      '推送': 'push',
      '钉钉': 'dingtalk',
      '微信': 'wechat',
      '飞书': 'feishu'
    }
  }
};

/**
 * 常用任务模板
 */
const TASK_TEMPLATES = {
  http: {
    '健康检查': { method: 'GET', description: '检查服务健康状态' },
    '数据查询': { method: 'GET', description: '查询数据接口' },
    '数据提交': { method: 'POST', description: '提交数据到服务端' },
    '文件下载': { method: 'GET', description: '下载文件资源' }
  },
  
  command: {
    '系统监控': { command: 'top -n 1', description: '查看系统资源使用情况' },
    '磁盘清理': { command: 'find /tmp -type f -mtime +7 -delete', description: '清理7天前的临时文件' },
    '服务检查': { command: 'systemctl status nginx', description: '检查Nginx服务状态' },
    '日志分析': { command: 'tail -f /var/log/syslog', description: '实时查看系统日志' }
  },
  
  script: {
    '数据处理': { language: 'python', description: '数据清洗和分析脚本' },
    '定时备份': { language: 'shell', description: '自动备份数据库脚本' },
    '报表生成': { language: 'javascript', description: '生成业务报表' },
    '监控告警': { language: 'python', description: '系统监控和告警脚本' }
  },
  
  notification: {
    '日报发送': { type: 'email', template: '每日工作报告', description: '发送每日工作汇总邮件' },
    '系统告警': { type: 'push', template: '系统异常告警', description: '系统异常时发送推送通知' },
    '任务完成': { type: 'dingtalk', template: '任务完成通知', description: '任务执行完成后发送钉钉消息' },
    '统计报告': { type: 'wechat', template: '周统计报告', description: '每周发送统计报告到微信' }
  }
};

class TaskTypeIdentifier {
  
  /**
   * 识别任务类型
   */
  identify(text: string): TaskTypeResult {
    try {
      // 清洗输入文本
      const cleanedText = this.cleanText(text);
      
      // 分词处理
      const words = nodejieba.cut(cleanedText);
      
      // 计算每种任务类型的匹配分数
      const scores = {
        http: this.calculateHttpScore(cleanedText, words),
        command: this.calculateCommandScore(cleanedText, words),
        script: this.calculateScriptScore(cleanedText, words),
        notification: this.calculateNotificationScore(cleanedText, words)
      };
      
      // 找到得分最高的类型
      const bestMatch = Object.entries(scores).reduce((prev, [type, score]) => 
        score > prev.score ? { type, score } : prev
      , { type: 'command', score: 0 });
      
      if (bestMatch.score === 0) {
        return {
          type: 'command',
          confidence: 0.5,
          suggestions: ['请提供更详细的任务描述以便准确识别类型']
        };
      }
      
      // 生成配置建议
      const config = this.generateConfig(bestMatch.type as any, cleanedText);
      const suggestions = this.generateSuggestions(bestMatch.type as any, cleanedText);
      
      return {
        type: bestMatch.type as any,
        confidence: Math.min(bestMatch.score, 1),
        config,
        suggestions
      };
      
    } catch (error) {
      return {
        type: 'command',
        confidence: 0,
        error: `识别错误: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }
  
  /**
   * 清洗文本
   */
  private cleanText(text: string): string {
    return text
      .replace(/[\s\n\r]+/g, ' ')
      .replace(/[，。；：！？]/g, ' ')
      .trim();
  }
  
  /**
   * 计算HTTP任务分数
   */
  private calculateHttpScore(text: string, words: string[]): number {
    let score = 0;
    
    // 关键词匹配
    for (const keyword of TASK_PATTERNS.http.keywords) {
      if (text.includes(keyword)) {
        score += 0.3;
      }
    }
    
    // URL模式匹配
    for (const pattern of TASK_PATTERNS.http.urlPatterns) {
      if (pattern.test(text)) {
        score += 0.5;
        break;
      }
    }
    
    // HTTP方法关键词匹配
    for (const [chinese, method] of Object.entries(TASK_PATTERNS.http.methodKeywords)) {
      if (text.includes(chinese)) {
        score += 0.2;
      }
    }
    
    return score;
  }
  
  /**
   * 计算命令任务分数
   */
  private calculateCommandScore(text: string, words: string[]): number {
    let score = 0;
    
    // 关键词匹配
    for (const keyword of TASK_PATTERNS.command.keywords) {
      if (text.includes(keyword)) {
        score += 0.3;
      }
    }
    
    // 常见命令匹配
    for (const command of TASK_PATTERNS.command.commonCommands) {
      if (text.includes(command)) {
        score += 0.4;
        break;
      }
    }
    
    // 系统操作相关词汇
    const systemWords = ['系统', '服务', '文件', '目录', '进程', '网络', '磁盘', '内存'];
    for (const word of systemWords) {
      if (text.includes(word)) {
        score += 0.1;
      }
    }
    
    return score;
  }
  
  /**
   * 计算脚本任务分数
   */
  private calculateScriptScore(text: string, words: string[]): number {
    let score = 0;
    
    // 关键词匹配
    for (const keyword of TASK_PATTERNS.script.keywords) {
      if (text.includes(keyword)) {
        score += 0.3;
      }
    }
    
    // 编程语言关键词匹配
    for (const [language, keywords] of Object.entries(TASK_PATTERNS.script.languageKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 0.4;
          break;
        }
      }
    }
    
    // 编程相关词汇
    const programmingWords = ['函数', '变量', '循环', '条件', '算法', '逻辑', '代码'];
    for (const word of programmingWords) {
      if (text.includes(word)) {
        score += 0.1;
      }
    }
    
    return score;
  }
  
  /**
   * 计算通知任务分数
   */
  private calculateNotificationScore(text: string, words: string[]): number {
    let score = 0;
    
    // 关键词匹配
    for (const keyword of TASK_PATTERNS.notification.keywords) {
      if (text.includes(keyword)) {
        score += 0.3;
      }
    }
    
    // 通知类型匹配
    for (const [chinese, type] of Object.entries(TASK_PATTERNS.notification.notificationTypes)) {
      if (text.includes(chinese)) {
        score += 0.4;
        break;
      }
    }
    
    // 报告相关词汇
    const reportWords = ['日报', '周报', '月报', '报告', '汇总', '统计', '分析'];
    for (const word of reportWords) {
      if (text.includes(word)) {
        score += 0.1;
      }
    }
    
    return score;
  }
  
  /**
   * 生成配置建议
   */
  private generateConfig(type: string, text: string): Record<string, any> {
    switch (type) {
      case 'http':
        return this.generateHttpConfig(text);
      case 'command':
        return this.generateCommandConfig(text);
      case 'script':
        return this.generateScriptConfig(text);
      case 'notification':
        return this.generateNotificationConfig(text);
      default:
        return {};
    }
  }
  
  private generateHttpConfig(text: string): Record<string, any> {
    const config: any = { method: 'GET' };
    
    // 提取URL
    const urlMatch = text.match(/https?:\/\/[^\s]+/) || 
                    text.match(/www\.[^\s]+/) ||
                    text.match(/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/);
    
    if (urlMatch) {
      let url = urlMatch[0];
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      config.url = url;
    }
    
    // 识别方法
    for (const [chinese, method] of Object.entries(TASK_PATTERNS.http.methodKeywords)) {
      if (text.includes(chinese)) {
        config.method = method;
        break;
      }
    }
    
    return config;
  }
  
  private generateCommandConfig(text: string): Record<string, any> {
    const config: any = {};
    
    // 尝试提取命令
    for (const command of TASK_PATTERNS.command.commonCommands) {
      if (text.includes(command)) {
        config.command = command;
        break;
      }
    }
    
    // 如果没找到具体命令，提供模板
    if (!config.command) {
      if (text.includes('监控') || text.includes('检查')) {
        config.command = 'top -n 1';
      } else if (text.includes('清理') || text.includes('删除')) {
        config.command = 'find /tmp -type f -mtime +7 -delete';
      } else if (text.includes('备份')) {
        config.command = 'tar -czf backup.tar.gz /path/to/backup';
      }
    }
    
    return config;
  }
  
  private generateScriptConfig(text: string): Record<string, any> {
    const config: any = { language: 'javascript' };
    
    // 识别编程语言
    for (const [language, keywords] of Object.entries(TASK_PATTERNS.script.languageKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          config.language = language;
          break;
        }
      }
    }
    
    return config;
  }
  
  private generateNotificationConfig(text: string): Record<string, any> {
    const config: any = { type: 'email' };
    
    // 识别通知类型
    for (const [chinese, type] of Object.entries(TASK_PATTERNS.notification.notificationTypes)) {
      if (text.includes(chinese)) {
        config.type = type;
        break;
      }
    }
    
    return config;
  }
  
  /**
   * 生成建议
   */
  private generateSuggestions(type: string, text: string): string[] {
    const suggestions: string[] = [];
    
    switch (type) {
      case 'http':
        suggestions.push('请提供完整的URL地址');
        suggestions.push('选择正确的HTTP方法（GET/POST/PUT/DELETE）');
        suggestions.push('如有需要，可以设置请求头和请求体');
        break;
      case 'command':
        suggestions.push('请提供完整的命令内容');
        suggestions.push('确保命令在安全的环境中执行');
        suggestions.push('设置合适的超时时间和重试策略');
        break;
      case 'script':
        suggestions.push('请提供完整的脚本代码');
        suggestions.push('选择合适的编程语言');
        suggestions.push('测试脚本在不同环境下的兼容性');
        break;
      case 'notification':
        suggestions.push('配置通知接收人信息');
        suggestions.push('设计通知消息模板');
        suggestions.push('测试通知发送功能');
        break;
    }
    
    return suggestions;
  }
  
  /**
   * 获取任务模板
   */
  getTaskTemplates(type?: string): Record<string, any> {
    if (type && TASK_TEMPLATES[type]) {
      return TASK_TEMPLATES[type];
    }
    return TASK_TEMPLATES;
  }
}

// 导出单例实例
export const taskTypeIdentifier = new TaskTypeIdentifier();

export default TaskTypeIdentifier;
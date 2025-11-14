import * as nodejieba from 'nodejieba';

/**
 * 中文自然语言时间解析器
 * 支持将中文时间描述转换为cron表达式
 */
export interface TimeParseResult {
  success: boolean;
  cronExpression?: string;
  description?: string;
  error?: string;
  confidence: number; // 解析置信度 0-1
  parsedData?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'interval' | 'specific';
    time?: string; // HH:mm 格式
    daysOfWeek?: number[]; // 0-6, 0=周日
    dayOfMonth?: number; // 1-31
    month?: number; // 1-12
    interval?: number; // 间隔秒数
  };
}

/**
 * 常用时间模式配置
 */
const TIME_PATTERNS = {
  // 每日模式
  daily: {
    patterns: [
      /每天\s*(上午|早上|早晨|凌晨|下午|晚上|傍晚|午夜)?\s*(\d{1,2})点(\d{1,2})?分?/, // 每天上午9点
      /每日\s*(\d{1,2}):(\d{1,2})/, // 每日9:30
      /每天早上/, // 每天早上
      /每天上午/, // 每天上午
      /每天下午/, // 每天下午
      /每天晚上/, // 每天晚上
      /每天午夜/, // 每天午夜
    ],
    defaultTime: {
      '早上': '08:00',
      '上午': '09:00',
      '中午': '12:00',
      '下午': '15:00',
      '傍晚': '18:00',
      '晚上': '20:00',
      '午夜': '00:00'
    }
  },
  
  // 每周模式
  weekly: {
    patterns: [
      /每(周|星期)([一二三四五六日天])\s*(上午|下午|晚上)?\s*(\d{1,2})点(\d{1,2})?分?/, // 每周三上午9点
      /每(周|星期)([1-7])\s*(\d{1,2}):(\d{1,2})/, // 每周3 9:30
    ],
    dayMapping: {
      '日': 0, '天': 0, '1': 0,
      '一': 1, '2': 1,
      '二': 2, '3': 2,
      '三': 3, '4': 3,
      '四': 4, '5': 4,
      '五': 5, '6': 5,
      '六': 6, '7': 6
    }
  },
  
  // 每月模式
  monthly: {
    patterns: [
      /每月(\d{1,2})号?\s*(上午|下午)?\s*(\d{1,2})点(\d{1,2})?分?/, // 每月15号上午9点
      /每月(\d{1,2})日\s*(\d{1,2}):(\d{1,2})/, // 每月15日9:30
    ]
  },
  
  // 间隔模式
  interval: {
    patterns: [
      /每(\d+)(分钟|小时|天|周|月)/, // 每30分钟
      /每隔(\d+)(分钟|小时|天)/, // 每隔2小时
      /(\d+)(分钟|小时|天)一次/, // 30分钟一次
    ],
    multipliers: {
      '分钟': 60,
      '小时': 3600,
      '天': 86400,
      '周': 604800,
      '月': 2592000
    }
  },
  
  // 特定时间模式
  specific: {
    patterns: [
      /(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{1,2})/, // 2023年12月25日14:30
      /(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{1,2})/, // 12月25日14:30
    ]
  }
};

/**
 * 常用时间词汇
 */
const TIME_KEYWORDS = {
  morning: ['早上', '早晨', '上午', '凌晨'],
  afternoon: ['下午', '午后'],
  evening: ['晚上', '傍晚', '夜晚', '夜间'],
  days: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日', '周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  intervals: ['分钟', '小时', '天', '周', '月', '年']
};

class ChineseTimeParser {
  
  /**
   * 初始化jieba分词器
   */
  constructor() {
    // 添加自定义词典，提高时间相关词汇的分词准确性
    const customDict = [
      '每天 100',
      '每周 100',
      '每月 100',
      '每年 100',
      '上午 100',
      '下午 100',
      '晚上 100',
      '分钟 100',
      '小时 100',
      '点钟 100'
    ];
    
    nodejieba.insertWord(customDict.join(' '));
  }
  
  /**
   * 解析中文时间描述
   */
  parse(text: string): TimeParseResult {
    try {
      // 清洗输入文本
      const cleanedText = this.cleanText(text);
      
      // 分词处理
      const words = nodejieba.cut(cleanedText);
      
      // 按优先级尝试不同的解析模式
      const results = [
        this.parseDailyPattern(cleanedText),
        this.parseWeeklyPattern(cleanedText),
        this.parseMonthlyPattern(cleanedText),
        this.parseIntervalPattern(cleanedText),
        this.parseSpecificPattern(cleanedText)
      ].filter(result => result.success);
      
      if (results.length === 0) {
        return {
          success: false,
          confidence: 0,
          error: '无法识别的时间格式'
        };
      }
      
      // 返回置信度最高的结果
      const bestResult = results.reduce((prev, current) => 
        prev.confidence > current.confidence ? prev : current
      );
      
      return bestResult;
      
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        error: `解析错误: ${error instanceof Error ? error.message : '未知错误'}`
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
   * 解析每日模式
   */
  private parseDailyPattern(text: string): TimeParseResult {
    for (const pattern of TIME_PATTERNS.daily.patterns) {
      const match = pattern.exec(text);
      if (match) {
        let hour = 9; // 默认9点
        let minute = 0;
        
        // 提取时间信息
        if (match[1]) { // 时间段（上午/下午）
          const timeOfDay = match[1];
          const defaultTime = TIME_PATTERNS.daily.defaultTime[timeOfDay] || '09:00';
          [hour, minute] = defaultTime.split(':').map(Number);
          
          // 如果有具体小时数，覆盖默认时间
          if (match[2]) {
            hour = parseInt(match[2]);
            if ((timeOfDay === '下午' || timeOfDay === '晚上') && hour < 12) {
              hour += 12;
            }
          }
          
          if (match[3]) {
            minute = parseInt(match[3]);
          }
        } else if (match[2]) {
          // 直接的时间格式
          hour = parseInt(match[2]);
          minute = match[3] ? parseInt(match[3]) : 0;
        }
        
        const cronExpression = `${minute} ${hour} * * *`;
        
        return {
          success: true,
          cronExpression,
          description: `每天 ${hour}:${minute.toString().padStart(2, '0')} 执行`,
          confidence: 0.9,
          parsedData: {
            type: 'daily',
            time: `${hour}:${minute.toString().padStart(2, '0')}`
          }
        };
      }
    }
    
    return { success: false, confidence: 0 };
  }
  
  /**
   * 解析每周模式
   */
  private parseWeeklyPattern(text: string): TimeParseResult {
    for (const pattern of TIME_PATTERNS.weekly.patterns) {
      const match = pattern.exec(text);
      if (match) {
        const dayChar = match[2];
        const dayOfWeek = TIME_PATTERNS.weekly.dayMapping[dayChar];
        
        let hour = 9, minute = 0;
        
        // 提取时间信息
        if (match[3]) {
          const timeOfDay = match[3];
          if (timeOfDay === '下午' && match[4]) {
            hour = parseInt(match[4]) + 12;
          } else {
            hour = parseInt(match[4]);
          }
          
          if (match[5]) minute = parseInt(match[5]);
        } else if (match[3]) {
          // 直接的时间格式
          hour = parseInt(match[3]);
          minute = match[4] ? parseInt(match[4]) : 0;
        }
        
        const cronExpression = `${minute} ${hour} * * ${dayOfWeek}`;
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        return {
          success: true,
          cronExpression,
          description: `每周${dayNames[dayOfWeek]} ${hour}:${minute.toString().padStart(2, '0')} 执行`,
          confidence: 0.9,
          parsedData: {
            type: 'weekly',
            time: `${hour}:${minute.toString().padStart(2, '0')}`,
            daysOfWeek: [dayOfWeek]
          }
        };
      }
    }
    
    return { success: false, confidence: 0 };
  }
  
  /**
   * 解析每月模式
   */
  private parseMonthlyPattern(text: string): TimeParseResult {
    for (const pattern of TIME_PATTERNS.monthly.patterns) {
      const match = pattern.exec(text);
      if (match) {
        const dayOfMonth = parseInt(match[1]);
        
        let hour = 9, minute = 0;
        
        if (match[2]) {
          const timeOfDay = match[2];
          if (timeOfDay === '下午' && match[3]) {
            hour = parseInt(match[3]) + 12;
          } else {
            hour = parseInt(match[3]);
          }
          
          if (match[4]) minute = parseInt(match[4]);
        } else if (match[2]) {
          hour = parseInt(match[2]);
          minute = match[3] ? parseInt(match[3]) : 0;
        }
        
        const cronExpression = `${minute} ${hour} ${dayOfMonth} * *`;
        
        return {
          success: true,
          cronExpression,
          description: `每月${dayOfMonth}号 ${hour}:${minute.toString().padStart(2, '0')} 执行`,
          confidence: 0.9,
          parsedData: {
            type: 'monthly',
            time: `${hour}:${minute.toString().padStart(2, '0')}`,
            dayOfMonth: dayOfMonth
          }
        };
      }
    }
    
    return { success: false, confidence: 0 };
  }
  
  /**
   * 解析间隔模式
   */
  private parseIntervalPattern(text: string): TimeParseResult {
    for (const pattern of TIME_PATTERNS.interval.patterns) {
      const match = pattern.exec(text);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const multiplier = TIME_PATTERNS.interval.multipliers[unit] || 60;
        
        // 转换为cron表达式（每分钟检查一次）
        const cronExpression = `*/${Math.max(1, Math.floor(value * multiplier / 60))} * * * *`;
        
        return {
          success: true,
          cronExpression,
          description: `每${value}${unit}执行一次`,
          confidence: 0.8,
          parsedData: {
            type: 'interval',
            interval: value * multiplier
          }
        };
      }
    }
    
    return { success: false, confidence: 0 };
  }
  
  /**
   * 解析特定时间模式
   */
  private parseSpecificPattern(text: string): TimeParseResult {
    for (const pattern of TIME_PATTERNS.specific.patterns) {
      const match = pattern.exec(text);
      if (match) {
        let year, month, day, hour, minute;
        
        if (match[1] && match[1].length === 4) {
          // 完整日期格式
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
          hour = parseInt(match[4]);
          minute = match[5] ? parseInt(match[5]) : 0;
        } else {
          // 月日格式（使用当前年份）
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          hour = parseInt(match[3]);
          minute = match[4] ? parseInt(match[4]) : 0;
          year = new Date().getFullYear();
        }
        
        // 对于特定时间，我们使用一次性cron表达式
        const date = new Date(year, month - 1, day, hour, minute);
        const now = new Date();
        
        if (date <= now) {
          return {
            success: false,
            confidence: 0,
            error: '指定的时间已经过去'
          };
        }
        
        const cronExpression = `${minute} ${hour} ${day} ${month} *`;
        
        return {
          success: true,
          cronExpression,
          description: `${year}年${month}月${day}日 ${hour}:${minute.toString().padStart(2, '0')} 执行`,
          confidence: 0.9,
          parsedData: {
            type: 'specific',
            time: `${hour}:${minute.toString().padStart(2, '0')}`
          }
        };
      }
    }
    
    return { success: false, confidence: 0 };
  }
  
  /**
   * 验证cron表达式
   */
  validateCronExpression(cron: string): boolean {
    try {
      const cronParser = require('cron-parser');
      cronParser.parseExpression(cron);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 获取cron表达式的人类可读描述
   */
  getCronDescription(cron: string): string {
    try {
      const parts = cron.split(' ');
      if (parts.length !== 5) return '无效的cron表达式';
      
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      
      if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return '每分钟执行';
      }
      
      if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        const interval = parseInt(minute.substring(2));
        return `每${interval}分钟执行一次`;
      }
      
      if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return `每天 ${hour}:${minute} 执行`;
      }
      
      if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const days = dayOfWeek.split(',').map(d => dayNames[parseInt(d)]).join(',');
        return `每周${days} ${hour}:${minute} 执行`;
      }
      
      return cron;
    } catch {
      return cron;
    }
  }
}

// 导出单例实例
export const chineseTimeParser = new ChineseTimeParser();

export default ChineseTimeParser;
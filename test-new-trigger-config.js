// 测试新的定时配置系统
const { taskScheduler } = require('./backend/src/services/taskScheduler');

// 测试可视化定时配置
const visualTask = {
  id: 'test-visual-1',
  name: '可视化定时测试',
  type: 'command',
  config: { command: 'echo "可视化定时测试"' },
  triggerType: 'visual',
  triggerConfig: {
    visualType: 'once',
    visualTime: '14:30'
  },
  status: 'active'
};

// 测试农历定时配置
const lunarTask = {
  id: 'test-lunar-1',
  name: '农历定时测试',
  type: 'command',
  config: { command: 'echo "农历定时测试"' },
  triggerType: 'lunar',
  triggerConfig: {
    lunarYear: 2024,
    lunarMonth: 1,
    lunarDay: 1,
    lunarRepeat: true
  },
  status: 'active'
};

// 测试倒计时配置
const countdownTask = {
  id: 'test-countdown-1',
  name: '倒计时测试',
  type: 'command',
  config: { command: 'echo "倒计时测试"' },
  triggerType: 'countdown',
  triggerConfig: {
    countdownHours: 1,
    countdownMinutes: 30,
    countdownStartTime: new Date().toISOString()
  },
  status: 'active'
};

// 测试条件触发配置
const conditionalTask = {
  id: 'test-conditional-1',
  name: '条件触发测试',
  type: 'command',
  config: { command: 'echo "条件触发测试"' },
  triggerType: 'conditional',
  triggerConfig: {
    conditionType: 'cpu_usage',
    conditionValue: 30,
    conditionDelay: 5000
  },
  status: 'active'
};

console.log('=== 测试新的定时配置系统 ===');

// 测试可视化定时时间计算
console.log('\n1. 可视化定时时间计算:');
try {
  const nextTime = taskScheduler.calculateVisualScheduleTime(visualTask);
  console.log('   下次执行时间:', nextTime);
} catch (error) {
  console.log('   计算错误:', error.message);
}

// 测试农历定时时间计算
console.log('\n2. 农历定时时间计算:');
try {
  const nextTime = taskScheduler.calculateLunarScheduleTime(lunarTask);
  console.log('   下次执行时间:', nextTime);
} catch (error) {
  console.log('   计算错误:', error.message);
}

// 测试倒计时时间计算
console.log('\n3. 倒计时时间计算:');
try {
  const nextTime = taskScheduler.calculateNextExecutionTime(countdownTask);
  console.log('   下次执行时间:', nextTime);
} catch (error) {
  console.log('   计算错误:', error.message);
}

// 测试条件触发时间计算
console.log('\n4. 条件触发时间计算:');
try {
  const nextTime = taskScheduler.calculateConditionalScheduleTime(conditionalTask);
  console.log('   下次执行时间:', nextTime);
} catch (error) {
  console.log('   计算错误:', error.message);
}

console.log('\n=== 测试完成 ===');
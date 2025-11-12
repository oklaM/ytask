import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

interface SandboxConfig {
  timeout?: number;
  workingDirectory?: string;
  allowedCommands?: string[];
  disallowedCommands?: string[];
  maxOutputSize?: number;
  environment?: Record<string, string>;
}

interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code?: number;
  signal?: string;
  duration: number;
}

class SandboxExecutor {
  private baseSandboxDir: string;
  private defaultConfig: Required<SandboxConfig>;

  constructor() {
    // 创建沙盒基础目录
    this.baseSandboxDir = join(process.cwd(), 'sandbox');
    if (!existsSync(this.baseSandboxDir)) {
      mkdirSync(this.baseSandboxDir, { recursive: true });
    }

    this.defaultConfig = {
      timeout: 30000, // 30秒默认超时
      workingDirectory: this.baseSandboxDir,
      allowedCommands: [
        'echo', 'ls', 'cat', 'mkdir', 'rm', 'cp', 'mv',
        'date', 'pwd', 'whoami', 'uname', 'hostname',
        'python', 'python3', 'node', 'npm', 'yarn'
      ],
      disallowedCommands: [
        'rm -rf', 'sudo', 'su', 'passwd', 'chmod', 'chown',
        'dd', 'mkfs', 'fdisk', 'mount', 'umount',
        'shutdown', 'reboot', 'halt', 'poweroff',
        'wget', 'curl', 'ssh', 'scp', 'telnet'
      ],
      maxOutputSize: 1024 * 1024, // 1MB最大输出
      environment: {
        ...process.env,
        PATH: process.env.PATH || '',
        HOME: this.baseSandboxDir,
        TMPDIR: join(this.baseSandboxDir, 'tmp')
      }
    };
  }

  /**
   * 验证命令是否安全
   */
  private validateCommand(command: string): { safe: boolean; reason?: string } {
    const trimmedCommand = command.trim();
    
    // 检查空命令
    if (!trimmedCommand) {
      return { safe: false, reason: '命令不能为空' };
    }
    
    // 检查命令长度
    if (trimmedCommand.length > 1000) {
      return { safe: false, reason: '命令过长' };
    }
    
    // 提取第一个单词作为命令
    const firstWord = trimmedCommand.split(' ')[0].toLowerCase();
    
    // 检查不允许的命令
    for (const disallowed of this.defaultConfig.disallowedCommands) {
      if (trimmedCommand.toLowerCase().includes(disallowed)) {
        return { safe: false, reason: `命令包含不允许的关键字: ${disallowed}` };
      }
    }
    
    // 检查允许的命令列表
    if (!this.defaultConfig.allowedCommands.includes(firstWord)) {
      return { safe: false, reason: `命令不在允许列表中: ${firstWord}` };
    }
    
    // 检查危险字符
    const dangerousChars = ['`', '$', '&', '|', ';', '>', '<', '~'];
    for (const char of dangerousChars) {
      if (trimmedCommand.includes(char)) {
        return { safe: false, reason: `命令包含危险字符: ${char}` };
      }
    }
    
    return { safe: true };
  }

  /**
   * 创建隔离的工作目录
   */
  private createIsolatedWorkspace(taskId: string): string {
    const workspaceDir = join(this.baseSandboxDir, `task_${taskId}`);
    
    if (!existsSync(workspaceDir)) {
      mkdirSync(workspaceDir, { recursive: true });
    }
    
    // 创建必要的子目录
    const subDirs = ['tmp', 'logs', 'output'];
    for (const dir of subDirs) {
      const dirPath = join(workspaceDir, dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    }
    
    return workspaceDir;
  }

  /**
   * 执行命令并限制资源
   */
  async executeCommand(command: string, taskId: string, config?: SandboxConfig): Promise<ExecutionResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    // 验证命令安全性
    const validation = this.validateCommand(command);
    if (!validation.safe) {
      return {
        success: false,
        stdout: '',
        stderr: validation.reason || '命令验证失败',
        duration: Date.now() - startTime
      };
    }
    
    // 创建工作目录
    const workspaceDir = this.createIsolatedWorkspace(taskId);
    
    try {
      // 使用 spawn 而不是 exec，以便更好地控制进程
      const childProcess = spawn(command, {
        shell: true,
        cwd: workspaceDir,
        env: mergedConfig.environment,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      // 收集标准输出
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        // 限制输出大小
        if (stdout.length > mergedConfig.maxOutputSize) {
          childProcess.kill();
          stdout = stdout.substring(0, mergedConfig.maxOutputSize) + '\n[输出被截断...]';
        }
      });
      
      // 收集错误输出
      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > mergedConfig.maxOutputSize) {
          childProcess.kill();
          stderr = stderr.substring(0, mergedConfig.maxOutputSize) + '\n[错误输出被截断...]';
        }
      });
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        childProcess.kill();
        stderr += '\n[进程因超时被终止]';
      }, mergedConfig.timeout);
      
      // 等待进程结束
      const exitCode = await new Promise<number>((resolve) => {
        childProcess.on('close', (code, signal) => {
          clearTimeout(timeoutId);
          resolve(code || 0);
        });
      });
      
      const duration = Date.now() - startTime;
      
      return {
        success: exitCode === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: exitCode,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('沙盒执行错误:', error);
      
      return {
        success: false,
        stdout: '',
        stderr: `执行错误: ${error instanceof Error ? error.message : '未知错误'}`,
        duration
      };
    }
  }

  /**
   * 清理沙盒工作目录
   */
  async cleanupWorkspace(taskId: string): Promise<void> {
    const workspaceDir = join(this.baseSandboxDir, `task_${taskId}`);
    
    // 在实际实现中，这里应该使用 rimraf 或类似的库来安全删除目录
    // 但为了安全，我们可以保留日志和输出文件
    logger.info(`清理沙盒工作目录: ${workspaceDir}`);
  }

  /**
   * 获取沙盒状态
   */
  getSandboxStatus(): {
    baseDir: string;
    totalTasks: number;
    config: SandboxConfig;
  } {
    return {
      baseDir: this.baseSandboxDir,
      totalTasks: 0, // 可以扩展为统计当前运行的沙盒任务
      config: this.defaultConfig
    };
  }

  /**
   * 执行脚本文件
   */
  async executeScript(scriptContent: string, language: string, taskId: string, config?: SandboxConfig): Promise<ExecutionResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    // 验证脚本语言
    const supportedLanguages = ['javascript', 'python', 'bash'];
    if (!supportedLanguages.includes(language.toLowerCase())) {
      return {
        success: false,
        stdout: '',
        stderr: `不支持的脚本语言: ${language}. 支持的脚本语言: ${supportedLanguages.join(', ')}`,
        duration: Date.now() - startTime
      };
    }
    
    // 验证脚本内容安全性
    if (!scriptContent || scriptContent.length > 10000) {
      return {
        success: false,
        stdout: '',
        stderr: '脚本内容无效或过长（最大10KB）',
        duration: Date.now() - startTime
      };
    }
    
    // 检查危险代码模式
    const dangerousPatterns = [
      /require\s*\(\s*['"]fs['"]\s*\)/g,
      /require\s*\(\s*['"]child_process['"]\s*\)/g,
      /import\s+.*\s+from\s+['"]fs['"]/g,
      /import\s+.*\s+from\s+['"]child_process['"]/g,
      /exec\s*\(/g,
      /spawn\s*\(/g,
      /eval\s*\(/g,
      /Function\s*\(/g,
      /process\.exit/g,
      /rm\s+-rf/g,
      /sudo\s+/g
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(scriptContent)) {
        return {
          success: false,
          stdout: '',
          stderr: '脚本包含危险代码模式，被拒绝执行',
          duration: Date.now() - startTime
        };
      }
    }
    
    try {
      // 创建工作目录
      const workspaceDir = this.createIsolatedWorkspace(taskId);
      
      // 根据语言创建脚本文件
      const scriptFile = this.createScriptFile(scriptContent, language, workspaceDir);
      
      // 构建执行命令
      const executionCommand = this.buildExecutionCommand(language, scriptFile);
      
      // 使用沙盒执行命令
      return await this.executeCommand(executionCommand, taskId, mergedConfig);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('脚本执行错误:', error);
      
      return {
        success: false,
        stdout: '',
        stderr: `脚本执行错误: ${error instanceof Error ? error.message : '未知错误'}`,
        duration
      };
    }
  }

  /**
   * 创建脚本文件
   */
  private createScriptFile(content: string, language: string, workspaceDir: string): string {
    const { writeFileSync } = require('fs');
    const { join } = require('path');
    
    let filename: string;
    let fullContent: string;
    
    switch (language.toLowerCase()) {
      case 'javascript':
        filename = 'script.js';
        // 添加安全包装
        fullContent = `// 安全包装的JavaScript脚本
console.log('脚本开始执行...');
try {
  ${content}
  console.log('脚本执行完成');
} catch (error) {
  console.error('脚本执行错误:', error.message);
  process.exit(1);
}
`;
        break;
        
      case 'python':
        filename = 'script.py';
        fullContent = `# 安全包装的Python脚本
print('脚本开始执行...')
try:
${this.pythonifyContent(content)}
    print('脚本执行完成')
except Exception as e:
    print(f'脚本执行错误: {e}')
    exit(1)
`;
        break;
        
      case 'bash':
        filename = 'script.sh';
        fullContent = `#!/bin/bash
# 安全包装的Bash脚本
echo "脚本开始执行..."
${content}
echo "脚本执行完成"
`;
        break;
        
      default:
        throw new Error(`不支持的脚本语言: ${language}`);
    }
    
    const filePath = join(workspaceDir, filename);
    writeFileSync(filePath, fullContent, 'utf8');
    
    // 如果是bash脚本，设置执行权限
    if (language.toLowerCase() === 'bash') {
      const { chmodSync } = require('fs');
      chmodSync(filePath, 0o755);
    }
    
    return filePath;
  }

  /**
   * 将Python代码缩进
   */
  private pythonifyContent(content: string): string {
    return content.split('\n').map(line => `    ${line}`).join('\n');
  }

  /**
   * 构建执行命令
   */
  private buildExecutionCommand(language: string, scriptFile: string): string {
    switch (language.toLowerCase()) {
      case 'javascript':
        return `node "${scriptFile}"`;
      case 'python':
        return `python "${scriptFile}"`;
      case 'bash':
        return `bash "${scriptFile}"`;
      default:
        throw new Error(`不支持的脚本语言: ${language}`);
    }
  }
}

export const sandboxExecutor = new SandboxExecutor();